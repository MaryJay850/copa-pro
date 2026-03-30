"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { subscribePush, unsubscribePush, getVapidPublicKey } from "@/lib/actions/push-actions";
import { subscribeBrowserPush, unsubscribeBrowserPush, getSwRegistration } from "./sw-register";

const STORAGE_KEY = "copapro-push-subscribed";

export function PushNotificationButton() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  // Check current subscription state on mount
  useEffect(() => {
    async function checkState() {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setSupported(false);
        return;
      }

      // Check localStorage first for quick UI render
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setSubscribed(true);
      }

      // Verify with actual push manager state
      try {
        const reg = await getSwRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          const isActive = !!sub;
          setSubscribed(isActive);
          localStorage.setItem(STORAGE_KEY, String(isActive));
        }
      } catch {
        // Ignore errors during check
      }
    }
    checkState();
  }, []);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      if (subscribed) {
        // Unsubscribe
        const endpoint = await unsubscribeBrowserPush();
        if (endpoint) {
          await unsubscribePush(endpoint);
        }
        setSubscribed(false);
        localStorage.setItem(STORAGE_KEY, "false");
      } else {
        // Subscribe
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) {
          console.error("VAPID public key not configured");
          return;
        }

        const subJson = await subscribeBrowserPush(vapidKey);
        if (!subJson || !subJson.endpoint || !subJson.keys) {
          // User denied or something went wrong
          return;
        }

        await subscribePush({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh!,
            auth: subJson.keys.auth!,
          },
        });

        setSubscribed(true);
        localStorage.setItem(STORAGE_KEY, "true");
      }
    } catch (error) {
      console.error("Push notification toggle failed:", error);
    } finally {
      setLoading(false);
    }
  }, [subscribed]);

  if (!supported) return null;

  if (subscribed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={loading}
        className="gap-2 text-green-600 hover:text-red-600"
        title="Notificações ativas — clique para desativar"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Notificações Ativas</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
      title="Ativar notificações push"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Ativar Notificações</span>
    </Button>
  );
}
