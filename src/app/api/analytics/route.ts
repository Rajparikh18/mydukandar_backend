import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

// GET /api/analytics - Get sales analytics for shop owner
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get all orders for the shop
    const orders = await prisma.order.findMany({
      where: { shopId: shop.id },
      include: {
        items: { include: { product: { select: { name: true, category: true } } } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all payments for the shop
    const payments = await prisma.payment.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
    });

    // Summary calculations
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === "PICKED_UP").length;
    const cancelledOrders = orders.filter(o => o.status === "CANCELLED").length;
    const activeOrders = orders.filter(o => ["PENDING", "ACCEPTED", "PACKING", "READY"].includes(o.status)).length;

    const totalRevenue = orders
      .filter(o => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalCollected = payments
      .filter(p => p.method !== "UDHAAR")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalUdhaar = payments
      .filter(p => p.method === "UDHAAR")
      .reduce((sum, p) => sum + p.amount, 0);

    // Revenue by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueByDay: Record<string, number> = {};
    const ordersByDay: Record<string, number> = {};

    orders
      .filter(o => o.status !== "CANCELLED" && new Date(o.createdAt) >= thirtyDaysAgo)
      .forEach(o => {
        const day = new Date(o.createdAt).toISOString().split("T")[0];
        revenueByDay[day] = (revenueByDay[day] || 0) + o.totalAmount;
        ordersByDay[day] = (ordersByDay[day] || 0) + 1;
      });

    // Revenue by category
    const revenueByCategory: Record<string, number> = {};
    orders
      .filter(o => o.status !== "CANCELLED")
      .forEach(o => {
        o.items.forEach(item => {
          const cat = item.product.category;
          revenueByCategory[cat] = (revenueByCategory[cat] || 0) + item.price * item.quantity;
        });
      });

    // Payment method breakdown
    const paymentBreakdown = {
      CASH: payments.filter(p => p.method === "CASH").reduce((s, p) => s + p.amount, 0),
      ONLINE: payments.filter(p => p.method === "ONLINE").reduce((s, p) => s + p.amount, 0),
      UDHAAR: payments.filter(p => p.method === "UDHAAR").reduce((s, p) => s + p.amount, 0),
    };

    // Top products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders
      .filter(o => o.status !== "CANCELLED")
      .forEach(o => {
        o.items.forEach(item => {
          const key = item.productId;
          if (!productSales[key]) {
            productSales[key] = { name: item.product.name, quantity: 0, revenue: 0 };
          }
          productSales[key].quantity += item.quantity;
          productSales[key].revenue += item.price * item.quantity;
        });
      });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top customers
    const customerSpending: Record<string, { name: string; orderCount: number; totalSpent: number }> = {};
    orders
      .filter(o => o.status !== "CANCELLED")
      .forEach(o => {
        const key = o.customerId;
        if (!customerSpending[key]) {
          customerSpending[key] = { name: o.customer.name, orderCount: 0, totalSpent: 0 };
        }
        customerSpending[key].orderCount += 1;
        customerSpending[key].totalSpent += o.totalAmount;
      });

    const topCustomers = Object.values(customerSpending)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Order status breakdown
    const statusBreakdown = {
      PENDING: orders.filter(o => o.status === "PENDING").length,
      ACCEPTED: orders.filter(o => o.status === "ACCEPTED").length,
      PACKING: orders.filter(o => o.status === "PACKING").length,
      READY: orders.filter(o => o.status === "READY").length,
      PICKED_UP: completedOrders,
      CANCELLED: cancelledOrders,
    };

    // Average order value
    const nonCancelledOrders = orders.filter(o => o.status !== "CANCELLED");
    const avgOrderValue = nonCancelledOrders.length > 0
      ? totalRevenue / nonCancelledOrders.length
      : 0;

    return NextResponse.json({
      summary: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        activeOrders,
        totalRevenue,
        totalCollected,
        totalUdhaar,
        avgOrderValue,
      },
      revenueByDay,
      ordersByDay,
      revenueByCategory,
      paymentBreakdown,
      statusBreakdown,
      topProducts,
      topCustomers,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
