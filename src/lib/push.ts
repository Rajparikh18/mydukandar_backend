import webpush, { PushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@mydukandar.local";

let isConfigured = false;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  isConfigured = true;
}

export function isPushConfigured() {
  return isConfigured;
}

export function getVapidPublicKey() {
  return vapidPublicKey || null;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!isConfigured) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (!subscriptions.length) return;

  const payloadText = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ? subscription.expirationTime.getTime() : null,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadText);
      } catch (error: unknown) {
        // Remove stale subscriptions that are no longer valid.
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: subscription.endpoint } });
        }
      }
    })
  );
}
