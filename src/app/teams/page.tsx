"use client";

// ============================================================
// MentorMesh — Teams List Page, Member Selection & Staff Approval Workflow
// ============================================================
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTeams,
  createTeam,
  getEvents,
  getActiveStudents,
  reviewTeamProposal,
} from "@/lib/firebase/firestore";
import type { Team, Event, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, teamStatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  UsersRound,
  Plus,
  Layers,
  Star,
  Check,
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";

export default function TeamsPage() {
  return (
    <AppShell>
      <TeamsContent />
    </AppShell>
  );
}

function TeamsContent() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Create Team Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [creating, setCreating] = useState(false);

  // Staff Review Modal State
  const [rejectingTeam, setRejectingTeam] = useState<Team | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const isStaff = user?.role === "staff" || user?.role === "master";

  const loadData = async () => {
    try {
      const [tmList, evList, stList] = await Promise.all([
        getTeams(),
        getEvents(),
        getActiveStudents(),
      ]);
      setTeams(tmList);
      setEvents(evList);
      setAvailableStudents(stList);
    } catch (err) {
      console.error("Error loading teams data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When opening Create Modal, pre-populate user as member & leader
  const handleOpenCreate = () => {
    if (user) {
      setSelectedMemberIds([user.uid]);
      setSelectedLeaderId(user.uid);
    }
    setName("");
    setEventId("");
    setDescription("");
    setStudentSearch("");
    setSubmitForApproval(true);
    setCreateOpen(true);
  };

  // Toggle member selection in Create modal
  const handleToggleMember = (st: User) => {
    if (selectedMemberIds.includes(st.uid)) {
      const next = selectedMemberIds.filter((id) => id !== st.uid);
      setSelectedMemberIds(next);
      if (selectedLeaderId === st.uid) {
        setSelectedLeaderId(next[0] || "");
      }
    } else {
      const next = [...selectedMemberIds, st.uid];
      setSelectedMemberIds(next);
      if (!selectedLeaderId) {
        setSelectedLeaderId(st.uid);
      }
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    if (selectedMemberIds.length === 0) {
      warning("Please select at least one team member.");
      return;
    }

    setCreating(true);
    const selectedEv = events.find((ev) => ev.id === eventId);

    // Collect member names
    const memberNames = selectedMemberIds.map((id) => {
      if (id === user.uid) return user.name;
      const found = availableStudents.find((s) => s.uid === id);
      return found?.name || id;
    });

    const leaderObj =
      selectedLeaderId === user.uid
        ? user
        : availableStudents.find((s) => s.uid === selectedLeaderId);

    const initialStatus = isStaff
      ? "approved"
      : submitForApproval
      ? "pending_approval"
      : "draft";

    try {
      await createTeam({
        name: name.trim(),
        memberIds: selectedMemberIds,
        memberNames,
        leaderId: selectedLeaderId || selectedMemberIds[0] || user.uid,
        leaderName: leaderObj?.name || user.name,
        eventId: eventId || undefined,
        eventName: selectedEv?.name || undefined,
        status: initialStatus,
        description: description.trim() || undefined,
        createdBy: user.uid,
        createdByName: user.name,
      });

      if (submitForApproval && !isStaff) {
        success(`Team "${name}" created & submitted for staff approval! 🚀`);
      } else {
        success(`Team "${name}" created successfully.`);
      }

      setCreateOpen(false);
      await loadData();
    } catch (err) {
      console.error("Team create error:", err);
      error("Failed to create team. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Staff 1-click Approve
  const handleApproveTeam = async (t: Team) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await reviewTeamProposal(t.id, user.uid, user.name, "approved");
      success(`Team "${t.name}" APPROVED successfully! 🎉`);
      await loadData();
    } catch {
      error("Failed to approve team.");
    } finally {
      setActionLoading(false);
    }
  };

  // Staff Reject
  const handleConfirmReject = async () => {
    if (!rejectingTeam || !user) return;
    setActionLoading(true);
    try {
      await reviewTeamProposal(
        rejectingTeam.id,
        user.uid,
        user.name,
        "rejected",
        rejectReason.trim() || undefined
      );
      success(`Team "${rejectingTeam.name}" has been marked as rejected.`);
      setRejectingTeam(null);
      setRejectReason("");
      await loadData();
    } catch {
      error("Failed to reject team.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered members in picker
  const filteredAvailableStudents = useMemo(() => {
    if (!studentSearch.trim()) return availableStudents.slice(0, 15);
    const q = studentSearch.toLowerCase();
    return availableStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.section && s.section.toLowerCase().includes(q))
    );
  }, [availableStudents, studentSearch]);

  const pendingCount = teams.filter((t) => t.status === "pending_approval").length;

  const filteredTeams = useMemo(() => {
    if (filterStatus === "all") return teams;
    if (filterStatus === "pending") return teams.filter((t) => t.status === "pending_approval");
    if (filterStatus === "approved")
      return teams.filter((t) => t.status === "approved" || t.status === "active");
    return teams.filter((t) => t.status === filterStatus);
  }, [teams, filterStatus]);

  const tabs = [
    { id: "all", label: "All Teams", count: teams.length },
    ...(pendingCount > 0 || isStaff
      ? [{ id: "pending", label: "Pending Approval", count: pendingCount }]
      : []),
    { id: "approved", label: "Approved / Active" },
    { id: "draft", label: "Draft" },
    { id: "finalized", label: "Finalized" },
  ];

  return (
    <div className="space-y-6 w-full mm-page-animate">
      <PageHeader
        icon={<UsersRound size={20} />}
        iconClass="bg-blue-100 text-blue-600"
        title="Teams"
        subtitle="Form, manage, and explore project teams for hackathons and group projects."
        actions={
          <div className="flex items-center gap-2">
            {isStaff && (
              <Link href="/team-builder">
                <Button variant="outline" size="sm" icon={<Layers size={14} />}>
                  Team Builder
                </Button>
              </Link>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleOpenCreate}
            >
              Create Team
            </Button>
          </div>
        }
      />

      <Tabs tabs={tabs} activeTab={filterStatus} onTabChange={setFilterStatus} />

      {/* Grid */}
      {loading ? (
        <LoadingState message="Loading teams..." />
      ) : filteredTeams.length === 0 ? (
        <EmptyState
          icon={<UsersRound size={40} />}
          title={`No ${filterStatus !== "all" ? filterStatus : ""} teams found`}
          description="Create your first team to get started."
          action={{ label: "Create Team", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              currentUserId={user?.uid}
              isStaff={isStaff}
              onApprove={() => handleApproveTeam(t)}
              onReject={() => {
                setRejectingTeam(t);
                setRejectReason("");
              }}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Team"
        description="Form your team, select members from any section or department, and submit for mentor approval."
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-team-form"
              variant="primary"
              loading={creating}
              icon={<Sparkles size={15} />}
            >
              {isStaff
                ? "Create Approved Team"
                : submitForApproval
                ? "Submit for Staff Approval"
                : "Save as Draft"}
            </Button>
          </>
        }
      >
        <form id="create-team-form" onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="mm-label">
              Team Name <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              className="mm-input"
              placeholder="e.g. Team ByteCrafters / VLSI Explorers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mm-label">Associated Event (optional)</label>
              <select
                className="mm-input mm-select"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              >
                <option value="">No specific event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mm-label">Team Leader</label>
              <select
                className="mm-input mm-select"
                value={selectedLeaderId}
                onChange={(e) => setSelectedLeaderId(e.target.value)}
              >
                {selectedMemberIds.map((id) => {
                  const s =
                    id === user?.uid
                      ? user
                      : availableStudents.find((st) => st.uid === id);
                  return (
                    <option key={id} value={id}>
                      {s?.name || id} {id === user?.uid ? "(You)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Member Selection Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="mm-label mb-0">
                Select Team Members ({selectedMemberIds.length} chosen)
              </label>
              <span className="text-xs text-slate-500">Click to add/remove</span>
            </div>

            {/* Selected Member Chips */}
            {selectedMemberIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {selectedMemberIds.map((id) => {
                  const s =
                    id === user?.uid
                      ? user
                      : availableStudents.find((st) => st.uid === id);
                  const isLeader = id === selectedLeaderId;
                  return (
                    <span
                      key={id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        isLeader
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {isLeader && <Star size={11} fill="currentColor" />}
                      {s?.name || id} {id === user?.uid ? "(You)" : ""}
                      {id !== user?.uid && (
                        <button
                          type="button"
                          onClick={() => handleToggleMember(s || ({ uid: id } as User))}
                          className="hover:text-red-600 cursor-pointer ml-1"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Student Search & List */}
            <div className="border border-slate-200 rounded-xl p-2.5 space-y-2 bg-white">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search students by name, reg no, dept, sec..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {filteredAvailableStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No matching students found.
                  </p>
                ) : (
                  filteredAvailableStudents.map((st) => {
                    const isSelected = selectedMemberIds.includes(st.uid);
                    return (
                      <div
                        key={st.uid}
                        onClick={() => handleToggleMember(st)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? "bg-blue-50/80 border border-blue-200 text-blue-900 font-semibold"
                            : "hover:bg-slate-50 border border-transparent text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={st.name} photoUrl={st.profilePhoto} size="sm" />
                          <div className="truncate">
                            <p className="truncate font-medium">
                              {st.name} {st.uid === user?.uid ? "(You)" : ""}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {st.registerNumber ? `${st.registerNumber} · ` : ""}
                              {st.department || "ECE"} · {st.year || "Yr"} · Sec {st.section || "A"}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-transparent hover:border-blue-400">
                              +
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mm-label">Project Description (optional)</label>
            <textarea
              className="mm-input resize-none"
              rows={2}
              placeholder="Briefly describe what your team will work on..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {!isStaff && (
            <div className="flex items-center gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <input
                type="checkbox"
                id="submit-approval-toggle"
                checked={submitForApproval}
                onChange={(e) => setSubmitForApproval(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor="submit-approval-toggle"
                className="text-xs text-blue-900 font-medium cursor-pointer"
              >
                Submit proposal directly to Staff / Admin Dashboard for approval
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectingTeam}
        onClose={() => setRejectingTeam(null)}
        title={rejectingTeam ? `Reject Team: ${rejectingTeam.name}` : "Reject Team"}
        description="Provide feedback to the student leader explaining the rejection or requesting modifications."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectingTeam(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={actionLoading}
              onClick={handleConfirmReject}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="mm-label">Reason / Feedback (optional)</label>
          <textarea
            className="mm-input resize-none"
            rows={3}
            placeholder="e.g. Please add 1 more student from ECE or rename team..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

function TeamCard({
  team,
  currentUserId,
  isStaff,
  onApprove,
  onReject,
  actionLoading,
}: {
  team: Team;
  currentUserId?: string;
  isStaff?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  actionLoading?: boolean;
}) {
  const isPending = team.status === "pending_approval";
  const isRejected = team.status === "rejected";

  return (
    <div
      className={`mm-card flex flex-col justify-between space-y-4 transition-all ${
        isPending
          ? "border-amber-300 bg-amber-50/20 shadow-sm"
          : isRejected
          ? "border-red-200 bg-red-50/10"
          : "hover:border-blue-300"
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-slate-900 text-base leading-snug">{team.name}</h3>
          <Badge variant={teamStatusBadge(team.status).variant}>
            {teamStatusBadge(team.status).label}
          </Badge>
        </div>

        {team.eventName && (
          <p className="text-xs text-blue-600 font-semibold">{team.eventName}</p>
        )}

        {team.description && (
          <p className="text-xs text-slate-600 line-clamp-2">{team.description}</p>
        )}

        {/* Member names */}
        <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
          <p>
            <span className="font-semibold text-slate-700">
              Members ({team.memberIds.length}):
            </span>
          </p>
          <p className="text-slate-500 truncate mt-0.5">
            {team.memberNames?.join(", ") || `${team.memberIds.length} members`}
          </p>
        </div>

        {team.leaderName && (
          <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 border border-amber-100">
            <Star size={10} fill="currentColor" /> Leader: {team.leaderName}
          </p>
        )}

        {/* Staff reviewer note or rejection note */}
        {team.reviewedByName && (
          <p className="text-[11px] text-slate-500">
            Reviewed by <strong>{team.reviewedByName}</strong>
          </p>
        )}

        {team.reviewFeedback && isRejected && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <strong>Feedback:</strong> {team.reviewFeedback}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        {/* Staff Quick Action Bar for Pending Teams */}
        {isStaff && isPending && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              className="flex-1 text-xs"
              icon={<Check size={14} />}
              loading={actionLoading}
              onClick={onApprove}
            >
              Approve Team
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-red-600 hover:bg-red-50"
              icon={<X size={14} />}
              disabled={actionLoading}
              onClick={onReject}
            >
              Reject
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>By {team.createdByName}</span>
          <Link
            href={`/teams/${team.id}`}
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
