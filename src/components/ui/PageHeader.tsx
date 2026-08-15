"use client";

// ============================================================
// MentorMesh — PageHeader Component
// ============================================================
import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Icon element — e.g. <Users size={22} /> */
  icon?: React.ReactNode;
  /** Icon background color class e.g. "bg-blue-100 text-blue-600" */
  iconClass?: string;
  title: string;
  subtitle?: string;
  /** Right-side action buttons */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon,
  iconClass = "bg-blue-100 text-blue-600",
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
    >
      {/* Left: icon + text */}
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              iconClass
            )}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className="mm-page-title">{title}</h1>
          {subtitle && <p className="mm-page-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
