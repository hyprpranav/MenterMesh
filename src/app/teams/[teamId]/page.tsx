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
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Request to Join State
  const [joinRequested, setJoinRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

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
    setDeleting(true);
    try {
      await deleteTeam(team.id);
      success("Team archived.");
      router.push("/teams");
    } catch {
      error("Failed to archive team.");
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

  // Filter students who are not already in team
  const availableToAdd = useMemo(() => {
    const currentIds = team.memberIds || [];
    const pool = allStudents.filter((s) => !currentIds.includes(s.uid));
    if (!memberSearch.trim()) return pool.slice(0, 10);
    const q = memberSearch.toLowerCase();
    return pool.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
    );
  }, [allStudents, team.memberIds, memberSearch]);

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto w-full mm-page-animate">
        {/* Top Header & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/teams"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back to Teams
          </Link>

          <div className="flex items-center gap-2">
            {canEdit && team.status !== "finalized" && (
              <Button
                variant="outline"
                size="sm"
                icon={<UserPlus size={14} />}
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
                size="sm"
                icon={<Lock size={14} />}
                loading={finalizing}
                onClick={handleFinalize}
              >
                Finalize Team
              </Button>
            )}

            {canEdit && (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setDeleteOpen(true)}
              >
                Archive Team
              </Button>
            )}
          </div>
        </div>

        {/* Staff Approval Action Banner */}
        {isPending && isStaff && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="font-bold text-amber-950 text-sm">
                  Team Proposal Awaiting Staff Approval
                </h2>
                <p className="text-xs text-amber-800">
                  Submitted by {team.createdByName}. Review team composition and decide.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                icon={<Check size={15} />}
                loading={reviewing}
                onClick={handleApproveProposal}
              >
                Approve Team
              </Button>
              <Button
                variant="destructive"
                size="sm"
                icon={<X size={15} />}
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
                <Badge variant={teamStatusBadge(team.status).variant}>
                  {teamStatusBadge(team.status).label}
                </Badge>
              </div>

              {team.eventName && (
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  Event: {team.eventName}
                </p>
              )}

              {team.description && (
                <p className="text-sm text-slate-600 mt-2">{team.description}</p>
              )}
            </div>

            {!isMember && team.status !== "finalized" && (
              <Button
                variant={joinRequested ? "secondary" : "primary"}
                size="sm"
                icon={<UserPlus size={16} />}
                disabled={joinRequested}
                loading={requesting}
                onClick={handleRequestJoin}
              >
                {joinRequested ? "Request Sent" : "Request to Join"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100 flex-wrap">
            <span>
              Created by <strong>{team.createdByName}</strong>
            </span>
            {team.leaderName && (
              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                ⭐ Leader: {team.leaderName}
              </span>
            )}
            {team.reviewedByName && (
              <span className="text-slate-500">
                Reviewed by <strong>{team.reviewedByName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Member Grid */}
        <div className="mm-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-900 text-lg">
              Team Members ({members.length})
            </h2>
            {canEdit && team.status !== "finalized" && (
              <Button
                variant="outline"
                size="sm"
                icon={<UserPlus size={14} />}
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
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={m.name} photoUrl={m.profilePhoto} size="md" />
                    <div className="truncate">
                      <Link
                        href={`/students/${m.uid}`}
                        className="font-bold text-slate-900 text-sm hover:text-blue-600 truncate block"
                      >
                        {m.name}
                      </Link>
                      <p className="text-xs text-slate-500 truncate">
                        {m.department} - {m.year} Yr ({m.section})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMemberLeader ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                        <Star size={12} fill="currentColor" /> Leader
                      </span>
                    ) : (
                      canEdit &&
                      team.status !== "finalized" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAssignLeader(m)}
                            className="text-[11px] text-slate-600 hover:text-amber-600 font-medium px-2 py-0.5 rounded border border-slate-200 hover:border-amber-400 bg-white cursor-pointer"
                          >
                            Make Leader
                          </button>
                          <button
                            onClick={() => handleRemoveMember(m)}
                            className="text-[11px] text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                            title="Remove member"
                          >
                            <X size={14} />
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
        <div className="mm-card space-y-4">
          <h2 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-2">
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

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deleteOpen}
        title={`Archive Team "${team.name}"?`}
        message="This team will be archived and hidden from active team lists."
        confirmLabel="Archive Team"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </AppShell>
  );
}
