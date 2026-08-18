"use client";

// ============================================================
// MentorMesh — ToastProvider v2
// ============================================================
import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error:   (message: string) => void;
  warning: (message: string) => void;
  info:    (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle   size={16} />,
  error:   <XCircle       size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info          size={16} />,
};

const TOAST_CLASS: Record<ToastType, string> = {
  success: "mm-toast-success",
  error:   "mm-toast-error",
  warning: "mm-toast-warning",
  info:    "mm-toast-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => {
      // Max 3 visible
      const next = [...prev.slice(-2), { id, type, message }];
      return next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (m) => addToast("success", m),
    error:   (m) => addToast("error",   m),
    warning: (m) => addToast("warning", m),
    info:    (m) => addToast("info",    m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="mm-toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn("mm-toast", TOAST_CLASS[toast.type])}>
            <span className="mm-toast-icon">{TOAST_ICONS[toast.type]}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
            <button
              className="mm-toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
