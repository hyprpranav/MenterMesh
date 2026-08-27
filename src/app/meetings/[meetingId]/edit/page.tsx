"use client";

// ============================================================
// MentorMesh — Submit Meeting Details
// ============================================================
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveStudents, getMeeting, updateMeeting } from "@/lib/firebase/firestore";
import type { User, MeetingMode } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { Presentation, Loader2, ArrowLeft, Search, Check, AlertCircle, X, Plus, Image as ImageIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CloudinaryImageUpload } from "@/components/ui/CloudinaryImageUpload";
import { cn } from "@/lib/utils";

export default function EditMeetingPage() {
    return (
        <AppShell>
            <EditMeetingContent />
        </AppShell>
    );
}

const T = {
    input: "block w-full rounded-[14px] border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-[15px] font-medium min-h-[52px] outline-none hover:bg-white hover:border-slate-300 focus:bg-white focus:border-blue-500 transition focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400",
    label: "block text-[14px] font-bold text-slate-800 mb-2",
    textarea: "block w-full rounded-[14px] border border-slate-200 bg-slate-50/50 px-5 py-4 text-[15px] font-medium min-h-[90px] resize-y outline-none hover:bg-white hover:border-slate-300 focus:bg-white focus:border-blue-500 transition focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400",
    card: "bg-white border border-slate-200/80 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden",
};

function EditMeetingContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { success, error } = useToast();

    const [students, setStudents] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const list = await getActiveStudents();
                setStudents(list);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingUsers(false);
            }
        }
        load();
    }, []);

    const meetingId = useParams().meetingId as string;

    const [form, setForm] = useState({
        title: "",
        purpose: "",
        description: "",
        mode: "Online" as MeetingMode,
        date: "",
        time: "",
        link: "",
        location: "",
        images: [] as string[],
    });

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        async function loadMeeting() {
            if (!meetingId) return;
            try {
                const data = await getMeeting(meetingId);
                if (data) {
                    setForm({
                        title: data.title || "",
                        purpose: data.purpose || "",
                        description: data.description || "",
                        mode: data.mode || "Online",
                        date: data.date || "",
                        time: data.time || "",
                        link: data.link || "",
                        location: data.location || "",
                        images: (data as any).images || [],
                    });
                    setSelectedIds(data.attendeeIds || []);
                }
            } catch (error) {
                console.error(error);
            }
        }
        loadMeeting();
    }, [meetingId]);

    // Automatically select the submitter
    useEffect(() => {
        if (user?.uid && !selectedIds.includes(user.uid)) {
            setSelectedIds((prev) => [...prev, user.uid]);
        }
    }, [user]);

    const toggleStudent = (uid: string) => {
        setSelectedIds((prev) =>
            prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
        );
    };

    const filteredStudents = students.filter(s => {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.registerNumber || "").toLowerCase().includes(q);
    });

    const handleSave = async () => {
        if (!form.title || !form.purpose || !form.description || !form.date || !form.time) {
            error("Please fill in all required fields marked with *");
            return;
        }
        if (selectedIds.length === 0) {
            error("Please select at least one attendee.");
            return;
        }
        if (form.images.length === 0) {
            error("Please attach at least one meeting screenshot.");
            return;
        }

        try {
            setSaving(true);
            const selectedNames = selectedIds.map(
                (id) => students.find((s) => s.uid === id)?.name || (id === user?.uid ? user?.name : "Unknown")
            );

            await updateMeeting(meetingId, {
                title: form.title.trim(),
                purpose: form.purpose.trim(),
                description: form.description.trim(),
                mode: form.mode,
                date: form.date,
                time: form.time,
                link: form.link.trim(),
                location: form.location.trim(),
                attendeeIds: selectedIds,
                attendeeNames: selectedNames,
                images: form.images,
                attendeeCount: selectedIds.length,
            });

            success("Meeting successfully updated!");
            router.push(`/meetings/${meetingId}`);
        } catch (err: any) {
            console.error(err);
            error(err.message || "Failed to submit meeting.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 pb-24 mm-page-animate space-y-6 mt-6">
            <div>
                <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => router.push("/meetings")} className="-ml-3 mb-4">
                    Back to Meetings
                </Button>
                <PageHeader
                    icon={<Presentation size={24} strokeWidth={2.5} />}
                    iconClass="bg-blue-100 text-blue-600 rounded-xl"
                    title="Edit Meeting Details"
                    subtitle="Update existing meeting information."
                />
            </div>

            <div className="space-y-7">

                <div>
                    <label className={T.label}>Meeting Title <span className="text-rose-500 ml-0.5">*</span></label>
                    <input type="text" className={T.input} placeholder="e.g. Project Brainstorming Phase 1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>

                <div>
                    <label className={T.label}>Meeting Purpose / Goal <span className="text-rose-500 ml-0.5">*</span></label>
                    <input type="text" className={T.input} placeholder="What was the main goal?" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />
                </div>

                <div>
                    <label className={T.label}>Meeting Description <span className="text-rose-500 ml-0.5">*</span></label>
                    <textarea className={T.textarea} rows={2} placeholder="Detailed description of what was discussed..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                        <label className={T.label}>Meeting Type / Mode</label>
                        <select className={T.input} value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as MeetingMode })}>
                            <option>Online</option>
                            <option>Offline</option>
                            <option>Hybrid</option>
                        </select>
                    </div>

                    <div>
                        <label className={T.label}>Meeting Date <span className="text-rose-500 ml-0.5">*</span></label>
                        <input type="date" className={T.input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>

                    <div>
                        <label className={T.label}>Meeting Start Time <span className="text-rose-500 ml-0.5">*</span></label>
                        <input type="time" className={T.input} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                    </div>

                    {(form.mode === "Online" || form.mode === "Hybrid") && (
                        <div className="sm:col-span-2">
                            <label className={T.label}>Meeting Link <span className="text-[12px] text-slate-400 font-medium ml-1">Optional</span></label>
                            <input type="url" className={T.input} placeholder="https://meet.google.com/..." value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
                        </div>
                    )}

                    {(form.mode === "Offline" || form.mode === "Hybrid") && (
                        <div className="sm:col-span-2">
                            <label className={T.label}>Meeting Location <span className="text-[12px] text-slate-400 font-medium ml-1">Optional</span></label>
                            <input type="text" className={T.input} placeholder="e.g. Innovation Lab / Library Setup" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <label className="block text-[15px] font-bold text-slate-800 mb-0">Select Attendees / Participants <span className="text-rose-500 ml-0.5">*</span> ({selectedIds.length} chosen)</label>
                        <span className="text-[13px] font-medium text-slate-500 hidden sm:block tracking-wide">Search & click to add</span>
                    </div>

                    {
                        selectedIds.length > 0 && (
                            <div className="flex flex-wrap gap-2.5 p-4 bg-gradient-to-tr from-blue-50/80 to-indigo-50/30 rounded-2xl border border-blue-100 shadow-sm animate-in fade-in duration-300">
                                {selectedIds.map((id) => {
                                    const s = id === user?.uid ? user : students.find((st) => st.uid === id);
                                    return (
                                        <span key={id} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13.5px] font-bold shadow-sm transition-transform animate-in zoom-in duration-200 bg-white text-blue-900 border border-blue-200 hover:border-rose-300 group`}>
                                            {s?.name || id} {id === user?.uid ? "(You)" : ""}
                                            {id !== user?.uid && <button type="button" onClick={() => toggleStudent(id)} className="text-slate-400 hover:text-rose-500 cursor-pointer ml-1.5 bg-slate-100 group-hover:bg-rose-50 rounded-full p-0.5 transition-colors"><X size={13} strokeWidth={3} /></button>}
                                        </span>
                                    );
                                })}
                            </div>
                        )
                    }

                    <div className="p-4 sm:p-5 bg-blue-50 border border-blue-100 rounded-[14px] flex items-start gap-3.5 text-[14px] text-blue-800 shadow-sm">
                        <AlertCircle size={20} className="shrink-0 text-blue-500 mt-0.5" />
                        <p className="leading-relaxed">A meeting only needs to be submitted <b className="font-bold">ONCE</b>. Select all attendees below. Once approved, the meeting will appear seamlessly in everyone's dashboard.</p>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col h-[380px]">
                        <div className="bg-slate-50/80 p-4 sm:p-5 border-b border-slate-200 shrink-0">
                            <div className="relative">
                                <Search size={26} className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                                <input type="text" placeholder="Search students by name, reg number..." className="block w-full !pl-[64px] pr-5 py-5 text-[18px] bg-white border-2 border-slate-200/80 rounded-2xl outline-none hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all font-bold placeholder-slate-400 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 sm:p-3 bg-slate-50/30">
                            {loadingUsers ? (
                                <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                                    <Loader2 className="animate-spin" size={24} />
                                    <span>Loading directory...</span>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <p className="text-[13px] font-medium text-slate-400 py-8 text-center animate-pulse">No matching students found.</p>
                            ) : filteredStudents.map((st) => {
                                const isSelected = selectedIds.includes(st.uid);
                                return (
                                    <div key={st.uid} onClick={() => toggleStudent(st.uid)}
                                        className={`flex items-center justify-between p-3 mb-1.5 rounded-xl cursor-pointer transition-all border outline-none select-none ${isSelected ? "bg-blue-50 border-blue-300 text-blue-950 shadow-[0_2px_8px_rgba(37,99,235,0.08)]" : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-800"}`}>
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <Avatar name={st.name} photoUrl={st.profilePhoto} size="md" />
                                            <div className="truncate">
                                                <p className={`truncate ${isSelected ? "font-bold text-[14px]" : "font-semibold text-[14px]"}`}>{st.name} {st.uid === user?.uid ? "(You)" : ""}</p>
                                                <p className="text-[12px] font-medium text-slate-500 truncate mt-0.5">{st.registerNumber ? `${st.registerNumber} · ` : ""}{st.department || "ECE"}</p>
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

                {/* Screenshots */}
                <div className="mt-8">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <label className="block text-[15px] font-bold text-slate-800 mb-0">Meeting Screenshots (Max 3) <span className="text-rose-500 ml-0.5">*</span></label>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-[20px] p-5 sm:p-6 shadow-sm">
                        <p className="text-[13px] text-slate-500 mb-4">You are required to attach at least 1 and up to 3 screenshots of your meeting.</p>
                        <div className="flex flex-wrap gap-4">
                            {form.images.map((url, i) => (
                                <div key={i} className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200 group bg-white shrink-0">
                                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))} className="bg-white/20 p-2 rounded-full hover:bg-rose-500 hover:text-white text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {form.images.length < 3 && (
                                <div className="w-32 h-32 shrink-0">
                                    <CloudinaryImageUpload label="" buttonText="Upload Photo" onUploadSuccess={(url) => setForm(f => ({ ...f, images: [...f.images, url] }))} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Action Bar */}
            <div className="mt-10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white border border-slate-200/80 rounded-[24px] px-6 py-6 sm:px-10 sm:py-8 shadow-sm w-full">
                <div className="text-[13px] text-slate-500 font-medium text-center sm:text-left">
                    Timestamp will be captured automatically.
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <Button variant="ghost" onClick={() => router.push("/meetings")} disabled={saving} className="w-full sm:w-auto px-6 font-semibold justify-center">
                        Discard
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto px-8 min-w-[180px] shadow-lg shadow-blue-500/20 text-[15px] font-bold justify-center"
                        icon={saving ? <Loader2 className="animate-spin" size={18} /> : undefined}
                    >
                        {saving ? "Updating..." : "Update Meeting"}
                    </Button>
                </div>
            </div >
        </div >
    );
}
