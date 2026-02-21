"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Trophy, Calendar, Users, Info, X } from "lucide-react";
import {
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/actions/notification-actions";
import { useRouter } from "next/navigation";

// ── Types ──

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

function typeIcon(type: string) {
  switch (type) {
    case "MATCH":
      return <Calendar className="w-4 h-4 shrink-0" />;
    case "RESULT":
    case "RANKING":
      return <Trophy className="w-4 h-4 shrink-0" />;
    case "SYSTEM":
      return <Info className="w-4 h-4 shrink-0" />;
    default:
      return <Bell className="w-4 h-4 shrink-0" />;
  }
}

// ── Component ──

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unread notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getUnreadNotifications(10);
      setNotifications(data.notifications as Notification[]);
      setUnreadCount(data.totalUnread);
    } catch {
      // Silently fail — user might not be authenticated
    }
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle single notification click
  async function handleNotificationClick(n: Notification) {
    try {
      await markNotificationAsRead(n.id);
    } catch {
      // ignore
    }
    setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  }

  // Mark all as read
  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        title="Notificações"
        className="relative rounded-lg border border-border p-1.5 text-text-muted hover:text-text hover:border-text transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-surface border border-border rounded-xl shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text">
              Notificações
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              Sem notificações
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className="w-full text-left px-4 py-3 flex gap-3 items-start bg-primary/5 border-l-2 border-primary hover:bg-primary/10 transition-colors"
                  >
                    <span className="mt-0.5 text-text-muted">
                      {typeIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text truncate">
                          {n.title}
                        </span>
                        <span className="text-[11px] text-text-muted whitespace-nowrap">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
