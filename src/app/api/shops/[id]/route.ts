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
