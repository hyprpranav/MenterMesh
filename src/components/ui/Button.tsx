"use client";

// ============================================================
// MentorMesh — Button v2
// ============================================================
import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary" | "secondary" | "ghost" | "danger"
  | "destructive" | "outline" | "success";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:     "mm-btn-primary",
  secondary:   "mm-btn-secondary",
  ghost:       "mm-btn-ghost",
  danger:      "mm-btn-danger",
  destructive: "mm-btn-danger",
  outline:     "mm-btn-outline",
  success:     "mm-btn-success",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "mm-btn-sm",
  md: "mm-btn-md",
  lg: "mm-btn-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={cn(
        "mm-btn",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 14 : size === "lg" ? 18 : 16} className="animate-spin" style={{ flexShrink: 0 }} />
      ) : icon ? (
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{icon}</span>
      ) : null}

      {children && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {children}
        </span>
      )}

      {iconRight && !loading && (
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{iconRight}</span>
      )}
    </button>
  );
}
