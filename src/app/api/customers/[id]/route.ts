import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: customerId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { ownerId: auth.userId },
      select: { id: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get the connection (for balance)
    const connection = await prisma.customerShopConnection.findUnique({
      where: {
        customerId_shopId: { customerId, shopId: shop.id },
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    if (!connection) {
      return NextResponse.json({ error: "Customer not connected to this shop" }, { status: 404 });
    }

    // Get all orders of this customer at this shop
    const orders = await prisma.order.findMany({
      where: { customerId, shopId: shop.id },
      include: {
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all payments made by this customer at this shop
    const payments = await prisma.payment.findMany({
      where: { customerId, shopId: shop.id },
      include: {
        order: { select: { id: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalOrdered = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = payments.filter(p => p.method !== "UDHAAR").reduce((sum, p) => sum + p.amount, 0);
    const manualUdhaar = payments.filter(p => p.method === "UDHAAR").reduce((sum, p) => sum + p.amount, 0);
    const trueBalance = totalOrdered + manualUdhaar - totalPaid;

    return NextResponse.json({
      customer: connection.customer,
      balance: trueBalance, // Dynamically calculated true dues
      orders,
      payments,
    });
  } catch (error) {
    console.error("Get customer detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
