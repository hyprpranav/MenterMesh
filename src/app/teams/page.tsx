"use client";

// ============================================================
// MentorMesh — Teams List Page, Member Selection & Staff Approval Workflow
// ============================================================
import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTeams,
  createTeam,
  getEvents,
  getActiveStudents,
  reviewTeamProposal,
  sendTeamMessage,
  subscribeToTeamChat,
  type TeamChatMessage,
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
  Info,
  MessageCircle,
  ArrowLeft,
  Send,
  Calendar,
  Shield,
  Users,
  ChevronRight,
} from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";

// ── Helpers ────────────────────────────────────────────────────
function formatDateTime(val: any): string {
  if (!val) return "—";
  let ms = 0;
  if (typeof val === "object" && typeof val.seconds === "number") {
    ms = val.seconds * 1000;
  } else if (typeof val === "string") {
    ms = new Date(val).getTime();
  } else if (typeof val === "number") {
    ms = val;
  }
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatChatTime(val: any): string {
  if (!val) return "";
  let ms = 0;
  if (typeof val === "object" && typeof val.seconds === "number") {
    ms = val.seconds * 1000;
  } else if (typeof val === "string") {
    ms = new Date(val).getTime();
  } else if (typeof val === "number") {
    ms = val;
  }
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Main Page ──────────────────────────────────────────────────
export default function TeamsPage() {
  return (
    <AppShell>
      <TeamsContent />
    </AppShell>
  );
}

// ── Teams Content ──────────────────────────────────────────────
function TeamsContent() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Create Team Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [creating, setCreating] = useState(false);

  // Staff Reject Modal
  const [rejectingTeam, setRejectingTeam] = useState<Team | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Team Info Panel
  const [infoTeam, setInfoTeam] = useState<Team | null>(null);
  const [infoView, setInfoView] = useState<"info" | "chat">("info");

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

  const handleToggleMember = (st: User) => {
    if (selectedMemberIds.includes(st.uid)) {
      const next = selectedMemberIds.filter((id) => id !== st.uid);
      setSelectedMemberIds(next);
      if (selectedLeaderId === st.uid) setSelectedLeaderId(next[0] || "");
    } else {
      const next = [...selectedMemberIds, st.uid];
      setSelectedMemberIds(next);
      if (!selectedLeaderId) setSelectedLeaderId(st.uid);
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
    const memberNames = selectedMemberIds.map((id) => {
      if (id === user.uid) return user.name;
      return availableStudents.find((s) => s.uid === id)?.name || id;
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
      success(
        submitForApproval && !isStaff
          ? `Team "${name}" created & submitted for staff approval! 🚀`
          : `Team "${name}" created successfully.`
      );
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      console.error("Team create error:", err);
      error("Failed to create team. Please try again.");
    } finally {
      setCreating(false);
    }
  };

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

  const handleOpenInfo = (team: Team) => {
    setInfoTeam(team);
    setInfoView("info");
  };

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
              onViewInfo={() => handleOpenInfo(t)}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* ── Team Info + Chat Panel ────────────────────────── */}
      {infoTeam && (
        <TeamInfoPanel
          team={infoTeam}
          currentUser={user}
          view={infoView}
          onViewChange={setInfoView}
          onClose={() => setInfoTeam(null)}
        />
      )}

      {/* ── Create Team Modal ─────────────────────────────── */}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="mm-label mb-0">
                Select Team Members ({selectedMemberIds.length} chosen)
              </label>
              <span className="text-xs text-slate-500">Click to add/remove</span>
            </div>

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
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${isLeader
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
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${isSelected
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

      {/* ── Reject Modal ─────────────────────────────────── */}
      <Modal
        open={!!rejectingTeam}
        onClose={() => setRejectingTeam(null)}
        title={rejectingTeam ? `Reject Team: ${rejectingTeam.name}` : "Reject Team"}
        description="Provide feedback to the student leader explaining the rejection."
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

// ── TeamCard ───────────────────────────────────────────────────
function TeamCard({
  team,
  currentUserId,
  isStaff,
  onApprove,
  onReject,
  onViewInfo,
  actionLoading,
}: {
  team: Team;
  currentUserId?: string;
  isStaff?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onViewInfo: () => void;
  actionLoading?: boolean;
}) {
  const isPending = team.status === "pending_approval";
  const isRejected = team.status === "rejected";

  return (
    <div
      className={`mm-card flex flex-col justify-between space-y-4 transition-all ${isPending
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
          <div className="flex items-center gap-2">
            {/* View Info Button */}
            <button
              onClick={onViewInfo}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
            >
              <Info size={12} />
              View Info
            </button>
            <Link
              href={`/teams/${team.id}`}
              className="font-semibold text-slate-500 hover:text-slate-700 hover:underline"
            >
              Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TeamInfoPanel — slide-over with Info & WhatsApp Chat ───────
function TeamInfoPanel({
  team,
  currentUser,
  view,
  onViewChange,
  onClose,
}: {
  team: Team;
  currentUser: any;
  view: "info" | "chat";
  onViewChange: (v: "info" | "chat") => void;
  onClose: () => void;
}) {
  // Chat state
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    const unsub = subscribeToTeamChat(team.id, setMessages);
    return () => unsub();
  }, [team.id]);

  // Auto-scroll to bottom when messages change and in chat view
  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  // Focus input when switching to chat view
  useEffect(() => {
    if (view === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [view]);

  const handleSend = async () => {
    if (!chatText.trim() || !currentUser) return;
    setSending(true);
    try {
      await sendTeamMessage(
        team.id,
        currentUser.uid,
        currentUser.name,
        chatText.trim(),
        currentUser.profilePhoto
      );
      setChatText("");
      inputRef.current?.focus();
    } catch (e) {
      console.error("Send message error:", e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 55,
          animation: "mm-overlay-in 0.2s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 100vw)",
          background: "var(--color-surface)",
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-xl)",
          animation: "mm-panel-in 0.28s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* ── Panel Header ── */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexShrink: 0,
            background: "var(--color-surface)",
          }}
        >
          {view === "chat" ? (
            <button
              onClick={() => onViewChange("info")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: "var(--color-surface-2)",
                cursor: "pointer",
                color: "var(--color-muted)",
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--color-primary-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users size={18} color="var(--color-primary)" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--color-text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {view === "chat" ? `💬 ${team.name}` : team.name}
            </p>
            {view === "chat" && (
              <p style={{ fontSize: 11, color: "var(--color-muted)" }}>
                {team.memberIds.length} members · Group Chat
              </p>
            )}
            {view === "info" && (
              <p style={{ fontSize: 11, color: "var(--color-muted)" }}>
                Team Information
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "var(--color-surface-2)",
              cursor: "pointer",
              color: "var(--color-muted)",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Info View ── */}
        {view === "info" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Status Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "var(--color-surface-2)",
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                  Status
                </span>
                <Badge variant={teamStatusBadge(team.status).variant}>
                  {teamStatusBadge(team.status).label}
                </Badge>
              </div>

              {/* Description */}
              {team.description && (
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    background: "#EFF6FF",
                    borderRadius: 12,
                    border: "1px solid #DBEAFE",
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", marginBottom: 4 }}>
                    About
                  </p>
                  <p style={{ fontSize: 13, color: "#1D4ED8", lineHeight: 1.55 }}>
                    {team.description}
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div
                style={{
                  padding: "0.875rem 1rem",
                  background: "var(--color-surface)",
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", marginBottom: 2 }}>
                  Timeline
                </p>

                {/* Submitted */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#FEF3C7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={14} color="#D97706" />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)" }}>
                      Submitted by {team.createdByName}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                      {formatDateTime(team.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Approved / Reviewed */}
                {team.reviewedByName && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: team.status === "rejected" ? "#FFE4E6" : "#DCFCE7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Shield
                        size={14}
                        color={team.status === "rejected" ? "#DC2626" : "#16A34A"}
                      />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)" }}>
                        {team.status === "rejected" ? "Rejected" : "Approved"} by{" "}
                        {team.reviewedByName}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                        {formatDateTime(team.reviewedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Finalized */}
                {team.finalizedAt && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "#EFF6FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={14} color="#2563EB" />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)" }}>
                        Finalized
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                        {formatDateTime(team.finalizedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Members List */}
              <div
                style={{
                  background: "var(--color-surface)",
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Users size={14} color="var(--color-muted)" />
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                    Members ({team.memberIds.length})
                  </p>
                </div>

                <div style={{ padding: "0.5rem" }}>
                  {(team.memberNames || []).map((memberName, idx) => {
                    const isLeader = memberName === team.leaderName;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.625rem",
                          padding: "0.5rem 0.625rem",
                          borderRadius: 8,
                          background: isLeader ? "#FFFBEB" : "transparent",
                        }}
                      >
                        <Avatar name={memberName} size="sm" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: isLeader ? 700 : 500,
                              color: "var(--color-text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {memberName}
                          </p>
                        </div>
                        {isLeader && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#D97706",
                              background: "#FEF3C7",
                              border: "1px solid #FDE68A",
                              borderRadius: 99,
                              padding: "2px 7px",
                              flexShrink: 0,
                            }}
                          >
                            <Star size={9} fill="currentColor" />
                            Leader
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rejection feedback */}
              {team.reviewFeedback && team.status === "rejected" && (
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    background: "#FFF1F2",
                    borderRadius: 12,
                    border: "1px solid #FFE4E6",
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>
                    Rejection Feedback
                  </p>
                  <p style={{ fontSize: 13, color: "#DC2626" }}>{team.reviewFeedback}</p>
                </div>
              )}

              {/* Chat CTA */}
              <button
                onClick={() => onViewChange("chat")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1rem",
                  background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                  color: "#fff",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <MessageCircle size={20} />
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>Team Group Chat</p>
                    <p style={{ fontSize: 11, opacity: 0.85 }}>
                      {messages.length > 0
                        ? `${messages.length} messages · Tap to open`
                        : "Start the conversation"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── WhatsApp-style Chat View ── */}
        {view === "chat" && (
          <>
            {/* Messages area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                background: "#ECE5DD",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C4BDB5' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem 1rem",
                    color: "#6B7280",
                  }}
                >
                  <MessageCircle
                    size={40}
                    color="#9CA3AF"
                    style={{ margin: "0 auto 0.5rem" }}
                  />
                  <p style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    Say hello to your team! 👋
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser?.uid;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showSender =
                  !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                      marginTop: showSender && !isMe ? "0.5rem" : "2px",
                    }}
                  >
                    {/* Sender name for received messages */}
                    {showSender && (
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#2563EB",
                          marginBottom: 2,
                          paddingLeft: 4,
                        }}
                      >
                        {msg.senderName}
                      </p>
                    )}

                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: isMe
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        background: isMe ? "#DCF8C6" : "#FFFFFF",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                        position: "relative",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 14,
                          color: "#111827",
                          lineHeight: 1.45,
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.text}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "#6B7280",
                          marginTop: 2,
                          textAlign: "right",
                        }}
                      >
                        {formatChatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderTop: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                background: "#F0F0F0",
                flexShrink: 0,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  padding: "0.625rem 1rem",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  color: "var(--color-text)",
                  background: "#FFFFFF",
                  border: "1px solid #D1D5DB",
                  borderRadius: 24,
                  outline: "none",
                  minHeight: 44,
                  lineHeight: 1.4,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!chatText.trim() || sending}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background:
                    !chatText.trim() || sending ? "#D1D5DB" : "#25D366",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: !chatText.trim() || sending ? "not-allowed" : "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                <Send size={18} color="#fff" />
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes mm-panel-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
