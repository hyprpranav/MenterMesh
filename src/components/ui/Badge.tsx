"use client";

// ============================================================
// MentorMesh — Badge Component
// ============================================================
import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "pending"
  | "active"
  | "approved"
  | "rejected"
  | "draft"
  | "finalized"
  | "info"
  | "warning"
  | "changes";

const variantMap: Record<BadgeVariant, string> = {
  pending:   "bg-amber-100 text-amber-800 border-amber-200",
  active:    "bg-emerald-100 text-emerald-800 border-emerald-200",
  approved:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected:  "bg-red-100 text-red-700 border-red-200",
  changes:   "bg-rose-100 text-rose-700 border-rose-200",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  finalized: "bg-blue-100 text-blue-700 border-blue-200",
  info:      "bg-cyan-100 text-cyan-700 border-cyan-200",
  warning:   "bg-amber-100 text-amber-700 border-amber-200",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "draft", children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "mm-badge border",
        variantMap[variant],
        className
      )}
    >
      {icon && <span className="mr-1 inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
