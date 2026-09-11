"use client";

// Re-export the dedicated in-app MentorMesh Meeting Room so both
// /meet/[meetingId] and /meetings/live/[meetingId] work identically.
export { default } from "@/app/meet/[meetingId]/page";
