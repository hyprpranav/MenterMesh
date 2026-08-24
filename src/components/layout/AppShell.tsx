"use client";

// ============================================================
// MentorMesh — App Shell v2 (Mobile-First)
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { subscribeToNotifications, getAllUsers } from "@/lib/firebase/firestore";
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
  const [hasNewCommunity, setHasNewCommunity] = useState(false);
  const [birthdayPopupOpen, setBirthdayPopupOpen] = useState(false);
  const [devPhotoUrl, setDevPhotoUrl] = useState<string | null>(null);

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

  // Birthday popup — shown once per day when today === user's DOB
  useEffect(() => {
    if (!user?.dateOfBirth) return;
    try {
      const dob = new Date(user.dateOfBirth);
      if (isNaN(dob.getTime())) return;
      const today = new Date();
      const isBirthday = dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
      if (!isBirthday) return;
      const todayStr = today.toDateString();
      const lastShown = localStorage.getItem(`mm_bday_popup_${user.uid}`);
      if (lastShown !== todayStr) {
        setBirthdayPopupOpen(true);
        localStorage.setItem(`mm_bday_popup_${user.uid}`, todayStr);
      }
    } catch { /* ignore */ }
  }, [user]);

  // Fetch developer photo for birthday popup
  useEffect(() => {
    getAllUsers("master").then(masters => {
      if (masters.length > 0) {
        const dev = masters[0];
        setDevPhotoUrl((dev as any).professionalPhoto || (dev as any).profilePhoto || null);
      }
    }).catch(() => { });
  }, []);

  // Developer testing tool listener
  useEffect(() => {
    const handleTestPopup = () => setBirthdayPopupOpen(true);
    window.addEventListener('mm-test-birthday-popup', handleTestPopup);
    return () => window.removeEventListener('mm-test-birthday-popup', handleTestPopup);
  }, []);

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

    const qCommunity = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(1));
    const unsubCommunity = onSnapshot(qCommunity, (snap) => {
      if (!snap.empty) {
        const doc = snap.docs[0].data();
        if (doc.createdAt) {
          const latest = new Date(doc.createdAt).getTime();
          const lastVis = localStorage.getItem("last_visited_community");
          if (!lastVis || latest > parseInt(lastVis)) setHasNewCommunity(true);
          else setHasNewCommunity(false);
        }
      }
    });

    const handleRead = () => {
      if (window.location.pathname.startsWith("/teams")) setHasNewTeams(false);
      if (window.location.pathname.startsWith("/events")) setHasNewEvents(false);
      if (window.location.pathname.startsWith("/community")) setHasNewCommunity(false);
    };
    window.addEventListener("mentormesh_notifications_read", handleRead);

    return () => { unsub(); unsubTeams(); unsubEvents(); unsubCommunity(); window.removeEventListener("mentormesh_notifications_read", handleRead); };
  }, [user]);

  const isReady = !loading && user && (user.status === "active" || user.status === "imported");
  const unreadCount = unreadNotifs.length;

  return (
    <div className="mm-layout">
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <Sidebar unreadCount={unreadCount} hasNewTeams={hasNewTeams} hasNewEvents={hasNewEvents} hasNewCommunity={hasNewCommunity} />

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
              <Sidebar unreadCount={unreadCount} hasNewTeams={hasNewTeams} hasNewEvents={hasNewEvents} hasNewCommunity={hasNewCommunity} isMobileDrawer />
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
      <BottomNav unreadCount={unreadCount} hasNewTeams={hasNewTeams} hasNewEvents={hasNewEvents} hasNewCommunity={hasNewCommunity} />

      {/* ── Birthday Popup ────────────────────────────────── */}
      {birthdayPopupOpen && user && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            animation: "mm-fade-in 0.4s ease",
          }}
          onClick={() => setBirthdayPopupOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
              borderRadius: "28px",
              padding: "2.5rem 2rem",
              maxWidth: "440px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.3)",
              animation: "mm-slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
              overflow: "hidden",
            }}
          >
            {/* Glow decoration */}
            <div style={{ position: "absolute", top: "-40px", left: "50%", transform: "translateX(-50%)", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)", pointerEvents: "none" }} />

            {/* Developer photo */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: "1.25rem" }}>
              {devPhotoUrl ? (
                <div style={{
                  width: "88px", height: "88px", borderRadius: "50%", overflow: "hidden",
                  margin: "0 auto",
                  boxShadow: "0 0 0 4px rgba(139,92,246,0.5), 0 0 0 8px rgba(139,92,246,0.2), 0 8px 24px rgba(139,92,246,0.4)",
                }}>
                  <img src={devPhotoUrl} alt="Developer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{
                  width: "80px", height: "80px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto",
                  boxShadow: "0 0 0 4px rgba(139,92,246,0.4), 0 8px 24px rgba(139,92,246,0.3)",
                  fontSize: "2.5rem", lineHeight: 1,
                }}>
                  🎂
                </div>
              )}
              {/* Sparkles */}
              {["✨", "🎉", "⭐"].map((s, i) => (
                <span key={i} style={{
                  position: "absolute",
                  fontSize: "1.2rem",
                  top: i === 0 ? "-8px" : i === 1 ? "0" : "auto",
                  bottom: i === 2 ? "-4px" : "auto",
                  left: i === 1 ? "-16px" : "auto",
                  right: i === 0 ? "-12px" : i === 2 ? "0" : "auto",
                  animation: `mm-float 2s ease-in-out infinite ${i * 0.4}s`,
                }}>{s}</span>
              ))}
            </div>

            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
              🎊 Happy Birthday, {user.name.split(" ")[0]}! 🎊
            </p>

            <h2 style={{
              fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 900,
              background: "linear-gradient(135deg, #F8FAFC, #C4B5FD)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              lineHeight: 1.2, marginBottom: "1rem",
            }}>
              Wishing You a<br />Wonderful Day! 🌟
            </h2>

            <p style={{
              fontSize: "0.9375rem", color: "#CBD5E1", lineHeight: 1.65,
              marginBottom: "1.25rem", fontStyle: "italic",
            }}>
              "Today you are you, that is truer than true. There is no one alive who is youer than you!"
            </p>
            <p style={{ fontSize: "0.75rem", color: "#7C3AED", fontWeight: 600, marginBottom: "1.5rem" }}>— Dr. Seuss 💜</p>

            <p style={{ fontSize: "0.8125rem", color: "#94A3B8", marginBottom: "1.5rem" }}>
              With love & warm wishes from<br />
              <strong style={{ color: "#E2E8F0" }}>HARISH PRANAV S</strong>{" "}
              <span style={{ color: "#7C3AED" }}>&</span>{" "}
              <strong style={{ color: "#E2E8F0" }}>the MentorMesh Team</strong> 🧡
            </p>

            <button
              onClick={() => setBirthdayPopupOpen(false)}
              style={{
                background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                color: "#fff", fontWeight: 700, fontSize: "1rem",
                padding: "0.875rem 2.5rem", borderRadius: "50px",
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(124,58,237,0.5)",
                transition: "transform 0.15s, box-shadow 0.15s",
                width: "100%",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              Thank You! 🎂
            </button>

            <button
              onClick={() => setBirthdayPopupOpen(false)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "rgba(255,255,255,0.1)", border: "none",
                borderRadius: "8px", width: "32px", height: "32px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#94A3B8",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

