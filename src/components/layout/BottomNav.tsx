"use client";

// ============================================================
// MentorMesh — Mobile Bottom Navigation
// ============================================================
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UsersRound, Calendar, Bell, BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Array<"student" | "staff" | "master">;
}

const MOBILE_NAV: MobileNavItem[] = [
  { label: "Home",       href: "/dashboard",    icon: <LayoutDashboard size={22} />, roles: ["student", "staff", "master"] },
  { label: "Students",   href: "/students",     icon: <Users size={22} />,           roles: ["student", "staff", "master"] },
  { label: "Teams",      href: "/teams",        icon: <UsersRound size={22} />,      roles: ["student", "staff", "master"] },
  { label: "Events",     href: "/events",       icon: <Calendar size={22} />,        roles: ["student", "staff", "master"] },
  { label: "Community",  href: "/community",    icon: <BookOpen size={22} />,        roles: ["student", "staff", "master"] },
];

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const items = MOBILE_NAV.filter((i) => i.roles.includes(user.role));

  return (
    <nav className="mm-bottom-nav" aria-label="Mobile navigation">
      <div className="mm-bottom-nav-items">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mm-bottom-nav-item", isActive && "active")}
              aria-label={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
