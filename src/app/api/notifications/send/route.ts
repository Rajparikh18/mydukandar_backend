import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod/v4";

const notifySchema = z.object({
  customerId: z.string().uuid().optional(), // specific customer, or all if omitted
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
});

// POST /api/notifications/send - Shop owner sends notification to customers
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = notifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { customerId, title, message } = parsed.data;

    let sentCount = 0;

    if (customerId) {
      // Send to specific customer
      const connection = await prisma.customerShopConnection.findUnique({
        where: { customerId_shopId: { customerId, shopId: shop.id } },
      });
      if (!connection) {
        return NextResponse.json({ error: "Customer not connected to your shop" }, { status: 400 });
      }
      await sendPushToUser(customerId, {
        title: `${shop.name}: ${title}`,
        body: message,
        url: "/customer/orders",
      });
      sentCount = 1;
    } else {
      // Send to all connected customers
      const connections = await prisma.customerShopConnection.findMany({
        where: { shopId: shop.id },
        select: { customerId: true },
      });
      for (const conn of connections) {
        try {
          await sendPushToUser(conn.customerId, {
            title: `${shop.name}: ${title}`,
            body: message,
            url: "/customer",
          });
          sentCount++;
        } catch {
          // Skip failed individual notifications
        }
      }
    }

    return NextResponse.json({ 
      message: `Notification sent to ${sentCount} customer(s)`,
      sentCount,
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
