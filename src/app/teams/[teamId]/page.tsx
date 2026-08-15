"use client";

// ============================================================
// MentorMesh — Team Detail & Member Management Page
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getTeam, updateTeam, getUser, finalizeTeam, deleteTeam } from "@/lib/firebase/firestore";
import type { Team, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Star, UserPlus, Folder, Share2, Shield, Lock, Trash2, Check, X } from "lucide-react";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function TeamDetailPage() {
  const { teamId } = useParams() as { teamId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { success, error } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Drive & Link Editing
  const [driveLink, setDriveLink] = useState("");
  const [linkedInPost, setLinkedInPost] = useState("");
  const [updatingLinks, setUpdatingLinks] = useState(false);

  // Dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Request to Join State
  const [joinRequested, setJoinRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!teamId) return;
      try {
        const data = await getTeam(teamId);
        if (!data) return;
        setTeam(data);
        setDriveLink(data.driveLink || "");
        setLinkedInPost(data.linkedInPost || "");

        // Fetch member profiles
        const memberPromises = data.memberIds.map((mId) => getUser(mId));
        const memberResults = await Promise.all(memberPromises);
        setMembers(memberResults.filter(Boolean) as User[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId]);

  if (loading) return <AppShell><LoadingState message="Loading team..." /></AppShell>;
  if (!team) return <AppShell><ErrorState message="Team not found." retry={() => router.push("/teams")} /></AppShell>;

  const isStaff = user?.role === "staff" || user?.role === "master";
  const isLeader = user?.uid === team.leaderId;
  const isMember = user ? team.memberIds.includes(user.uid) : false;
  const canEdit = isStaff || isLeader;

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
      // Notify team leader or staff
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

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top Header & Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/teams" className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Teams
          </Link>

          <div className="flex items-center gap-2">
            {isStaff && team.status !== "finalized" && (
              <Button variant="primary" size="sm" icon={<Lock size={14} />} loading={finalizing} onClick={handleFinalize}>
                Finalize Team
              </Button>
            )}
            {isStaff && (
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>
                Archive Team
              </Button>
            )}
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
                <span className={`mm-badge ${team.status === "finalized" ? "mm-badge-finalized" : "mm-badge-draft"}`}>
                  {team.status.toUpperCase()}
                </span>
              </div>

              {team.eventName && (
                <p className="text-xs text-blue-600 font-semibold mt-1">Event: {team.eventName}</p>
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

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Created by <strong>{team.createdByName}</strong></span>
            {team.leaderName && (
              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                ⭐ Leader: {team.leaderName}
              </span>
            )}
          </div>
        </div>

        {/* Member Grid */}
        <div className="mm-card space-y-4">
          <h2 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-2">
            Team Members ({members.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => {
              const isMemberLeader = m.uid === team.leaderId;
              return (
                <div key={m.uid} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} photoUrl={m.profilePhoto} size="md" />
                    <div>
                      <Link href={`/students/${m.uid}`} className="font-bold text-slate-900 text-sm hover:text-blue-600">
                        {m.name}
                      </Link>
                      <p className="text-xs text-slate-500">{m.department} - {m.year} Yr ({m.section})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMemberLeader ? (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star size={12} /> Leader
                      </span>
                    ) : (
                      canEdit && team.status !== "finalized" && (
                        <button
                          onClick={() => handleAssignLeader(m)}
                          className="text-[11px] text-slate-500 hover:text-amber-600 font-medium px-2 py-0.5 rounded border border-slate-200 hover:border-amber-400"
                        >
                          Make Leader
                        </button>
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
                      <Button variant="outline" icon={<Folder size={16} />}>Open</Button>
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
                      <Button variant="outline" icon={<Share2 size={16} />}>Open</Button>
                    </a>
                  )}
                </div>
              </div>

              <Button variant="primary" size="sm" loading={updatingLinks} onClick={handleSaveLinks}>
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
                <p className="text-xs text-slate-400 italic">No Google Drive documentation folder configured yet.</p>
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
