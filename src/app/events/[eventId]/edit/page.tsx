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
  CheckCircle2, User as UserIcon, Trophy,
} from "lucide-react";

const EVENT_TYPES = [
  "Hackathon", "Designathon", "Project Expo", "Workshop",
  "Competition", "Bootcamp", "Internship", "Symposium", "Seminar", "Other",
];
const RESULTS_LIST = [
  "Winner / 1st Place 🏆", "1st Runner Up 🥈", "2nd Runner Up 🥉",
  "Top 10 Finalist 🌟", "Special Jury Award 🎖️", "Participant / Completed 📜",
];

// ─── Design tokens ─────────────────────────────────────────────
const T = {
  card: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
  input: [
    "block w-full rounded-xl border border-slate-200 bg-white",
    "px-4 py-3 text-sm text-slate-900 placeholder-slate-400",
    "outline-none transition duration-150",
    "hover:border-slate-300",
    "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
  ].join(" "),
  label: "block text-[13px] font-semibold text-slate-700 mb-1.5",
  req: "text-rose-500 ml-0.5",
  opt: "ml-1.5 text-[11px] font-normal text-slate-400",
  hint: "mt-1 text-[11px] text-slate-400",
  divider: "border-t border-slate-100",
};

type Accent = "blue" | "violet" | "amber" | "rose" | "teal";
const ACCENT: Record<Accent, { ring: string; iconBg: string; iconTxt: string; stepBg: string; headerBg: string; titleTxt: string }> = {
  blue: { ring: "border-blue-100", iconBg: "bg-blue-100", iconTxt: "text-blue-600", stepBg: "bg-blue-600", headerBg: "bg-gradient-to-r from-blue-50 to-slate-50", titleTxt: "text-blue-700" },
  violet: { ring: "border-violet-100", iconBg: "bg-violet-100", iconTxt: "text-violet-600", stepBg: "bg-violet-600", headerBg: "bg-gradient-to-r from-violet-50 to-slate-50", titleTxt: "text-violet-700" },
  amber: { ring: "border-amber-100", iconBg: "bg-amber-100", iconTxt: "text-amber-600", stepBg: "bg-amber-500", headerBg: "bg-gradient-to-r from-amber-50 to-slate-50", titleTxt: "text-amber-700" },
  rose: { ring: "border-rose-100", iconBg: "bg-rose-100", iconTxt: "text-rose-600", stepBg: "bg-rose-600", headerBg: "bg-gradient-to-r from-rose-50 to-slate-50", titleTxt: "text-rose-700" },
  teal: { ring: "border-teal-100", iconBg: "bg-teal-100", iconTxt: "text-teal-600", stepBg: "bg-teal-600", headerBg: "bg-gradient-to-r from-teal-50 to-slate-50", titleTxt: "text-teal-700" },
};

function SectionCard({ step, icon, title, subtitle, accent, children }: {
  step: number; icon: React.ReactNode; title: string; subtitle: string; accent: Accent; children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <div className={`${T.card} border ${a.ring}`}>
      <div className={`${a.headerBg} px-6 py-4 border-b ${a.ring} flex items-center gap-4`}>
        <div className={`w-8 h-8 rounded-full ${a.stepBg} text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm`}>{step}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-extrabold uppercase tracking-[0.08em] ${a.titleTxt}`}>{title}</p>
          <p className="text-[12px] text-slate-500 mt-0.5 font-medium">{subtitle}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl ${a.iconBg} ${a.iconTxt} flex items-center justify-center shrink-0`}>{icon}</div>
      </div>
      <div className="px-6 py-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, required, optional, hint, children }: {
  label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className={T.label}>{label}{required && <span className={T.req}>*</span>}{optional && <span className={T.opt}>optional</span>}</label>
      {children}
      {hint && <p className={T.hint}>{hint}</p>}
    </div>
  );
}

