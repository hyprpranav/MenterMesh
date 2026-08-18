"use client";

// ============================================================
// MentorMesh — Avatar v2
// ============================================================
import React, { useState } from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "mm-avatar-xs",
  sm: "mm-avatar-sm",
  md: "mm-avatar-md",
  lg: "mm-avatar-lg",
  xl: "mm-avatar-xl",
};

// Generate a consistent background color from a name string
const AVATAR_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#DC2626",
  "#D97706", "#059669", "#0891B2", "#65A30D",
];

function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: AvatarSize;
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({ name, photoUrl, size = "md", className, style }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = photoUrl && !imgError;
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div
      className={cn("mm-avatar", SIZE_CLASS[size], className)}
      style={{
        background: showImage ? "transparent" : bgColor,
        ...style,
      }}
      aria-label={name}
    >
      {showImage ? (
        <img
          src={photoUrl}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initials
      )}
    </div>
  );
}
