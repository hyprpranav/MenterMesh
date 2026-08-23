"use client";
// ============================================================
// MentorMesh — Edit Event Page  ·  Premium UI Redesign v4
// ============================================================
import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getEvent, updateEvent, getUserTeams, getActiveStudents } from "@/lib/firebase/firestore";
import type { Team, Event, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/States";
import { CloudinaryImageUpload } from "@/components/ui/CloudinaryImageUpload";
import {
  ArrowLeft, Calendar, Users, Link2, FileText,
  X, Plus, Search, UserPlus, ChevronDown, Camera, Upload,
  CheckCircle2, User as UserIcon, Trophy, Check,
} from "lucide-react";

const EVENT_TYPES = [
  "Hackathon", "Designathon", "Project Expo", "Workshop",
  "Competition", "Bootcamp", "Internship", "Symposium", "Seminar", "Other",
];
const RESULTS_LIST = [
  "Winner / 1st Place 🏆", "1st Runner Up 🥈", "2nd Runner Up 🥉",
  "Top 10 Finalist 🌟", "Special Jury Award 🎖️", "Participant / Completed 📜",
];

// ─── Premium Design Tokens ─────────────────────────────────────
const T = {
  input: [
    "block w-full rounded-[14px] border border-slate-200/80 bg-white",
    "px-5 py-4 text-[15px] text-slate-900 placeholder-slate-400 font-medium min-h-[52px]",
    "outline-none transition-all duration-200 shadow-sm",
    "hover:border-slate-300",
    "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:shadow-md",
  ].join(" "),
  label: "block text-[14px] font-bold text-slate-800 mb-1.5 inline-flex items-center gap-2",
  req: "text-rose-500 font-bold",
  opt: "ml-1.5 text-[12px] font-medium text-slate-400 font-normal",
  hint: "mt-2.5 text-[13px] text-slate-500 font-medium leading-relaxed",
  divider: "mt-10 pt-10 border-t border-slate-100",
};

type Accent = "blue" | "violet" | "amber" | "rose" | "teal";
const ACCENT: Record<Accent, { iconBg: string; iconTxt: string; badgeTxt: string }> = {
  blue: { iconBg: "bg-blue-100", iconTxt: "text-blue-600", badgeTxt: "text-blue-600" },
  violet: { iconBg: "bg-violet-100", iconTxt: "text-violet-600", badgeTxt: "text-violet-600" },
  amber: { iconBg: "bg-amber-100", iconTxt: "text-amber-600", badgeTxt: "text-amber-600" },
  rose: { iconBg: "bg-rose-100", iconTxt: "text-rose-600", badgeTxt: "text-rose-600" },
  teal: { iconBg: "bg-teal-100", iconTxt: "text-teal-600", badgeTxt: "text-teal-600" },
};

function SectionCard({ step, icon, title, subtitle, accent, children }: {
  step: number; icon: React.ReactNode; title: string; subtitle: string; accent: Accent; children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <div className="mb-16 md:mb-20 flex flex-col w-full relative">
      <div className="mb-8 md:mb-10 flex items-center gap-5">
        <div className={`w-14 h-14 rounded-[16px] ${a.iconBg} ${a.iconTxt} flex items-center justify-center shrink-0 shadow-sm border border-white/50`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[13px] font-extrabold uppercase tracking-[0.15em] ${a.badgeTxt}`}>Step {step}</span>
          </div>
          <h3 className="text-[22px] md:text-[24px] font-black text-slate-900 tracking-tight leading-none mb-2">{title}</h3>
          <p className="text-[15px] font-medium text-slate-500 leading-tight">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-10 md:space-y-12">
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, optional, hint, children }: {
  label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center gap-2 mb-3">
        <label className="text-[14px] font-bold text-slate-800 tracking-wide flex items-center gap-2">
          {label}
          {required && <span className="text-rose-500 font-bold">*</span>}
          {optional && <span className="text-[12px] font-medium text-slate-400 font-normal">Optional</span>}
        </label>
      </div>
      <div className="relative flex-1 flex flex-col justify-end">
        {children}
      </div>
      {hint && <p className="mt-2.5 text-[13px] text-slate-500 font-medium leading-relaxed">{hint}</p>}
    </div>
  );
}

function SelectField({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className={`${T.input} appearance-none pr-10 cursor-pointer ${className}`}>{children}</select>
      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function Row({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return <div className={cols === 3 ? "grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8"}>{children}</div>;
}

function ParticipationCard({ active, icon, title, desc, onClick }: {
  active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={["flex flex-col items-start gap-4 p-5 rounded-[16px] border-2 transition-all duration-200 text-left w-full min-h-[140px]",
        active ? "border-violet-500 bg-violet-50/40 shadow-[0_4px_12px_rgba(139,92,246,0.06)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
      ].join(" ")}>
      <div className="flex items-center justify-between w-full">
        <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-colors ${active ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "bg-slate-100 text-slate-500"}`}>{icon}</div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"}`}>
          {active && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
      <div className="mt-1 flex flex-col">
        <p className={`text-[14px] font-bold mb-1 ${active ? "text-violet-950" : "text-slate-800"}`}>{title}</p>
        <p className={`text-[12px] leading-relaxed ${active ? "text-violet-700/80" : "text-slate-500"}`}>{desc}</p>
      </div>
    </button>
  );
}

function StudentRow({ student, checked, onToggle }: { student: User; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`w-full flex items-center gap-3.5 px-5 py-3 text-left transition-colors ${checked ? "bg-violet-50/50" : "hover:bg-slate-50"}`}>
      <div className={`flex-shrink-0 w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${checked ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"}`}>
        {checked && <Check size={12} strokeWidth={4} className="text-white" />}
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 ${checked ? "bg-violet-200 text-violet-800" : "bg-slate-100 text-slate-600"}`}>
        {student.name?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-bold truncate ${checked ? "text-violet-950" : "text-slate-800"}`}>{student.name}</p>
        <p className="text-[12px] text-slate-500 truncate mt-0.5">{[student.registerNumber, student.department, student.year && `${student.year} Yr`].filter(Boolean).join("  ·  ")}</p>
      </div>
      {checked && <span className="text-[11px] font-extrabold text-violet-600 bg-violet-100 px-2.5 py-1 rounded-full shrink-0">✓ Added</span>}
    </button>
  );
}

