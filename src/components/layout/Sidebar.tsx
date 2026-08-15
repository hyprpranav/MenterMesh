"use client";

// ============================================================
// MentorMesh — App Sidebar (Desktop)
// ============================================================
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UsersRound, Calendar, Bell,
  Megaphone, BookOpen, Download, Settings, LogOut,
  ChevronDown, UserCheck, ShieldCheck, Layers,
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
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Students",
    href: "/students",
    icon: <Users size={18} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Teams",
    href: "/teams",
    icon: <UsersRound size={18} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Team Builder",
    href: "/team-builder",
    icon: <Layers size={18} />,
    roles: ["staff", "master"],
  },
  {
    label: "Events",
    href: "/events",
    icon: <Calendar size={18} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Community",
    href: "/community",
    icon: <BookOpen size={18} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Announcements",
    href: "/announcements",
    icon: <Megaphone size={18} />,
    roles: ["student", "staff", "master"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: <Bell size={18} />,
    roles: ["student", "staff", "master"],
  },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    label: "Manage Students",
    href: "/admin/students",
    icon: <Users size={18} />,
    roles: ["staff", "master"],
  },
  {
    label: "Access Requests",
    href: "/admin/requests",
    icon: <UserCheck size={18} />,
    roles: ["staff", "master"],
  },
  {
    label: "Export Data",
    href: "/admin/export",
    icon: <Download size={18} />,
    roles: ["staff", "master"],
  },
  {
    label: "Staff Management",
    href: "/admin/staff",
    icon: <ShieldCheck size={18} />,
    roles: ["master"],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: <Settings size={18} />,
    roles: ["master"],
  },
];

export function Sidebar({ unreadCount = 0, isMobileDrawer = false }: { unreadCount?: number; isMobileDrawer?: boolean }) {
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

  return (
    <aside className={isMobileDrawer ? "w-full h-full flex flex-col bg-white overflow-y-auto" : "mm-sidebar"}>

      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-base leading-none">MentorMesh</p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{role}</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const isNotif = item.href === "/notifications";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("mm-nav-item", isActive && "active")}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {isNotif && unreadCount > 0 && (
                  <span className="text-xs font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin section */}
        {filteredAdmin.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Admin
            </p>
            <div className="space-y-0.5">
              {filteredAdmin.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("mm-nav-item", isActive && "active")}
                  >
                    {item.icon}
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-slate-200">
        <Link href="/profile" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors no-underline mb-1">
          <Avatar name={user.name} photoUrl={user.profilePhoto} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mm-nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
          <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
        </button>
      </div>
    </aside>
  );
}
