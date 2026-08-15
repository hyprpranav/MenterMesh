"use client";

// ============================================================
// MentorMesh — CopyButton Component
// ============================================================
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "./ToastProvider";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { success, error } = useToast();

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      success(label ? `${label} copied.` : "Copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } else {
      error("Unable to copy. Please copy manually.");
    }
  };

  return (
    <button
      className={`mm-copy-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      aria-label={`Copy ${label || "value"}`}
      title={`Copy ${label || ""}`}
    >
      {copied ? (
        <>
          <Check size={12} />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
