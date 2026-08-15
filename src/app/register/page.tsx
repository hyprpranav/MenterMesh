"use client";

// ============================================================
// MentorMesh — Register / Request Access Page (Premium Redesign)
// ============================================================
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { firebaseErrorToMessage } from "@/lib/utils";

const DEPARTMENTS = ["ECE", "CSE", "EEE", "MECH", "CIVIL", "IT", "Other"];
const YEARS = ["I", "II", "III", "IV"];
const SECTIONS = ["A", "B", "C", "D"];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  registerNumber: z.string().min(3, "Register number is required.").trim(),
  rollNumber: z.string().optional(),
  department: z.string().min(1, "Please select your department."),
  year: z.string().min(1, "Please select your year."),
  section: z.string().min(1, "Please select your section."),
  phone: z.string().min(10, "Please enter a valid phone number.").max(15),
  message: z.string().max(300).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

// A minimal Field wrapper
function Field({
  id, label, required, error, children,
}: {
  id: string; label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}{required && <span className="auth-required"> *</span>}
      </label>
      {children}
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setAuthError("");
    try {
      await signUp({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        registerNumber: data.registerNumber.trim().toUpperCase(),
        rollNumber: data.rollNumber?.trim(),
        department: data.department,
        year: data.year,
        section: data.section,
        phone: data.phone.trim(),
        message: data.message,
      });
      router.push("/pending");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || "";
      setAuthError(firebaseErrorToMessage(code));
    }
  };

  return (
    <div className="auth-root auth-root-register">
      {/* ── Left Panel ──────────────────────────────── */}
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
              Join the<br />Community.
            </h2>
            <p className="auth-hero-desc">
              Submit your access request and get onboarded by your mentor. Your journey to excellence starts here.
            </p>
          </div>

          <ul className="auth-steps">
            {[
              "Fill in your academic details",
              "Submit your access request",
              "Mentor reviews & approves",
              "Start collaborating!",
            ].map((step, i) => (
              <li key={step} className="auth-step-item">
                <div className="auth-step-num">{i + 1}</div>
                <span>{step}</span>
              </li>
            ))}
          </ul>

          <div className="auth-hero-footer">
            <p className="auth-hero-quote">
              &ldquo;Your mentor is waiting. Take the first step.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap auth-form-wrap-lg">
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
            <h1 className="auth-form-title">Request Access</h1>
            <p className="auth-form-subtitle">Fill in your details — your mentor will review and approve.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
            {authError && (
              <div className="auth-alert auth-alert-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {authError}
              </div>
            )}

            {/* Section divider */}
            <div className="auth-section-label">Personal Information</div>

            <div className="auth-grid-2">
              <Field id="name" label="Full Name" required error={errors.name?.message}>
                <input id="name" className={`auth-input${errors.name ? " auth-input-error" : ""}`} placeholder="Arun Kumar" {...register("name")} />
              </Field>
              <Field id="phone" label="Phone Number" required error={errors.phone?.message}>
                <input id="phone" type="tel" className={`auth-input${errors.phone ? " auth-input-error" : ""}`} placeholder="+91 98765 43210" {...register("phone")} />
              </Field>
            </div>

            <Field id="email" label="Email Address" required error={errors.email?.message}>
              <input id="email" type="email" autoComplete="email" className={`auth-input${errors.email ? " auth-input-error" : ""}`} placeholder="you@example.com" {...register("email")} />
            </Field>

            <div className="auth-section-label">Academic Details</div>

            <div className="auth-grid-2">
              <Field id="registerNumber" label="Register Number" required error={errors.registerNumber?.message}>
                <input id="registerNumber" className={`auth-input${errors.registerNumber ? " auth-input-error" : ""}`} placeholder="23EC100" {...register("registerNumber")} />
              </Field>
              <Field id="rollNumber" label="Roll Number" error={errors.rollNumber?.message}>
                <input id="rollNumber" className="auth-input" placeholder="101" {...register("rollNumber")} />
              </Field>
            </div>

            <div className="auth-grid-3">
              <Field id="department" label="Department" required error={errors.department?.message}>
                <select id="department" className={`auth-input auth-select${errors.department ? " auth-input-error" : ""}`} {...register("department")}>
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field id="year" label="Year" required error={errors.year?.message}>
                <select id="year" className={`auth-input auth-select${errors.year ? " auth-input-error" : ""}`} {...register("year")}>
                  <option value="">Select</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field id="section" label="Section" required error={errors.section?.message}>
                <select id="section" className={`auth-input auth-select${errors.section ? " auth-input-error" : ""}`} {...register("section")}>
                  <option value="">Select</option>
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <div className="auth-section-label">Account Security</div>

            <div className="auth-grid-2">
              <Field id="password" label="Password" required error={errors.password?.message}>
                <div className="auth-input-group">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    className={`auth-input auth-input-with-addon${errors.password ? " auth-input-error" : ""}`}
                    placeholder="Min. 6 characters"
                    {...register("password")}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="auth-input-addon" aria-label="Toggle password">
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>
              <Field id="confirmPassword" label="Confirm Password" required error={errors.confirmPassword?.message}>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`auth-input${errors.confirmPassword ? " auth-input-error" : ""}`}
                  placeholder="Re-enter password"
                  {...register("confirmPassword")}
                />
              </Field>
            </div>

            <Field id="message" label="Message to Mentor (optional)" error={errors.message?.message}>
              <textarea
                id="message"
                className="auth-input auth-textarea"
                rows={3}
                placeholder="Any additional info or reason for joining..."
                {...register("message")}
              />
            </Field>

            <Button type="submit" variant="primary" fullWidth size="lg" loading={isSubmitting} icon={<UserPlus size={17} />} className="auth-submit-btn">
              Submit Request
            </Button>
          </form>

          <p className="auth-switch-text">
            Already have an account?{" "}
            <Link href="/login" className="auth-switch-link">Sign In</Link>
          </p>

          <p className="auth-copyright">MentorMesh · {new Date().getFullYear()} · FORUS</p>
        </div>
      </div>
    </div>
  );
}
