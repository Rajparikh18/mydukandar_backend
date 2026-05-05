import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod/v4";

const createOrderSchema = z.object({
  shopId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  notes: z.string().optional(),
});

// GET /api/orders - Get orders (customer sees their orders, shop owner sees shop orders)
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let where: Record<string, unknown> = {};

    if (auth.role === "CUSTOMER") {
      where = { customerId: auth.userId };
    } else {
      const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
      if (!shop) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      }
      where = { shopId: shop.id };
    }

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
        customer: { select: { id: true, name: true, phone: true } },
        shop: { select: { name: true, address: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/orders - Place an order (customer only)
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { shopId, items, notes } = parsed.data;

    // Verify shop exists
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get product prices and calculate total
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, shopId },
    });

    if (products.length !== items.length) {
      return NextResponse.json({ error: "Some products not found in this shop" }, { status: 400 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      };
    });

    const order = await prisma.order.create({
      data: {
        customerId: auth.userId,
        shopId,
        totalAmount,
        notes,
        items: { create: orderItems },
      },
      include: {
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
        shop: { select: { name: true } },
      },
    });

    // Auto-connect customer to shop if not connected
    await prisma.customerShopConnection.upsert({
      where: {
        customerId_shopId: { customerId: auth.userId, shopId },
      },
      create: { customerId: auth.userId, shopId },
      update: {},
    });

    const customer = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true },
    });

    await sendPushToUser(shop.ownerId, {
      title: "New order received",
      body: `${customer?.name || "A customer"} placed an order of Rs. ${totalAmount.toFixed(2)}`,
      url: "/shop-owner/orders",
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
