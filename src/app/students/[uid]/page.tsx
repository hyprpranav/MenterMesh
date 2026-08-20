"use client";

// ============================================================
// MentorMesh — Student Profile Detail v3 (Open Data, Expanded Card)
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, getUser, getUserTeams, getStudentEvents } from "@/lib/firebase/firestore";
import type { User, Team, Event } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { CopyField } from "@/components/ui/CopyField";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge, teamStatusBadge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft, Copy, UsersRound, ChevronDown, ChevronUp,
  Calendar, Award, BookOpen, Megaphone, Star, Hash,
  Image as ImageIcon,
} from "lucide-react";

export default function StudentProfilePage() {
  const { uid } = useParams() as { uid: string };
  const { user: me } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [student, setStudent] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState("");
  const [showExpanded, setShowExpanded] = useState(false);

  useEffect(() => {
    if (!uid) return;
    Promise.all([getUser(uid), getUserTeams(uid), getAllUsers(), getStudentEvents(uid)])
      .then(([u, t, allUsers, evts]) => {
        if (!u) setPageErr("Student record not found.");
        else {
          setStudent(u);
          setTeams(t);
          setEvents(evts);
          setStaffMembers((allUsers || []).filter((member) => member.role === "staff" || member.role === "master"));
        }
      })
      .catch(() => setPageErr("Unable to load student profile."))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <AppShell><LoadingState message="Loading student profile…" /></AppShell>;
  if (pageErr || !student) return <AppShell><ErrorState title="Profile Error" message={pageErr || "Student record not found."} onRetry={() => router.push("/students")} /></AppShell>;

  // ── Copy all visible fields ───────────────────────────────
  const handleCopyAll = async () => {
    const lines: string[] = [
      `Name: ${student.name}`,
      `Register No: ${student.registerNumber || "N/A"}`,
      `Roll No: ${student.rollNumber || "N/A"}`,
      `Department: ${student.department || "N/A"} · ${student.year} Year · Sec ${student.section}`,
      `College Email: ${student.email || "N/A"}`,
    ];
    if (student.personalEmail) lines.push(`Personal Email: ${student.personalEmail}`);
    if (student.phone) lines.push(`Phone: ${student.phone}`);
    if (student.dateOfBirth) lines.push(`Date of Birth: ${student.dateOfBirth}`);
    if (student.bloodGroup) lines.push(`Blood Group: ${student.bloodGroup}`);
    if (student.aadhaarNumber) lines.push(`Aadhaar: ${student.aadhaarNumber}`);
    if (student.parentPhoneNumber) lines.push(`Parent Phone: ${student.parentPhoneNumber}`);
    if (student.address) lines.push(`Address: ${student.address}`);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      success("Student information copied to clipboard!");
    } catch {
      toastError("Failed to copy. Please try again.");
    }
  };

  const handleCopyProfessionalPic = async () => {
    if (!student.professionalPhoto) return;
    try {
      await navigator.clipboard.writeText(student.professionalPhoto);
      success("Professional picture URL copied!");
    } catch {
      toastError("Failed to copy professional picture URL.");
    }
  };

  const meta = [student.department, student.year && `${student.year} Year`, student.section && `Sec ${student.section}`].filter(Boolean).join(" · ");

  // ── Expanded card data ─────────────────────────────────────
  const hackathonEvents = events.filter(e => e.type?.toLowerCase().includes("hackathon"));
  const otherEvents = events.filter(e => !e.type?.toLowerCase().includes("hackathon"));

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
            <div style={{ position: "relative" }}>
              <Avatar name={student.name} photoUrl={student.profilePhoto} size="xl" />
            </div>
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

            {/* Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
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
        </div>

        {student.professionalPhoto && (
          <div style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.5rem", display: "flex", gap: "1.5rem", alignItems: "center", marginTop: "0.5rem" }}>
            <div style={{ width: "90px", height: "90px", borderRadius: "12px", overflow: "hidden", border: "2px solid #fff", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", flexShrink: 0 }}>
              <img src={student.professionalPhoto} alt="Professional" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", marginBottom: "0.25rem", margin: 0 }}>Professional Photo</h4>
              <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, marginBottom: "1rem" }}>High-resolution picture for official use, presentations, and events.</p>
              <Button onClick={handleCopyProfessionalPic} variant="primary" size="sm" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>}>
                Copy Photo Link
              </Button>
            </div>
          </div>
        )}

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

        {/* Contact Section — all open, no privacy */}
        <div className="mm-card">
          <p className="mm-profile-section-title">Contact</p>
          <div className="mm-profile-fields">
            <CopyField label="College Email" value={student.email} />
            <CopyField label="Personal Email" value={student.personalEmail} />
            <CopyField label="Phone" value={student.phone} />
            {student.alternateEmail && <CopyField label="Alternate Email" value={student.alternateEmail} />}
            {student.parentPhoneNumber && <CopyField label="Parent/Guardian Phone" value={student.parentPhoneNumber} />}
          </div>
        </div>

        {/* Personal Info — all open, no masking */}
        {(student.dateOfBirth || student.bloodGroup || student.address || student.aadhaarNumber) && (
          <div className="mm-card">
            <p className="mm-profile-section-title">Personal Information</p>
            <div className="mm-profile-fields">
              {student.dateOfBirth && <CopyField label="Date of Birth" value={student.dateOfBirth} />}
              {student.bloodGroup && <CopyField label="Blood Group" value={student.bloodGroup} />}
              {student.address && <CopyField label="Address" value={student.address} />}
              {student.aadhaarNumber && <CopyField label="Aadhaar Number" value={student.aadhaarNumber} />}
            </div>
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
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "0.75rem", padding: "0.8rem 0.9rem", borderRadius: "12px",
                    border: "1px solid rgba(148,163,184,0.3)", background: "rgba(30,41,59,0.7)", color: "#F8FAFC",
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

        <div className="mm-card">
          <p className="mm-profile-section-title">Events Participated</p>
          <p className="mb-3 text-xs text-slate-500">Approved public event history for {student.name}.</p>
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 no-underline transition-colors hover:border-blue-200 hover:bg-blue-50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold text-slate-900">{event.name}</p><p className="text-xs text-slate-500">Team: {event.teamName || "Individual participation"}</p></div>
                    <span className="text-xs font-semibold text-slate-500">{formatDate(event.date)}</span>
                  </div>
                  {event.result && <p className="mt-1 text-xs font-semibold text-amber-700">Result: {event.result}</p>}
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No approved public events yet.</p>}
        </div>

        {/* ── Expanded Details Button + Card ────────────────── */}
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowExpanded(!showExpanded)}
          icon={showExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {showExpanded ? "Hide Full Overview" : "View Full Overview (Teams, Events, Skills & More)"}
        </Button>

        {showExpanded && (
          <div className="mm-student-expanded-card">
            <h3 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.25rem", color: "var(--color-text)", textAlign: "center" }}>
              📋 {student.name} — Full Overview
            </h3>

            {/* Teams Overview */}
            <div className="mm-expanded-section">
              <div className="mm-expanded-section-title">
                <UsersRound size={13} /> Teams ({teams.length})
              </div>
              {teams.length > 0 ? (
                <div className="mm-expanded-tags">
                  {teams.map((t) => (
                    <span key={t.id} className="mm-expanded-tag">
                      <UsersRound size={11} style={{ marginRight: 4 }} />
                      {t.name} {t.eventName ? `(${t.eventName})` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>Not part of any team yet.</p>
              )}
            </div>

            {/* Events Attended */}
            <div className="mm-expanded-section">
              <div className="mm-expanded-section-title">
                <Calendar size={13} /> Events Attended ({events.length})
              </div>
              {events.length > 0 ? (
                <>
                  {hackathonEvents.length > 0 && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--amber-600)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        🏆 Hackathons ({hackathonEvents.length})
                      </p>
                      <div className="mm-expanded-tags">
                        {hackathonEvents.map((e) => (
                          <span key={e.id} className="mm-expanded-tag" style={{ background: "var(--amber-50)", borderColor: "var(--amber-100)", color: "var(--amber-600)" }}>
                            {e.name} {e.result ? `· ${e.result}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {otherEvents.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-muted)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Other Events ({otherEvents.length})
                      </p>
                      <div className="mm-expanded-tags">
                        {otherEvents.map((e) => (
                          <span key={e.id} className="mm-expanded-tag">
                            {e.name} ({e.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>No events attended yet.</p>
              )}
            </div>

            {/* Skills */}
            <div className="mm-expanded-section">
              <div className="mm-expanded-section-title">
                <Star size={13} /> Skills
              </div>
              {student.skills && student.skills.length > 0 ? (
                <div className="mm-expanded-tags">
                  {student.skills.map((sk) => (
                    <span key={sk} className="mm-expanded-tag" style={{ background: "var(--blue-50)", borderColor: "var(--blue-100)", color: "var(--blue-700)" }}>
                      {sk}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>No skills added yet.</p>
              )}
            </div>

            {/* Bio */}
            {student.bio && (
              <div className="mm-expanded-section">
                <div className="mm-expanded-section-title">
                  <BookOpen size={13} /> Bio
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-2)", lineHeight: 1.6 }}>{student.bio}</p>
              </div>
            )}

            {/* Achievements from events */}
            {events.filter(e => e.result && e.result !== "Participant").length > 0 && (
              <div className="mm-expanded-section">
                <div className="mm-expanded-section-title">
                  <Award size={13} /> Achievements
                </div>
                <div className="mm-expanded-tags">
                  {events.filter(e => e.result && e.result !== "Participant").map((e) => (
                    <span key={e.id} className="mm-expanded-tag" style={{ background: "var(--green-50)", borderColor: "var(--green-100)", color: "var(--green-700)" }}>
                      🏅 {e.result} — {e.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(student.github || student.linkedIn || student.portfolio) && (
              <div className="mm-expanded-section">
                <div className="mm-expanded-section-title">
                  <Hash size={13} /> Links & Profiles
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {student.github && <span className="mm-expanded-tag">GitHub: {student.github}</span>}
                  {student.linkedIn && <span className="mm-expanded-tag">LinkedIn: {student.linkedIn}</span>}
                  {student.portfolio && <span className="mm-expanded-tag">Portfolio: {student.portfolio}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
