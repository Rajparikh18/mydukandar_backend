import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { z } from "zod/v4";

const createBatchProductSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().positive(),
      mrp: z.number().positive().nullable().optional(),
      unit: z.string().default("piece"),
      category: z.enum(["GROCERY", "STATIONERY", "MEDICAL", "HOUSEHOLD", "OTHER"]).default("GROCERY"),
      imageUrl: z.string().optional(),
      quantity: z.number().int().min(0).default(0),
    })
  ).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found. Create a shop first." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createBatchProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const createdProducts = await Promise.all(
      parsed.data.products.map(async (productData) => {
        // Find existing product with same name (case-insensitive) and same unit
        const existingProduct = await prisma.product.findFirst({
          where: {
            shopId: shop.id,
            name: { equals: productData.name, mode: "insensitive" },
            unit: { equals: productData.unit, mode: "insensitive" },
          },
        });

        if (existingProduct) {
          // Product exists, just add to its quantity
          return prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              quantity: existingProduct.quantity + productData.quantity,
              inStock: true, // ensure it's marked as in stock if it was out of stock
            },
          });
        } else {
          // Product doesn't exist, create it
          return prisma.product.create({
            data: {
              name: productData.name,
              description: productData.description,
              price: productData.price,
              mrp: productData.mrp ?? null,
              unit: productData.unit,
              category: productData.category as any,
              imageUrl: productData.imageUrl,
              quantity: productData.quantity,
              inStock: true,
              shopId: shop.id,
            },
          });
        }
      })
    );

    return NextResponse.json({ products: createdProducts }, { status: 201 });
  } catch (error) {
    console.error("Create batch product error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
