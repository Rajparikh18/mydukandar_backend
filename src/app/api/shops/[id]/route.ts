import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/shops/[id] - Get shop details with products
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, phone: true } },
        products: {
          where: { inStock: true },
          orderBy: { category: "asc" },
        },
        _count: { select: { products: true, orders: true, customers: true } },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json({ shop });
  } catch (error) {
    console.error("Get shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/shops/[id] - Update shop details (shop owner only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { getAuthFromRequest } = await import("@/lib/auth");
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const shop = await prisma.shop.findUnique({ where: { id } });
    if (!shop || shop.ownerId !== auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const updatedShop = await prisma.shop.update({
      where: { id },
      data: {
        name: body.name || shop.name,
        description: body.description ?? shop.description,
        address: body.address || shop.address,
        city: body.city || shop.city,
        pincode: body.pincode || shop.pincode,
        phone: body.phone || shop.phone,
      },
    });

    return NextResponse.json({ shop: updatedShop });
  } catch (error) {
    console.error("Update shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
