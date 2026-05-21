import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { z } from "zod/v4";

const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  mrp: z.number().positive().optional(),
  unit: z.string().default("piece"),
  category: z.enum(["GROCERY", "STATIONERY", "MEDICAL", "HOUSEHOLD", "OTHER"]).default("GROCERY"),
  imageUrl: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
});

// GET /api/products?shopId=xxx&category=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const category = searchParams.get("category");

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: {
        shopId,
        inStock: true,
        ...(category && { category: category as "GROCERY" | "STATIONERY" | "MEDICAL" | "HOUSEHOLD" | "OTHER" }),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/products - Add product (shop owner only)
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
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Find existing product
    const existingProduct = await prisma.product.findFirst({
      where: {
        shopId: shop.id,
        name: { equals: parsed.data.name, mode: "insensitive" },
        unit: { equals: parsed.data.unit, mode: "insensitive" },
      },
    });

    let product;
    if (existingProduct) {
      product = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          quantity: existingProduct.quantity + parsed.data.quantity,
          price: parsed.data.price, // Update price to latest
          mrp: parsed.data.mrp ?? null,
          inStock: true,
        },
      });
    } else {
      product = await prisma.product.create({
        data: { ...parsed.data, shopId: shop.id, inStock: true },
      });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
