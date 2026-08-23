"use client";

// ============================================================
// MentorMesh — States v3 (Loading with 3D + Cat, Empty, Error)
// ============================================================
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

// ── Cat Loader Component ──────────────────────────────────────
function CatLoader() {
  return (
    <div className="mm-cat-loader">
      <div className="mm-cat">
        <div className="mm-cat-body">
          <div className="mm-cat-tail" />
        </div>
        <div className="mm-cat-paws">
          <div className="mm-cat-paw mm-cat-paw--left" />
          <div className="mm-cat-paw mm-cat-paw--right" />
        </div>
        <div className="mm-cat-head">
          <div className="mm-cat-ear mm-cat-ear--left" />
          <div className="mm-cat-ear mm-cat-ear--right" />
          <div className="mm-cat-eye mm-cat-eye--left" />
          <div className="mm-cat-eye mm-cat-eye--right" />
          <div className="mm-cat-nose" />
          <div className="mm-cat-mouth" />
          <div className="mm-cat-whiskers-l" />
          <div className="mm-cat-whiskers-r" />
        </div>
      </div>
    </div>
  );
}

// ── 3D Rotating Loader Component ──────────────────────────────
function Loader3D() {
  return (
    <div className="mm-loader-3d">
      <div className="mm-load-ring mm-load-ring-1" />
      <div className="mm-load-ring mm-load-ring-2" />
      <div className="mm-load-ring mm-load-ring-3" />
    </div>
  );
}

// ── Loading State ─────────────────────────────────────────────
interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = "Loading…", fullPage = false }: LoadingStateProps) {
  return (
    <div
      className={`mm-loading-overlay${fullPage ? " mm-loading-fullpage" : ""}`}
      style={fullPage ? {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      } : { minHeight: "200px" }}
    >
      {/* Desktop: 3D Loader */}
      <div className="mm-loading-desktop">
        <Loader3D />
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0, fontWeight: 500 }}>{message}</p>
      </div>

      {/* Mobile: Cat Loader */}
      <div className="mm-loading-mobile">
        <CatLoader />
        <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", margin: 0, fontWeight: 500 }}>{message}</p>
      </div>
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

// ── Export Cat Loader for use elsewhere ────────────────────────
export { CatLoader };
