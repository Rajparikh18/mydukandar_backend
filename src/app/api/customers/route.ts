import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

// GET /api/customers?q=... for shop owners: returns customer-shop connections (balances)
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    // If customer requested their own info
    if (auth.role === "CUSTOMER") {
      const connections = await prisma.customerShopConnection.findMany({
        where: { customerId: auth.userId },
        include: { customer: { select: { id: true, name: true } }, shop: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ balances: connections });
    }

    // Shop owner: find their shop
    const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId }, select: { id: true } });
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const whereClause: any = { shopId: shop.id };
    if (q) {
      whereClause.customer = { name: { contains: q, mode: "insensitive" } };
    }

    const connections = await prisma.customerShopConnection.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ balances: connections });
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
