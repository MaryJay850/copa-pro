"use server";

import { prisma } from "../db";
import { requireAuth } from "../auth-guards";

// Helper: strip Prisma Date objects → plain JSON-safe objects
type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

function serialize<T>(obj: T): Serialized<T> {
  return JSON.parse(JSON.stringify(obj));
}

// ── Create notifications ──

interface NotificationData {
  title: string;
  message: string;
  type?: string;
  href?: string;
}

/**
 * Create a notification for a single user.
 * Fire-and-forget friendly — never throws.
 */
export async function createNotification(
  userId: string,
  data: NotificationData,
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type ?? "INFO",
        href: data.href ?? null,
      },
    });
  } catch {
    // Fire-and-forget: swallow errors so callers are never disrupted
  }
}

/**
 * Create notifications for multiple users at once.
 * Fire-and-forget friendly — never throws.
 */
export async function createNotificationBulk(
  userIds: string[],
  data: NotificationData,
) {
  try {
    if (userIds.length === 0) return;

    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type ?? "INFO",
        href: data.href ?? null,
      })),
    });
  } catch {
    // Fire-and-forget: swallow errors so callers are never disrupted
  }
}

// ── Read notifications ──

/**
 * Get unread notifications for the current user.
 * Returns the notifications and the total unread count.
 */
export async function getUnreadNotifications(limit = 10) {
  const user = await requireAuth();

  const where = { userId: user.id, read: false };

  const [notifications, totalUnread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return serialize({ notifications, totalUnread });
}

/**
 * Get all notifications (read and unread) for the current user, paginated.
 */
export async function getNotificationsPage(page = 1, limit = 20) {
  const user = await requireAuth();

  const where = { userId: user.id };
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return serialize({
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// ── Update notifications ──

/**
 * Mark a single notification as read.
 * Verifies the notification belongs to the current user.
 */
export async function markNotificationAsRead(notificationId: string) {
  const user = await requireAuth();

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== user.id) {
    throw new Error("Notification not found.");
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return { success: true };
}

/**
 * Mark all unread notifications as read for the current user.
 */
export async function markAllNotificationsAsRead() {
  const user = await requireAuth();

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return { success: true };
}
