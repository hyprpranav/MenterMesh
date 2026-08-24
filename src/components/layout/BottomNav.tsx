"use client";

// ============================================================
// MentorMesh — Bottom Navigation v2 (Mobile)
// ============================================================
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UsersRound, Calendar,
  Bell, Megaphone, BookOpen, MoreHorizontal, X,
  UserCheck, Download, Settings, ShieldCheck, Layers,
  User, Presentation,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/students", icon: Users },
  { label: "Teams", href: "/teams", icon: UsersRound },
  { label: "Events", href: "/events", icon: Calendar },
];

const MORE_NAV = [
  { label: "Profile", href: "/profile", icon: User, roles: ["student", "staff", "master"] },
  { label: "Meetings", href: "/meetings", icon: Presentation, roles: ["student", "staff", "master"] },
  { label: "Community", href: "/community", icon: BookOpen, roles: ["student", "staff", "master"] },
  { label: "Announcements", href: "/announcements", icon: Megaphone, roles: ["student", "staff", "master"] },
  { label: "Notifications", href: "/notifications", icon: Bell, roles: ["student", "staff", "master"] },
  { label: "Team Builder", href: "/team-builder", icon: Layers, roles: ["staff", "master"] },
  { label: "Manage Students", href: "/admin/students", icon: Users, roles: ["staff", "master"] },
  { label: "Access Requests", href: "/admin/requests", icon: UserCheck, roles: ["staff", "master"] },
  { label: "Export Data", href: "/admin/export", icon: Download, roles: ["staff", "master"] },
  { label: "Staff Mgmt", href: "/admin/staff", icon: ShieldCheck, roles: ["master"] },
  { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["master"] },
];

export function BottomNav({
  unreadCount = 0,
  hasNewTeams = false,
  hasNewEvents = false,
  hasNewCommunity = false,
}: {
  unreadCount?: number;
  hasNewTeams?: boolean;
  hasNewEvents?: boolean;
  hasNewCommunity?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!user) return null;
  const role = user.role;

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const filteredMore = MORE_NAV.filter(item =>
    (item.roles as string[]).includes(role)
  );

  const moreIsActive = filteredMore.some(item => isActive(item.href));

  return (
    <>
      <nav className="mm-bottom-nav">
        <div className="mm-bottom-nav-items">
          {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            const showRedDot = (label === "Teams" && hasNewTeams) || (label === "Events" && hasNewEvents) || (label === "Community" && hasNewCommunity);
            return (
              <Link
                key={href}
                href={href}
                className={cn("mm-bottom-nav-item", active && "active")}
                aria-label={label}
                style={{ position: "relative" }}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
                {showRedDot && !active && (
                  <span style={{
                    position: "absolute", top: "10px", right: "20px", // adjust based on icon size
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: "#EF4444", border: "1.5px solid var(--color-surface)",
                  }} />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn("mm-bottom-nav-item", moreIsActive && "active")}
            aria-label="More options"
          >
            {unreadCount > 0 ? (
              <span style={{ position: "relative", display: "flex" }}>
                <Bell size={22} strokeWidth={2} />
                <span style={{
                  position: "absolute", top: "-2px", right: "-4px",
                  width: "8px", height: "8px",
                  background: "#EF4444", borderRadius: "50%",
                  border: "1.5px solid var(--color-surface)",
                }} />
              </span>
            ) : (
              <MoreHorizontal size={22} strokeWidth={2} />
            )}
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ── "More" Bottom Sheet ─────────────────────────── */}
      {moreOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 70,
            display: "flex", alignItems: "flex-end",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMoreOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgb(0 0 0 / 0.4)",
              animation: "mm-fade-in 0.2s ease",
            }}
          />

          {/* Sheet */}
          <div
            style={{
              position: "relative", width: "100%",
              background: "var(--color-surface)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "var(--shadow-xl)",
              animation: "mm-slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
              zIndex: 1,
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              maxHeight: "80dvh",
              overflowY: "auto",
            }}
          >
            {/* Sheet handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0.75rem 0 0.25rem" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "99px", background: "var(--color-border-strong)" }} />
            </div>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.5rem 1.25rem 0.75rem",
            }}>
              <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-text)" }}>More</p>
              <button
                onClick={() => setMoreOpen(false)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: "none", background: "var(--color-surface-2)",
                  color: "var(--color-muted)", cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav items */}
            <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "2px" }}>
              {filteredMore.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                const isNotif = href === "/notifications";
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.75rem 0.875rem",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontWeight: active ? 600 : 500,
                      fontSize: "15px",
                      color: active ? "var(--color-primary)" : "var(--color-text-2)",
                      background: active ? "var(--color-primary-light)" : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {isNotif && unreadCount > 0 && (
                      <span style={{
                        fontSize: "11px", fontWeight: 700,
                        background: "#EF4444", color: "#fff",
                        borderRadius: "999px",
                        minWidth: "20px", height: "20px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 5px",
                      }}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
