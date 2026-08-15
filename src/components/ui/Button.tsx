"use client";

// ============================================================
// MentorMesh — Button Component
// ============================================================
import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "destructive"
  | "outline"
  | "success";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-sm",
  secondary:
    "bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-400 disabled:opacity-50 border border-slate-300",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 border border-transparent hover:border-slate-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50 shadow-sm",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50 shadow-sm",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 shadow-sm",
  outline:
    "bg-white border-2 border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 disabled:opacity-50 shadow-xs",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5 h-8 min-w-[64px]",
  md: "px-4 py-2 text-sm gap-2 h-10 min-w-[80px]",
  lg: "px-5 py-2.5 text-base gap-2 h-11 min-w-[100px]",
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
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        (disabled || loading) && "pointer-events-none",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2
          size={size === "sm" ? 14 : size === "lg" ? 18 : 16}
          className="animate-spin shrink-0"
        />
      ) : icon ? (
        <span className="shrink-0 flex items-center justify-center leading-none">
          {icon}
        </span>
      ) : null}
      {children && <span className="truncate">{children}</span>}
      {iconRight && !loading && (
        <span className="shrink-0 flex items-center justify-center leading-none">
          {iconRight}
        </span>
      )}
    </button>
  );
}

