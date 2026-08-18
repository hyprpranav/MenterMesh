"use client";

// ============================================================
// MentorMesh — Account Inactive Page v2
// ============================================================
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { AlertCircle, LogOut } from "lucide-react";

export default function InactivePage() {
  const { logOut } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logOut();
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
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
          background: "var(--color-surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.25rem",
        }}>
          <AlertCircle size={30} color="var(--color-muted)" />
        </div>

        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: "0.625rem", letterSpacing: "-0.02em" }}>
          Account Inactive
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", lineHeight: 1.65, marginBottom: "1.75rem" }}>
          Your MentorMesh account has been deactivated by the system administrator. Please contact your mentor or coordinator if you need access restored.
        </p>

        <Button
          variant="primary"
          fullWidth
          loading={loggingOut}
          icon={<LogOut size={16} />}
          onClick={handleLogout}
        >
          Return to Sign In
        </Button>
      </div>
    </div>
  );
}
