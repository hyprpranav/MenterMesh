"use client";

// ============================================================
// MentorMesh — States v2 (Loading, Empty, Error)
// ============================================================
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

// ── Loading State ─────────────────────────────────────────────
interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = "Loading…", fullPage = false }: LoadingStateProps) {
  return (
    <div
      className="mm-empty"
      style={fullPage ? { minHeight: "60vh" } : undefined}
    >
      <div className="mm-spinner mm-spinner-lg" />
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0 }}>{message}</p>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mm-empty">
      {icon && (
        <div className="mm-empty-icon">
          {icon}
        </div>
      )}
      <p className="mm-empty-title">{title}</p>
      {description && <p className="mm-empty-desc">{description}</p>}
      {action && (
        <Button
          variant={action.variant ?? "primary"}
          size="sm"
          onClick={action.onClick}
          style={{ marginTop: "0.25rem" }}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="mm-empty">
      <div className="mm-empty-icon" style={{ background: "var(--color-danger-bg)" }}>
        <AlertCircle size={24} color="var(--color-danger)" />
      </div>
      <p className="mm-empty-title">{title}</p>
      <p className="mm-empty-desc">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: "0.25rem" }}>
          Try Again
        </Button>
      )}
    </div>
  );
}
