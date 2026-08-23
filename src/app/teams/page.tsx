"use client";

// ============================================================
// MentorMesh — Teams List Page  (v3 – Modal Info + Full-Screen Chat)
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
import { deleteDoc, doc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Team, Event, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, teamStatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  UsersRound, Plus, Layers, Star, Check, X, Search,
  CheckCircle2, Sparkles, Info, MessageCircle, ArrowLeft,
  Send, Calendar, Shield, Users, ChevronRight, Trash2, Image as ImageIcon, FileText,
} from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";

// ── helpers ────────────────────────────────────────────────────
function fmtDT(val: any): string {
  if (!val) return "—";
  let ms = 0;
  if (typeof val === "object" && typeof val.seconds === "number") ms = val.seconds * 1000;
  else if (typeof val === "string") ms = new Date(val).getTime();
  else if (typeof val === "number") ms = val;
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtTime(val: any): string {
  if (!val) return "";
  let ms = 0;
  if (typeof val === "object" && typeof val.seconds === "number") ms = val.seconds * 1000;
  else if (typeof val === "string") ms = new Date(val).getTime();
  else if (typeof val === "number") ms = val;
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Page ───────────────────────────────────────────────────────
export default function TeamsPage() {
  return <AppShell><TeamsContent /></AppShell>;
}

function TeamsContent() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Create Team
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [creating, setCreating] = useState(false);

  // Staff Reject
  const [rejectingTeam, setRejectingTeam] = useState<Team | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Info + Chat states
  const [infoTeam, setInfoTeam] = useState<Team | null>(null);   // modal card
  const [chatTeam, setChatTeam] = useState<Team | null>(null);   // full-screen chat

  // Delete Team
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [deleteSecurityCode, setDeleteSecurityCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isStaff = user?.role === "staff" || user?.role === "master";

  const loadData = async () => {
    try {
      const [tmList, evList, stList] = await Promise.all([getTeams(), getEvents(), getActiveStudents()]);
      setTeams(tmList); setEvents(evList); setAvailableStudents(stList);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

  const handleOpenCreate = () => {
    if (user) { setSelectedMemberIds([user.uid]); setSelectedLeaderId(user.uid); }
    setName(""); setEventId(""); setDescription(""); setStudentSearch(""); setSubmitForApproval(true);
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
    if (selectedMemberIds.length === 0) { warning("Please select at least one team member."); return; }
    setCreating(true);
    const selectedEv = events.find((ev) => ev.id === eventId);
    const memberNames = selectedMemberIds.map((id) =>
      id === user.uid ? user.name : availableStudents.find((s) => s.uid === id)?.name || id
    );
    const leaderObj = selectedLeaderId === user.uid ? user : availableStudents.find((s) => s.uid === selectedLeaderId);
    const initialStatus = isStaff ? "approved" : submitForApproval ? "pending_approval" : "draft";
    try {
      await createTeam({
        name: name.trim(), memberIds: selectedMemberIds, memberNames,
        leaderId: selectedLeaderId || selectedMemberIds[0] || user.uid,
        leaderName: leaderObj?.name || user.name,
        eventId: eventId || undefined, eventName: selectedEv?.name || undefined,
        status: initialStatus, description: description.trim() || undefined,
        createdBy: user.uid, createdByName: user.name,
      });
      success(submitForApproval && !isStaff ? `Team "${name}" submitted for approval! 🚀` : `Team "${name}" created.`);
      setCreateOpen(false); await loadData();
    } catch { error("Failed to create team."); }
    finally { setCreating(false); }
  };

  const handleApproveTeam = async (t: Team) => {
    if (!user) return; setActionLoading(true);
    try { await reviewTeamProposal(t.id, user.uid, user.name, "approved"); success(`Team "${t.name}" APPROVED! 🎉`); await loadData(); }
    catch { error("Failed to approve team."); }
    finally { setActionLoading(false); }
  };

  const handleConfirmReject = async () => {
    if (!rejectingTeam || !user) return; setActionLoading(true);
    try {
      await reviewTeamProposal(rejectingTeam.id, user.uid, user.name, "rejected", rejectReason.trim() || undefined);
      success(`Team "${rejectingTeam.name}" rejected.`); setRejectingTeam(null); setRejectReason(""); await loadData();
    } catch { error("Failed to reject team."); }
    finally { setActionLoading(false); }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam || deleteSecurityCode !== "927624") {
      error("Invalid security code. Please enter the correct 6-digit code.");
      return;
    }
    setDeleteLoading(true);
    try {
      // Delete team chat messages first
      try {
        const snap = await getDocs(collection(db, "teamChats", deletingTeam.id, "messages"));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "teamChats", deletingTeam.id, "messages", d.id))));
      } catch { /* no chat to delete */ }
      // Delete the team document
      await deleteDoc(doc(db, "teams", deletingTeam.id));
      success(`Team "${deletingTeam.name}" has been permanently deleted.`);
      setDeletingTeam(null);
      setDeleteSecurityCode("");
      await loadData();
    } catch {
      error("Failed to delete team.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAvailableStudents = useMemo(() => {
    if (!studentSearch.trim()) return availableStudents.slice(0, 15);
    const q = studentSearch.toLowerCase();
    return availableStudents.filter((s) =>
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
    if (filterStatus === "approved") return teams.filter((t) => t.status === "approved" || t.status === "active");
    return teams.filter((t) => t.status === filterStatus);
  }, [teams, filterStatus]);

  const tabs = [
    { id: "all", label: "All Teams", count: teams.length },
    ...(pendingCount > 0 || isStaff ? [{ id: "pending", label: "Pending Approval", count: pendingCount }] : []),
    { id: "approved", label: "Approved / Active" },
    { id: "draft", label: "Draft" },
    { id: "finalized", label: "Finalized" },
  ];

  return (
    <>
      <div className="space-y-6 w-full">
        <PageHeader
          icon={<UsersRound size={20} />} iconClass="bg-blue-100 text-blue-600"
          title="Teams"
          subtitle="Form, manage, and explore project teams for hackathons and group projects."
          actions={
            <div className="flex items-center gap-3">
              {isStaff && <Link href="/team-builder"><Button variant="outline" size="md" icon={<Layers size={16} />}>Team Builder</Button></Link>}
              <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={handleOpenCreate}>Create Team</Button>
            </div>
          }
        />

        <Tabs tabs={tabs} activeTab={filterStatus} onTabChange={setFilterStatus} />

        {loading ? <LoadingState message="Loading teams..." /> :
          filteredTeams.length === 0 ? (
            <EmptyState icon={<UsersRound size={40} />}
              title={`No ${filterStatus !== "all" ? filterStatus : ""} teams found`}
              description="Create your first team to get started."
              action={{ label: "Create Team", onClick: handleOpenCreate }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTeams.map((t) => (
                <TeamCard key={t.id} team={t} currentUserId={user?.uid} isStaff={isStaff}
                  onApprove={() => handleApproveTeam(t)}
                  onReject={() => { setRejectingTeam(t); setRejectReason(""); }}
                  onViewInfo={() => setInfoTeam(t)}
                  onOpenChat={() => setChatTeam(t)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )
        }
      </div>

      {/* ── Team Info Modal Card ── */}
      {infoTeam && (
        <TeamInfoModal
          team={infoTeam}
          isStaff={isStaff}
          onClose={() => setInfoTeam(null)}
          onOpenChat={() => {
            if (!user) return;
            // Staff and team members can access chat
            if (!isStaff && !infoTeam.memberIds.includes(user.uid)) {
              error("Only team members can access this private chat.");
              return;
            }
            setChatTeam(infoTeam); setInfoTeam(null);
          }}
          onDeleteTeam={() => { setDeletingTeam(infoTeam); setInfoTeam(null); setDeleteSecurityCode(""); }}
        />
      )}

      {/* ── Full-Screen Chat ── */}
      {chatTeam && (
        <FullScreenChat
          team={chatTeam}
          currentUser={user}
          isStaff={isStaff}
          onBack={() => { setInfoTeam(chatTeam); setChatTeam(null); }}
          onClose={() => setChatTeam(null)}
        />
      )}

      {/* ── Create Team Modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Team"
        description="Form your team, select members, and submit for mentor approval." size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-team-form" variant="primary" loading={creating} icon={<Sparkles size={15} />}>
              {isStaff ? "Create Approved Team" : submitForApproval ? "Submit for Staff Approval" : "Save as Draft"}
            </Button>
          </>
        }
      >
        <form id="create-team-form" onSubmit={handleCreateTeam} className="space-y-7">
          <div>
            <label className="block text-[14px] font-bold text-slate-800 mb-2">Team Name <span className="text-rose-500 ml-0.5">*</span></label>
            <input className="block w-full rounded-[14px] border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-[15px] font-medium min-h-[52px] outline-none hover:bg-white hover:border-slate-300 focus:bg-white focus:border-blue-500 transition focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400" placeholder="e.g. Team ByteCrafters" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[14px] font-bold text-slate-800 mb-2">Associated Event <span className="text-[12px] text-slate-400 font-medium ml-1">Optional</span></label>
              <select className="block w-full rounded-[14px] border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-[15px] font-medium min-h-[52px] outline-none hover:bg-white hover:border-slate-300 focus:bg-white focus:border-blue-500 transition" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">No specific event</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name} ({ev.type})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-bold text-slate-800 mb-2">Team Leader <span className="text-[12px] text-slate-400 font-medium ml-1">Optional</span></label>
              <select className="block w-full rounded-[14px] border border-amber-200/80 bg-amber-50/40 text-amber-900 px-5 py-3.5 text-[15px] font-bold min-h-[52px] outline-none hover:bg-amber-50 hover:border-amber-300 focus:bg-amber-50 focus:border-amber-500 transition" value={selectedLeaderId} onChange={(e) => setSelectedLeaderId(e.target.value)}>
                {selectedMemberIds.map((id) => {
                  const s = id === user?.uid ? user : availableStudents.find((st) => st.uid === id);
                  return <option key={id} value={id}>{s?.name || id} {id === user?.uid ? "(You)" : ""}</option>;
                })}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="block text-[15px] font-bold text-slate-800 mb-0">Select Team Members ({selectedMemberIds.length} chosen)</label>
              <span className="text-[13px] font-medium text-slate-500 hidden sm:block tracking-wide">Search & click to add</span>
            </div>
            {selectedMemberIds.length > 0 && (
              <div className="flex flex-wrap gap-2.5 p-4 bg-gradient-to-tr from-blue-50/80 to-indigo-50/30 rounded-2xl border border-blue-100 shadow-sm animate-in fade-in duration-300">
                {selectedMemberIds.map((id) => {
                  const s = id === user?.uid ? user : availableStudents.find((st) => st.uid === id);
                  const isLeader = id === selectedLeaderId;
                  return (
                    <span key={id} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13.5px] font-bold shadow-sm transition-transform animate-in zoom-in duration-200 ${isLeader ? "bg-amber-400 text-amber-950 border border-amber-500" : "bg-white text-blue-900 border border-blue-200 hover:border-rose-300 group"}`}>
                      {isLeader && <Star size={14} strokeWidth={2.5} fill="currentColor" />}
                      {s?.name || id} {id === user?.uid ? "(You)" : ""}
                      {id !== user?.uid && <button type="button" onClick={() => handleToggleMember(s || ({ uid: id } as User))} className="text-slate-400 hover:text-rose-500 cursor-pointer ml-1.5 bg-slate-100 group-hover:bg-rose-50 rounded-full p-0.5 transition-colors"><X size={13} strokeWidth={3} /></button>}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col h-[380px]">
              <div className="bg-slate-50/80 p-4 sm:p-5 border-b border-slate-200 shrink-0">
                <div className="relative">
                  <Search size={26} className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                  <input type="text" placeholder="Search students by name, reg number..." className="block w-full !pl-[64px] pr-5 py-5 text-[18px] bg-white border-2 border-slate-200/80 rounded-2xl outline-none hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all font-bold placeholder-slate-400 shadow-sm" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 bg-slate-50/30">
                {filteredAvailableStudents.length === 0 ? (
                  <p className="text-[13px] font-medium text-slate-400 py-8 text-center animate-pulse">No matching students found.</p>
                ) : filteredAvailableStudents.map((st) => {
                  const isSelected = selectedMemberIds.includes(st.uid);
                  return (
                    <div key={st.uid} onClick={() => handleToggleMember(st)}
                      className={`flex items-center justify-between p-3 mb-1.5 rounded-xl cursor-pointer transition-all border outline-none select-none ${isSelected ? "bg-blue-50 border-blue-300 text-blue-950 shadow-[0_2px_8px_rgba(37,99,235,0.08)]" : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-800"}`}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar name={st.name} photoUrl={st.profilePhoto} size="md" />
                        <div className="truncate">
                          <p className={`truncate ${isSelected ? "font-bold text-[14px]" : "font-semibold text-[14px]"}`}>{st.name} {st.uid === user?.uid ? "(You)" : ""}</p>
                          <p className="text-[12px] font-medium text-slate-500 truncate mt-0.5">{st.registerNumber ? `${st.registerNumber} · ` : ""}{st.department || "ECE"} · {st.year || "Yr"} · Sec {st.section || "A"}</p>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                        {isSelected
                          ? <span className="w-[26px] h-[26px] rounded-full bg-blue-600 text-white flex items-center justify-center shadow-[0_2px_6px_rgba(37,99,235,0.4)] animate-in zoom-in duration-200"><Check size={14} strokeWidth={3.5} /></span>
                          : <span className="w-[26px] h-[26px] rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors bg-slate-50"><Plus size={14} strokeWidth={2.5} /></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-bold text-slate-800 mb-2">Project Description <span className="text-[12px] text-slate-400 font-medium ml-1">Optional</span></label>
            <textarea className="block w-full rounded-[14px] border border-slate-200 bg-slate-50/50 px-5 py-4 text-[15px] font-medium min-h-[90px] resize-y outline-none hover:bg-white hover:border-slate-300 focus:bg-white focus:border-blue-500 transition focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400" rows={2} placeholder="Briefly describe your team's project..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {!isStaff && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50/80 to-white rounded-xl border border-blue-100 shadow-sm mt-2">
              <input type="checkbox" id="submit-approval-toggle" checked={submitForApproval} onChange={(e) => setSubmitForApproval(e.target.checked)} className="rounded text-blue-600 w-[18px] h-[18px] cursor-pointer border-slate-300 focus:ring-blue-500" />
              <label htmlFor="submit-approval-toggle" className="text-[14px] text-blue-950 font-bold cursor-pointer select-none">Submit proposal to Staff / Admin for approval</label>
            </div>
          )}
        </form>
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal open={!!rejectingTeam} onClose={() => setRejectingTeam(null)}
        title={rejectingTeam ? `Reject Team: ${rejectingTeam.name}` : "Reject Team"}
        description="Provide feedback to the student leader." size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectingTeam(null)}>Cancel</Button>
            <Button variant="destructive" loading={actionLoading} onClick={handleConfirmReject}>Confirm Rejection</Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="mm-label">Reason / Feedback (optional)</label>
          <textarea className="mm-input resize-none" rows={3} placeholder="e.g. Please add 1 more student from ECE..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </div>
      </Modal>

      {/* ── Delete Team Security Modal ── */}
      <Modal
        open={!!deletingTeam}
        onClose={() => { setDeletingTeam(null); setDeleteSecurityCode(""); }}
        title={deletingTeam ? `Delete Team: ${deletingTeam.name}` : "Delete Team"}
        description="This action is permanent and cannot be undone. Enter the 6-digit security code to confirm."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeletingTeam(null); setDeleteSecurityCode(""); }}>Cancel</Button>
            <Button variant="destructive" loading={deleteLoading} onClick={handleDeleteTeam} disabled={deleteSecurityCode.length !== 6}>
              Permanently Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div style={{ padding: "0.75rem", background: "var(--red-50)", border: "1px solid var(--red-100)", borderRadius: "10px" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--red-700)", fontWeight: 600 }}>
              ⚠️ This will permanently delete the team and all its chat messages. This cannot be undone.
            </p>
          </div>
          <label className="mm-label">Security Code <span style={{ color: "var(--color-danger)" }}>*</span></label>
          <input
            className="mm-input"
            type="password"
            placeholder="Enter 6-digit security code"
            value={deleteSecurityCode}
            onChange={(e) => setDeleteSecurityCode(e.target.value)}
            maxLength={6}
            style={{ fontFamily: "monospace", letterSpacing: "0.2em", textAlign: "center", fontSize: "1.25rem" }}
          />
        </div>
      </Modal>
    </>
  );
}

// ── TeamCard ────────────────────────────────────────────────────
function TeamCard({ team, currentUserId, isStaff, onApprove, onReject, onViewInfo, onOpenChat, actionLoading }: {
  team: Team; currentUserId?: string; isStaff?: boolean;
  onApprove?: () => void; onReject?: () => void; onViewInfo: () => void; onOpenChat?: () => void; actionLoading?: boolean;
}) {
  const isPending = team.status === "pending_approval";
  const isRejected = team.status === "rejected";
  const isDirectMember = currentUserId ? team.memberIds.includes(currentUserId) : false;
  // Staff technically have access to all teams, so they get the highlighted card & chat button
  const hasChatAccess = isDirectMember || isStaff;

  // Card styling based on membership & status
  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRadius: 16,
    overflow: "hidden",
    transition: "all 0.2s ease",
    position: "relative",
    ...(hasChatAccess
      ? {
        background: "linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 50%, #F8FAFC 100%)",
        border: "2px solid #3B82F6",
        boxShadow: "0 4px 16px rgba(59, 130, 246, 0.15), 0 1px 4px rgba(59, 130, 246, 0.08)",
      }
      : isPending
        ? { background: "#FFFBF0", border: "1.5px solid #FCD34D", boxShadow: "0 2px 8px rgba(252, 211, 77, 0.12)" }
        : isRejected
          ? { background: "#FFF5F5", border: "1.5px solid #FCA5A5", boxShadow: "0 2px 8px rgba(252, 165, 165, 0.1)" }
          : { background: "var(--color-surface)", border: "1.5px solid var(--color-border)", boxShadow: "var(--shadow-xs)" }),
  };

  return (
    <div style={cardStyle} className="hover:shadow-lg">
      {/* Member indicator strip */}
      {hasChatAccess && (
        <div style={{ height: 4, background: "linear-gradient(90deg, #3B82F6, #6366F1, #8B5CF6)", borderRadius: "0 0 0 0", flexShrink: 0 }} />
      )}

      <div style={{ padding: "1.25rem 1.25rem 0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Header: Team Name + Status Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>
            {team.name}
          </h3>
          <div style={{ flexShrink: 0 }}>
            <Badge variant={teamStatusBadge(team.status).variant}>{teamStatusBadge(team.status).label}</Badge>
          </div>
        </div>

        {/* Event name */}
        {team.eventName && (
          <p style={{ fontSize: "0.75rem", color: "#2563EB", fontWeight: 700, letterSpacing: "0.02em" }}>{team.eventName}</p>
        )}

        {/* Description */}
        {team.description && (
          <p style={{ fontSize: "0.8125rem", color: "#64748B", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {team.description}
          </p>
        )}

        {/* Members section */}
        <div style={{ paddingTop: "0.625rem", borderTop: "1px solid rgba(148, 163, 184, 0.15)" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
            Members ({team.memberIds.length}):
          </p>
          <p style={{ fontSize: "0.8125rem", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {team.memberNames?.join(", ") || `${team.memberIds.length} members`}
          </p>
        </div>

        {/* Leader badge */}
        {team.leaderName && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.6875rem", fontWeight: 700, color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "4px 10px", width: "fit-content" }}>
            <Star size={11} fill="currentColor" /> Leader: {team.leaderName}
          </span>
        )}

        {/* Reviewed by */}
        {team.reviewedByName && (
          <p style={{ fontSize: "0.6875rem", color: "#94A3B8" }}>
            Reviewed by <strong style={{ color: "#64748B" }}>{team.reviewedByName}</strong>
          </p>
        )}

        {/* Rejection feedback */}
        {team.reviewFeedback && isRejected && (
          <div style={{ padding: "0.5rem 0.75rem", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, fontSize: "0.75rem", color: "#DC2626" }}>
            <strong>Feedback:</strong> {team.reviewFeedback}
          </div>
        )}

        {/* Member badge */}
        {hasChatAccess && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.6875rem", fontWeight: 700, color: "#1D4ED8", background: "#DBEAFE", border: "1px solid #93C5FD", borderRadius: 8, padding: "4px 10px", width: "fit-content" }}>
            <CheckCircle2 size={11} /> {isDirectMember ? "You're in this team" : "Staff Chat Access"}
          </span>
        )}
      </div>

      {/* Footer: Actions */}
      <div style={{ padding: "0.75rem 1.25rem 1.25rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {/* Staff Approve/Reject buttons */}
        {isStaff && isPending && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button size="md" variant="primary" className="flex-1" icon={<Check size={16} />} loading={actionLoading} onClick={onApprove}>Approve</Button>
            <Button size="md" variant="danger" icon={<X size={16} />} disabled={actionLoading} onClick={onReject}>Reject</Button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: "80px" }}>
            By {team.createdByName}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {hasChatAccess && onOpenChat && (
              <Button size="md" variant="primary" icon={<MessageCircle size={15} />} onClick={onOpenChat}>
                Chat
              </Button>
            )}
            <Button size="md" variant={hasChatAccess ? "outline" : "primary"} icon={<Info size={15} />} onClick={onViewInfo}>
              Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TeamInfoModal — centered card ──────────────────────────────
function TeamInfoModal({ team, isStaff, onClose, onOpenChat, onDeleteTeam }: {
  team: Team; isStaff: boolean; onClose: () => void; onOpenChat: () => void; onDeleteTeam?: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", animation: "mm-fade-in 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          borderRadius: 20, width: "100%", maxWidth: 480,
          maxHeight: "88dvh", display: "flex", flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          animation: "mm-modal-in 0.22s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.125rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={18} color="var(--color-primary)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</p>
            <p style={{ fontSize: 11, color: "var(--color-muted)" }}>Team Information</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.125rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "var(--color-surface-2)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Status</span>
              <Badge variant={teamStatusBadge(team.status).variant}>{teamStatusBadge(team.status).label}</Badge>
            </div>

            {team.description && (
              <div style={{ padding: "0.875rem 1rem", background: "#EFF6FF", borderRadius: 12, border: "1px solid #DBEAFE" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF", marginBottom: 4 }}>About</p>
                <p style={{ fontSize: 13, color: "#1D4ED8", lineHeight: 1.55 }}>{team.description}</p>
              </div>
            )}

            {/* Timeline */}
            <div style={{ padding: "0.875rem 1rem", background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Timeline</p>
              <TimelineRow icon={<Calendar size={14} color="#D97706" />} iconBg="#FEF3C7" label={`Submitted by ${team.createdByName}`} value={fmtDT(team.createdAt)} />
              {team.reviewedByName && (
                <TimelineRow
                  icon={<Shield size={14} color={team.status === "rejected" ? "#DC2626" : "#16A34A"} />}
                  iconBg={team.status === "rejected" ? "#FFE4E6" : "#DCFCE7"}
                  label={`${team.status === "rejected" ? "Rejected" : "Approved"} by ${team.reviewedByName}`}
                  value={fmtDT(team.reviewedAt)}
                />
              )}
              {team.finalizedAt && (
                <TimelineRow icon={<CheckCircle2 size={14} color="#2563EB" />} iconBg="#EFF6FF" label="Finalized" value={fmtDT(team.finalizedAt)} />
              )}
            </div>

            {/* Members */}
            <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)", overflow: "hidden" }}>
              <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={14} color="var(--color-muted)" />
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Members ({team.memberIds.length})</p>
              </div>
              <div style={{ padding: "0.5rem" }}>
                {(team.memberNames || []).map((memberName, idx) => {
                  const isLeader = memberName === team.leaderName;
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.625rem", borderRadius: 8, background: isLeader ? "#FFFBEB" : "transparent" }}>
                      <Avatar name={memberName} size="sm" />
                      <p style={{ flex: 1, fontSize: 13, fontWeight: isLeader ? 700 : 500, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{memberName}</p>
                      {isLeader && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#D97706", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
                          <Star size={9} fill="currentColor" /> Leader
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rejection feedback */}
            {team.reviewFeedback && team.status === "rejected" && (
              <div style={{ padding: "0.875rem 1rem", background: "#FFF1F2", borderRadius: 12, border: "1px solid #FFE4E6" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>Rejection Feedback</p>
                <p style={{ fontSize: 13, color: "#DC2626" }}>{team.reviewFeedback}</p>
              </div>
            )}

            {/* Open Chat CTA */}
            <button onClick={onOpenChat} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.125rem", background: "linear-gradient(135deg,#25D366,#128C7E)", borderRadius: 14, border: "none", cursor: "pointer", color: "#fff", transition: "all 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <MessageCircle size={22} />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>Team Group Chat</p>
                  <p style={{ fontSize: 12, opacity: 0.85 }}>Open WhatsApp-style chat</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>

            {/* Full Details Page Link */}
            <Link href={`/teams/${team.id}`} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.125rem", background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", borderRadius: 14, border: "1.5px solid #93C5FD", cursor: "pointer", color: "#1D4ED8", textDecoration: "none", transition: "all 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Info size={22} />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>Full Team Details</p>
                  <p style={{ fontSize: 12, opacity: 0.7 }}>Members, docs, links & management</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </Link>

            {/* Delete Team (Staff/Developer only) */}
            {isStaff && onDeleteTeam && (
              <button onClick={onDeleteTeam} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.875rem 1rem", background: "#FEF2F2", border: "1.5px solid #FECDD3", borderRadius: 14, cursor: "pointer", color: "#DC2626", fontWeight: 700, fontSize: 14, transition: "all 0.15s" }}>
                <Trash2 size={16} />
                Delete This Team
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)" }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{value}</p>
      </div>
    </div>
  );
}

// ── FullScreenChat ─────────────────────────────────────────────
function FullScreenChat({ team, currentUser, isStaff, onBack, onClose }: {
  team: Team; currentUser: any; isStaff: boolean; onBack: () => void; onClose: () => void;
}) {
  const { success, error } = useToast();
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToTeamChat(team.id, setMessages);
    return () => unsub();
  }, [team.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const handleSend = async () => {
    if (!chatText.trim() || !currentUser) return;
    setSending(true);
    try {
      await sendTeamMessage(team.id, currentUser.uid, currentUser.name, chatText.trim(), currentUser.profilePhoto);
      setChatText("");
      inputRef.current?.focus();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const handleAttachment = async (file: File, kind: "image" | "document") => {
    if (!currentUser) return;
    setUploading(true);
    try {
      const { uploadToCloudinary, validateUploadFile } = await import("@/lib/cloudinary");
      validateUploadFile(file, kind);
      const url = await uploadToCloudinary(file, kind === "image" ? "image" : "raw");
      await sendTeamMessage(team.id, currentUser.uid, currentUser.name, "", currentUser.profilePhoto, kind, {
        name: file.name,
        url,
        type: file.type,
        size: file.size,
      });
      success(kind === "image" ? "Image sent." : "Document sent.");
    } catch (uploadError) {
      error(uploadError instanceof Error ? uploadError.message : "Failed to send attachment.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm(`Delete ALL messages in "${team.name}" chat? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const snap = await getDocs(collection(db, "teamChats", team.id, "messages"));
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "teamChats", team.id, "messages", d.id))));
      success("Chat cleared successfully.");
    } catch { error("Failed to delete chat."); }
    finally { setDeleting(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70,
      display: "flex", flexDirection: "column",
      background: "#ECE5DD",
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C4BDB5' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    }}>
      {/* Top Bar */}
      <div style={{
        background: "#075E54", color: "#fff", padding: "0 1rem",
        height: 60, display: "flex", alignItems: "center", gap: "0.75rem",
        flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</p>
          <p style={{ fontSize: 12, opacity: 0.8 }}>{team.memberIds.length} members · Group Chat</p>
        </div>
        {isStaff && (
          <button onClick={handleDeleteChat} disabled={deleting} title="Delete all chat messages (Staff only)"
            style={{ background: "none", border: "none", color: "#fff", opacity: deleting ? 0.5 : 0.8, cursor: "pointer", display: "flex", alignItems: "center", padding: 6, borderRadius: 8 }}>
            <Trash2 size={18} />
          </button>
        )}
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
          <X size={22} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "2px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6B7280" }}>
            <MessageCircle size={48} color="#9CA3AF" style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>No messages yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Say hello to your team! 👋</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser?.uid;
          const prev = idx > 0 ? messages[idx - 1] : null;
          const showSender = !isMe && (!prev || prev.senderId !== msg.senderId);
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginTop: showSender && !isMe ? "0.625rem" : "2px" }}>
              {showSender && (
                <p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 2, paddingLeft: 4 }}>{msg.senderName}</p>
              )}
              <div style={{
                maxWidth: "72%", padding: "0.5rem 0.75rem",
                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMe ? "#DCF8C6" : "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
              }}>
                {msg.messageType === "image" && msg.attachment ? (
                  <img src={msg.attachment.url} alt={msg.attachment.name} style={{ display: "block", maxWidth: "min(280px, 100%)", maxHeight: 260, borderRadius: 10, objectFit: "cover" }} />
                ) : msg.messageType === "document" && msg.attachment ? (
                  <a href={msg.attachment.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "#111827", textDecoration: "none", minWidth: 180 }}>
                    <FileText size={22} color="#2563EB" />
                    <span style={{ minWidth: 0 }}><strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.attachment.name}</strong><small>{(msg.attachment.size / 1024).toFixed(1)} KB · Open</small></span>
                  </a>
                ) : (
                  <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.45, wordBreak: "break-word" }}>{msg.text}</p>
                )}
                <p style={{ fontSize: 10, color: "#6B7280", marginTop: 2, textAlign: "right" }}>{fmtTime(msg.createdAt || msg.clientCreatedAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "0.625rem 0.75rem", background: "#F0F0F0", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, borderTop: "1px solid #D1D5DB" }}>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAttachment(file, "image"); }} />
        <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAttachment(file, "document"); }} />
        <div style={{ position: "relative" }}>
          <button type="button" onClick={() => setAttachmentMenuOpen((open) => !open)} disabled={uploading} title="Attach image or document" style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "#fff", color: "#128C7E", display: "flex", alignItems: "center", justifyContent: "center", cursor: uploading ? "not-allowed" : "pointer" }}><Plus size={20} /></button>
          {attachmentMenuOpen && <div style={{ position: "absolute", bottom: 44, left: 0, display: "flex", gap: 4, background: "#fff", padding: 4, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
            <button type="button" onClick={() => { setAttachmentMenuOpen(false); imageInputRef.current?.click(); }} title="Images" style={{ border: "none", background: "#E8F5E9", color: "#128C7E", padding: 7, borderRadius: 6, display: "flex" }}><ImageIcon size={16} /></button>
            <button type="button" onClick={() => { setAttachmentMenuOpen(false); documentInputRef.current?.click(); }} title="Documents" style={{ border: "none", background: "#EFF6FF", color: "#2563EB", padding: 7, borderRadius: 6, display: "flex" }}><FileText size={16} /></button>
          </div>}
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message"
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, padding: "0.625rem 1rem", fontSize: 15, fontFamily: "var(--font-sans)", color: "var(--color-text)", background: "#fff", border: "1px solid #D1D5DB", borderRadius: 24, outline: "none", minHeight: 44 }}
        />
        <button onClick={handleSend} disabled={!chatText.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: "50%", background: !chatText.trim() || sending ? "#D1D5DB" : "#25D366", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: !chatText.trim() || sending ? "not-allowed" : "pointer", flexShrink: 0, transition: "background 0.15s" }}>
          <Send size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}
