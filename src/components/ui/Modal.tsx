"use client";

// ============================================================
// MentorMesh — Modal v2
// ============================================================
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "",
  md: "",
  lg: "mm-modal-lg",
  xl: "mm-modal-xl",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  /** If true, the modal header title is rendered as a large centered element */
  centered?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  centered = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !mounted) return null;

  const content = (
    <div
      className="mm-overlay"
      onClick={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <div className={cn("mm-modal", SIZE_CLASS[size])}>
        {/* Header */}
        {(title !== undefined || description !== undefined) && (
          <div className="mm-modal-header" style={description ? { alignItems: "flex-start" } : undefined}>
            {centered ? (
              <div style={{ width: "100%", textAlign: "center" }}>
                <p className="mm-modal-title">{title}</p>
                {description && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "4px" }}>{description}</p>}
              </div>
            ) : (
              <div>
                <p className="mm-modal-title">{title}</p>
                {description && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "4px" }}>{description}</p>}
              </div>
            )}
            <button
              onClick={onClose}
              className="mm-modal-close"
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="mm-modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mm-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
