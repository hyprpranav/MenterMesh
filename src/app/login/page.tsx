"use client";

// ============================================================
// MentorMesh — Login Page (Premium Redesign)
// ============================================================
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, LogIn, Users, Star, Zap, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { firebaseErrorToMessage } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: Users, text: "Centralized student & mentor management" },
  { icon: Star, text: "Smart team building & project tracking" },
  { icon: Zap, text: "Real-time announcements & community" },
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
      if (user.status === "pending") { router.push("/pending"); return; }
      if (user.status === "rejected") { router.push("/rejected"); return; }
      if (user.status === "inactive") { router.push("/inactive"); return; }
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
    <div className="auth-root">
      {/* ── Left Panel — Brand / Hero ─────────────────── */}
      <div className="auth-hero">
        <div className="auth-hero-bg" aria-hidden="true">
          <div className="auth-blob auth-blob-1" />
          <div className="auth-blob auth-blob-2" />
          <div className="auth-blob auth-blob-3" />
        </div>

        <div className="auth-hero-content">
          {/* Logo */}
          <div className="auth-brand">
            <div className="auth-logo-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="auth-brand-name">MentorMesh</span>
          </div>

          <div className="auth-hero-text">
            <h2 className="auth-hero-title">
              One Mentor.<br />Every Journey.
            </h2>
            <p className="auth-hero-desc">
              The centralized hub that connects mentors and students — from team building to hackathon glory.
            </p>
          </div>

          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Icon size={15} />
                </div>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="auth-hero-footer">
            <p className="auth-hero-quote">
              &ldquo;Built for FORUS — empowering every student&rsquo;s potential.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          {/* Mobile logo */}
          <div className="auth-mobile-brand">
            <div className="auth-logo-box auth-logo-box-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="auth-brand-name">MentorMesh</span>
          </div>

          <div className="auth-form-header">
            <h1 className="auth-form-title">Welcome back</h1>
            <p className="auth-form-subtitle">Sign in to your MentorMesh account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
            {authError && (
              <div className="auth-alert auth-alert-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {authError}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`auth-input${errors.email ? " auth-input-error" : ""}`}
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password" className="auth-label">Password</label>
                <Link href="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
              </div>
              <div className="auth-input-group">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  className={`auth-input auth-input-with-addon${errors.password ? " auth-input-error" : ""}`}
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="auth-input-addon"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={isSubmitting}
              icon={<LogIn size={17} />}
              className="auth-submit-btn"
            >
              Sign In
            </Button>
          </form>

          <p className="auth-switch-text">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="auth-switch-link">Request Access</Link>
          </p>

          <p className="auth-copyright">MentorMesh · {new Date().getFullYear()} · FORUS</p>
        </div>
      </div>
    </div>
  );
}
