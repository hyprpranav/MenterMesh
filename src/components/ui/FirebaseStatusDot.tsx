"use client";

// ============================================================
// MentorMesh — Firebase Status Indicator Dot
// Shows real-time Firebase connection status on every page
// ============================================================
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";

type Status = "connecting" | "connected" | "slow" | "error";

function useFirebaseStatus(): Status {
  const [status, setStatus] = useState<Status>("connecting");
  const mountedRef = useRef(true);

  const check = async () => {
    if (!mountedRef.current) return;

    // No internet → immediate red
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("error");
      return;
    }

    setStatus("connecting");

    const startTime = Date.now();
    const timeoutMs = 6000;

    try {
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      );

      const firestorePromise = getDoc(doc(db, "_mm_health", "ping"));
      const result = await Promise.race([firestorePromise, timeoutPromise]);

      if (!mountedRef.current) return;

      if (result === null) {
        // Timed out
        setStatus("slow");
      } else {
        const elapsed = Date.now() - startTime;
        setStatus(elapsed > 3500 ? "slow" : "connected");
      }
    } catch {
      if (mountedRef.current) setStatus("error");
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    check();

    // Re-check every 45 seconds
    const interval = setInterval(check, 45000);

    const handleOnline  = () => check();
    const handleOffline = () => { if (mountedRef.current) setStatus("error"); };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}

// ── Status config (inline styles — no Tailwind dependency) ───
const STATUS_CONFIG: Record<Status, { color: string; ring: string; label: string; pulse: boolean }> = {
  connecting: {
    color: "#f59e0b",   // amber
    ring: "rgba(245, 158, 11, 0.3)",
    label: "Connecting to Firebase…",
    pulse: true,
  },
  connected: {
    color: "#10b981",   // emerald-500
    ring: "rgba(16, 185, 129, 0.3)",
    label: "Firebase connected · All systems live",
    pulse: false,
  },
  slow: {
    color: "#f97316",   // orange-500
    ring: "rgba(249, 115, 22, 0.3)",
    label: "Firebase responding slowly · Check your connection",
    pulse: true,
  },
  error: {
    color: "#ef4444",   // red-500
    ring: "rgba(239, 68, 68, 0.3)",
    label: "Firebase unreachable · Data may not sync",
    pulse: false,
  },
};

export function FirebaseStatusDot() {
  const status = useFirebaseStatus();
  const cfg    = STATUS_CONFIG[status];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="firebase-status-dot"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={cfg.label}
    >
      {/* Tooltip */}
      {hovered && (
        <div className="firebase-status-tooltip">
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: cfg.color,
              marginRight: 6,
              flexShrink: 0,
            }}
          />
          {cfg.label}
        </div>
      )}

      {/* Dot with optional pulse ring */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Outer pulse ring (only when connecting or slow) */}
        {cfg.pulse && (
          <span
            style={{
              position: "absolute",
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: cfg.color,
              opacity: 0.45,
              animation: "mm-ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite",
            }}
          />
        )}
        {/* Core dot */}
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: cfg.color,
            boxShadow: `0 0 0 2.5px ${cfg.ring}, 0 1px 3px rgba(0,0,0,0.12)`,
          }}
        />
      </div>

      {/* Ping animation keyframes */}
      <style jsx>{`
        @keyframes mm-ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
