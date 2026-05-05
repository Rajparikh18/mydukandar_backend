import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { z } from "zod/v4";

const updateOrderSchema = z.object({
  status: z.enum(["ACCEPTED", "PACKING", "READY", "PICKED_UP", "CANCELLED"]),
});

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

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
