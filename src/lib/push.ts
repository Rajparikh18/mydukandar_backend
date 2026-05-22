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
  // Notifications feature temporarily disabled / terminated.
  // Keep function as a no-op to avoid runtime errors where called.
  return;
}
