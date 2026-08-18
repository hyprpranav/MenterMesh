"use client";

// ============================================================
// MentorMesh — Badge v2
// ============================================================
import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "pending"
  | "approved"
  | "rejected"
  | "draft"
  | "finalized"
  | "active"
  | "changes";

export interface BadgeProps {
  variant?: BadgeVariant | string;
  children?: React.ReactNode;
  label?: string;
  className?: string;
  icon?: React.ReactNode;
}

const VARIANT_CLASS: Record<string, string> = {
  default:   "mm-badge-default",
  primary:   "mm-badge-primary",
  success:   "mm-badge-success",
  warning:   "mm-badge-warning",
  danger:    "mm-badge-danger",
  info:      "mm-badge-info",
  // Aliases for convenience
  pending:   "mm-badge-warning",
  changes:   "mm-badge-warning",
  approved:  "mm-badge-success",
  active:    "mm-badge-primary",
  finalized: "mm-badge-success",
  rejected:  "mm-badge-danger",
  draft:     "mm-badge-default",
};

export function Badge({ variant = "default", children, label, className, icon }: BadgeProps) {
  const resolvedClass = VARIANT_CLASS[variant] || "mm-badge-default";
  const content = children ?? label;

  return (
    <span className={cn("mm-badge", resolvedClass, className)}>
      {icon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
      {content}
    </span>
  );
}

// ─── Helpers to map status → variant ─────────────────────────
export function eventSubmissionBadge(status?: string): { variant: BadgeVariant; label: string } {
  switch (status) {
    case "approved":          return { variant: "success", label: "Approved" };
    case "pending_review":    return { variant: "warning", label: "Pending Review" };
    case "changes_requested": return { variant: "warning", label: "Changes Requested" };
    case "rejected":          return { variant: "danger",  label: "Rejected" };
    case "draft":             return { variant: "default", label: "Draft" };
    default:                  return { variant: "default", label: "Draft" };
  }
}

export function teamStatusBadge(status?: string): { variant: BadgeVariant; label: string } {
  switch (status) {
    case "approved":         return { variant: "success", label: "Approved" };
    case "active":           return { variant: "primary", label: "Active" };
    case "finalized":        return { variant: "success", label: "Finalized" };
    case "pending_approval": return { variant: "warning", label: "Pending Approval" };
    case "rejected":         return { variant: "danger",  label: "Rejected" };
    case "archived":         return { variant: "default", label: "Archived" };
    case "draft":            return { variant: "default", label: "Draft" };
    default:                 return { variant: "default", label: status || "Unknown" };
  }
}

export function userRoleBadge(role?: string): { variant: BadgeVariant; label: string } {
  switch (role) {
    case "master":  return { variant: "danger",  label: "Master" };
    case "staff":   return { variant: "primary", label: "Staff" };
    case "student": return { variant: "success", label: "Student" };
    default:        return { variant: "default", label: role || "Unknown" };
  }
}

export function requestStatusBadge(status?: string): { variant: BadgeVariant; label: string } {
  switch (status) {
    case "approved": return { variant: "success", label: "Approved" };
    case "rejected": return { variant: "danger",  label: "Rejected" };
    case "pending":  return { variant: "warning", label: "Pending" };
    default:         return { variant: "default", label: status || "Unknown" };
  }
}
