"use client";

// ============================================================
// MentorMesh — Sidebar v2 (Desktop Navigation)
// ============================================================
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UsersRound, Calendar,
  Bell, Megaphone, BookOpen, Download, Settings,
  LogOut, UserCheck, ShieldCheck, Layers, User,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Array<"student" | "staff" | "master">;
  badgeKey?: "notifications";
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={17} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Students",
    href: "/students",
    icon: <Users size={17} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Teams",
    href: "/teams",
    icon: <UsersRound size={17} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Team Builder",
    href: "/team-builder",
    icon: <Layers size={17} />,
    roles: ["staff", "master"],
  },
  {
    label: "Events",
    href: "/events",
    icon: <Calendar size={17} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Community",
    href: "/community",
    icon: <BookOpen size={17} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Announcements",
    href: "/announcements",
    icon: <Megaphone size={17} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: <Bell size={17} />,
    roles: ["student", "staff", "master"],
    badgeKey: "notifications",
  },
  {
    label: "Export Data",
    href: "/export",
    icon: <Download size={17} />,
    roles: ["student"],
  },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    label: "Manage Students",
    href: "/admin/students",
    icon: <Users size={17} />,
    roles: ["staff", "master"],
  },
  {
    label: "Access Requests",
    href: "/admin/requests",
    icon: <UserCheck size={17} />,
    roles: ["staff", "master"],
  },
  {
    label: "Export Data",
    href: "/admin/export",
    icon: <Download size={17} />,
    roles: ["staff", "master"],
  },
  {
    label: "File Share",
    href: "/file-share",
    icon: <Download size={17} />,
    roles: ["staff", "master"],
  },
  {
    label: "Staff Management",
    href: "/admin/staff",
    icon: <ShieldCheck size={17} />,
    roles: ["master"],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: <Settings size={17} />,
    roles: ["master"],
  },
];

export function Sidebar({
  unreadCount = 0,
  isMobileDrawer = false,
}: {
  unreadCount?: number;
  isMobileDrawer?: boolean;
}) {
  const { user, logOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;
  const role = user.role;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logOut();
      success("Signed out successfully.");
      router.push("/login");
    } catch {
      error("Failed to sign out. Please try again.");
      setLoggingOut(false);
    }
  };

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const filteredAdmin = ADMIN_ITEMS.filter((item) => item.roles.includes(role));

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const roleLabel = role === "master" ? "Master" : role === "staff" ? "Staff / Faculty" : "Student";

  return (
    <aside className={isMobileDrawer ? undefined : "mm-sidebar"} style={isMobileDrawer ? { display: "flex", flexDirection: "column", height: "100%", background: "var(--color-surface)" } : undefined}>

      {/* ── Logo (desktop only — mobile has it in drawer header) ── */}
      {!isMobileDrawer && (
        <div style={{
          padding: "1.25rem 1rem 1rem",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}>
          <Link
            href="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "var(--color-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-text)", lineHeight: 1.2, margin: 0 }}>
                MentorMesh
              </p>
              <p style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "2px", fontWeight: 500 }}>
                {roleLabel}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "0.75rem 0.625rem", overflowY: "auto", overflowX: "hidden" }}>

        {/* Main nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {filteredNav.map((item) => {
            const active = isActive(item.href);
            const showBadge = item.badgeKey === "notifications" && unreadCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("mm-nav-item", active && "active")}
              >
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{item.icon}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </span>
                {showBadge && (
                  <span style={{
                    fontSize: "11px", fontWeight: 700,
                    background: "#EF4444", color: "#fff",
                    borderRadius: "999px",
                    minWidth: "18px", height: "18px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", flexShrink: 0,
                  }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin section */}
        {filteredAdmin.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <p style={{
              padding: "0 0.75rem",
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--color-placeholder)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.375rem",
            }}>
              Admin
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {filteredAdmin.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("mm-nav-item", active && "active")}
                  >
                    <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{item.icon}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── User Footer ─────────────────────────────────── */}
      <div style={{
        padding: "0.75rem 0.625rem",
        borderTop: "1px solid var(--color-border)",
        flexShrink: 0,
      }}>
        {/* Profile link */}
        <Link
          href="/profile"
          style={{
            display: "flex", alignItems: "center", gap: "0.625rem",
            padding: "0.5rem 0.75rem", borderRadius: "8px",
            textDecoration: "none", marginBottom: "2px",
            transition: "background 0.15s",
            minWidth: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-2)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Avatar name={user.name} photoUrl={user.profilePhoto} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
              {user.name}
            </p>
            <p style={{ fontSize: "11px", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
              {user.email}
            </p>
          </div>
        </Link>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mm-nav-item"
          style={{ width: "100%", color: loggingOut ? "var(--color-muted)" : "var(--red-600)" }}
          onMouseEnter={e => { if (!loggingOut) e.currentTarget.style.background = "var(--red-50)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={17} />
          <span>{loggingOut ? "Signing out…" : "Sign Out"}</span>
        </button>

        {/* Facing Issues */}
        <Link
          href="/facing-issues"
          className="mm-facing-issues-link"
          style={{ marginTop: "0.5rem" }}
        >
          <AlertTriangle size={13} />
          <span>Facing Issues?</span>
        </Link>
      </div>

      {/* ── Developer Credit ─────────────────────────────── */}
      <div className="mm-dev-credit">
        Crafted by <a href="mailto:harishpranavs259@gmail.com">HARISH PRANAV S</a>
      </div>
    </aside>
  );
}
