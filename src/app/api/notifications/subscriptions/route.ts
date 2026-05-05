import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

const saveSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const deleteSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = saveSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subscription payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const subscription = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: auth.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: subscription.expirationTime
        ? new Date(subscription.expirationTime)
        : null,
    },
    update: {
      userId: auth.userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: subscription.expirationTime
        ? new Date(subscription.expirationTime)
        : null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = deleteSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint: parsed.data.endpoint,
      userId: auth.userId,
    },
  });

  return NextResponse.json({ ok: true });
}
