"use client";

// ============================================================
// MentorMesh — Forgot Password Page (Premium Redesign)
// ============================================================
import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, ArrowLeft, MailCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { firebaseErrorToMessage } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await resetPassword(data.email.trim());
      setSuccessMsg("Password reset email sent! Check your inbox for instructions.");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || "";
      setErrorMsg(firebaseErrorToMessage(code));
    }
  };

  return (
    <div className="auth-root">
      {/* ── Left Panel ────────────────────────────────── */}
      <div className="auth-hero">
        <div className="auth-hero-bg" aria-hidden="true">
          <div className="auth-blob auth-blob-1" />
          <div className="auth-blob auth-blob-2" />
          <div className="auth-blob auth-blob-3" />
        </div>

        <div className="auth-hero-content">
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
              Secure &amp;<br />Reliable.
            </h2>
            <p className="auth-hero-desc">
              We&apos;ve got you covered. A reset link will be in your inbox within a few seconds.
            </p>
          </div>

          <div className="auth-hero-footer">
            <p className="auth-hero-quote">
              &ldquo;Account security is our top priority.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">
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

          {successMsg ? (
            <div className="auth-success-state">
              <div className="auth-success-icon">
                <MailCheck size={32} />
              </div>
              <h1 className="auth-form-title" style={{ textAlign: "center" }}>Check your email</h1>
              <p className="auth-form-subtitle" style={{ textAlign: "center" }}>{successMsg}</p>
              <Button variant="outline" fullWidth icon={<ArrowLeft size={16} />} onClick={() => setSuccessMsg("")}>
                Try another email
              </Button>
              <Link href="/login" className="auth-back-link">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="auth-form-header">
                <div className="auth-icon-wrap">
                  <KeyRound size={22} />
                </div>
                <h1 className="auth-form-title">Reset Password</h1>
                <p className="auth-form-subtitle">
                  Enter your registered email and we&apos;ll send you reset instructions.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
                {errorMsg && (
                  <div className="auth-alert auth-alert-error" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {errorMsg}
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="email" className="auth-label">Email address</label>
                  <input
                    id="email"
                    type="email"
                    className={`auth-input${errors.email ? " auth-input-error" : ""}`}
                    placeholder="you@example.com"
                    {...register("email")}
                  />
                  {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
                </div>

                <Button type="submit" variant="primary" fullWidth size="lg" loading={isSubmitting} className="auth-submit-btn">
                  Send Reset Link
                </Button>
              </form>

              <Link href="/login" className="auth-back-link">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </>
          )}

          <p className="auth-copyright">MentorMesh · {new Date().getFullYear()} · FORUS</p>
        </div>
      </div>
    </div>
  );
}
