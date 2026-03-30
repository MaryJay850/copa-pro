"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

/**
 * Get the current service worker registration (useful for push subscription).
 */
export async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

/**
 * Subscribe the browser to push notifications via the service worker.
 * Returns the PushSubscription JSON or null if denied/unavailable.
 */
export async function subscribeBrowserPush(
  vapidPublicKey: string
): Promise<PushSubscriptionJSON | null> {
  const reg = await getSwRegistration();
  if (!reg) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // Convert VAPID key to Uint8Array
  const padding = "=".repeat((4 - (vapidPublicKey.length % 4)) % 4);
  const base64 = (vapidPublicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const applicationServerKey = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    applicationServerKey[i] = rawData.charCodeAt(i);
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  return subscription.toJSON();
}

/**
 * Unsubscribe the browser from push notifications.
 */
export async function unsubscribeBrowserPush(): Promise<string | null> {
  const reg = await getSwRegistration();
  if (!reg) return null;

  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return null;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
