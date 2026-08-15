"use client";

// ============================================================
// MentorMesh — Student Profile Detail View (Role-Based Privacy)
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getUser, getUserTeams } from "@/lib/firebase/firestore";
import type { User, Team } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Mail, Phone, Calendar, ArrowLeft, Shield, ExternalLink, Globe, Copy, Code } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { copyToClipboard } from "@/lib/utils";

export default function StudentProfilePage() {
  const { uid } = useParams() as { uid: string };
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [student, setStudent] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!uid) return;
      try {
        const [userData, userTeams] = await Promise.all([
          getUser(uid),
          getUserTeams(uid),
        ]);
        if (!userData) {
          setError("Student record not found.");
        } else {
          setStudent(userData);
          setTeams(userTeams);
        }
      } catch (err) {
        console.error("Error loading student profile:", err);
        setError("Unable to load student profile.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uid]);

  if (loading) return <AppShell><LoadingState message="Loading student profile..." /></AppShell>;
  if (error || !student) return <AppShell><ErrorState title="Profile Error" message={error || "Student record not found."} retry={() => router.push("/students")} /></AppShell>;

  // Privacy Access Control logic
  const isSelf = currentUser?.uid === student.uid;
  const isStaff = currentUser?.role === "staff";
  const isMaster = currentUser?.role === "master";
  const isPrivileged = isStaff || isMaster || isSelf;
  const isSuperPrivileged = isMaster || isSelf;

  const handleCopyAll = async () => {
    const lines: string[] = [
      `Name: ${student.name}`,
      `Register No: ${student.registerNumber || "N/A"}`,
      `Roll No: ${student.rollNumber || "N/A"}`,
      `Department: ${student.department || "N/A"}`,
      `Year: ${student.year || "N/A"} Year`,
      `Section: Section ${student.section || "N/A"}`,
      `College Email: ${student.email || "N/A"}`,
    ];

    if (isPrivileged) {
      lines.push(`Personal Email: ${student.personalEmail || "N/A"}`);
      lines.push(`Phone: ${student.phone || "N/A"}`);
    }

    if (isSuperPrivileged) {
      lines.push(`Date of Birth: ${student.dateOfBirth || "N/A"}`);
      lines.push(`Blood Group: ${student.bloodGroup || "N/A"}`);
      lines.push(`Address: ${student.address || "N/A"}`);
    }

    const textToCopy = lines.join("\n");
    const ok = await copyToClipboard(textToCopy);
    if (ok) success("Student information copied to clipboard!");
    else toastError("Failed to copy student info.");
  };

  const maskAadhaar = (aadhaar?: string) => {
    if (!aadhaar) return "N/A";
    const cleaned = aadhaar.replace(/\s+/g, "");
    if (cleaned.length < 4) return "XXXX XXXX XXXX";
    const last4 = cleaned.slice(-4);
    return `XXXX XXXX ${last4}`;
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top bar & actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link href="/students" className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Directory
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<Copy size={14} />} onClick={handleCopyAll}>
              Copy Student Details
            </Button>
            {isSelf && (
              <Link href="/profile/edit">
                <Button variant="primary" size="sm">Edit Profile</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Profile Hero Card */}
        <div className="mm-profile-hero">
          <Avatar name={student.name} photoUrl={student.profilePhoto} size="2xl" />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{student.name}</h1>
              <span className="mm-badge border bg-blue-100 text-blue-800 border-blue-200 capitalize">{student.role}</span>
              {student.status === "imported" && (
                <span className="mm-badge border bg-amber-50 text-amber-800 border-amber-200">Imported Data</span>
              )}
            </div>

            <p className="text-slate-600 font-medium text-sm">
              {[student.department, student.year && `${student.year} Year`, student.section && `Section ${student.section}`].filter(Boolean).join(" · ")}
            </p>

            {student.bio && (
              <p className="text-slate-500 text-xs max-w-xl italic">&quot;{student.bio}&quot;</p>
            )}

            {/* Quick links */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold">
              {student.linkedIn && (
                <a href={student.linkedIn} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  🔗 LinkedIn <ExternalLink size={12} />
                </a>
              )}
              {student.github && (
                <a href={student.github} target="_blank" rel="noreferrer" className="text-slate-700 hover:underline inline-flex items-center gap-1">
                  <Code size={12} /> GitHub <ExternalLink size={12} />
                </a>
              )}
              {student.portfolio && (
                <a href={student.portfolio} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-1">
                  <Globe size={12} /> Portfolio <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Academic & Identity */}
          <div className="mm-card space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
              Academic & Identity
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="mm-info-row">
                <span className="mm-info-label">Register Number:</span>
                <div className="mm-info-value">
                  <span className="font-mono">{student.registerNumber || "Not provided"}</span>
                  {student.registerNumber && <CopyButton text={student.registerNumber} label="Register number" />}
                </div>
              </div>

              <div className="mm-info-row">
                <span className="mm-info-label">Roll Number:</span>
                <div className="mm-info-value">
                  <span className="font-mono">{student.rollNumber || "Not provided"}</span>
                  {student.rollNumber && <CopyButton text={student.rollNumber} label="Roll number" />}
                </div>
              </div>

              <div className="mm-info-row">
                <span className="mm-info-label">Department:</span>
                <span className="mm-info-value">{student.department || "Not provided"}</span>
              </div>

              <div className="mm-info-row">
                <span className="mm-info-label">Academic Year:</span>
                <span className="mm-info-value">{student.year ? `${student.year} Year` : "Not provided"}</span>
              </div>

              <div className="mm-info-row">
                <span className="mm-info-label">Section:</span>
                <span className="mm-info-value">{student.section ? `Section ${student.section}` : "Not provided"}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="mm-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Contact Information</h3>
              {!isPrivileged && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1 border border-amber-200">
                  <Shield size={10} /> Personal Info Protected
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              {/* College Email - Public */}
              <div className="mm-info-row">
                <span className="mm-info-label">College Email:</span>
                <div className="mm-info-value">
                  <span>{student.email}</span>
                  <CopyButton text={student.email} label="College email" />
                </div>
              </div>

              {/* Privileged Contact Fields */}
              {isPrivileged ? (
                <>
                  <div className="mm-info-row">
                    <span className="mm-info-label">Personal Email:</span>
                    <div className="mm-info-value">
                      <span>{student.personalEmail || "Not provided"}</span>
                      {student.personalEmail && <CopyButton text={student.personalEmail} label="Personal email" />}
                    </div>
                  </div>

                  <div className="mm-info-row">
                    <span className="mm-info-label">Phone Number:</span>
                    <div className="mm-info-value">
                      <span className="font-mono">{student.phone || "Not provided"}</span>
                      {student.phone && <CopyButton text={student.phone} label="Phone number" />}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center text-slate-500 text-xs mt-2">
                  🔒 Phone number and personal email are visible only to faculty mentors and administrators.
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Personal & Sensitive Profile (Master & Self Only) */}
          <div className="mm-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Personal Record</h3>
              {!isSuperPrivileged && (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <Shield size={10} /> Restricted Access
                </span>
              )}
            </div>

            {isSuperPrivileged ? (
              <div className="space-y-2.5 text-xs">
                <div className="mm-info-row">
                  <span className="mm-info-label">Date of Birth:</span>
                  <span className="mm-info-value">{student.dateOfBirth || "Not provided"}</span>
                </div>
                <div className="mm-info-row">
                  <span className="mm-info-label">Blood Group:</span>
                  <span className="mm-info-value">{student.bloodGroup || "Not provided"}</span>
                </div>
                <div className="mm-info-row">
                  <span className="mm-info-label">Aadhaar (Masked):</span>
                  <span className="mm-info-value font-mono">{maskAadhaar(student.aadhaarNumber)}</span>
                </div>
                <div className="mm-info-row">
                  <span className="mm-info-label">Permanent Address:</span>
                  <span className="mm-info-value leading-relaxed">{student.address || "Not provided"}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center text-slate-500 text-xs">
                🔒 Personal identification records are visible only to the student and master administrator.
              </div>
            )}
          </div>

          {/* Section 4: Skills & Associated Teams */}
          <div className="mm-card space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
              Skills & Teams
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1.5">Skills & Technical Domains:</span>
                {student.skills && student.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {student.skills.map((sk) => (
                      <span key={sk} className="bg-blue-50 text-blue-700 font-semibold text-xs px-2.5 py-0.5 rounded-full border border-blue-100">
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No skills listed.</p>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1.5">Associated Teams ({teams.length}):</span>
                {teams.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Not a member of any team yet.</p>
                ) : (
                  <div className="space-y-2">
                    {teams.map((t) => (
                      <Link key={t.id} href={`/teams/${t.id}`} className="block p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-colors text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{t.name}</span>
                          <span className="text-[11px] text-slate-500">{t.eventName || "General"}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
