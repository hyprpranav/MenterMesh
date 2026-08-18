"use client";

// ============================================================
// MentorMesh — Login Page v2
// ============================================================
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, LogIn, Users, Star, Zap, Shield, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { firebaseErrorToMessage } from "@/lib/utils";

const schema = z.object({
  email:    z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: Users,  text: "Centralized student & mentor hub" },
  { icon: Star,   text: "Smart team building & project tracking" },
  { icon: Zap,    text: "Real-time announcements & community" },
  { icon: Shield, text: "Secure role-based access control" },
];

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && user) {
      if (user.status === "pending")  { router.push("/pending");   return; }
      if (user.status === "rejected") { router.push("/rejected");  return; }
      if (user.status === "inactive") { router.push("/inactive");  return; }
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const onSubmit = async (data: FormData) => {
    setAuthError("");
    try {
      await signIn(data.email, data.password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || "";
      setAuthError(firebaseErrorToMessage(code));
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      background: "var(--color-bg)",
    }}>
      {/* ── Left Brand Panel (desktop only) ──────────────── */}
      <div style={{
        display: "none",
        flex: "0 0 420px",
        background: "linear-gradient(145deg, var(--blue-600) 0%, var(--blue-800) 100%)",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem 2.5rem",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
      className="mm-hide-mobile"
      id="login-brand-panel"
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "rgb(255 255 255 / 0.06)" }} />
        <div style={{ position: "absolute", bottom: "80px", left: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: "rgb(255 255 255 / 0.04)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "rgb(255 255 255 / 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.02em" }}>MentorMesh</span>
        </div>

        {/* Hero text */}
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "1rem", color: "#fff" }}>
            One Mentor.<br />Every Journey.
          </h2>
          <p style={{ fontSize: "1rem", color: "rgb(255 255 255 / 0.75)", lineHeight: 1.65, marginBottom: "2rem" }}>
            The centralized hub connecting mentors and students — from team building to hackathon glory.
          </p>

          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "rgb(255 255 255 / 0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={14} />
                </div>
                <span style={{ fontSize: "0.875rem", color: "rgb(255 255 255 / 0.85)" }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p style={{ fontSize: "0.8125rem", color: "rgb(255 255 255 / 0.5)", position: "relative" }}>
          MentorMesh · FORUS · {new Date().getFullYear()}
        </p>
      </div>

      {/* ── Right Form Panel ─────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        minHeight: "100dvh",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Mobile logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2rem", justifyContent: "center" }}
            className="mm-hide-desktop"
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "var(--color-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: "18px", color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              MentorMesh
            </span>
          </div>

          {/* Form card */}
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            padding: "2rem",
            boxShadow: "var(--shadow-md)",
          }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                Welcome back
              </h1>
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                Sign in to your MentorMesh account
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Auth error */}
              {authError && (
                <div role="alert" style={{
                  display: "flex", alignItems: "flex-start", gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--red-100)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-danger)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                  {authError}
                </div>
              )}

              {/* Email */}
              <div className="mm-field">
                <label htmlFor="login-email" className="mm-label">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className={`mm-input${errors.email ? " error" : ""}`}
                  placeholder="you@example.com"
                  {...register("email")}
                />
                {errors.email && <p className="mm-field-error">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="mm-field">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label htmlFor="login-password" className="mm-label">Password</label>
                  <Link href="/forgot-password" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-primary)" }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    id="login-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className={`mm-input${errors.password ? " error" : ""}`}
                    placeholder="Enter your password"
                    style={{ paddingRight: "2.75rem" }}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: "absolute", right: "0.75rem", top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      color: "var(--color-placeholder)", cursor: "pointer",
                      display: "flex", alignItems: "center",
                    }}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.password && <p className="mm-field-error">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={isSubmitting}
                icon={<LogIn size={17} />}
              >
                Sign In
              </Button>
            </form>

            <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--color-muted)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                Request Access
              </Link>
            </p>
          </div>

          <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "var(--color-placeholder)" }}>
            MentorMesh · FORUS · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
