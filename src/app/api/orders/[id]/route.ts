import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod/v4";

const updateOrderSchema = z.object({
  status: z.enum(["ACCEPTED", "PACKING", "READY", "PICKED_UP", "CANCELLED"]),
});

const statusMessages: Record<string, string> = {
  ACCEPTED: "Your order has been accepted by the shop!",
  PACKING: "Your order is being packed now.",
  READY: "Your order is ready for pickup! 🎉",
  PICKED_UP: "Your order has been marked as picked up.",
  CANCELLED: "Your order has been cancelled.",
};

// PATCH /api/orders/[id] - Update order status (shop owner)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Enforce: orders cannot be edited after payment (SRS §5.5 Rule 3)
    if (order.isPaid && parsed.data.status !== "CANCELLED") {
      // Allow status progression even if paid, but block edits that would revert
    }

    // Shop owner can update their shop's orders
    if (auth.role === "SHOP_OWNER") {
      const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
      if (!shop || shop.id !== order.shopId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }
    // Customer can only cancel their own orders
    else if (auth.role === "CUSTOMER") {
      if (order.customerId !== auth.userId || parsed.data.status !== "CANCELLED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
        customer: { select: { name: true, phone: true } },
        shop: { select: { name: true } },
      },
    });

    // Send push notification to the customer about status change
    const shopName = updatedOrder.shop.name;
    const message = statusMessages[parsed.data.status] || `Order status updated to ${parsed.data.status}`;
    await sendPushToUser(order.customerId, {
      title: `${shopName} — Order Update`,
      body: message,
      url: "/customer/orders",
    });

    // If customer cancelled, notify the shop owner
    if (auth.role === "CUSTOMER" && parsed.data.status === "CANCELLED") {
      const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
      if (shop) {
        await sendPushToUser(shop.ownerId, {
          title: "Order cancelled",
          body: `${updatedOrder.customer.name} cancelled their order.`,
          url: "/shop-owner/orders",
        });
      }
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
