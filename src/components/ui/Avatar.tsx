"use client";

// ============================================================
// MentorMesh — Avatar Component
// ============================================================
import React from "react";
import Image from "next/image";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm:  "mm-avatar-sm",
  md:  "mm-avatar-md",
  lg:  "mm-avatar-lg",
  xl:  "mm-avatar-xl",
  "2xl": "mm-avatar-2xl",
};

const sizePx: Record<AvatarSize, number> = {
  sm: 32, md: 40, lg: 56, xl: 80, "2xl": 112,
};

export function Avatar({ name, photoUrl, size = "md", className }: AvatarProps) {
  const color = getAvatarColor(name);
  const initials = getInitials(name);
  const px = sizePx[size];

  if (photoUrl) {
    return (
      <div className={cn("mm-avatar", sizeClasses[size], className)}>
        <Image
          src={photoUrl}
          alt={name}
          width={px}
          height={px}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn("mm-avatar", sizeClasses[size], color, className)} aria-label={name}>
      {initials}
    </div>
  );
}
