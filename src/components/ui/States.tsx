"use client";

// ============================================================
// MentorMesh — Empty State, Loading State, Error State
// ============================================================
import React from "react";
import { Button } from "./Button";

// ─── Empty State ─────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mm-empty py-12 px-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3 shrink-0">
        {icon}
      </div>
      <p className="font-bold text-slate-900 text-base">{title}</p>
      {description && <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>}
      {action && (
        <div className="mt-4">
          <Button variant="primary" size="sm" icon={action.icon} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}


// ─── Loading State ────────────────────────────────────────────
interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message, fullPage = false }: LoadingStateProps) {
  return (
    <div className="mm-content-skeleton" style={fullPage ? { minHeight: "60vh", justifyContent: "center" } : undefined}>
      <div className="mm-content-skeleton-bar h-8 w-3/4" />
      <div className="mm-content-skeleton-bar w-1/2" />
      <div className="mm-content-skeleton-bar h-32 w-full" />
      <div className="mm-content-skeleton-bar w-3/4" />
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  retry,
}: ErrorStateProps) {
  return (
    <div className="mm-empty">
      <div className="text-red-300 mb-3">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="mm-empty-title text-red-600">{title}</p>
      <p className="mm-empty-desc">{message}</p>
      {retry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page Loading (minimal splash — only for root redirect) ──
export function PageLoading() {
  return (
    <div className="mm-splash">
      <div className="mm-splash-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
    </div>
  );
}

// ─── Offline Banner ───────────────────────────────────────────
export function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-sm font-medium text-center">
      You&apos;re offline. Some actions may be unavailable until your connection returns.
    </div>
  );
}
