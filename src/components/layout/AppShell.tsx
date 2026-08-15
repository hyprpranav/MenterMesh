"use client";

// ============================================================
// MentorMesh — App Shell Layout (authenticated pages)
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { subscribeToNotifications } from "@/lib/firebase/firestore";
import type { Notification } from "@/types";
import { Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

interface AppShellProps {
  children: React.ReactNode;
}

// ── Minimal content skeleton shown while auth or data is resolving ──
function ContentSkeleton() {
  return (
    <div className="mm-content-skeleton">
      <div className="mm-content-skeleton-bar h-8 w-3/4" />
      <div className="mm-content-skeleton-bar w-1/2" />
      <div className="mm-content-skeleton-bar h-32 w-full" />
      <div className="mm-content-skeleton-bar w-3/4" />
      <div className="mm-content-skeleton-bar w-1/2" />
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadNotifs, setUnreadNotifs] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const closeDrawer = useCallback(() => setMobileMenuOpen(false), []);

  // Role-based redirect
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (user.status === "pending")  { router.push("/pending"); return; }
    if (user.status === "rejected") { router.push("/rejected"); return; }
    if (user.status === "inactive") { router.push("/inactive"); return; }
  }, [user, loading, router]);

  // Real-time unread notifications
  useEffect(() => {
    if (!user || user.status !== "active") return;
    const unsub = subscribeToNotifications(user.uid, setUnreadNotifs);
    return () => unsub();
  }, [user]);

  // Determine what to render inside the content area:
  // - If auth is still loading → show skeleton (shell is still visible)
  // - If user is not active (redirecting) → show skeleton
  // - Otherwise → show actual children
  const isReady = !loading && user && user.status === "active";

  return (
    <div className="mm-layout" style={{ overflow: "clip" }}>
      {/* Desktop Sidebar */}
      <Sidebar unreadCount={unreadNotifs.length} />

      {/* Mobile Topbar */}
      <header className="mm-mobile-topbar">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-base">MentorMesh</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification icon */}
          <Link href="/notifications" className="relative p-2 text-slate-500 hover:text-slate-700">
            <Bell size={20} />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            )}
          </Link>

          {/* Profile */}
          {user && (
            <Link href="/profile">
              <Avatar name={user.name} photoUrl={user.profilePhoto} size="sm" />
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex" style={{ display: "flex" }}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={closeDrawer}
            style={{ animation: "mm-overlay-in 0.2s ease" }}
          />

          {/* Slide Drawer */}
          <div
            className="relative w-4/5 max-w-[280px] bg-white h-full flex flex-col z-10 shadow-2xl"
            style={{ animation: "mm-drawer-slide 0.25s ease" }}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-base">Menu</span>
              <button
                onClick={closeDrawer}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto" onClick={closeDrawer}>
              <Sidebar unreadCount={unreadNotifs.length} isMobileDrawer />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mm-main">
        <div className="mm-content mm-page-animate">
          {isReady ? children : <ContentSkeleton />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav unreadCount={unreadNotifs.length} />

      {/* Drawer slide animation */}
      <style jsx global>{`
        @keyframes mm-drawer-slide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
