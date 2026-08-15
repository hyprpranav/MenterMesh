// ============================================================
// MentorMesh — Utility Functions
// ============================================================
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Tailwind class merger ───────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Format date for display ─────────────────────────────────
export function formatDate(isoString: string, options?: Intl.DateTimeFormatOptions): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(isoString);
}

// ─── Copy to clipboard ───────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand("copy");
      document.body.removeChild(textarea);
      return result;
    }
  } catch {
    return false;
  }
}

// ─── Get initials from name ──────────────────────────────────
export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// ─── Debounce ────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Normalize string for search ────────────────────────────
export function normalizeForSearch(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

// ─── Generate avatar color from name ────────────────────────
export function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ─── Year options ────────────────────────────────────────────
export const YEAR_OPTIONS = [
  { value: "I", label: "I Year" },
  { value: "II", label: "II Year" },
  { value: "III", label: "III Year" },
  { value: "IV", label: "IV Year" },
];

// ─── Default settings ────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  appName: "MentorMesh",
  tagline: "One Mentor. One Community. Every Team. Every Journey.",
  mentorName: "",
  department: "",
  academicYear: "2025-26",
  eventTypes: [
    "Hackathon",
    "Designathon",
    "Project Expo",
    "Workshop",
    "Competition",
    "Bootcamp",
    "Internship",
    "Symposium",
    "Seminar",
    "Other",
  ],
  departments: ["ECE", "CSE", "EEE", "MECH", "CIVIL", "IT"],
  sections: ["A", "B", "C", "D"],
  years: ["I", "II", "III", "IV"],
  allowStudentTeamCreation: true,
  allowStudentPostCreation: true,
  maxTeamSize: 5,
};

// ─── Firebase error to human message ────────────────────────
export function firebaseErrorToMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/user-disabled": "This account has been disabled.",
    "permission-denied": "You don't have permission to perform this action.",
    "not-found": "The requested record was not found.",
    "already-exists": "This record already exists.",
    "unavailable": "Service temporarily unavailable. Please try again.",
  };
  return map[code] || "An unexpected error occurred. Please try again.";
}

// ─── Truncate text ───────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

// ─── Shuffle array (Fisher-Yates) ────────────────────────────
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Distribute students across teams evenly ─────────────────
export function distributeEvenly<T>(items: T[], numGroups: number): T[][] {
  const groups: T[][] = Array.from({ length: numGroups }, () => []);
  items.forEach((item, i) => {
    groups[i % numGroups].push(item);
  });
  return groups;
}
