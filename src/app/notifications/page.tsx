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
import { getUpcomingBirthdays, markVirtualNotificationRead, markAllVirtualNotificationsRead } from "@/lib/birthdays";
import type { Notification } from "@/types";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { Bell, Cake, CheckCheck, CheckCircle, XCircle } from "lucide-react";
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
        const dbList = await getUserNotifications(user.uid);
        const bdayList = await getUpcomingBirthdays(user);
        const all = [...bdayList, ...dbList];
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(all);
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
      markAllVirtualNotificationsRead();
      await markAllNotificationsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    // If the click came from the 1-click action button, we do not want to trigger container onClick
    if (e) e.stopPropagation();

    try {
      if (id.startsWith("bday_")) {
        markVirtualNotificationRead(id);
      } else {
        await markNotificationRead(id);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconConfig: Record<string, { icon: React.ReactNode; classes: string }> = {
    approval: { icon: <CheckCircle size={18} />, classes: "bg-emerald-100 text-emerald-600" },
    rejection: { icon: <XCircle size={18} />, classes: "bg-red-100 text-red-600" },
    info: { icon: <Bell size={18} />, classes: "bg-blue-100 text-blue-600" },
    birthday: { icon: <Cake size={18} />, classes: "bg-pink-100 text-pink-600" },
    default: { icon: <Bell size={18} />, classes: "bg-blue-100 text-blue-600" },
  };

  return (
    <div className="mm-card space-y-6 w-full max-w-4xl mx-auto mm-page-animate">
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
                  "mm-notification-card rounded-xl border transition-all cursor-pointer",
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

                <div className="mm-notification-content">
                  <div className="mm-notification-heading">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug overflow-wrap-anywhere">{n.title}</h3>
                    <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed overflow-wrap-anywhere">{n.message}</p>

                  {n.link && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={n.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-6 px-3 py-1"
                        onClick={() => !n.read && handleMarkRead(n.id)}
                      >
                        Send a Message
                      </a>
                    </div>
                  )}
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
