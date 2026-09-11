"use client";

import React from "react";

interface MentorMeshRobotProps {
  size?: number;
  className?: string;
  expression?: "happy" | "thinking" | "wink" | "neutral";
}

export function MentorMeshRobot({
  size = 40,
  className = "",
  expression = "happy",
}: MentorMeshRobotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MentorMesh AI Mascot"
    >
      <defs>
        {/* Head Gradient: Tech Blue to Indigo */}
        <linearGradient id="mmRobotHead" x1="15" y1="20" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Visor / Face screen Gradient */}
        <linearGradient id="mmRobotFace" x1="25" y1="36" x2="75" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        {/* Orange Accent Gradient */}
        <linearGradient id="mmRobotOrange" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Eye Glow Filter */}
        <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Antenna Stem */}
      <rect x="47.5" y="8" width="5" height="14" rx="2.5" fill="#94A3B8" />

      {/* Antenna Core Orb (Orange Signal Beacon) */}
      <circle cx="50" cy="8" r="6" fill="url(#mmRobotOrange)" />
      <circle cx="50" cy="8" r="3" fill="#FED7AA" />

      {/* Ear Discs (Left & Right) */}
      <rect x="10" y="42" width="7" height="20" rx="3.5" fill="url(#mmRobotOrange)" />
      <rect x="83" y="42" width="7" height="20" rx="3.5" fill="url(#mmRobotOrange)" />

      {/* Robot Main Head Shell */}
      <rect
        x="15"
        y="22"
        width="70"
        height="60"
        rx="22"
        fill="url(#mmRobotHead)"
        stroke="#FFFFFF"
        strokeWidth="2.5"
      />

      {/* Head Highlight */}
      <path
        d="M 26 28 C 36 24, 64 24, 74 28"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Visor Screen */}
      <rect
        x="23"
        y="35"
        width="54"
        height="36"
        rx="14"
        fill="url(#mmRobotFace)"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Eyes & Smile according to expression */}
      {expression === "wink" ? (
        <>
          {/* Left Eye: Open */}
          <circle cx="39" cy="51" r="5" fill="#38BDF8" filter="url(#eyeGlow)" />
          <circle cx="37.5" cy="49.5" r="1.5" fill="#FFFFFF" />
          {/* Right Eye: Wink */}
          <path
            d="M 57 52 Q 62 47 67 52"
            stroke="#38BDF8"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#eyeGlow)"
          />
        </>
      ) : expression === "thinking" ? (
        <>
          <circle cx="40" cy="48" r="5" fill="#FBBF24" filter="url(#eyeGlow)" />
          <circle cx="60" cy="48" r="5" fill="#FBBF24" filter="url(#eyeGlow)" />
          <path
            d="M 44 61 L 56 61"
            stroke="#FBBF24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Happy Eyes */}
          <circle cx="40" cy="51" r="5" fill="#38BDF8" filter="url(#eyeGlow)" />
          <circle cx="38.5" cy="49.5" r="1.8" fill="#FFFFFF" />
          <circle cx="60" cy="51" r="5" fill="#38BDF8" filter="url(#eyeGlow)" />
          <circle cx="58.5" cy="49.5" r="1.8" fill="#FFFFFF" />

          {/* Friendly Smile */}
          <path
            d="M 44 60 Q 50 66 56 60"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            filter="url(#eyeGlow)"
          />
        </>
      )}

      {/* Cheek Glows */}
      <circle cx="31" cy="57" r="2.5" fill="rgba(249,115,22,0.6)" />
      <circle cx="69" cy="57" r="2.5" fill="rgba(249,115,22,0.6)" />

      {/* Neck Collar */}
      <path
        d="M 38 82 L 62 82 L 58 90 L 42 90 Z"
        fill="#94A3B8"
        stroke="#64748B"
        strokeWidth="1"
      />
    </svg>
  );
}
