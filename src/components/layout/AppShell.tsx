"use client";

// ============================================================
// MentorMesh — App Shell v2 (Mobile-First)
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { subscribeToNotifications } from "@/lib/firebase/firestore";
import { collection, query, limit, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Notification } from "@/types";
import { Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

interface AppShellProps {
  children: React.ReactNode;
}

function ContentSkeleton() {
  return (
    <div className="mm-content-skeleton">
      <div className="mm-content-skeleton-bar mm-skeleton" style={{ height: "2rem", width: "60%" }} />
      <div className="mm-content-skeleton-bar mm-skeleton" style={{ height: "1rem", width: "40%" }} />
      <div className="mm-content-skeleton-bar mm-skeleton" style={{ height: "8rem", width: "100%", marginTop: "0.5rem" }} />
      <div className="mm-grid-2" style={{ marginTop: "1rem" }}>
        <div className="mm-skeleton" style={{ height: "6rem", borderRadius: "12px" }} />
        <div className="mm-skeleton" style={{ height: "6rem", borderRadius: "12px" }} />
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadNotifs, setUnreadNotifs] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasNewTeams, setHasNewTeams] = useState(false);
  const [hasNewEvents, setHasNewEvents] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const closeDrawer = useCallback(() => setMobileMenuOpen(false), []);
  const openDrawer = useCallback(() => setMobileMenuOpen(true), []);

  // Role-based redirect
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (user.status === "pending") { router.push("/pending"); return; }
    if (user.status === "rejected") { router.push("/rejected"); return; }
    if (user.status === "inactive") { router.push("/inactive"); return; }
  }, [user, loading, router]);

  // Request browser notification permissions
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const prevNotifs = React.useRef<Set<string>>(new Set());
  const initialLoad = React.useRef(false);

  // Real-time unread notifications
  useEffect(() => {
    if (!user || (user.status !== "active" && user.status !== "imported")) return;
    const unsub = subscribeToNotifications(user.uid, async (dbNotifs) => {
      try {
        const { getUpcomingBirthdays } = await import("@/lib/birthdays");
        const bdayNotifs = await getUpcomingBirthdays(user);

        const allUnread = [...bdayNotifs.filter(n => !n.read), ...dbNotifs];
        allUnread.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Trigger browser notification for new items
        if (initialLoad.current && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          for (const n of allUnread) {
            if (!prevNotifs.current.has(n.id)) {
              new Notification(n.title, { body: n.message, icon: "/icon.jpg" });
            }
          }
        }

        prevNotifs.current = new Set(allUnread.map(n => n.id));
        initialLoad.current = true;
        setUnreadNotifs(allUnread);
      } catch (err) {
        console.error("Error loading birthday notifs:", err);
        setUnreadNotifs(dbNotifs);
      }
    });

    // Lightweight team and event unread watchers
    const qTeams = query(collection(db, "teams"), orderBy("createdAt", "desc"), limit(1));
    const unsubTeams = onSnapshot(qTeams, (snap) => {
      if (!snap.empty) {
        const doc = snap.docs[0].data();
        if (doc.createdAt) {
          const latest = new Date(doc.createdAt).getTime();
          const lastVis = localStorage.getItem("last_visited_teams");
          if (!lastVis || latest > parseInt(lastVis)) setHasNewTeams(true);
          else setHasNewTeams(false);
        }
      }
    });

    const qEvents = query(collection(db, "events"), orderBy("createdAt", "desc"), limit(1));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      if (!snap.empty) {
        const doc = snap.docs[0].data();
        if (doc.createdAt) {
          const latest = new Date(doc.createdAt).getTime();
          const lastVis = localStorage.getItem("last_visited_events");
          if (!lastVis || latest > parseInt(lastVis)) setHasNewEvents(true);
          else setHasNewEvents(false);
        }
      }
    });

    const handleRead = () => {
      if (window.location.pathname.startsWith("/teams")) setHasNewTeams(false);
      if (window.location.pathname.startsWith("/events")) setHasNewEvents(false);
    };
    window.addEventListener("mentormesh_notifications_read", handleRead);

    return () => { unsub(); unsubTeams(); unsubEvents(); window.removeEventListener("mentormesh_notifications_read", handleRead); };
  }, [user]);

  const isReady = !loading && user && (user.status === "active" || user.status === "imported");
  const unreadCount = unreadNotifs.length;

  return (
    <div className="mm-layout">
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <Sidebar unreadCount={unreadCount} hasNewTeams={hasNewTeams} hasNewEvents={hasNewEvents} />

      {/* ── Mobile Topbar ───────────────────────────────── */}
      <header className="mm-mobile-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Hamburger */}
          <button
            onClick={openDrawer}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "var(--color-text-2)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          {/* Logo */}
          <Link
            href="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
          >
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "var(--color-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-text)", letterSpacing: "-0.01em" }}>
              MentorMesh
            </span>
          </Link>
        </div>

        {/* Right side icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Link
            href="/notifications"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "36px", height: "36px", borderRadius: "8px",
              color: "var(--color-muted)", position: "relative", textDecoration: "none",
              transition: "background 0.15s",
            }}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "6px", right: "6px",
                width: "8px", height: "8px",
                background: "#EF4444",
                borderRadius: "50%",
                border: "2px solid var(--color-surface)",
              }} />
            )}
          </Link>

          {user && (
            <Link href="/profile" style={{ textDecoration: "none", marginLeft: "2px" }}>
              <Avatar name={user.name} photoUrl={user.profilePhoto} size="sm" />
            </Link>
          )}
        </div>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgb(0 0 0 / 0.45)",
              animation: "mm-overlay-in 0.2s ease",
            }}
          />

          {/* Drawer panel */}
          <div
            style={{
              position: "relative",
              width: "min(280px, 85vw)",
              background: "var(--color-surface)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              zIndex: 1,
              boxShadow: "var(--shadow-xl)",
              animation: "mm-drawer-in 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {/* Drawer header */}
            <div style={{
              padding: "1rem 1rem 1rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "var(--color-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-text)" }}>MentorMesh</span>
              </div>
              <button
                onClick={closeDrawer}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: "none", background: "var(--color-surface-2)",
                  color: "var(--color-muted)", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer nav */}
            <div
              style={{ flex: 1, overflowY: "auto" }}
              onClick={closeDrawer}
            >
              <Sidebar unreadCount={unreadCount} hasNewTeams={hasNewTeams} hasNewEvents={hasNewEvents} isMobileDrawer />
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="mm-main">
        <div className="mm-content mm-page-animate">
          {isReady ? children : <ContentSkeleton />}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <BottomNav unreadCount={unreadCount} hasNewTeams={hasNewTeams} hasNewEvents={hasNewEvents} />
    </div>
  );
}