function UploadZone({ title, required, desc, icon, children, badgeText, badgeColor }: {
  title: string; required?: boolean; desc: string; icon: React.ReactNode;
  children: React.ReactNode; badgeText?: string; badgeColor?: string;
}) {
  return (
    <div className="rounded-[16px] border-2 border-dashed border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/30 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 flex items-center justify-center shrink-0">{icon}</div>
          <div className="pt-0.5">
            <p className="text-[13px] font-bold text-slate-900 tracking-wide">{title}{required && <span className="text-rose-500 ml-1 font-bold">*</span>}</p>
            <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>
          </div>
        </div>
        {badgeText && <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeColor ?? "bg-slate-100 text-slate-600 border-slate-200 shrink-0"}`}>{badgeText}</span>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
export default function EditEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { eventId } = useParams() as { eventId: string };
  const { success, error, warning } = useToast();
  const isStaff = user?.role === "staff" || user?.role === "master";

  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<Event | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("Hackathon");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [description, setDescription] = useState("");

  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [partType, setPartType] = useState<"individual" | "team" | "custom">("individual");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [checkedUids, setCheckedUids] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [externalInput, setExternalInput] = useState("");
  const [externalMembers, setExternalMembers] = useState<string[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [eventTrack, setEventTrack] = useState("");

  const [result, setResult] = useState("Participant / Completed 📜");
  const [whatBuilt, setWhatBuilt] = useState("");
  const [whatLearned, setWhatLearned] = useState("");

  const [certificateFile, setCertificateFile] = useState("");
  const [geotagPhotos, setGeotagPhotos] = useState<string[]>([]);

  const [driveLink, setDriveLink] = useState("");
  const [linkedInPost, setLinkedInPost] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!eventId) return;
      try {
        const ev = await getEvent(eventId);
        if (!ev) { error("Event not found"); router.push("/events"); return; }
        if (user && ev.submittedBy !== user.uid && !isStaff) {
          warning("No edit permission."); router.push(`/events/${eventId}`); return;
        }
        setEventData(ev);
        setName(ev.name || ""); setType(ev.type || "Hackathon");
        setDate(ev.date || ""); setEndDate(ev.endDate || "");
        setVenue(ev.venue || ""); setCity(ev.city || ""); setState(ev.state || "");
        setOrganizer(ev.organizer || ""); setDescription(ev.description || "");
        setProjectTitle(ev.projectTitle || ""); setEventTrack(ev.eventTrack || "");
        setResult(ev.result || "Participant / Completed 📜");
        setWhatBuilt(ev.whatBuilt || ""); setWhatLearned(ev.whatLearned || "");
        setCertificateFile(ev.certificateFile || "");
        setGeotagPhotos(ev.geotagPhotos || []);
        setDriveLink(ev.driveLink || ""); setLinkedInPost(ev.linkedInPost || "");
        setGithubUrl(ev.githubUrl || ""); setLiveUrl(ev.liveUrl || "");
        setExternalMembers(ev.externalParticipants || []);

        if (user?.uid) {
          const [teams, students] = await Promise.all([getUserTeams(user.uid), getActiveStudents()]);
          setUserTeams(teams); setAllStudents(students);
          if (ev.teamId) { setPartType("team"); setSelectedTeamId(ev.teamId); }
          else if ((ev.participantIds?.length ?? 0) > 1) {
            setPartType("custom");
            setCheckedUids(new Set(ev.participantIds?.filter((id: string) => id !== user.uid) || []));
          } else { setPartType("individual"); }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [eventId, user, isStaff]);

  const filteredStudents = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return allStudents.filter(s => {
      if (s.uid === user?.uid) return false;
      if (!q) return true;
      return s.name?.toLowerCase().includes(q) || s.registerNumber?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
    });
  }, [allStudents, memberSearch, user]);

  const toggleCheck = (uid: string) =>
    setCheckedUids(prev => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  const addExternal = () => {
    const n = externalInput.trim();
    if (!n) return;
    if (externalMembers.includes(n)) { error("Already added."); return; }
    setExternalMembers(p => [...p, n]); setExternalInput("");
  };

  const handleGeotagUpload = (url: string) => {
    if (geotagPhotos.length >= 5) { error("Max 5 photos."); return; }
    setGeotagPhotos(p => [...p, url]);
  };

  const handleSave = async (asDraft = false) => {
    if (!name.trim() || !date || !user || !eventData) return;
    if (partType === "team" && !selectedTeamId) { error("Please select a team."); return; }
    if (!asDraft) {
      if (!certificateFile) { error("Certificate is mandatory."); return; }
      if (geotagPhotos.length < 1) { error("At least one geotag photo required."); return; }
    }
    setSaving(true);
    try {
      const teamObj = partType === "team" ? userTeams.find(t => t.id === selectedTeamId) : undefined;
      const checkedStudents = allStudents.filter(s => checkedUids.has(s.uid));
      let finalIds = [user.uid], finalNames = [user.name || "Student"];
      let teamName: string | undefined;
      if (partType === "team" && teamObj) {
        finalIds = teamObj.memberIds; finalNames = teamObj.memberNames || []; teamName = teamObj.name;
      } else if (partType === "custom") {
        finalIds = [user.uid, ...checkedStudents.map(s => s.uid)];
        finalNames = [user.name || "Student", ...checkedStudents.map(s => s.name || "?"), ...externalMembers];
        teamName = "Custom Group";
      }
      let newStatus = eventData.submissionStatus || "pending_review";
      if (asDraft) newStatus = "draft";
      else if (isStaff) newStatus = ["draft"].includes(eventData.submissionStatus || "") ? "approved" : eventData.submissionStatus || "pending_review";
      else if (["draft", "changes_requested"].includes(eventData.submissionStatus || "")) newStatus = "pending_review";

      await updateEvent(eventId, {
        name: name.trim(), type, date,
        endDate: endDate || undefined, venue: venue.trim() || undefined,
        city: city.trim() || undefined, state: state.trim() || undefined,
        organizer: organizer.trim() || undefined, description: description.trim() || undefined,
        teamId: teamObj?.id, teamName, participantIds: finalIds, participantNames: finalNames,
        externalParticipants: externalMembers.length > 0 ? externalMembers : undefined,
        eventTrack: eventTrack.trim() || undefined, projectTitle: projectTitle.trim() || undefined,
        result, whatBuilt: whatBuilt.trim() || undefined, whatLearned: whatLearned.trim() || undefined,
        certificateFile: certificateFile || undefined,
        geotagPhotos: geotagPhotos.length > 0 ? geotagPhotos : undefined,
        driveLink: driveLink.trim() || undefined, linkedInPost: linkedInPost.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined, liveUrl: liveUrl.trim() || undefined,
        submissionStatus: newStatus,
        reviewFeedback: newStatus === "pending_review" ? undefined : eventData.reviewFeedback,
      });
      if (asDraft) success("Saved as draft!");
      else if (isStaff) success("Event updated.");
      else success("Re-submitted for review!");
      router.push(`/events/${eventId}`);
    } catch (e) { console.error(e); error("Update failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <AppShell><LoadingState message="Loading event…" /></AppShell>;
  if (!eventData) return null;

  const checkedList = allStudents.filter(s => checkedUids.has(s.uid));
  const rosterCount = 1 + checkedList.length + externalMembers.length;

  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 pb-32 mm-page-animate">

        {/* ── PAGE HEADER ── */}
        <div className="pt-10 pb-16">
          <Link href={`/events/${eventId}`} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-slate-500 hover:text-blue-600 transition-colors mb-8">
            <ArrowLeft size={16} /> Back to Event
          </Link>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[20px] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Calendar size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                "Edit Event"
              </h1>
              <p className="text-[15px] text-slate-500 mt-2 leading-relaxed max-w-2xl">
                "Update event details and re-submit for faculty review."
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleSave(false); }} className="space-y-4">

          {/* 1. EVENT DETAILS */}
          <SectionCard step={1} accent="blue" icon={<FileText size={20} strokeWidth={2.5} />} title="Event Details" subtitle="Basic information about the event">
            <Row>
              <Field label="Event Name" required>
                <input className={T.input} placeholder="e.g. Smart India Hackathon 2025" value={name} onChange={e => setName(e.target.value)} required />
              </Field>
              <Field label="Event Type">
                <SelectField value={type} onChange={setType}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </SelectField>
              </Field>
            </Row>
            <Row>
              <Field label="Start Date" required>
                <input type="date" className={T.input} value={date} onChange={e => setDate(e.target.value)} required />
              </Field>
              <Field label="End Date" optional>
                <input type="date" className={T.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </Field>
            </Row>
            <Row cols={3}>
              <Field label="Venue / College" optional>
                <input className={T.input} placeholder="e.g. Main Auditorium" value={venue} onChange={e => setVenue(e.target.value)} />
              </Field>
              <Field label="City" optional>
                <input className={T.input} placeholder="e.g. Salem" value={city} onChange={e => setCity(e.target.value)} />
              </Field>
              <Field label="State" optional>
                <input className={T.input} placeholder="e.g. Tamil Nadu" value={state} onChange={e => setState(e.target.value)} />
              </Field>
            </Row>
            <Field label="Organizing Institution / Company" optional>
              <input className={T.input} placeholder="e.g. Sri Eshwar College of Engineering" value={organizer} onChange={e => setOrganizer(e.target.value)} />
            </Field>
          </SectionCard>

          {/* 2. TEAM & PARTICIPATION */}
          <SectionCard step={2} accent="violet" icon={<Users size={17} />} title="Team & Participation" subtitle="Who participated at this event?">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-[14px] font-bold text-slate-800 tracking-wide flex items-center gap-2">Participation Type<span className="text-rose-500 font-bold">*</span></label>
              </div>
              <div className={`grid grid-cols-1 gap-6 ${userTeams.length > 0 ? "lg:grid-cols-3 md:grid-cols-2" : "md:grid-cols-2"}`}>
                <ParticipationCard active={partType === "individual"} icon={<UserIcon size={16} />} title="Individual" desc="Only me — no teammates" onClick={() => setPartType("individual")} />
                {userTeams.length > 0 && <ParticipationCard active={partType === "team"} icon={<Users size={16} />} title="MentorMesh Team" desc="One of my existing teams" onClick={() => setPartType("team")} />}
                <ParticipationCard active={partType === "custom"} icon={<UserPlus size={16} />} title="Custom Group" desc="Select platform students + add outside participants" onClick={() => setPartType("custom")} />
              </div>
            </div>

            {partType === "team" && (
              <div className="rounded-[20px] bg-violet-50/50 border border-violet-100 p-6 md:p-8 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[13px] font-extrabold text-violet-800 uppercase tracking-widest">Selected Team</p>
                <SelectField value={selectedTeamId} onChange={setSelectedTeamId} className="bg-white border-violet-200 hover:border-violet-300 focus:border-violet-500 focus:ring-violet-500/10 h-[52px]">
                  <option value="">— Choose a team —</option>
                  {userTeams.map(t => <option key={t.id} value={t.id}>{t.name}  ({t.memberIds.length} members)</option>)}
                </SelectField>
                {selectedTeamId && (() => {
                  const t = userTeams.find(x => x.id === selectedTeamId);
                  return t?.memberNames?.length ? (
                    <div className="pt-2">
                      <p className="text-[12px] font-bold text-violet-600 mb-3">Team Members List</p>
                      <div className="flex flex-wrap gap-2.5">
                        {t.memberNames.map((n, i) => (
                          <span key={i} className="flex items-center gap-2 text-[13px] font-bold bg-white text-violet-900 border border-violet-200 px-3.5 py-1.5 rounded-full shadow-sm">
                            <CheckCircle2 size={14} className="text-violet-500" /> {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {partType === "custom" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                <Row>
                  {/* Platform Students */}
                  <div className="rounded-[20px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[350px] md:h-[420px] bg-white">
                    <div className="bg-white px-4 sm:px-5 py-4 sm:py-5 border-b border-slate-100 shrink-0 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">MentorMesh Students</p>
                          <p className="text-[12px] text-slate-500 mt-0.5">Search and select registered peers</p>
                        </div>
                        {checkedUids.size > 0 && <span className="text-[12px] font-bold text-violet-800 bg-violet-100 border border-violet-200 px-3 py-1 rounded-full">{checkedUids.size} added</span>}
                      </div>
                      <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input type="text" placeholder="Search by name or reg number…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                          className="w-full !pl-11 pr-4 py-3 text-[14px] rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition" />
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100 overflow-y-auto flex-1 bg-white">
                      {filteredStudents.length === 0 ? <div className="px-5 py-10 text-center text-[14px] text-slate-400">No peers found matching your criteria.</div>
                        : filteredStudents.map(s => <StudentRow key={s.uid} student={s} checked={checkedUids.has(s.uid)} onToggle={() => toggleCheck(s.uid)} />)}
                    </div>
                  </div>

                  {/* External Participants */}
                  <div className="rounded-[20px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[350px] md:h-[420px] bg-white">
                    <div className="bg-slate-50/50 px-4 sm:px-5 py-4 sm:py-5 border-b border-slate-100 shrink-0">
                      <p className="text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">External Teammates</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">Add people not on the platform</p>
                    </div>
                    <div className="p-4 sm:p-5 flex flex-col flex-1 bg-white">
                      <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-5 shrink-0">
                        <div className="relative flex-1">
                          <UserPlus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input type="text" placeholder="Type full name & add…" value={externalInput} onChange={e => setExternalInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExternal())}
                            className="w-full !pl-11 pr-4 py-3 text-[14px] rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition" />
                        </div>
                        <button type="button" onClick={addExternal} disabled={!externalInput.trim()}
                          className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-3 rounded-xl bg-slate-900 text-white text-[14px] font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0">
                          <Plus size={16} /> <span className="hidden sm:inline">Add</span>
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {externalMembers.length > 0 ? (
                          <div className="flex flex-wrap gap-2.5">
                            {externalMembers.map((n, i) => (
                              <span key={i} className="inline-flex items-center gap-2 bg-slate-50 text-slate-800 text-[13px] font-bold px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm animate-in zoom-in duration-200">
                                {n}
                                <button type="button" onClick={() => setExternalMembers(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500 transition-colors bg-white rounded-full p-0.5"><X size={12} /></button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-[13px] text-slate-400 text-center px-4">
                            No external members added yet.<br />Use the input above to add manually.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Row>

                {/* Final Roster Display */}
                {(checkedList.length > 0 || externalMembers.length > 0) && (
                  <div className="rounded-[20px] bg-gradient-to-br from-violet-50/50 via-white to-blue-50/30 border border-violet-100 p-6 md:p-8 shadow-sm">
                    <p className="text-[13px] font-extrabold text-violet-900 uppercase tracking-wider mb-4">Complete Group Roster <span className="text-violet-500 ml-1">({rosterCount} members)</span></p>
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 bg-blue-600 text-white text-[13px] font-bold px-4 py-2 rounded-full shadow-md">
                        ★ {user?.name} (You)
                      </span>
                      {checkedList.map(s => (
                        <span key={s.uid} className="inline-flex items-center gap-2 bg-white text-violet-950 text-[13px] font-bold px-4 py-2 rounded-full border border-violet-200 shadow-sm">
                          <CheckCircle2 size={14} className="text-violet-500" /> {s.name}
                        </span>
                      ))}
                      {externalMembers.map((n, i) => (
                        <span key={`e-${i}`} className="inline-flex items-center gap-2 bg-white text-slate-700 text-[13px] font-bold px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block shrink-0" /> {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-14 pt-14 border-t border-slate-200/60" /> {/* Project Context */}
            <Row>
              <Field label="Project Title / Theme" optional>
                <input className={T.input} placeholder="e.g. Smart Agriculture Bot" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} />
              </Field>
              <Field label="Event Track / Category" optional>
                <input className={T.input} placeholder="e.g. AI/ML, Hardware, Fintech" value={eventTrack} onChange={e => setEventTrack(e.target.value)} />
              </Field>
            </Row>
          </SectionCard>

          {/* 3. EXPERIENCE & RESULT */}
          <SectionCard step={3} accent="amber" icon={<Trophy size={20} strokeWidth={2.5} />} title="Experience & Result" subtitle="Share your achievement and key takeaways">
            <Field label="Result / Achievement" required>
              <SelectField value={result} onChange={setResult} className="font-bold text-amber-950 bg-amber-50/50 border-amber-200 hover:border-amber-300 focus:border-amber-500 focus:ring-amber-500/10 h-[52px]">
                {RESULTS_LIST.map(r => <option key={r} value={r}>{r}</option>)}
              </SelectField>
            </Field>
            <div className="grid grid-cols-1 gap-8 pt-2">
              <Field label="What did you build / create?" optional hint="Keep it brief but descriptive. Focus on the core value or functionality of your solution.">
                <textarea className={`${T.input} resize-y min-h-[120px] leading-relaxed`} placeholder="Describe your prototype, solution, or deliverable clearly…" value={whatBuilt} onChange={e => setWhatBuilt(e.target.value)} />
              </Field>
              <Field label="Key Learnings & Challenges" optional hint="What valuable technical or soft skills did you gain? What was the hardest part?">
                <textarea className={`${T.input} resize-y min-h-[120px] leading-relaxed`} placeholder="Technical skills learned, obstacles overcome, insights gained…" value={whatLearned} onChange={e => setWhatLearned(e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          {/* 4. DOCUMENTS & VERIFICATION */}
          <SectionCard step={4} accent="rose" icon={<Camera size={20} strokeWidth={2.5} />} title="Documents & Verification Photos" subtitle="Required for submission to be approved by faculty">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <UploadZone title="Event Certificate" required desc="Upload your final participation or winner certificate." icon={<Upload size={18} />}>
                <CloudinaryImageUpload label="" buttonText="Click to Upload Certificate" existingUrl={certificateFile} onUploadSuccess={url => setCertificateFile(url)} />
                {certificateFile && (
                  <div className="flex items-center justify-between gap-4 bg-emerald-50 border border-emerald-200 rounded-[14px] px-4 py-3 animate-in zoom-in-95 duration-200 mt-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check size={14} strokeWidth={4} />
                      </div>
                      <span className="text-[13px] font-bold text-emerald-900 truncate">Certificate successfully uploaded</span>
                    </div>
                    <button type="button" onClick={() => setCertificateFile("")} className="w-8 h-8 flex items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-200/50 hover:text-emerald-900 transition-colors shrink-0"><X size={16} /></button>
                  </div>
                )}
              </UploadZone>

              <UploadZone title="Geotagged Photos" required desc="Real venue photos for verification purposes." icon={<Camera size={18} />} badgeText={`${geotagPhotos.length} / 5`} badgeColor={geotagPhotos.length >= 5 ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-white text-slate-600 border-slate-200"}>
                {geotagPhotos.length < 5 && (
                  <CloudinaryImageUpload label="" buttonText="Upload Geotag Photo" onUploadSuccess={handleGeotagUpload} />
                )}
                {geotagPhotos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                    {geotagPhotos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-[14px] overflow-hidden border border-slate-200 shadow-sm group">
                        <img src={url} alt={`Verification Photo ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                        <button type="button" onClick={() => setGeotagPhotos(p => p.filter((_, i) => i !== idx))} className="absolute inset-0 bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 backdrop-blur-[2px]">
                          <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg"><X size={14} strokeWidth={3} /></div>
                        </button>
                        <span className="absolute bottom-1.5 right-1.5 text-[10px] font-black bg-slate-900/70 text-white px-2 py-1 rounded-md backdrop-blur-md">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </UploadZone>
            </div>
          </SectionCard>

          {/* 5. EXTERNAL LINKS */}
          <SectionCard step={5} accent="teal" icon={<Link2 size={20} strokeWidth={2.5} />} title="External Links" subtitle="Drive folder, LinkedIn post, GitHub, live demo — all optional">
            <Row>
              <Field label="Google Drive Folder" optional><input className={T.input} placeholder="https://drive.google.com/…" value={driveLink} onChange={e => setDriveLink(e.target.value)} /></Field>
              <Field label="LinkedIn Post" optional><input className={T.input} placeholder="https://linkedin.com/…" value={linkedInPost} onChange={e => setLinkedInPost(e.target.value)} /></Field>
              <Field label="GitHub Repository" optional><input className={T.input} placeholder="https://github.com/…" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} /></Field>
              <Field label="Live Demo / Hosted App" optional><input className={T.input} placeholder="https://…" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} /></Field>
            </Row>
          </SectionCard>

          {/* SUBMIT BAR */}
          <div className="mt-14 flex items-center justify-between bg-white border border-slate-200 rounded-[20px] px-8 py-8 shadow-sm">
            <Link href={`/events/${eventId}`}>
              <Button type="button" variant="secondary" className="px-6 py-3 font-semibold hover:bg-slate-100">Cancel</Button>
            </Link>
            <div className="flex items-center gap-3">
              {!isStaff && <Button type="button" variant="outline" loading={saving} onClick={() => handleSave(true)} className="px-6 py-3 font-bold border-slate-300 text-slate-700 hover:bg-slate-50">Save Draft</Button>}
              <Button type="submit" variant="primary" loading={saving} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-[15px] font-bold shadow-lg shadow-blue-500/20">
                {isStaff ? "Update Event" : "Re-Submit for Review"}
              </Button>
            </div>
          </div>

        </form>
      </div>
    </AppShell>
  );
}
