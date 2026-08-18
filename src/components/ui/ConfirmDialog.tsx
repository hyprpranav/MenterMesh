"use client";

// ============================================================
// MentorMesh — ConfirmDialog v2
// ============================================================
import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const handleClose = onClose ?? onCancel ?? (() => {});

  return (
    <Modal open={open} onClose={handleClose} size="sm" closeOnBackdrop={!loading}>
      <div style={{ textAlign: "center" }}>
        {/* Icon */}
        <div
          className="mm-confirm-icon"
          style={{
            background: variant === "danger" ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
          }}
        >
          {variant === "danger" ? (
            <Trash2 size={22} color="var(--color-danger)" />
          ) : (
            <AlertTriangle size={22} color="var(--color-warning)" />
          )}
        </div>

        <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "0.5rem" }}>{title}</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
