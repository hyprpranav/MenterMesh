"use client";

// ============================================================
// MentorMesh — Facing Issues Page (Contact Developer)
// ============================================================
import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
    AlertTriangle, Send, Mail, Phone, User, Hash,
    CheckCircle2,
} from "lucide-react";

const ISSUE_TYPES = [
    "Bug / Something Not Working",
    "Feature Request",
    "UI / Design Issue",
    "Data / Profile Issue",
    "Team Related",
    "Event Related",
    "Cannot Access Something",
    "Other",
];

export default function FacingIssuesPage() {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [issueType, setIssueType] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!issueType || !description.trim() || !user) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, "developerIssues"), {
                userId: user.uid,
                userName: user.name,
                userEmail: user.email,
                userRole: user.role,
                issueType,
                description: description.trim(),
                status: "open",
                createdAt: serverTimestamp(),
            });
            success("Issue reported successfully! The developer will look into it.");
            setSubmitted(true);
        } catch {
            toastError("Failed to submit issue. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AppShell>
            <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                {/* Header */}
                <div>
                    <h1 className="mm-page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AlertTriangle size={22} color="var(--amber-600)" />
                        Facing Issues?
                    </h1>
                    <p className="mm-page-subtitle">
                        Report a bug, request a feature, or let the developer know about any problem you&#39;re facing.
                    </p>
                </div>

                {/* Developer Contact Card */}
                <div className="mm-card" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", color: "#F8FAFC", border: "1px solid rgba(148,163,184,0.25)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={20} color="#60A5FA" />
                        </div>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#F8FAFC" }}>Developer Contact</p>
                            <p style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Reach out directly if it&#39;s urgent</p>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem", background: "rgba(255,255,255,0.06)", borderRadius: 10, border: "1px solid rgba(148,163,184,0.15)" }}>
                            <User size={16} color="#94A3B8" />
                            <div>
                                <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Developer</p>
                                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#F8FAFC" }}>HARISH PRANAV S</p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem", background: "rgba(255,255,255,0.06)", borderRadius: 10, border: "1px solid rgba(148,163,184,0.15)" }}>
                            <Mail size={16} color="#94A3B8" />
                            <div>
                                <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</p>
                                <a href="mailto:harishpranavs259@gmail.com" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#60A5FA", textDecoration: "none" }}>
                                    harishpranavs259@gmail.com
                                </a>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem", background: "rgba(255,255,255,0.06)", borderRadius: 10, border: "1px solid rgba(148,163,184,0.15)" }}>
                                <Phone size={16} color="#94A3B8" />
                                <div>
                                    <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Phone</p>
                                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#F8FAFC" }}>7845693765</p>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem", background: "rgba(255,255,255,0.06)", borderRadius: 10, border: "1px solid rgba(148,163,184,0.15)" }}>
                                <Hash size={16} color="#94A3B8" />
                                <div>
                                    <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ref No</p>
                                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#F8FAFC", fontFamily: "monospace" }}>927624BEC066</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Issue Form */}
                {submitted ? (
                    <div className="mm-card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green-50)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                            <CheckCircle2 size={28} color="var(--green-600)" />
                        </div>
                        <h2 style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Issue Reported!</h2>
                        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", maxWidth: "360px", margin: "0 auto 1.25rem" }}>
                            Your issue has been submitted to the developer. You&#39;ll hear back soon.
                        </p>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => { setSubmitted(false); setIssueType(""); setDescription(""); }}
                        >
                            Report Another Issue
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mm-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <p style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Report an Issue</p>

                        <div className="mm-field">
                            <label className="mm-label">Issue Type <span style={{ color: "var(--color-danger)" }}>*</span></label>
                            <select
                                className="mm-input mm-select"
                                value={issueType}
                                onChange={(e) => setIssueType(e.target.value)}
                                required
                            >
                                <option value="">Select issue type...</option>
                                {ISSUE_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mm-field">
                            <label className="mm-label">Describe the Issue <span style={{ color: "var(--color-danger)" }}>*</span></label>
                            <textarea
                                className="mm-input"
                                rows={5}
                                placeholder="Tell us what's happening, what you expected, and any steps to reproduce the issue..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                style={{ resize: "vertical", minHeight: "120px" }}
                            />
                        </div>

                        {user && (
                            <div style={{ padding: "0.75rem", background: "var(--color-bg)", borderRadius: 10, border: "1px solid var(--color-border)", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                                <p style={{ fontWeight: 600, marginBottom: "0.25rem", color: "var(--color-text-2)" }}>Submitting as:</p>
                                <p>{user.name} · {user.email} · {user.role}</p>
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={submitting}
                                icon={<Send size={14} />}
                                disabled={!issueType || !description.trim()}
                            >
                                Submit Issue
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </AppShell>
    );
}
