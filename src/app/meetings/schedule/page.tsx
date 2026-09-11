"use client";

// ============================================================
// MentorMesh — Schedule an Online Meeting
// Exact 1:1 match with UI Mockup
// Sections: 1. Details → 2. Schedule → 3. Participants → 4. Agenda → 5. Settings
// Sidebar: Meeting Preview with Brand Graphic & Capabilities + Quote Card
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getScheduledMeetingsForViewer,
  createScheduledMeeting,
  updateScheduledMeeting,
  getActiveStudents,
  getTeams,
  generateMeetingCode,
} from "@/lib/firebase/firestore";
import type { User, Team, ScheduledMeeting, LiveMeetingParticipant } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Video,
  ChevronLeft,
  Users,
  User as UserIcon,
  Search,
  Check,
  X,
  Plus,
  Clock,
  Calendar,
  Trash2,
  HelpCircle,
  Link2,
  Info,
  Radio,
} from "lucide-react";

export default function ScheduleMeetingPage() {
  return (
    <AppShell>
      <ScheduleOnlineMeetingWorkspace />
    </AppShell>
  );
}

interface ExternalGuest {
  name: string;
  email: string;
}

interface AgendaItem {
  id: string;
  text: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 mins" },
  { value: 30, label: "30 mins" },
  { value: 45, label: "45 mins" },
  { value: 60, label: "1 hour (60 mins)" },
  { value: 90, label: "1.5 hours (90 mins)" },
  { value: 120, label: "2 hours (120 mins)" },
];

function ScheduleOnlineMeetingWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useToast();

  const isStaff = user?.role === "staff" || user?.role === "master";

  // ── Form State ────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("16:00");
  const [duration, setDuration] = useState(60);

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { id: "1", text: "Welcome & Introduction" },
    { id: "2", text: "Discussion Points" },
    { id: "3", text: "Action Items & Next Steps" },
  ]);

  const [allowExternal, setAllowExternal] = useState(true);
  const [waitingRoom, setWaitingRoom] = useState(false);

  const [errors, setErrors] = useState<{ title?: string; purpose?: string; date?: string; startTime?: string }>({});

  const [students, setStudents] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [externalGuests, setExternalGuests] = useState<ExternalGuest[]>([]);
  const [coHostIds, setCoHostIds] = useState<string[]>([]);

  // Modals
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);

  const [studentModalSearch, setStudentModalSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [teamModalSearch, setTeamModalSearch] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");

  // Load participants data
  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setLoadingData(true);
        const [studentList, allTeams] = await Promise.all([
          getActiveStudents(),
          getTeams(),
        ]);
        const teamList = isStaff
          ? allTeams
          : allTeams.filter((t) => t.memberIds?.includes(user.uid) || t.leaderId === user.uid);
        setStudents(studentList);
        setTeams(teamList);

        setSelectedStudentIds([user.uid]);
      } catch (err) {
        console.error("Error loading participants data:", err);
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [user, isStaff]);

  // Timing Display for Banner and Preview
  const { timeRangeDisplay, endTimeDisplay } = useMemo(() => {
    if (!startTime) return { timeRangeDisplay: "—", endTimeDisplay: "—" };
    const [h, m] = startTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return { timeRangeDisplay: "—", endTimeDisplay: "—" };

    const startTotalMin = h * 60 + m;
    const endTotalMin = startTotalMin + Number(duration);

    const formatHour = (totalM: number) => {
      const hours = Math.floor(totalM / 60) % 24;
      const mins = totalM % 60;
      const period = hours >= 12 ? "PM" : "AM";
      const displayH = hours % 12 === 0 ? 12 : hours % 12;
      return `${String(displayH).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
    };

    const durText =
      duration === 60
        ? "1 hour"
        : duration === 90
        ? "1.5 hours"
        : duration === 120
        ? "2 hours"
        : `${duration} mins`;

    return {
      timeRangeDisplay: `${formatHour(startTotalMin)} – ${formatHour(endTotalMin)} (${durText})`,
      endTimeDisplay: formatHour(endTotalMin),
    };
  }, [startTime, duration]);

  // Formatted Date calculations
  const { previewDateText, formattedDateDash } = useMemo(() => {
    if (!date) return { previewDateText: "Select date", formattedDateDash: "" };
    try {
      const [y, m, d] = date.split("-");
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const monthIndex = parseInt(m, 10) - 1;
      const monthName = monthNames[monthIndex] || m;
      return {
        previewDateText: `${parseInt(d, 10)} ${monthName} ${y}`,
        formattedDateDash: `${d}-${m}-${y}`,
      };
    } catch {
      return { previewDateText: date, formattedDateDash: date };
    }
  }, [date]);

  // Handlers
  const addAgendaItem = () => {
    const nextNum = agendaItems.length + 1;
    setAgendaItems((prev) => [
      ...prev,
      { id: Date.now().toString(), text: `Topic ${nextNum}` },
    ]);
  };

  const removeAgendaItem = (id: string) => {
    setAgendaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleChooseAll = () => {
    const allIds = students.map((s) => s.uid);
    if (selectedStudentIds.length === allIds.length) {
      setSelectedStudentIds(user?.uid ? [user.uid] : []);
    } else {
      setSelectedStudentIds(allIds);
    }
  };

  const toggleTeam = (team: Team) => {
    const isSelected = selectedTeamIds.includes(team.id);
    if (isSelected) {
      setSelectedTeamIds((prev) => prev.filter((id) => id !== team.id));
    } else {
      setSelectedTeamIds((prev) => [...prev, team.id]);
      setSelectedStudentIds((prev) => {
        const merged = new Set([...prev, ...(team.memberIds || [])]);
        return Array.from(merged);
      });
    }
  };

  const toggleStudent = (uid: string) => {
    if (uid === user?.uid) return;
    setSelectedStudentIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
    setCoHostIds((prev) => prev.filter((id) => id !== uid));
  };

  const toggleCoHost = (uid: string) => {
    setCoHostIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleAddGuest = () => {
    const name = newGuestName.trim();
    const email = newGuestEmail.trim().toLowerCase();

    if (!name) {
      error("Please enter guest name.");
      return;
    }
    if (!email || !email.includes("@")) {
      error("Please enter a valid email address.");
      return;
    }
    if (externalGuests.some((g) => g.email === email)) {
      error("This guest email has already been added.");
      return;
    }

    setExternalGuests((prev) => [...prev, { name, email }]);
    setNewGuestName("");
    setNewGuestEmail("");
    setGuestModalOpen(false);
    success(`External guest ${name} added.`);
  };

  const removeGuest = (email: string) => {
    setExternalGuests((prev) => prev.filter((g) => g.email !== email));
  };

  // Validation & Submit
  const validateForm = () => {
    const errs: { title?: string; purpose?: string; date?: string; startTime?: string } = {};
    if (!title.trim()) errs.title = "Meeting title is required.";
    if (!purpose.trim()) errs.purpose = "Meeting purpose is required.";
    if (!date) errs.date = "Date is required.";
    if (!startTime) errs.startTime = "Start time is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent, isDraft = false) => {
    if (e) e.preventDefault();
    if (!user) return;

    if (!validateForm()) {
      error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const participantUsers = students.filter((s) => selectedStudentIds.includes(s.uid));
      const participantNames = participantUsers.map((s) => s.name);
      const coHostNames = students.filter((s) => coHostIds.includes(s.uid)).map((s) => s.name);
      const teamNames = teams.filter((t) => selectedTeamIds.includes(t.id)).map((t) => t.name);

      const initialAttendance: LiveMeetingParticipant[] = participantUsers.map((s) => ({
        uid: s.uid,
        name: s.name,
        email: s.email,
        role: s.uid === user.uid ? "host" : coHostIds.includes(s.uid) ? "co_host" : "participant",
        invited: true,
        joined: false,
        status: "waiting",
      }));

      externalGuests.forEach((g) => {
        initialAttendance.push({
          uid: "",
          name: g.name,
          email: g.email,
          role: "external",
          invited: true,
          joined: false,
          status: "waiting",
        });
      });

      const formattedAgenda = agendaItems
        .map((item, idx) => `${idx + 1}. ${item.text}`)
        .join("\n");

      const meetingData: Omit<ScheduledMeeting, "id" | "createdAt" | "updatedAt"> = {
        title: title.trim(),
        purpose: purpose.trim(),
        description: description.trim(),
        mode: "Online",
        date,
        startTime,
        expectedDuration: Number(duration),
        hostId: user.uid,
        hostName: user.name,
        hostPhoto: user.profilePhoto || undefined,
        coHostIds,
        coHostNames,
        participantIds: selectedStudentIds,
        participantNames,
        teamIds: selectedTeamIds,
        teamNames,
        externalEmails: externalGuests.map((g) => g.email),
        agenda: formattedAgenda,
        meetingLink: "",
        status: isDraft ? ("scheduled" as any) : "scheduled",
        visibility: "invited",
        allowExternal,
        requireAdmission: waitingRoom,
        attendance: initialAttendance,
        attendeeCount: 0,
      };

      const code = generateMeetingCode();
      const internalRoomUrl = `${window.location.origin}/meet/${code}`;

      const meetingId = await createScheduledMeeting({
        ...meetingData,
        code,
        meetingLink: internalRoomUrl,
      });

      success(`Online meeting scheduled! Code: ${code}`);
      router.push(`/meet/${code}`);
    } catch (err: any) {
      console.error("Error creating meeting:", err);
      error(err.message || "Failed to schedule meeting.");
    } finally {
      setSubmitting(false);
    }
  };

  // Modals data
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    students.forEach((s) => {
      if (s.department) depts.add(s.department);
    });
    return ["All", ...Array.from(depts)];
  }, [students]);

  const filteredModalStudents = students.filter((s) => {
    const q = studentModalSearch.toLowerCase();
    const matchQuery =
      s.name.toLowerCase().includes(q) ||
      (s.registerNumber || "").toLowerCase().includes(q) ||
      (s.department || "").toLowerCase().includes(q);
    const matchDept = deptFilter === "All" || s.department === deptFilter;
    return matchQuery && matchDept;
  });

  const filteredModalTeams = teams.filter((t) => {
    const q = teamModalSearch.toLowerCase();
    return t.name.toLowerCase().includes(q);
  });

  const totalAttendeesCount = selectedStudentIds.length + externalGuests.length;

  // Clean host name to avoid duplicate "(Dev) (Dev)"
  const cleanHostDisplay = useMemo(() => {
    const hostRoleName = user?.role === "staff" ? "Staff" : user?.role === "master" ? "Admin" : "Dev";
    const rawName = user?.name?.trim() || "Harish Pranav S";
    const cleaned = rawName.replace(/\s*\((Dev|Staff|Admin|Student|Master)\)/gi, "").trim();
    return `${cleaned} (${hostRoleName})`;
  }, [user]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36 flex flex-col gap-8" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* ── TOP HEADER SECTION ────────────────────────────────── */}
      <div className="flex flex-col gap-4 pb-6 border-b border-slate-200" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Back to Meetings</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Video size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Schedule an Online Meeting
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                Create a live session, invite your participants and start collaborating — all within MentorMesh.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => success("Configure your meeting details, timing, and participants, then click 'Schedule Meeting' to create the live room.")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <HelpCircle size={15} />
            <span>Need Help?</span>
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN WORKSPACE ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ───────────────────────────────────────────────────── */}
        {/* LEFT COLUMN: 5 OPEN SECTIONS WITHOUT BACKGROUND CARDS */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-10" style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          
          {/* ── SECTION 1: MEETING DETAILS ─────────────────────── */}
          <div className="flex flex-col gap-6 pb-10 border-b border-slate-200" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm shadow-blue-500/20">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Meeting Details</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Add a title and brief information about your meeting.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 pt-1" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label className="text-xs sm:text-sm font-bold text-slate-800">
                  Meeting Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Team Progress Discussion"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  className={`w-full h-11 px-4 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                    errors.title
                      ? "border-red-500 bg-red-50/30 focus:ring-4 focus:ring-red-100"
                      : "border-slate-300 bg-white hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100/80"
                  }`}
                />
                {errors.title && <p className="text-xs text-red-600 font-bold">{errors.title}</p>}
              </div>

              <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label className="text-xs sm:text-sm font-bold text-slate-800">
                  Purpose / Goal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finalize design, review progress, assign tasks"
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                    if (errors.purpose) setErrors((prev) => ({ ...prev, purpose: undefined }));
                  }}
                  className={`w-full h-11 px-4 rounded-xl border text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                    errors.purpose
                      ? "border-red-500 bg-red-50/30 focus:ring-4 focus:ring-red-100"
                      : "border-slate-300 bg-white hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100/80"
                  }`}
                />
                {errors.purpose && <p className="text-xs text-red-600 font-bold">{errors.purpose}</p>}
              </div>

              <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-800">
                    Short Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Add any additional details, prerequisites or notes for participants..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[96px] p-4 rounded-xl border border-slate-300 bg-white hover:border-slate-400 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-100/80 resize-none"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: SCHEDULE ───────────────────────────── */}
          <div className="flex flex-col gap-6 pb-10 border-b border-slate-200" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm shadow-indigo-500/20">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Schedule & Timing</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Choose the date, start time and duration for your meeting.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-1" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" style={{ gap: "1.25rem" }}>
                <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="text-xs sm:text-sm font-bold text-slate-800">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/80 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="text-xs sm:text-sm font-bold text-slate-800">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/80 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="text-xs sm:text-sm font-bold text-slate-800">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/80 transition-all cursor-pointer"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated End Time Banner */}
              <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200 rounded-xl px-4 py-3.5 text-xs sm:text-sm text-blue-900 font-medium">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <Clock size={13} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-blue-700">Estimated End Time:</span>
                  <strong className="font-extrabold text-blue-950 text-sm">
                    {endTimeDisplay} ({formattedDateDash})
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 3: PARTICIPANTS ───────────────────────── */}
          <div className="flex flex-col gap-6 pb-10 border-b border-slate-200" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm shadow-emerald-500/20">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Participants</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Invite teams, individual students or external guests.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-1" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* 4 action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" style={{ gap: "0.875rem" }}>
                <button
                  type="button"
                  onClick={handleToggleChooseAll}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 text-slate-800 hover:text-emerald-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <Users size={16} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedStudentIds.length === students.length ? "Deselect All" : "Choose All"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeamModalOpen(true)}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 text-slate-800 hover:text-indigo-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <Users size={16} className="text-indigo-600 shrink-0" />
                  <span className="truncate">Select Team</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudentModalOpen(true)}
                  className="h-11 px-3.5 rounded-xl border border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-slate-800 hover:text-blue-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <UserIcon size={16} className="text-blue-600 shrink-0" />
                  <span className="truncate">Select Students</span>
                </button>
              </div>

              {/* Direct Code Join Notice */}
              <div className="flex items-center gap-3 p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-900 text-xs font-medium">
                <Radio size={16} className="text-blue-600 shrink-0" />
                <span>
                  <strong>Instant Join Code:</strong> A 4-character code (e.g. <code>K9X2</code>) will be generated automatically. Anyone with the code or share link can join directly or request host admission.
                </span>
              </div>

              {/* Selected Participants container */}
              <div className="flex flex-col gap-3" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Selected Participants ({selectedStudentIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudentModalOpen(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Manage Full Roster →
                  </button>
                </div>

                {selectedStudentIds.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 flex flex-col items-center justify-center text-center gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Users size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No students selected yet.</p>
                    <p className="text-xs text-slate-500">
                      Choose a team, select students from your department, or invite via 4-character code.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-4 shadow-2xs" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Teams list */}
                    {selectedTeamIds.length > 0 && (
                      <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Selected Teams ({selectedTeamIds.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedTeamIds.map((tid) => {
                            const t = teams.find((team) => team.id === tid);
                            if (!t) return null;
                            return (
                              <span
                                key={t.id}
                                className="inline-flex items-center gap-2 text-xs font-bold bg-white text-indigo-900 border border-indigo-200 px-3.5 py-1.5 rounded-lg shadow-2xs"
                              >
                                <span>Team: {t.name}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleTeam(t)}
                                  className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                                  title="Remove team"
                                >
                                  <X size={14} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Students summary */}
                    <div className="flex items-center justify-between text-xs text-slate-700 pt-2 border-t border-slate-200/80">
                      <span>
                        Including{" "}
                        <strong className="text-slate-950 font-bold">
                          {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? "s" : ""}
                        </strong>{" "}
                        from MentorMesh
                      </span>
                      <button
                        type="button"
                        onClick={() => setStudentModalOpen(true)}
                        className="text-emerald-700 hover:underline font-bold cursor-pointer"
                      >
                        Edit List →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 4: AGENDA ─────────────────────────────── */}
          <div className="flex flex-col gap-6 pb-10 border-b border-slate-200" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm shadow-amber-500/20">
                  4
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    Agenda <span className="text-slate-400 font-normal text-sm">(Optional)</span>
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Add key discussion points to keep the meeting focused.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addAgendaItem}
                className="h-9 px-3.5 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <Plus size={15} />
                <span>Add Agenda Item</span>
              </button>
            </div>

            <div className="flex flex-col gap-3.5 pt-1" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {agendaItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAgendaItems((prev) =>
                        prev.map((it) => (it.id === item.id ? { ...it, text: val } : it))
                      );
                    }}
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100/80 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(item.id)}
                    className="text-slate-400 hover:text-red-600 p-2.5 rounded-xl hover:bg-red-50 transition cursor-pointer shrink-0"
                    title="Delete item"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 5: MEETING SETTINGS ───────────────────── */}
          <div className="flex flex-col gap-6" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm shadow-purple-500/20">
                5
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Meeting Settings</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Configure meeting access and participation options.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1" style={{ gap: "1.25rem" }}>
              <label className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                allowExternal ? "border-purple-400 bg-purple-50/40" : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
              }`}>
                <input
                  type="checkbox"
                  checked={allowExternal}
                  onChange={(e) => setAllowExternal(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600 shrink-0"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Allow External Participants</span>
                  <span className="text-xs font-medium text-slate-500 block leading-relaxed mt-1">
                    Invited guests can join using their name and email without an account.
                  </span>
                </div>
              </label>

              <label className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                waitingRoom ? "border-purple-400 bg-purple-50/40" : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
              }`}>
                <input
                  type="checkbox"
                  checked={waitingRoom}
                  onChange={(e) => setWaitingRoom(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600 shrink-0"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Enable Waiting Room</span>
                  <span className="text-xs font-medium text-slate-500 block leading-relaxed mt-1">
                    Participants must be admitted by the host before entering the room.
                  </span>
                </div>
              </label>
            </div>
          </div>

        </div>

        {/* ───────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: MEETING PREVIEW & QUOTE CARD            */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* ── CARD: MEETING PREVIEW ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm flex flex-col gap-6" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Header: Title + Online Meeting pill */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Video size={16} />
                </div>
                <span className="font-extrabold text-slate-900 text-base">Meeting Preview</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Online Meeting
              </span>
            </div>

            {/* Dark Hero Graphic: MentorMesh Brand */}
            <div className="w-full aspect-[16/10] rounded-2xl bg-gradient-to-br from-[#090d16] via-[#0f172a] to-[#1e1b4b] flex flex-col items-center justify-center p-6 text-center shadow-inner relative overflow-hidden border border-slate-800">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-400/40 flex items-center justify-center backdrop-blur-md mb-2.5 shadow-xl">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">
                  M
                </span>
              </div>

              <h4 className="text-base font-extrabold text-white tracking-tight">MentorMesh</h4>
              <p className="text-[11px] text-blue-200/80 font-semibold mt-0.5">Built for Collaboration</p>
            </div>

            {/* Meeting Details List with high-contrast text and clean spacing */}
            <div className="flex flex-col gap-3.5 pt-1" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug break-words">
                {title.trim() || "Untitled Meeting"}
              </h3>

              <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-slate-600" style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">{previewDateText}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">{timeRangeDisplay}</span>
                </div>

                <div className="flex items-center gap-3">
                  <UserIcon size={16} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">
                    Host: <strong className="font-bold text-slate-900">{cleanHostDisplay}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Users size={16} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">{totalAttendeesCount} participants</span>
                </div>

                {/* In-app Meeting Room with clean spacing */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link2 size={16} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">In-app Meeting Room</span>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Will be created
                  </span>
                </div>
              </div>
            </div>

            {/* Blue Notice Box */}
            <div className="flex items-start gap-3 bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                This meeting will be hosted inside MentorMesh. No external links required.
              </p>
            </div>

            {/* Capabilities Checklist */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100" style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <p className="text-xs font-bold text-slate-800">What participants can do:</p>
              <ul className="flex flex-col gap-2 text-xs sm:text-sm text-slate-700" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li className="flex items-center gap-2.5">
                  <Check size={15} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">Join directly from MentorMesh</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={15} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">Use camera and microphone</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={15} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">Share screen</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={15} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">Chat in real-time</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={15} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">View participant list</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={15} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">Raise hand and reactions</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons — With generous 16px uncollapsible gap! */}
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-200" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(undefined, false)}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Video size={18} />
                <span>{submitting ? "Scheduling Meeting..." : "Schedule Meeting"}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => router.push("/meetings")}
                className="w-full h-11 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
                Invitations and calendar notifications will be sent automatically.
              </p>
            </div>

          </div>

          {/* ── CARD: INSPIRATIONAL QUOTE ──────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-50/90 border border-amber-200/80 p-6 text-center shadow-xs flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span className="text-amber-500 text-3xl font-serif font-black block leading-none">“</span>
            <p className="text-base font-black text-amber-950 tracking-tight leading-snug">
              “Better Meetings<br />Build Better Teams”
            </p>
            <span className="text-xs text-amber-800/80 font-bold block pt-1">
              — MentorMesh
            </span>
          </div>

        </div>

      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 3. MODALS                                                 */}
      {/* ═════════════════════════════════════════════════════════ */}

      {/* ── MODAL 1: TEAM SELECTION ───────────────────────────── */}
      <Modal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        title="Select Teams to Invite"
        description="Inviting a team automatically adds all members to the meeting."
        size="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setTeamModalOpen(false)}>
            Done ({selectedTeamIds.length} Teams Selected)
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams by name..."
              value={teamModalSearch}
              onChange={(e) => setTeamModalSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 outline-none focus:border-blue-600"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {filteredModalTeams.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No teams found matching search.</p>
            ) : (
              filteredModalTeams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                return (
                  <div
                    key={team.id}
                    onClick={() => toggleTeam(team)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-400 shadow-2xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{team.name}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                        {team.memberIds?.length || 0} members • Leader: {team.leaderName || "None"}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: STUDENT SELECTION ────────────────────────── */}
      <Modal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title="Select Individual Students"
        description="Search students by name, department, or register number."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">
              {selectedStudentIds.length} of {students.length} students selected
            </span>
            <Button variant="primary" size="sm" onClick={() => setStudentModalOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, roll no, or register no..."
                value={studentModalSearch}
                onChange={(e) => setStudentModalSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white outline-none focus:border-blue-600 font-medium"
            >
              {uniqueDepartments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Departments" : d}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {filteredModalStudents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No students found.</p>
            ) : (
              filteredModalStudents.map((s) => {
                const isSelected = selectedStudentIds.includes(s.uid);
                const isHost = s.uid === user?.uid;
                const isCoHost = coHostIds.includes(s.uid);

                return (
                  <div
                    key={s.uid}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-300 shadow-2xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => !isHost && toggleStudent(s.uid)}
                    >
                      <Avatar name={s.name} photoUrl={s.profilePhoto} size="sm" className="w-8 h-8 text-xs" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{s.name}</p>
                          {isHost && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                              Host
                            </span>
                          )}
                          {isCoHost && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                              Co-Host
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                          {s.registerNumber || s.rollNumber || "No Reg"} • {s.department || "General"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isSelected && !isHost && (
                        <button
                          type="button"
                          onClick={() => toggleCoHost(s.uid)}
                          className={`text-xs font-bold px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                            isCoHost
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700"
                          }`}
                        >
                          {isCoHost ? "★ Co-Host" : "+ Co-Host"}
                        </button>
                      )}

                      <div
                        onClick={() => !isHost && toggleStudent(s.uid)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: EXTERNAL GUEST ─────────────────────────── */}
      <Modal
        open={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        title="Add External Guest"
        description="Invite individuals outside MentorMesh with their name and email."
        size="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" size="sm" onClick={() => setGuestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddGuest}>
              Add Guest
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
              Guest Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Alex Johnson"
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 outline-none focus:border-blue-600 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
              Guest Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="alex.johnson@industry.com"
              value={newGuestEmail}
              onChange={(e) => setNewGuestEmail(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 outline-none focus:border-blue-600 font-medium"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
