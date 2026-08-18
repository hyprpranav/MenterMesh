"use client";

// ============================================================
// MentorMesh — Student Profile Detail v2 (Copy-First, Role Privacy)
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, getUser, getUserTeams } from "@/lib/firebase/firestore";
import type { User, Team } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { CopyField } from "@/components/ui/CopyField";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge, teamStatusBadge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Copy, UsersRound } from "lucide-react";

export default function StudentProfilePage() {
  const { uid }         = useParams() as { uid: string };
  const { user: me }    = useAuth();
  const router          = useRouter();
  const { success, error: toastError } = useToast();

  const [student, setStudent] = useState<User | null>(null);
  const [teams,   setTeams]   = useState<Team[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState("");

  useEffect(() => {
    if (!uid) return;
    Promise.all([getUser(uid), getUserTeams(uid), getAllUsers()])
      .then(([u, t, allUsers]) => {
        if (!u) setPageErr("Student record not found.");
        else {
          setStudent(u);
          setTeams(t);
          setStaffMembers((allUsers || []).filter((member) => member.role === "staff" || member.role === "master"));
        }
      })
      .catch(() => setPageErr("Unable to load student profile."))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <AppShell><LoadingState message="Loading student profile…" /></AppShell>;
  if (pageErr || !student) return <AppShell><ErrorState title="Profile Error" message={pageErr || "Student record not found."} onRetry={() => router.push("/students")} /></AppShell>;

  // ── Privacy access levels ─────────────────────────────────
  const isSelf          = me?.uid === student.uid;
  const isStaff         = me?.role === "staff";
  const isMaster        = me?.role === "master";
  const isPrivileged    = isStaff || isMaster || isSelf;   // sees phone, personal email
  const isSuperPriv     = isMaster || isSelf;              // sees DOB, Aadhaar, address

  // ── Copy all visible fields ───────────────────────────────
  const handleCopyAll = useCallback(async () => {
    const lines: string[] = [
      `Name: ${student.name}`,
      `Register No: ${student.registerNumber || "N/A"}`,
      `Roll No: ${student.rollNumber || "N/A"}`,
      `Department: ${student.department || "N/A"} · ${student.year} Year · Sec ${student.section}`,
      `College Email: ${student.email || "N/A"}`,
    ];
    if (isPrivileged) {
      if (student.personalEmail) lines.push(`Personal Email: ${student.personalEmail}`);
      if (student.phone)         lines.push(`Phone: ${student.phone}`);
    }
    if (isSuperPriv) {
      if (student.dateOfBirth)   lines.push(`Date of Birth: ${student.dateOfBirth}`);
      if (student.bloodGroup)    lines.push(`Blood Group: ${student.bloodGroup}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      success("Student information copied to clipboard!");
    } catch {
      toastError("Failed to copy. Please try again.");
    }
  }, [student, isPrivileged, isSuperPriv, success, toastError]);

  const meta = [student.department, student.year && `${student.year} Year`, student.section && `Sec ${student.section}`].filter(Boolean).join(" · ");

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "720px", margin: "0 auto" }}>

        {/* Back button */}
        <div>
          <Link href="/students">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />}>
              Back to Directory
            </Button>
          </Link>
        </div>

        {/* Profile Hero Card */}
        <div className="mm-card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Blue accent strip */}
          <div style={{ height: "6px", background: "linear-gradient(90deg, var(--blue-500), var(--blue-700))" }} />

          {/* Hero content */}
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.875rem" }}>
            <Avatar name={student.name} photoUrl={student.profilePhoto} size="xl" />
            <div>
              <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{student.name}</h1>
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontWeight: 500, marginTop: "2px" }}>{meta}</p>
            </div>

            {/* Skills */}
            {student.skills && student.skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", justifyContent: "center" }}>
                {student.skills.map((sk) => (
                  <span key={sk} style={{ fontSize: "12px", fontWeight: 600, background: "var(--blue-50)", color: "var(--blue-700)", padding: "3px 10px", borderRadius: "999px", border: "1px solid var(--blue-100)" }}>
                    {sk}
                  </span>
                ))}
              </div>
            )}

            {/* Social links */}
            {(student.github || student.linkedIn || student.portfolio) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                {student.github && (
                  <a href={student.github} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)", background: "var(--color-surface-2)", padding: "5px 14px", borderRadius: "8px", textDecoration: "none", border: "1px solid var(--color-border)" }}>
                    GitHub ↗
                  </a>
                )}
                {student.linkedIn && (
                  <a href={student.linkedIn} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0A66C2", background: "#EFF6FF", padding: "5px 14px", borderRadius: "8px", textDecoration: "none", border: "1px solid #DBEAFE" }}>
                    LinkedIn ↗
                  </a>
                )}
                {student.portfolio && (
                  <a href={student.portfolio} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-success)", background: "var(--green-50)", padding: "5px 14px", borderRadius: "8px", textDecoration: "none", border: "1px solid var(--green-100)" }}>
                    Portfolio ↗
                  </a>
                )}
              </div>
            )}

            {/* Copy All button */}
            <Button
              variant="secondary"
              size="sm"
              icon={<Copy size={14} />}
              onClick={handleCopyAll}
            >
              Copy All Info
            </Button>
          </div>
        </div>

        {/* Academic Section */}
        <div className="mm-card">
          <p className="mm-profile-section-title">Academic</p>
          <div className="mm-profile-fields">
            <CopyField label="Register Number" value={student.registerNumber} />
            {student.rollNumber && <CopyField label="Roll Number" value={student.rollNumber} />}
            <CopyField label="Department" value={student.department} />
            <CopyField label="Year" value={student.year ? `${student.year} Year` : undefined} />
            <CopyField label="Section" value={student.section ? `Section ${student.section}` : undefined} />
          </div>
        </div>

        {/* Contact Section */}
        <div className="mm-card">
          <p className="mm-profile-section-title">Contact</p>
          <div className="mm-profile-fields">
            <CopyField label="College Email" value={student.email} />
            <CopyField label="Personal Email" value={student.personalEmail} sensitive={!isPrivileged} />
            <CopyField label="Phone" value={student.phone} sensitive={!isPrivileged} />
            {student.alternateEmail && (
              <CopyField label="Alternate Email" value={student.alternateEmail} sensitive={!isPrivileged} />
            )}
          </div>
          {!isPrivileged && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              🔒 Phone and personal email visible to staff and mentors only.
            </p>
          )}
        </div>

        {/* Personal Info (Privileged) */}
        {isSuperPriv && (
          <div className="mm-card">
            <p className="mm-profile-section-title">Personal Information</p>
            <div className="mm-profile-fields">
              {student.dateOfBirth && <CopyField label="Date of Birth" value={student.dateOfBirth} />}
              {student.bloodGroup   && <CopyField label="Blood Group" value={student.bloodGroup} />}
              {student.address      && <CopyField label="Address" value={student.address} />}
              {student.aadhaarNumber && (
                <CopyField label="Aadhaar Number" value={student.aadhaarNumber} masked />
              )}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.75rem" }}>
              🔒 Sensitive details visible to Master and self only.
            </p>
          </div>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <div className="mm-card">
            <p className="mm-profile-section-title" style={{ marginBottom: "0.75rem" }}>Teams</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {teams.map((t) => {
                const { variant, label } = teamStatusBadge(t.status);
                return (
                  <Link key={t.id} href={`/teams/${t.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-bg)", transition: "border-color 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--blue-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <UsersRound size={16} color="var(--blue-600)" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
                          {t.eventName && <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{t.eventName}</p>}
                        </div>
                      </div>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Faculty & Staff */}
        {staffMembers.length > 0 && (
          <div className="mm-card" style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.96))", borderColor: "rgba(148,163,184,0.4)" }}>
            <p className="mm-profile-section-title" style={{ marginBottom: "0.75rem", color: "#E2E8F0" }}>Faculty & Staff</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {staffMembers.map((member) => (
                <Link key={member.uid} href={`/students/${member.uid}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.8rem 0.9rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(148,163,184,0.3)",
                    background: "rgba(30,41,59,0.7)",
                    color: "#F8FAFC",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
                      <Avatar name={member.name} photoUrl={member.profilePhoto} size="sm" />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#F8FAFC" }}>{member.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "#CBD5E1", marginTop: "2px" }}>{member.role === "master" ? "Master" : "Staff / Faculty"}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#E2E8F0", background: "rgba(148,163,184,0.14)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: "999px", padding: "5px 8px" }}>
                      {member.department || "Faculty"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
