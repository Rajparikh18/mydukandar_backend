import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

const paymentMethodSchema = z.enum(["CASH", "ONLINE", "UDHAAR"]);
const PAYMENT_EPSILON = 0.01;

const createPaymentSchema = z.object({
  customerId: z.string().uuid().optional(),
  amount: z.number().positive(),
  method: paymentMethodSchema,
  shopId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  note: z.string().optional(),
});

function normalizePaymentMethod(method: z.infer<typeof paymentMethodSchema>) {
  return method;
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseInclude = {
      customer: { select: { id: true, name: true } },
      shop: { select: { id: true, name: true } },
      order: { select: { id: true, totalAmount: true, status: true, isPaid: true } },
    } as const;

    if (auth.role === "CUSTOMER") {
      const [payments, balances] = await Promise.all([
        prisma.payment.findMany({
          where: { customerId: auth.userId },
          include: baseInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.customerShopConnection.findMany({
          where: { customerId: auth.userId },
          include: {
            customer: { select: { id: true, name: true } },
            shop: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return NextResponse.json({
        payments,
        balances,
        balance: balances[0]?.balance ?? null,
      });
    }

    const shop = await prisma.shop.findUnique({
      where: { ownerId: auth.userId },
      select: { id: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const [payments, balances] = await Promise.all([
      prisma.payment.findMany({
        where: { shopId: shop.id },
        include: baseInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customerShopConnection.findMany({
        where: { shopId: shop.id },
        include: {
          customer: { select: { id: true, name: true } },
          shop: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      payments,
      balances,
      balance: null,
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { customerId: requestedCustomerId, amount, method, shopId: providedShopId, orderId, note } = parsed.data;

    // Resolve shopId: prefer provided, else if shop owner infer, else error
    let shopId = providedShopId ?? null;
    if (!shopId && auth.role === "SHOP_OWNER") {
      const ownerShop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
      if (!ownerShop) return NextResponse.json({ error: "Shop not found for owner" }, { status: 404 });
      shopId = ownerShop.id;
    }

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required or inferable" }, { status: 400 });
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    let customerId = requestedCustomerId;

    if (auth.role === "CUSTOMER") {
      customerId = auth.userId;
      // customers cannot pass a shop that doesn't match their order or provided shop
    } else {
      const ownerShop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
      if (!ownerShop || ownerShop.id !== shop.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (!customerId) {
        return NextResponse.json({ error: "customerId is required" }, { status: 400 });
      }
    }

    const customer = await prisma.user.findUnique({ where: { id: customerId! } });
    if (!customer || customer.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let isFullyPaidNow = false;
    if (orderId) {
      const order = await prisma.order.findUnique({ 
        where: { id: orderId },
        include: { payments: { select: { amount: true } } }
      });
      if (!order || order.shopId !== shop.id || order.customerId !== customer.id) {
        return NextResponse.json({ error: "Invalid order mapping" }, { status: 400 });
      }
      const previousPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const nextPaidTotal = previousPaid + amount;
      isFullyPaidNow = nextPaidTotal >= (order.totalAmount - PAYMENT_EPSILON);
    }

    const signedAmount = normalizePaymentMethod(method) === "UDHAAR" ? amount : -amount;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          customerId: customer.id,
          shopId: shop.id,
          orderId: orderId || null,
          amount,
          method,
          note,
        },
        include: {
          customer: { select: { id: true, name: true } },
          shop: { select: { id: true, name: true } },
          order: { select: { id: true, totalAmount: true, status: true, isPaid: true } },
        },
      }),
      prisma.customerShopConnection.upsert({
        where: {
          customerId_shopId: {
            customerId: customer.id,
            shopId: shop.id,
          },
        },
        create: {
          customerId: customer.id,
          shopId: shop.id,
          balance: signedAmount,
        },
        update: {
          balance: { increment: signedAmount },
        },
      }),
      ...(orderId && method !== "UDHAAR"
        ? [
            prisma.order.update({
              where: { id: orderId },
              data: { isPaid: isFullyPaidNow },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
