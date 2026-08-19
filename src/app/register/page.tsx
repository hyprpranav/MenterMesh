"use client";

// ============================================================
// MentorMesh — Register / Request Access Page v2
// ============================================================
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { firebaseErrorToMessage } from "@/lib/utils";

const DEPARTMENTS = [
  "ECE",
  "CSE",
  "EEE",
  "MECH",
  "CIVIL",
  "IT",
  "VLSI / Microelectronics",
  "AI & DS",
  "Other",
];

const YEARS = [
  "I (1st Year)",
  "II (2nd Year)",
  "III (3rd Year)",
  "IV (4th Year / Final Year)",
  "Passed Out (2020-21)",
  "Passed Out (2021-22)",
  "Passed Out (2022-23)",
  "Passed Out (2023-24)",
  "Passed Out (2024-25)",
  "Passed Out (Alumni)",
];

const SECTIONS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "VLSI-1",
  "VLSI-2",
  "Other",
];

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

// ── Field helper ───────────────────────────────────────────
function Field({
  id, label, required, error, children,
}: {
  id: string; label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="mm-field">
      <label htmlFor={id} className="mm-label">
        {label}{required && <span style={{ color: "var(--color-danger)", marginLeft: "2px" }}>*</span>}
      </label>
      {children}
      {error && <p className="mm-field-error">{error}</p>}
    </div>
  );
}

// ── Section label ──────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "0.6875rem", fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--color-muted)", padding: "0.25rem 0",
      marginTop: "0.5rem",
    }}>
      {children}
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
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "600px" }}>

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

        {/* Form card */}
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "1.75rem",
          boxShadow: "var(--shadow-md)",
        }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
              Request Access
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
              Fill in your details — your mentor will review and approve your request.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

            {/* Error */}
            {authError && (
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
                {authError}
              </div>
            )}

            <SectionLabel>Personal Information</SectionLabel>

            <div className="mm-grid-2">
              <Field id="reg-name" label="Full Name" required error={errors.name?.message}>
                <input
                  id="reg-name"
                  className={`mm-input${errors.name ? " error" : ""}`}
                  placeholder="Arun Kumar"
                  {...register("name")}
                />
              </Field>
              <Field id="reg-phone" label="Phone Number" required error={errors.phone?.message}>
                <input
                  id="reg-phone"
                  type="tel"
                  className={`mm-input${errors.phone ? " error" : ""}`}
                  placeholder="+91 98765 43210"
                  {...register("phone")}
                />
              </Field>
            </div>

            <Field id="reg-email" label="Email Address" required error={errors.email?.message}>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className={`mm-input${errors.email ? " error" : ""}`}
                placeholder="you@example.com"
                {...register("email")}
              />
            </Field>

            <SectionLabel>Academic Details</SectionLabel>

            <div className="mm-grid-2">
              <Field id="reg-regnum" label="Register Number" required error={errors.registerNumber?.message}>
                <input
                  id="reg-regnum"
                  className={`mm-input${errors.registerNumber ? " error" : ""}`}
                  placeholder="23EC100"
                  {...register("registerNumber")}
                />
              </Field>
              <Field id="reg-rollnum" label="Roll Number" error={errors.rollNumber?.message}>
                <input
                  id="reg-rollnum"
                  className="mm-input"
                  placeholder="101"
                  {...register("rollNumber")}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
              <Field id="reg-dept" label="Department" required error={errors.department?.message}>
                <select
                  id="reg-dept"
                  className={`mm-select${errors.department ? " error" : ""}`}
                  {...register("department")}
                >
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field id="reg-year" label="Year" required error={errors.year?.message}>
                <select
                  id="reg-year"
                  className={`mm-select${errors.year ? " error" : ""}`}
                  {...register("year")}
                >
                  <option value="">Select</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field id="reg-section" label="Section" required error={errors.section?.message}>
                <select
                  id="reg-section"
                  className={`mm-select${errors.section ? " error" : ""}`}
                  {...register("section")}
                >
                  <option value="">Select</option>
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <SectionLabel>Account Security</SectionLabel>

            <div className="mm-grid-2">
              <Field id="reg-password" label="Password" required error={errors.password?.message}>
                <div style={{ position: "relative" }}>
                  <input
                    id="reg-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    className={`mm-input${errors.password ? " error" : ""}`}
                    placeholder="Min. 6 characters"
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
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>
              <Field id="reg-confirm" label="Confirm Password" required error={errors.confirmPassword?.message}>
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  className={`mm-input${errors.confirmPassword ? " error" : ""}`}
                  placeholder="Re-enter password"
                  {...register("confirmPassword")}
                />
              </Field>
            </div>

            <Field id="reg-message" label="Message to Mentor (optional)" error={errors.message?.message}>
              <textarea
                id="reg-message"
                className="mm-textarea"
                rows={3}
                placeholder="Any additional info or reason for joining..."
                {...register("message")}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={isSubmitting}
              icon={<UserPlus size={17} />}
            >
              Submit Request
            </Button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--color-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ fontWeight: 600, color: "var(--color-primary)" }}>
              Sign In
            </Link>
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "var(--color-placeholder)" }}>
          MentorMesh · FORUS · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
