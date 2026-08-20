"use client";

// ============================================================
// MentorMesh — Forgot Password Page v2
// ============================================================
import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, ArrowLeft, MailCheck, AlertCircle } from "lucide-react";
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
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem", justifyContent: "center" }}>
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

        {/* Card */}
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "2rem",
          boxShadow: "var(--shadow-md)",
        }}>
          {successMsg ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "var(--color-success-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}>
                <MailCheck size={28} color="var(--color-success)" />
              </div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Check your email</h1>
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
                {successMsg}
              </p>

              <div style={{
                background: "var(--amber-50)",
                border: "1px solid var(--amber-200)",
                borderRadius: "8px",
                padding: "0.875rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                marginBottom: "1.5rem",
                textAlign: "left"
              }}>
                <AlertCircle size={18} color="var(--amber-600)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontSize: "0.8125rem", color: "var(--amber-800)", margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: "var(--amber-900)" }}>Note:</span> Please check your <strong style={{ background: "var(--amber-200)", padding: "0 4px", borderRadius: "4px", color: "var(--amber-900)" }}>SPAM folder</strong> if you don't see it in your inbox immediately.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Button variant="secondary" fullWidth icon={<ArrowLeft size={16} />} onClick={() => setSuccessMsg("")}>
                  Try another email
                </Button>
                <Link href="/login" style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none", marginTop: "0.5rem" }}>
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "var(--blue-50)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                }}>
                  <KeyRound size={20} color="var(--color-primary)" />
                </div>
                <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                  Reset Password
                </h1>
                <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                  Enter your registered email and we&apos;ll send you password reset instructions.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {errorMsg && (
                  <div role="alert" style={{
                    display: "flex", alignItems: "flex-start", gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    background: "var(--color-danger-bg)",
                    border: "1px solid var(--red-100)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-danger)",
                    fontSize: "0.875rem", fontWeight: 500,
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                    {errorMsg}
                  </div>
                )}

                <div className="mm-field">
                  <label htmlFor="fp-email" className="mm-label">
                    Email address <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    className={`mm-input${errors.email ? " error" : ""}`}
                    placeholder="you@example.com"
                    {...register("email")}
                  />
                  {errors.email && <p className="mm-field-error">{errors.email.message}</p>}
                </div>

                <Button type="submit" variant="primary" fullWidth size="lg" loading={isSubmitting}>
                  Send Reset Link
                </Button>
              </form>

              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <Link href="/login" style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "var(--color-placeholder)" }}>
          MentorMesh · FORUS · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
