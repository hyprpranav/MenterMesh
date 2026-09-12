"use client";

// ============================================================
// MentorMesh — Meetings Hub & Dashboard
// Open, Spacious Workspace · Zero Heavy Background Card Bloat
// Clean Flow: Action Controls → Filter & Search → Session List
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMeetingsForViewer,
  getScheduledMeetingsForViewer,
  endLiveMeeting,
  createScheduledMeeting,
  updateScheduledMeeting,
  generateMeetingCode,
} from "@/lib/firebase/firestore";
import type { Meeting, ScheduledMeeting } from "@/types";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Video,
  Calendar,
  Link2,
  Plus,
  Users,
  Search,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Presentation,
  PhoneOff,
  Shield,
  MapPin,
  Play,
} from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";

export default function MeetingsPage() {
  return (
    <AppShell>
      <MeetingsHubDashboard />
    </AppShell>
  );
}

function MeetingsHubDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useToast();

  const handleEndMeetingDirectly = async (meetingId: string) => {
    if (!window.confirm("Are you sure you want to cut and end this meeting for all participants?")) return;
    try {
      await endLiveMeeting(meetingId, user?.uid || "");
      success("Meeting has been ended.");
      setScheduledMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId ? { ...m, status: "submitted_for_review" } : m
        )
      );
    } catch (err: any) {
      error(err?.message || "Failed to end meeting.");
    }
  };
  const isStaff = user?.role === "staff" || user?.role === "master";

  // Mode: "live" (Online meetings) vs "manual" (existing manual submissions for staff review)
  const [workflowMode, setWorkflowMode] = useState<"live" | "manual">("live");

  // Data states
  const [manualMeetings, setManualMeetings] = useState<Meeting[]>([]);
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInstant, setCreatingInstant] = useState(false);

  // Quick Join State
  const [quickJoinCode, setQuickJoinCode] = useState("");

  // Filter & Search states
  const [liveTab, setLiveTab] = useState<string>("all");
  const [manualTab, setManualTab] = useState<string>(isStaff ? "all" : "approved");
  const [sortBy, setSortBy] = useState("Date (Newest)");
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setLoading(true);
        const [manualList, scheduledList] = await Promise.all([
          getMeetingsForViewer(user.uid, user.role),
          getScheduledMeetingsForViewer(user.uid, user.role),
        ]);
        setManualMeetings(manualList);
        setScheduledMeetings(scheduledList);
      } catch (err) {
        console.error("Error loading meetings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── Start Instant Meeting Immediately ─────────────────────────
  const handleStartInstantMeeting = async () => {
    if (!user) {
      error("Please sign in to start a live meeting.");
      return;
    }

    try {
      setCreatingInstant(true);
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const hours = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${mins}`;

      const meetingData: Omit<ScheduledMeeting, "id" | "createdAt" | "updatedAt"> = {
        title: `${user.name}'s Instant Meeting`,
        purpose: "Instant live video collaboration session",
        description: "Ad-hoc live meeting created in MentorMesh.",
        mode: "Online",
        date: todayStr,
        startTime: timeStr,
        expectedDuration: 60,
        hostId: user.uid,
        hostName: user.name,
        hostPhoto: user.profilePhoto || undefined,
        coHostIds: [],
        coHostNames: [],
        participantIds: [user.uid],
        participantNames: [user.name],
        teamIds: [],
        teamNames: [],
        externalEmails: [],
        agenda: "1. Quick Sync & Discussion",
        meetingLink: "",
        status: "live",
        visibility: "everyone",
        allowExternal: true,
        requireAdmission: false,
        actualStart: new Date().toISOString(),
        attendance: [
          {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: "host",
            invited: true,
            joined: true,
            joinTime: new Date().toISOString(),
            status: "in_meeting",
          },
        ],
        attendeeCount: 1,
      };

      const code = generateMeetingCode();
      const internalRoomUrl = `${window.location.origin}/meet/${code}`;

      await createScheduledMeeting({
        ...meetingData,
        code,
        meetingLink: internalRoomUrl,
      });

      success(`Instant room live! Join Code: ${code}`);
      router.push(`/meet/${code}`);
    } catch (err: any) {
      console.error("Error starting instant meeting:", err);
      error(err.message || "Could not launch instant meeting.");
    } finally {
      setCreatingInstant(false);
    }
  };

  // ── Quick Join with Link or Code ──────────────────────────────
  const handleQuickJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = quickJoinCode.trim();
    if (!raw) {
      error("Please enter a meeting code or link.");
      return;
    }

    let extractedId = raw;
    if (raw.includes("/meet/")) {
      const parts = raw.split("/meet/");
      extractedId = parts[1].split("?")[0].split("/")[0].trim();
    } else if (raw.includes("/live/")) {
      const parts = raw.split("/live/");
      extractedId = parts[1].split("?")[0].split("/")[0].trim();
    }

    if (!extractedId) {
      error("Invalid meeting link or code.");
      return;
    }

    router.push(`/meet/${extractedId}`);
  };

  // Counts
  const liveNowCount = scheduledMeetings.filter((m) => m.status === "live").length;
  const reviewCount = scheduledMeetings.filter((m) => m.status === "submitted_for_review").length;
  const pendingManualCount = manualMeetings.filter((m) => m.status === "pending").length;

  // Tabs for scheduled
  const liveTabs = isStaff
    ? [
        { id: "all", label: "All Sessions", count: scheduledMeetings.length },
        { id: "live", label: "Live Now", count: liveNowCount, className: liveNowCount > 0 ? "text-emerald-600 font-bold" : undefined },
        { id: "upcoming", label: "Upcoming" },
        { id: "review", label: "Pending Review", count: reviewCount, className: reviewCount > 0 ? "text-amber-700 font-bold" : undefined },
        { id: "approved", label: "Approved" },
        { id: "past", label: "Past" },
      ]
    : [
        { id: "all", label: "All Sessions" },
        { id: "live", label: "Live Now", count: liveNowCount, className: liveNowCount > 0 ? "text-emerald-600 font-bold" : undefined },
        { id: "upcoming", label: "Upcoming" },
        { id: "my", label: "Hosted by Me" },
        { id: "attended", label: "Attended" },
        { id: "past", label: "Past" },
      ];

  // Tabs for manual records
  const manualTabs = isStaff
    ? [
        { id: "all", label: "All Manual Records", count: manualMeetings.length },
        { id: "pending", label: "Pending Review", count: pendingManualCount, className: pendingManualCount > 0 ? "text-amber-700 font-bold" : undefined },
        { id: "approved", label: "Approved" },
        { id: "rejected", label: "Rejected" },
      ]
    : [
        { id: "approved", label: "Approved Records" },
        { id: "attended", label: "Records I Attended" },
        { id: "pending", label: "My Pending Submissions" },
      ];

  // Filtering scheduled meetings
  const filteredScheduled = scheduledMeetings.filter((m) => {
    const isHost = m.hostId === user?.uid;
    const isAttendee = m.attendance?.some((p) => p.uid === user?.uid && p.joined);
    const isLive = m.status === "live";
    const isUpcoming = m.status === "scheduled" || m.status === "starting_soon";
    const isPast = m.status === "ended" || m.status === "approved" || m.status === "rejected" || m.status === "cancelled";

    let match = true;
    if (liveTab === "live") match = isLive;
    else if (liveTab === "upcoming") match = isUpcoming;
    else if (liveTab === "review") match = m.status === "submitted_for_review";
    else if (liveTab === "approved") match = m.status === "approved";
    else if (liveTab === "past") match = isPast;
    else if (liveTab === "attended") match = isAttendee;
    else if (liveTab === "my") match = isHost;

    if (!match) return false;

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.hostName.toLowerCase().includes(q) ||
        (m.purpose && m.purpose.toLowerCase().includes(q))
      );
    }
    return true;
  });

  filteredScheduled.sort((a, b) => {
    if (sortBy === "Date (Newest)") return new Date(`${b.date}T${b.startTime}`).getTime() - new Date(`${a.date}T${a.startTime}`).getTime();
    if (sortBy === "Date (Oldest)") return new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime();
    return 0;
  });

  // Filtering manual records
  const filteredManual = manualMeetings.filter((m) => {
    let matchTab = false;
    if (manualTab === "all") matchTab = true;
    else if (manualTab === "attended") matchTab = m.attendeeIds?.includes(user?.uid || "") ?? false;
    else if (manualTab === "pending") matchTab = m.status === "pending";
    else if (manualTab === "approved") matchTab = m.status === "approved";
    else if (manualTab === "rejected") matchTab = m.status === "rejected";
    else matchTab = true;

    if (!matchTab) return false;

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      return (
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.submittedByName && m.submittedByName.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const finalManual =
    !isStaff && (manualTab === "pending" || manualTab === "rejected")
      ? filteredManual.filter((m) => m.submittedBy === user?.uid)
      : !isStaff && manualTab === "approved"
      ? filteredManual.filter((m) => m.status === "approved")
      : filteredManual;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10 lg:space-y-12">
      
      {/* ═════════════════════════════════════════════════════════ */}
      {/* 1. DASHBOARD HEADER                                       */}
      {/* ═════════════════════════════════════════════════════════ */}
      <div className="pb-8 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full uppercase tracking-wider">
                <Video size={13} className="text-blue-600" />
                MentorMesh Live
              </span>
              {liveNowCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {liveNowCount} Live Now
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Meetings & Live Sessions
            </h1>
            <p className="text-base text-slate-500 max-w-2xl">
              Start instant video meetings, schedule future team sessions, or manage meeting records.
            </p>
          </div>

          <Link href="/meetings/new">
            <button
              type="button"
              className="inline-flex items-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer whitespace-nowrap"
            >
              <Presentation size={17} className="text-slate-500 shrink-0" />
              <span>Submit Meeting Record</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 2. THREE MAJOR ACTIONS (OPEN CANVAS, ZERO HEAVY CARDS)    */}
      {/* ═════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 pb-10 border-b border-slate-200">
        
        {/* ACTION 1: START INSTANT MEETING */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Video size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Start Instant Meeting</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Launch a live room immediately and invite others on the fly. No advance setup required.
            </p>
          </div>

          <button
            type="button"
            disabled={creatingInstant}
            onClick={handleStartInstantMeeting}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2 whitespace-nowrap disabled:opacity-50"
          >
            <Video size={18} className="shrink-0" />
            <span>{creatingInstant ? "STARTING ROOM..." : "+ START INSTANT MEETING"}</span>
          </button>
        </div>

        {/* ACTION 2: SCHEDULE MEETING */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Calendar size={24} className="text-slate-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Schedule a Meeting</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Plan upcoming meetings with date, start time, agenda items, participant selection, and room rules.
            </p>
          </div>

          <Link href="/meetings/schedule" className="w-full mt-2 block">
            <button
              type="button"
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-extrabold text-sm tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Calendar size={18} className="shrink-0" />
              <span>+ SCHEDULE MEETING</span>
            </button>
          </Link>
        </div>

        {/* ACTION 3: JOIN WITH MEETING LINK */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Link2 size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Join with Link</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Enter a MentorMesh meeting ID or paste an invitation link to jump directly into the room.
            </p>
          </div>

          <form onSubmit={handleQuickJoin} className="mt-2 w-full">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                placeholder="Paste code or link..."
                value={quickJoinCode}
                onChange={(e) => setQuickJoinCode(e.target.value)}
                className="w-full min-h-[48px] pl-4 pr-24 rounded-xl border border-slate-300 bg-white text-sm font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400 text-slate-900"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>JOIN</span>
                <ArrowRight size={14} className="shrink-0" />
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 3. WORKFLOW SWITCHER & FILTER CONTROLS                   */}
      {/* ═════════════════════════════════════════════════════════ */}
      <div className="space-y-6 pt-2">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* Workflow Toggle */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setWorkflowMode("live")}
              className={`flex-1 lg:flex-none py-2.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                workflowMode === "live"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Video size={16} />
              <span>Online Live Sessions ({scheduledMeetings.length})</span>
            </button>

            <button
              onClick={() => setWorkflowMode("manual")}
              className={`flex-1 lg:flex-none py-2.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                workflowMode === "manual"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Presentation size={16} />
              <span>Manual Meeting Records ({manualMeetings.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-80 flex items-center">
            <Search size={17} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={workflowMode === "live" ? "Search live sessions..." : "Search meeting records..."}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-sm font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder:text-slate-400"
            />
          </div>

        </div>

        {/* Filter Tabs */}
        <div className="overflow-x-auto pb-2">
          {workflowMode === "live" ? (
            <Tabs tabs={liveTabs} activeTab={liveTab} onTabChange={setLiveTab} />
          ) : (
            <Tabs tabs={manualTabs} activeTab={manualTab} onTabChange={setManualTab} />
          )}
        </div>

      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 4. MEETINGS ROSTER LIST                                   */}
      {/* ═════════════════════════════════════════════════════════ */}
      {loading ? (
        <LoadingState message="Loading sessions..." />
      ) : workflowMode === "live" ? (
        filteredScheduled.length === 0 ? (
          <EmptyState
            icon={<Video size={48} className="text-blue-500" />}
            title="No Online Meetings Found"
            description="There are no live or scheduled online sessions matching your filter."
            action={{
              label: "+ Schedule a Meeting",
              onClick: () => router.push("/meetings/schedule"),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredScheduled.map((meeting) => (
              <LiveSessionCard
                key={meeting.id}
                meeting={meeting}
                currentUserId={user?.uid}
                isStaff={isStaff}
                onEndMeeting={handleEndMeetingDirectly}
              />
            ))}
          </div>
        )
      ) : finalManual.length === 0 ? (
        <EmptyState
          icon={<Presentation size={48} className="text-slate-400" />}
          title="No Manual Meeting Records Found"
          description="There are no manual meeting submissions matching your filter."
          action={{
            label: "Submit Meeting Details",
            onClick: () => router.push("/meetings/new"),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {finalManual.map((meeting) => (
            <ManualRecordCard
              key={meeting.id}
              meeting={meeting}
              currentUserId={user?.uid}
              isStaff={isStaff}
            />
          ))}
        </div>
      )}

    </div>
  );
}

// ── Live Session Card with Clear, Spacious Buttons ─────────────
function LiveSessionCard({
  meeting,
  currentUserId,
  isStaff,
  onEndMeeting,
}: {
  meeting: ScheduledMeeting;
  currentUserId?: string;
  isStaff: boolean;
  onEndMeeting?: (id: string) => void;
}) {
  const isHost = meeting.hostId === currentUserId;
  const isLive = meeting.status === "live";
  const isSummaryRequired = meeting.status === "summary_required";
  const isUnderReview = meeting.status === "submitted_for_review";
  const isApproved = meeting.status === "approved";
  const isRejected = meeting.status === "rejected";
  const isCancelled = meeting.status === "cancelled";

  return (
    <div
      className={`rounded-2xl border bg-white p-7 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-6 ${
        isLive
          ? "border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-slate-200"
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full">
              Online Session
            </span>
            {meeting.code && (
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md tracking-wider">
                Code: {meeting.code}
              </span>
            )}
          </div>

          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Live Now
            </span>
          ) : isSummaryRequired ? (
            <Badge variant="warning">Summary Required</Badge>
          ) : isUnderReview ? (
            <Badge variant="pending">Under Review</Badge>
          ) : isApproved ? (
            <Badge variant="approved">Approved</Badge>
          ) : isRejected ? (
            <Badge variant="rejected">Rejected</Badge>
          ) : isCancelled ? (
            <Badge variant="secondary">Cancelled</Badge>
          ) : (
            <Badge variant="info">Scheduled</Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 leading-snug break-words line-clamp-2">
          {meeting.title}
        </h3>

        {/* Time, Host & Attendees */}
        <div className="space-y-2.5 text-sm text-slate-600 pt-1">
          <div className="flex items-center gap-2.5">
            <Calendar size={16} className="text-slate-400 shrink-0" />
            <span>
              {formatDate(meeting.date)} • {meeting.startTime} ({meeting.expectedDuration} mins)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Users size={16} className="text-slate-400 shrink-0" />
            <span>
              Host: <strong className="text-slate-800">{meeting.hostName}</strong>
              {meeting.attendeeCount !== undefined && ` • ${meeting.attendeeCount} Joined`}
            </span>
          </div>
        </div>

        {meeting.purpose && (
          <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            "{meeting.purpose}"
          </p>
        )}
      </div>

      {/* Action Button Area with Generous Space */}
      <div className="pt-2">
        {isLive ? (
          <div className="space-y-2">
            <Link href={`/meet/${meeting.id}`} className="block w-full">
              <button
                type="button"
                className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Video size={18} className="shrink-0" />
                <span>JOIN MEETING NOW</span>
              </button>
            </Link>
            {isHost && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onEndMeeting?.(meeting.id);
                }}
                className="w-full min-h-[38px] px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 font-bold text-xs border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneOff size={14} />
                <span>Cut / End Meeting for All</span>
              </button>
            )}
          </div>
        ) : isSummaryRequired && isHost ? (
          <Link href={`/meet/${meeting.id}`} className="block w-full">
            <button
              type="button"
              className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Complete Meeting Summary</span>
            </button>
          </Link>
        ) : isUnderReview && isStaff ? (
          <Link href={`/meetings/live/${meeting.id}/review`} className="block w-full">
            <button
              type="button"
              className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Review Meeting Report</span>
            </button>
          </Link>
        ) : isCancelled ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-100 text-slate-400 font-semibold text-sm cursor-not-allowed whitespace-nowrap"
          >
            Session Cancelled
          </button>
        ) : (
          <Link href={`/meet/${meeting.id}`} className="block w-full">
            <button
              type="button"
              className={`w-full min-h-[48px] px-5 py-2.5 rounded-xl font-extrabold text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                isHost
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              <Video size={18} className="shrink-0" />
              <span>{isHost ? "START MEETING" : "JOIN MEETING"}</span>
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Manual Meeting Record Card (Preserved 100%) ────────────────
function ManualRecordCard({
  meeting,
  currentUserId,
  isStaff,
}: {
  meeting: Meeting;
  currentUserId?: string;
  isStaff: boolean;
}) {
  const isPending = meeting.status === "pending";
  const isApproved = meeting.status === "approved";
  const isRejected = meeting.status === "rejected";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-5">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-0.5 rounded-full uppercase tracking-wider">
            {meeting.mode || "Meeting"} Record
          </span>
          {isPending ? (
            <Badge variant="pending">Pending Review</Badge>
          ) : isApproved ? (
            <Badge variant="approved">Approved</Badge>
          ) : (
            <Badge variant="rejected">Rejected</Badge>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
          {meeting.title}
        </h3>

        <div className="space-y-2 text-sm text-slate-600">
          <p className="flex items-center gap-2.5">
            <Calendar size={15} className="text-slate-400 shrink-0" />
            <span>{formatDate(meeting.date)}</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Users size={15} className="text-slate-400 shrink-0" />
            <span>Submitted by: <strong>{meeting.submittedByName}</strong></span>
          </p>
          {meeting.location && (
            <p className="flex items-center gap-2.5">
              <MapPin size={15} className="text-slate-400 shrink-0" />
              <span className="truncate">{meeting.location}</span>
            </p>
          )}
        </div>
      </div>

      <Link href={`/meetings/${meeting.id}`} className="block w-full pt-2">
        <button
          type="button"
          className="w-full min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition cursor-pointer whitespace-nowrap"
        >
          View Full Record →
        </button>
      </Link>
    </div>
  );
}