function SelectField({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className={`${T.input} appearance-none pr-10 cursor-pointer ${className}`}>{children}</select>
      <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function Row({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return <div className={cols === 3 ? "grid grid-cols-1 sm:grid-cols-3 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>{children}</div>;
}

function ParticipationCard({ active, icon, title, desc, onClick }: {
  active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={["flex items-center gap-3.5 w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200",
        active ? "border-violet-500 bg-violet-50 shadow-sm shadow-violet-100" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
      ].join(" ")}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${active ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500"}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold leading-tight ${active ? "text-violet-900" : "text-slate-800"}`}>{title}</p>
        <p className={`text-[11px] mt-0.5 ${active ? "text-violet-600" : "text-slate-400"}`}>{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? "border-violet-500 bg-violet-500" : "border-slate-300"}`}>
        {active && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

function StudentRow({ student, checked, onToggle }: { student: User; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${checked ? "bg-violet-50" : "hover:bg-slate-50/80"}`}>
      <div className={`flex-shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all ${checked ? "bg-violet-600 border-violet-600" : "border-slate-300 bg-white"}`}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${checked ? "bg-violet-200 text-violet-800" : "bg-slate-100 text-slate-600"}`}>
        {student.name?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${checked ? "text-violet-900" : "text-slate-800"}`}>{student.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{[student.registerNumber, student.department, student.year && `${student.year} Yr`].filter(Boolean).join("  ·  ")}</p>
      </div>
      {checked && <span className="text-[10px] font-extrabold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full shrink-0 border border-violet-200">✓ Added</span>}
    </button>
  );
}

function UploadZone({ title, required, desc, icon, children, badgeText, badgeColor }: {
  title: string; required?: boolean; desc: string; icon: React.ReactNode;
  children: React.ReactNode; badgeText?: string; badgeColor?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-sm">{icon}</div>
          <div>
            <p className="text-sm font-bold text-slate-800">{title}{required && <span className="text-rose-500 ml-1">*</span>}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
          </div>
        </div>
        {badgeText && <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${badgeColor ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>{badgeText}</span>}
      </div>
      {children}
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
      <div className="w-full max-w-[860px] mx-auto px-4 sm:px-6 pb-20 mm-page-animate">

        {/* ── PAGE HEADER ── */}
        <div className="pt-2 pb-8">
          <Link href={`/events/${eventId}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-6">
            <ArrowLeft size={14} /> Back to Event
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200 shrink-0 mt-0.5">
              <Calendar size={26} />
            </div>
            <div>
              <h1 className="text-[1.625rem] font-black text-slate-900 tracking-tight leading-tight">Edit Event</h1>
              <p className="text-[14px] text-slate-500 mt-1.5 leading-relaxed max-w-lg">
                Update event details and re-submit for faculty review.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleSave(false); }} className="space-y-6">

          {/* 1. EVENT DETAILS */}
          <SectionCard step={1} accent="blue" icon={<FileText size={17} />} title="Event Details" subtitle="Basic information about the event">
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
              <label className={T.label}>Participation Type<span className={T.req}>*</span></label>
              <div className="space-y-2.5">
                <ParticipationCard active={partType === "individual"} icon={<UserIcon size={16} />} title="Individual" desc="Only me — no teammates" onClick={() => setPartType("individual")} />
                {userTeams.length > 0 && <ParticipationCard active={partType === "team"} icon={<Users size={16} />} title="MentorMesh Team" desc="One of my existing teams on this platform" onClick={() => setPartType("team")} />}
                <ParticipationCard active={partType === "custom"} icon={<UserPlus size={16} />} title="Custom Group" desc="Select platform students + add outside participants" onClick={() => setPartType("custom")} />
              </div>
            </div>

            {partType === "team" && (
              <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 space-y-3">
                <p className="text-[12px] font-extrabold text-violet-700 uppercase tracking-widest">Choose a Team</p>
                <SelectField value={selectedTeamId} onChange={setSelectedTeamId} className="bg-white border-violet-200 focus:border-violet-400 focus:ring-violet-400/10">
                  <option value="">— Select a team —</option>
                  {userTeams.map(t => <option key={t.id} value={t.id}>{t.name}  ({t.memberIds.length} members)</option>)}
                </SelectField>
                {selectedTeamId && (() => {
                  const t = userTeams.find(x => x.id === selectedTeamId);
                  return t?.memberNames?.length ? (
                    <div>
                      <p className="text-[11px] font-semibold text-violet-600 mb-2">Team Members</p>
                      <div className="flex flex-wrap gap-2">
                        {t.memberNames.map((n, i) => (
                          <span key={i} className="flex items-center gap-1.5 text-xs font-semibold bg-white text-violet-800 border border-violet-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={11} className="text-violet-500" /> {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {partType === "custom" && (
              <div className="space-y-4">
                {/* Platform students */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[12px] font-extrabold text-slate-700 uppercase tracking-widest">MentorMesh Students</p>
                      {checkedUids.size > 0 && <span className="text-[11px] font-bold text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">{checkedUids.size} selected</span>}
                    </div>
                    <div className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input type="text" placeholder="Search name, register number, or department…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition" />
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[240px] overflow-y-auto">
                    {filteredStudents.length === 0
                      ? <div className="px-4 py-6 text-center text-sm text-slate-400 italic">No matching students found.</div>
                      : filteredStudents.map(s => <StudentRow key={s.uid} student={s} checked={checkedUids.has(s.uid)} onToggle={() => toggleCheck(s.uid)} />)}
                  </div>
                </div>

                {/* External */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <p className="text-[12px] font-extrabold text-slate-700 uppercase tracking-widest">External Participants</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Teammates who are <em>not</em> registered on MentorMesh</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2.5">
                      <div className="relative flex-1">
                        <UserPlus size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input type="text" placeholder="Enter full name and press Add" value={externalInput} onChange={e => setExternalInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExternal())}
                          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition" />
                      </div>
                      <button type="button" onClick={addExternal} disabled={!externalInput.trim()}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-40 transition-colors shrink-0">
                        <Plus size={14} /> Add
                      </button>
                    </div>
                    {externalMembers.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {externalMembers.map((n, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200">
                            {n}<button type="button" onClick={() => setExternalMembers(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 transition-colors"><X size={11} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(checkedList.length > 0 || externalMembers.length > 0) && (
                  <div className="rounded-xl bg-gradient-to-br from-violet-50 via-white to-indigo-50 border border-violet-200 p-4">
                    <p className="text-[12px] font-extrabold text-violet-900 uppercase tracking-widest mb-3">Group Roster — {rosterCount} members</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">★ {user?.name} (You)</span>
                      {checkedList.map(s => <span key={s.uid} className="inline-flex items-center gap-1.5 bg-white text-violet-900 text-xs font-semibold px-3 py-1.5 rounded-full border border-violet-200 shadow-sm"><CheckCircle2 size={11} className="text-violet-500" /> {s.name}</span>)}
                      {externalMembers.map((n, i) => <span key={`e-${i}`} className="inline-flex items-center gap-1.5 bg-white text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block shrink-0" /> {n}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={T.divider} />
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
          <SectionCard step={3} accent="amber" icon={<Trophy size={17} />} title="Experience & Result" subtitle="Share your achievement and key takeaways">
            <Field label="Result / Achievement" required>
              <SelectField value={result} onChange={setResult} className="font-bold text-amber-900 bg-amber-50/60 border-amber-200 hover:border-amber-300 focus:border-amber-500 focus:ring-amber-400/10">
                {RESULTS_LIST.map(r => <option key={r} value={r}>{r}</option>)}
              </SelectField>
            </Field>
            <Row>
              <Field label="What did you build / create?" optional hint="Describe your prototype, solution, or deliverable.">
                <textarea className={`${T.input} resize-none`} rows={4} placeholder="Briefly describe the project or prototype…" value={whatBuilt} onChange={e => setWhatBuilt(e.target.value)} />
              </Field>
              <Field label="Key Learnings & Challenges" optional hint="What skills did you gain? What was difficult?">
                <textarea className={`${T.input} resize-none`} rows={4} placeholder="Technical skills learned, obstacles overcome…" value={whatLearned} onChange={e => setWhatLearned(e.target.value)} />
              </Field>
            </Row>
          </SectionCard>

          {/* 4. DOCUMENTS */}
          <SectionCard step={4} accent="rose" icon={<Camera size={17} />} title="Documents & Verification Photos" subtitle="Required for submission to be approved by faculty">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <UploadZone title="Event Certificate" required desc="Participation or winner certificate" icon={<Upload size={15} />}>
                <CloudinaryImageUpload label="" buttonText="Click to Upload Certificate" existingUrl={certificateFile} onUploadSuccess={url => setCertificateFile(url)} />
                {certificateFile && (
                  <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5">
                    <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                    <span className="text-xs font-semibold text-green-800 flex-1 truncate">Certificate uploaded successfully</span>
                    <button type="button" onClick={() => setCertificateFile("")} className="text-slate-300 hover:text-red-400 transition-colors shrink-0"><X size={13} /></button>
                  </div>
                )}
              </UploadZone>
              <UploadZone title="Geotagged Event Photos" required desc="Photos taken at the event location" icon={<Camera size={15} />}
                badgeText={`${geotagPhotos.length} / 5`}
                badgeColor={geotagPhotos.length >= 5 ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"}>
                {geotagPhotos.length < 5 && <CloudinaryImageUpload label="" buttonText="Add Geotag Photo" onUploadSuccess={handleGeotagUpload} />}
                {geotagPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {geotagPhotos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md group">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setGeotagPhotos(p => p.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/55 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-150">
                          <X size={18} />
                        </button>
                        <span className="absolute bottom-0 right-0 text-[9px] font-black bg-black/65 text-white px-1.5 py-0.5 rounded-tl">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </UploadZone>
            </div>
          </SectionCard>

          {/* 5. LINKS */}
          <SectionCard step={5} accent="teal" icon={<Link2 size={17} />} title="External Links" subtitle="Drive folder, LinkedIn post, GitHub, live demo — all optional">
            <Row>
              <Field label="Google Drive Folder" optional><input className={T.input} placeholder="https://drive.google.com/…" value={driveLink} onChange={e => setDriveLink(e.target.value)} /></Field>
              <Field label="LinkedIn Post" optional><input className={T.input} placeholder="https://linkedin.com/…" value={linkedInPost} onChange={e => setLinkedInPost(e.target.value)} /></Field>
              <Field label="GitHub Repository" optional><input className={T.input} placeholder="https://github.com/…" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} /></Field>
              <Field label="Live Demo / Hosted App" optional><input className={T.input} placeholder="https://…" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} /></Field>
            </Row>
          </SectionCard>

          {/* SUBMIT BAR */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
            <Link href={`/events/${eventId}`}>
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <div className="flex items-center gap-3">
              {!isStaff && <Button type="button" variant="outline" loading={saving} onClick={() => handleSave(true)}>Save Draft</Button>}
              <Button type="submit" variant="primary" loading={saving}>
                {isStaff ? "Update Event" : "Re-Submit for Review"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
