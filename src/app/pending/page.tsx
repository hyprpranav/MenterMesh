"use client";

// ============================================================
// MentorMesh — Pending Approval Page v2
// ============================================================
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Clock, LogOut, RefreshCw } from "lucide-react";

export default function PendingPage() {
  const { user, logOut, loading } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (!loading && user && user.status === "active") { router.push("/dashboard"); }
    if (!loading && user && user.status === "rejected") { router.push("/rejected"); }
    if (!loading && user && user.status === "inactive") { router.push("/inactive"); }
  }, [user, loading, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logOut(); router.push("/login"); }
    catch { setLoggingOut(false); }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "1.5rem",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "2.5rem 2rem",
        boxShadow: "var(--shadow-md)",
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: "var(--color-warning-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.25rem",
        }}>
          <Clock size={30} color="var(--color-warning)" />
        </div>

        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: "0.625rem", letterSpacing: "-0.02em" }}>
          Access Pending Review
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", lineHeight: 1.65, marginBottom: "2rem" }}>
          Your request has been received. A staff member will review your details
          and approve your access shortly. You&apos;ll receive a notification once approved.
        </p>

        {user && (
          <div style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "1rem",
            marginBottom: "1.5rem",
            textAlign: "left",
          }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
              Submitted as
            </p>
            <p style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{user.name}</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{user.email}</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Button
            variant="secondary"
            fullWidth
            icon={<RefreshCw size={16} />}
            onClick={() => window.location.reload()}
          >
            Check Status
          </Button>
          <Button
            variant="ghost"
            fullWidth
            loading={loggingOut}
            icon={<LogOut size={16} />}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
