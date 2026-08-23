"use client";

// ============================================================
// MentorMesh — Team Detail, Member Management & Approval Page
// ============================================================
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTeam,
  updateTeam,
  getUser,
  finalizeTeam,
  deleteTeam,
  getActiveStudents,
  addMemberToTeam,
  removeMemberFromTeam,
  reviewTeamProposal,
} from "@/lib/firebase/firestore";
import { deleteDoc, doc, getDocs } from "firebase/firestore";
import type { Team, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, teamStatusBadge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ArrowLeft,
  Star,
  UserPlus,
  Folder,
  Share2,
  Lock,
  Trash2,
  Check,
  X,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Pencil,
} from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function TeamDetailPage() {
  const { teamId } = useParams() as { teamId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { success, error, warning } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Drive & Link Editing
  const [driveLink, setDriveLink] = useState("");
  const [linkedInPost, setLinkedInPost] = useState("");
  const [updatingLinks, setUpdatingLinks] = useState(false);

  // Team Name Editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Add Member Modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Staff Review State
  const [reviewing, setReviewing] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSecurityCode, setDeleteSecurityCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Request to Join State
  const [joinRequested, setJoinRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // ── HOOKS MUST ALL BE BEFORE EARLY RETURNS ──
  // Filter students who are not already in team (safe when team is null)
  const availableToAdd = useMemo(() => {
    const currentIds = team?.memberIds || [];
    const pool = allStudents.filter((s) => !currentIds.includes(s.uid));
    if (!memberSearch.trim()) return pool.slice(0, 10);
    const q = memberSearch.toLowerCase();
    return pool.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
    );
  }, [allStudents, team?.memberIds, memberSearch]);

  const loadTeamData = async () => {
    if (!teamId) return;
    try {
      const [teamData, studentsList] = await Promise.all([
        getTeam(teamId),
        getActiveStudents(),
      ]);
      if (!teamData) return;
      setTeam(teamData);
      setDriveLink(teamData.driveLink || "");
      setLinkedInPost(teamData.linkedInPost || "");
      setEditNameValue(teamData.name || "");
      setAllStudents(studentsList);

      // Fetch member profiles
      const memberPromises = teamData.memberIds.map((mId) => getUser(mId));
      const memberResults = await Promise.all(memberPromises);
      setMembers(memberResults.filter(Boolean) as User[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  if (loading) return <AppShell><LoadingState message="Loading team..." /></AppShell>;
  if (!team) return <AppShell><ErrorState message="Team not found." onRetry={() => router.push("/teams")} /></AppShell>;

  const isStaff = user?.role === "staff" || user?.role === "master";
  const isLeader = user?.uid === team.leaderId;
  const isCreator = user?.uid === team.createdBy;
  const isMember = user ? team.memberIds.includes(user.uid) : false;
  const canEdit = isStaff || isLeader || isCreator;
  const isPending = team.status === "pending_approval";

  // Save Links
  const handleSaveLinks = async () => {
    setUpdatingLinks(true);
    try {
      await updateTeam(team.id, { driveLink, linkedInPost });
      success("Team links updated successfully.");
      setTeam({ ...team, driveLink, linkedInPost });
    } catch {
      error("Failed to update links.");
    } finally {
      setUpdatingLinks(false);
    }
  };

  // Save Team Name
  const handleSaveTeamName = async () => {
    if (!editNameValue.trim()) {
      error("Team name cannot be empty.");
      return;
    }
    setSavingName(true);
    try {
      await updateTeam(team.id, { name: editNameValue.trim() });
      setTeam({ ...team, name: editNameValue.trim() });
      setIsEditingName(false);
      success("Team name updated successfully!");
    } catch {
      error("Failed to update team name.");
    } finally {
      setSavingName(false);
    }
  };

  // Assign Leader
  const handleAssignLeader = async (member: User) => {
    try {
      await updateTeam(team.id, {
        leaderId: member.uid,
        leaderName: member.name,
      });
      setTeam({ ...team, leaderId: member.uid, leaderName: member.name });
      success(`${member.name} assigned as Team Leader! ⭐`);
    } catch {
      error("Failed to assign leader.");
    }
  };

  // Add Member
  const handleAddMember = async (st: User) => {
    setAddingMember(true);
    try {
      await addMemberToTeam(team.id, st.uid, st.name);
      success(`Added ${st.name} to ${team.name}!`);
      setAddMemberOpen(false);
      await loadTeamData();
    } catch {
      error("Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (m: User) => {
    try {
      await removeMemberFromTeam(team.id, m.uid, m.name);
      success(`Removed ${m.name} from team.`);
      await loadTeamData();
    } catch {
      error("Failed to remove member.");
    }
  };

  // Staff Approve Team
  const handleApproveProposal = async () => {
    if (!user) return;
    setReviewing(true);
    try {
      await reviewTeamProposal(team.id, user.uid, user.name, "approved");
      success(`Team "${team.name}" approved successfully! 🎉`);
      await loadTeamData();
    } catch {
      error("Failed to approve team.");
    } finally {
      setReviewing(false);
    }
  };

  // Staff Reject Team
  const handleConfirmReject = async () => {
    if (!user) return;
    setReviewing(true);
    try {
      await reviewTeamProposal(
        team.id,
        user.uid,
        user.name,
        "rejected",
        rejectReason.trim() || undefined
      );
      success(`Team proposal rejected.`);
      setRejectModal(false);
      await loadTeamData();
    } catch {
      error("Failed to reject team.");
    } finally {
      setReviewing(false);
    }
  };

  // Finalize Team
  const handleFinalize = async () => {
    if (!team.leaderId) {
      error("A team must have a leader before it can be finalized.");
      return;
    }
    setFinalizing(true);
    try {
      await finalizeTeam(team.id);
      setTeam({ ...team, status: "finalized" });
      success("Team finalized and locked.");
    } catch {
      error("Failed to finalize team.");
    } finally {
      setFinalizing(false);
    }
  };

  // Delete/Archive
  const handleDelete = async () => {
    if (deleteSecurityCode !== "927624") {
      error("Invalid security code.");
      return;
    }
    setDeleting(true);
    try {
      // Delete team chat messages first
      try {
        const snap = await getDocs(collection(db, "teamChats", team.id, "messages"));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "teamChats", team.id, "messages", d.id))));
      } catch { /* no chat */ }
      // Delete doc completely
      await deleteDoc(doc(db, "teams", team.id));
      success("Team completely deleted.");
      router.push("/teams");
    } catch {
      error("Failed to delete team.");
    } finally {
      setDeleting(false);
    }
  };

  // Request to Join Team
  const handleRequestJoin = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      await addDoc(collection(db, "notifications"), {
        recipientId: team.leaderId || team.createdBy,
        title: "Team Join Request",
        message: `${user.name} has requested to join team "${team.name}".`,
        type: "team-join-request",
        read: false,
        priority: "normal",
        createdAt: new Date().toISOString(),
      });
      setJoinRequested(true);
      success("Request sent to team leader!");
    } catch {
      error("Failed to send join request.");
    } finally {
      setRequesting(false);
    }
  };

  // availableToAdd is computed above (before early returns) to satisfy Rules of Hooks

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto w-full mm-page-animate">
        {/* Top Header & Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link
            href="/teams"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#3B82F6", textDecoration: "none", padding: "6px 12px", borderRadius: 10, border: "1px solid #DBEAFE", background: "#EFF6FF", transition: "all 0.15s" }}
          >
            <ArrowLeft size={16} /> Back to Teams
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {canEdit && team.status !== "finalized" && (
              <Button
                variant="outline"
                size="md"
                icon={<UserPlus size={16} />}
                onClick={() => {
                  setMemberSearch("");
                  setAddMemberOpen(true);
                }}
              >
                Add Member
              </Button>
            )}

            {isStaff && team.status !== "finalized" && (
              <Button
                variant="primary"
                size="md"
                icon={<Lock size={16} />}
                loading={finalizing}
                onClick={handleFinalize}
              >
                Finalize Team
              </Button>
            )}

            {canEdit && (
              <Button
                variant="danger"
                size="md"
                icon={<Trash2 size={16} />}
                onClick={() => { setDeleteOpen(true); setDeleteSecurityCode(""); }}
              >
                Delete Team
              </Button>
            )}
          </div>
        </div>

        {/* Staff Approval Action Banner */}
        {isPending && isStaff && (
          <div style={{ padding: "1.25rem 1.5rem", background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", border: "1.5px solid #FCD34D", borderRadius: 18, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", boxShadow: "0 4px 12px rgba(252, 211, 77, 0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#FDE68A", color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={22} />
              </div>
              <div>
                <h2 style={{ fontWeight: 800, color: "#78350F", fontSize: "1rem" }}>
                  Team Proposal Awaiting Approval
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "#92400E", marginTop: 2 }}>
                  Submitted by {team.createdByName}. Review team composition and decide.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <Button
                variant="primary"
                size="md"
                icon={<Check size={18} />}
                loading={reviewing}
                onClick={handleApproveProposal}
              >
                Approve Team
              </Button>
              <Button
                variant="destructive"
                size="md"
                icon={<X size={18} />}
                disabled={reviewing}
                onClick={() => {
                  setRejectReason("");
                  setRejectModal(true);
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Rejection notice */}
        {team.status === "rejected" && team.reviewFeedback && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1">
            <p className="text-xs font-bold text-red-800">Review Feedback / Reason:</p>
            <p className="text-sm text-red-700">{team.reviewFeedback}</p>
          </div>
        )}

        {/* Hero Card */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "1.75rem", boxShadow: "0 4px 16px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                {!isEditingName ? (
                  <>
                    <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", lineHeight: 1.2, overflowWrap: "anywhere" }}>{team.name}</h1>
                    {isStaff && (
                      <button onClick={() => setIsEditingName(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "#F1F5F9", color: "#64748B", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
                        <Pencil size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", width: "100%", maxWidth: 500 }}>
                    <input
                      type="text"
                      className="mm-input"
                      style={{ flex: 1, fontSize: "1.25rem", fontWeight: 700 }}
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      placeholder="Enter new team name"
                      autoFocus
                    />
                    <Button size="md" variant="primary" loading={savingName} onClick={handleSaveTeamName}>Save</Button>
                    <Button size="md" variant="secondary" onClick={() => { setIsEditingName(false); setEditNameValue(team.name); }}>Cancel</Button>
                  </div>
                )}
                <Badge variant={teamStatusBadge(team.status).variant}>
                  {teamStatusBadge(team.status).label}
                </Badge>
              </div>

              {team.eventName && (
                <p style={{ fontSize: "0.8125rem", color: "#2563EB", fontWeight: 700, marginTop: 6 }}>
                  Event: {team.eventName}
                </p>
              )}

              {team.description && (
                <p style={{ fontSize: "0.9375rem", color: "#64748B", lineHeight: 1.6, marginTop: 10 }}>{team.description}</p>
              )}
            </div>

            {/* Only students (non-staff, non-member) see Request to Join */}
            {!isMember && !isStaff && team.status !== "finalized" && (
              <Button
                variant={joinRequested ? "secondary" : "primary"}
                size="md"
                icon={<UserPlus size={18} />}
                disabled={joinRequested}
                loading={requesting}
                onClick={handleRequestJoin}
              >
                {joinRequested ? "Request Sent" : "Request to Join"}
              </Button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", paddingTop: "0.875rem", borderTop: "1px solid #F1F5F9", fontSize: "0.8125rem", color: "#64748B" }}>
            <span>
              Created by <strong style={{ color: "#334155" }}>{team.createdByName}</strong>
            </span>
            {team.leaderName && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 700, color: "#92400E", background: "#FEF3C7", padding: "4px 12px", borderRadius: 8, border: "1px solid #FDE68A" }}>
                ⭐ Leader: {team.leaderName}
              </span>
            )}
            {team.reviewedByName && (
              <span style={{ color: "#94A3B8" }}>
                Reviewed by <strong style={{ color: "#64748B" }}>{team.reviewedByName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Member Grid */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "1.5rem", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid #F1F5F9" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>
              Team Members ({members.length})
            </h2>
            {canEdit && team.status !== "finalized" && (
              <Button
                variant="outline"
                size="md"
                icon={<UserPlus size={16} />}
                onClick={() => {
                  setMemberSearch("");
                  setAddMemberOpen(true);
                }}
              >
                Add Member
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => {
              const isMemberLeader = m.uid === team.leaderId;
              return (
                <div
                  key={m.uid}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem", borderRadius: 14, border: isMemberLeader ? "1.5px solid #FDE68A" : "1.5px solid #E2E8F0", background: isMemberLeader ? "#FFFBEB" : "#F8FAFC", transition: "all 0.15s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
                    <Avatar name={m.name} photoUrl={m.profilePhoto} size="md" />
                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                      <Link
                        href={`/students/${m.uid}`}
                        style={{ display: "block", fontWeight: 700, color: "#0F172A", fontSize: "0.9375rem", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {m.name}
                      </Link>
                      <p style={{ fontSize: "0.75rem", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                        {m.department} - {m.year} Yr ({m.section})
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0, marginLeft: "0.5rem" }}>
                    {isMemberLeader ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.6875rem", fontWeight: 800, color: "#D97706", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 99, padding: "4px 12px" }}>
                        <Star size={12} fill="currentColor" /> Leader
                      </span>
                    ) : (
                      canEdit &&
                      team.status !== "finalized" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={() => handleAssignLeader(m)}
                            style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600, padding: "5px 12px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                          >
                            Make Leader
                          </button>
                          <button
                            onClick={() => handleRemoveMember(m)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: "none", background: "#FEF2F2", color: "#EF4444", cursor: "pointer" }}
                            title="Remove member"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Links & Documentation */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "1.5rem", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", paddingBottom: "0.75rem", borderBottom: "1px solid #F1F5F9", letterSpacing: "-0.01em" }}>
            Documentation & External Links
          </h2>

          {canEdit ? (
            <div className="space-y-4">
              <div>
                <label className="mm-label">Google Drive Folder URL</label>
                <div className="flex gap-2">
                  <input
                    className="mm-input"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                  />
                  {driveLink && (
                    <a href={driveLink} target="_blank" rel="noreferrer">
                      <Button variant="outline" icon={<Folder size={16} />}>
                        Open
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="mm-label">LinkedIn Post URL</label>
                <div className="flex gap-2">
                  <input
                    className="mm-input"
                    placeholder="https://www.linkedin.com/posts/..."
                    value={linkedInPost}
                    onChange={(e) => setLinkedInPost(e.target.value)}
                  />
                  {linkedInPost && (
                    <a href={linkedInPost} target="_blank" rel="noreferrer">
                      <Button variant="outline" icon={<Share2 size={16} />}>
                        Open
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                loading={updatingLinks}
                onClick={handleSaveLinks}
              >
                Save Links
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {team.driveLink ? (
                <a
                  href={team.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-700 font-semibold text-sm hover:underline"
                >
                  <Folder size={18} /> Open Google Drive Folder
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No Google Drive documentation folder configured yet.
                </p>
              )}

              {team.linkedInPost && (
                <a
                  href={team.linkedInPost}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-700 font-semibold text-sm hover:underline"
                >
                  <Share2 size={18} /> View LinkedIn Achievement Post
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Add Member to Team"
        description="Search students by name, reg no, department, or section."
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setAddMemberOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search students..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {availableToAdd.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No matching available students found.
              </p>
            ) : (
              availableToAdd.map((st) => (
                <div
                  key={st.uid}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={st.name} photoUrl={st.profilePhoto} size="sm" />
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 text-xs truncate">
                        {st.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {st.registerNumber ? `${st.registerNumber} · ` : ""}
                        {st.department || "ECE"} · {st.year || "Yr"} · Sec {st.section || "A"}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Plus size={13} />}
                    loading={addingMember}
                    onClick={() => handleAddMember(st)}
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject Team Proposal"
        description="Provide feedback to the team creator."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={reviewing}
              onClick={handleConfirmReject}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="mm-label">Reason / Feedback</label>
          <textarea
            className="mm-input resize-none"
            rows={3}
            placeholder="Explain why this team proposal is rejected or needs changes..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Confirm Delete Security Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteSecurityCode(""); }}
        title={`Delete Team: ${team.name}`}
        description="This action is permanent and cannot be undone. Enter the 6-digit security code to confirm."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeleteSecurityCode(""); }}>Cancel</Button>
            <Button variant="destructive" loading={deleting} onClick={handleDelete} disabled={deleteSecurityCode.length !== 6}>
              Permanently Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div style={{ padding: "0.75rem", background: "var(--red-50)", border: "1px solid var(--red-100)", borderRadius: "10px" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--red-700)", fontWeight: 600 }}>
              ⚠️ This will completely delete the team and all chat messages from the database. This action cannot be reversed.
            </p>
          </div>
          <label className="mm-label">Security Code <span style={{ color: "var(--color-danger)" }}>*</span></label>
          <input
            className="mm-input"
            type="password"
            placeholder="Enter 6-digit PIN"
            value={deleteSecurityCode}
            onChange={(e) => setDeleteSecurityCode(e.target.value)}
            maxLength={6}
            style={{ fontFamily: "monospace", letterSpacing: "0.2em", textAlign: "center", fontSize: "1.25rem" }}
          />
        </div>
      </Modal>
    </AppShell>
  );
}
