import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { z } from "zod/v4";

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  mrp: z.number().positive().optional(),
  unit: z.string().optional(),
  category: z.enum(["GROCERY", "STATIONERY", "MEDICAL", "HOUSEHOLD", "OTHER"]).optional(),
  imageUrl: z.string().optional(),
  inStock: z.boolean().optional(),
  quantity: z.number().int().min(0).optional(),
});

// PATCH /api/products/[id] - Update a product (shop owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
    if (!shop || shop.id !== product.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product (shop owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
    if (!shop || shop.id !== product.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Soft-delete: just mark as out of stock so existing order references stay valid
    await prisma.product.update({
      where: { id },
      data: { inStock: false, quantity: 0 },
    });

    return NextResponse.json({ message: "Product removed from catalog" });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
