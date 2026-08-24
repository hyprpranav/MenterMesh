"use client";

// ============================================================
// MentorMesh — Meeting Details View
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getMeeting, reviewMeetingSubmission } from "@/lib/firebase/firestore";
import type { Meeting } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Loader2, ArrowLeft, Clock, MapPin, Users, CheckCircle2, XCircle, Link as LinkIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";

export default function MeetingDetailsPage() {
    return (
        <AppShell>
            <MeetingDetailsContent />
        </AppShell>
    );
}

function MeetingDetailsContent() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { success, error } = useToast();
    const meetingId = params.meetingId as string;

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(false);

    const isStaff = user?.role === "staff" || user?.role === "master";

    useEffect(() => {
        async function load() {
            try {
                const data = await getMeeting(meetingId);
                setMeeting(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [meetingId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
                <Loader2 className="animate-spin" size={32} />
                <p className="font-medium text-sm">Loading Meeting Details...</p>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className="text-center py-20 text-slate-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Meeting Not Found</h2>
                <p>The meeting you are looking for does not exist or has been removed.</p>
                <Button variant="primary" className="mt-6" onClick={() => router.push("/meetings")}>
                    Return to Meetings
                </Button>
            </div>
        );
    }

    const handleReview = async (status: "approved" | "rejected") => {
        try {
            setReviewing(true);
            if (!user) return;
            await reviewMeetingSubmission(meeting.id, user.uid, user.name, status);
            success(`Meeting ${status} successfully.`);
            setMeeting({
                ...meeting,
                status,
                ...(status === "approved" ? { approvedBy: user.uid, approvedByName: user.name, reviewFeedback: undefined } : { rejectedBy: user.uid, rejectedByName: user.name })
            } as any);
        } catch (err: any) {
            error(err.message || `Failed to ${status} meeting.`);
        } finally {
            setReviewing(false);
        }
    };

    const isPending = meeting.status === "pending";
    const isApproved = meeting.status === "approved";
    const isRejected = meeting.status === "rejected";

    const getSystemDateFormatted = (timestamp: any) => {
        if (!timestamp) return "N/A";
        let ms = 0;
        if (timestamp?.seconds) ms = timestamp.seconds * 1000;
        else if (typeof timestamp === "number") ms = timestamp;
        else if (typeof timestamp === "string") ms = new Date(timestamp).getTime();
        if (!ms) return "N/A";
        const d = new Date(ms);
        return `${formatDate(d.toISOString())}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto mm-page-animate pb-24">
            <div>
                <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => router.push("/meetings")} className="-ml-3 mb-4">
                    Back to Meetings
                </Button>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <PageHeader
                        title={meeting.title}
                        subtitle={`Meeting Purpose: ${meeting.purpose}`}
                    />
                    <div className="shrink-0 mt-2">
                        {isPending ? (
                            <Badge variant="pending" icon={<Clock size={14} />} className="text-sm py-1.5 px-3">Pending Review</Badge>
                        ) : isRejected ? (
                            <Badge variant="rejected" icon={<XCircle size={14} />} className="text-sm py-1.5 px-3">Rejected</Badge>
                        ) : isApproved ? (
                            <Badge variant="approved" icon={<CheckCircle2 size={14} />} className="text-sm py-1.5 px-3">Approved</Badge>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Main Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200/60 rounded-[20px] shadow-sm p-6 sm:p-8 space-y-6">
                        <h2 className="text-[17px] font-bold text-slate-900 border-b border-slate-100 pb-3">Meeting Overview</h2>

                        <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {meeting.description}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <Clock className="text-blue-500 shrink-0" size={20} />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Date & Time</p>
                                    <p className="font-semibold text-slate-800 text-[14px]">{formatDate(meeting.date)}, {meeting.time}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <Users className="text-purple-500 shrink-0" size={20} />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Type / Mode</p>
                                    <p className="font-semibold text-slate-800 text-[14px]">{meeting.mode}</p>
                                </div>
                            </div>
                            {meeting.location && (
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                                    <MapPin className="text-rose-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Location</p>
                                        <p className="font-semibold text-slate-800 text-[14px]">{meeting.location}</p>
                                    </div>
                                </div>
                            )}
                            {meeting.link && (
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                                    <LinkIcon className="text-emerald-500 shrink-0" size={20} />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Meeting Link</p>
                                        <a href={meeting.link} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 text-[14px] hover:underline truncate block">
                                            {meeting.link}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attendees List */}
                    <div className="bg-white border border-slate-200/60 rounded-[20px] shadow-sm p-6 sm:p-8 space-y-6">
                        <h2 className="text-[17px] font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                            <span>Attendees</span>
                            <span className="text-sm text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">{meeting.attendeeCount}</span>
                        </h2>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {(meeting.attendeeNames || []).map((name, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-[14px] text-slate-800">{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar (System Info & Actions) */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200/60 rounded-[20px] shadow-sm p-6 space-y-6">
                        <h2 className="text-[15px] font-bold text-slate-900 border-b border-slate-100 pb-3">System Information</h2>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Submitted By</p>
                                <p className="font-semibold text-[14px] text-slate-800">{meeting.submittedByName || "Unknown"}</p>
                                <p className="text-[12px] text-slate-500 mt-0.5">{getSystemDateFormatted(meeting.submittedAt)}</p>
                            </div>

                            {isApproved && (
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Approved By</p>
                                    <p className="font-semibold text-[14px] text-emerald-700">{meeting.approvedByName || "Unknown"}</p>
                                    <p className="text-[12px] text-slate-500 mt-0.5">{getSystemDateFormatted(meeting.approvedAt)}</p>
                                </div>
                            )}

                            {isRejected && (
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Rejected By</p>
                                    <p className="font-semibold text-[14px] text-rose-700">{meeting.rejectedByName || "Unknown"}</p>
                                    <p className="text-[12px] text-slate-500 mt-0.5">{getSystemDateFormatted(meeting.rejectedAt)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Admin Review Action (Only for Staff/Master) */}
                    {isStaff && isPending && (
                        <div className="bg-slate-50 border border-slate-200/60 rounded-[20px] shadow-sm p-6 space-y-5">
                            <h2 className="text-[15px] font-bold text-slate-900 border-b border-slate-200 pb-3">Staff Review</h2>
                            <p className="text-[13px] text-slate-600">
                                Please review the meeting details and verify the attendees before approving.
                            </p>
                            <div className="space-y-3">
                                <Button variant="primary" className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500" onClick={() => handleReview("approved")} disabled={reviewing}>
                                    {reviewing ? <Loader2 className="animate-spin" size={16} /> : "Approve Meeting"}
                                </Button>
                                <Button variant="outline" className="w-full justify-center text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleReview("rejected")} disabled={reviewing}>
                                    Reject
                                </Button>
                            </div>
                        </div>
                    )}

                    {isStaff && !isPending && (
                        <div className="bg-slate-50 border border-slate-200/60 rounded-[20px] shadow-sm p-6 text-center">
                            <h2 className="text-[14px] font-bold text-slate-900 mb-1">Review Completed</h2>
                            <p className="text-[13px] text-slate-500">This meeting has already been {meeting.status}.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
