"use client";

// ============================================================
// MentorMesh — Notification Center
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/firebase/firestore";
import type { Notification } from "@/types";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { Bell, CheckCheck, CheckCircle, XCircle } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsContent />
    </AppShell>
  );
}

function NotificationsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const list = await getUserNotifications(user.uid);
        setNotifications(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconConfig: Record<string, { icon: React.ReactNode; classes: string }> = {
    approval:  { icon: <CheckCircle size={18} />, classes: "bg-emerald-100 text-emerald-600" },
    rejection: { icon: <XCircle size={18} />,    classes: "bg-red-100 text-red-600" },
    info:      { icon: <Bell size={18} />,        classes: "bg-blue-100 text-blue-600" },
    default:   { icon: <Bell size={18} />,        classes: "bg-blue-100 text-blue-600" },
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto mm-page-animate">
      <PageHeader
        icon={<Bell size={20} />}
        iconClass="bg-blue-100 text-blue-600"
        title="Notification Center"
        subtitle="Approvals, team updates, and priority messages."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              icon={<CheckCheck size={14} />}
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} />}
          title="No notifications"
          description="You're all caught up! Updates and requests will appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const cfg = iconConfig[n.type] ?? iconConfig.default;
            return (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                  n.read
                    ? "bg-white border-slate-200"
                    : "bg-blue-50/40 border-blue-200 shadow-sm"
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && !n.read && handleMarkRead(n.id)}
                aria-label={n.title}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    cfg.classes
                  )}
                >
                  {cfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{n.title}</h3>
                    <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                </div>

                {!n.read && (
                  <span
                    className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2"
                    title="Unread"
                    aria-label="Unread notification"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
