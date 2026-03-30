"use server";

import { prisma } from "../db";
import { requireAuth } from "../auth-guards";
import webpush from "web-push";

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:suporte@copapro.pt",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const user = await requireAuth();

  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId: user.id, endpoint: subscription.endpoint } },
    update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return { success: true };
}

export async function unsubscribePush(endpoint: string) {
  const user = await requireAuth();

  await prisma.pushSubscription.deleteMany({
    where: { userId: user.id, endpoint },
  });

  return { success: true };
}

export async function sendPushToUser(userId: string, title: string, body: string, url?: string) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({ title, body, url: url || "/" });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
    } catch (error: any) {
      // If subscription is invalid (410 Gone), remove it
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
}

export async function sendPushToUsers(userIds: string[], title: string, body: string, url?: string) {
  for (const userId of userIds) {
    await sendPushToUser(userId, title, body, url);
  }
}

export async function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}
