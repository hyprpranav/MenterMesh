"use client";

// ============================================================
// MentorMesh — Meeting Details View
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getMeeting, reviewMeetingSubmission, getAllUsers } from "@/lib/firebase/firestore";
import type { Meeting } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
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
    const [usersMap, setUsersMap] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(false);

    const isStaff = user?.role === "staff" || user?.role === "master";

    useEffect(() => {
        async function load() {
            try {
                const data = await getMeeting(meetingId);
                setMeeting(data);

                if (data?.attendeeIds) {
                    try {
                        const allUsers = await getAllUsers();
                        const map: Record<string, any> = {};
                        for (const u of allUsers) {
                            map[u.uid] = u;
                        }
                        setUsersMap(map);
                    } catch (e) { console.error("Error loading users", e); }
                }
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
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => router.push("/meetings")} className="-ml-3 block">
                    Back to Meetings
                </Button>
            </div>

            {/* Staff Review Banner if Pending */}
            {isStaff && isPending && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Clock size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900 text-sm">Meeting Submission Pending Review</h3>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Submitted by <strong>{meeting.submittedByName || "Student"}</strong>. Please verify details before approving.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button variant="primary" size="md" icon={<CheckCircle2 size={16} />} loading={reviewing} onClick={() => handleReview("approved")}>Approve</Button>
                        <Button variant="destructive" size="md" icon={<XCircle size={16} />} loading={reviewing} onClick={() => handleReview("rejected")}>Reject</Button>
                    </div>
                </div>
            )}

            {/* Hero Card */}
            <div className="mm-event-hero">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="min-w-0">
                        <span className="mm-event-kicker">
                            {meeting.mode} Meeting
                        </span>
                        <h1 className="mm-event-title">{meeting.title}</h1>
                        {meeting.purpose && (
                            <p className="mm-event-subtitle">Purpose: {meeting.purpose}</p>
                        )}
                    </div>

                    {/* Status Badge */}
                    {isPending ? (
                        <Badge variant="pending">PENDING REVIEW</Badge>
                    ) : isApproved ? (
                        <Badge variant="approved">APPROVED</Badge>
                    ) : (
                        <Badge variant="rejected">REJECTED</Badge>
                    )}
                </div>

                {isStaff && (
                    <div className="mm-event-audit">
                        <div><strong>Submitted</strong><span>{getSystemDateFormatted(meeting.submittedAt)}</span></div>
                        {isApproved && <div><strong>Approved</strong><span>{getSystemDateFormatted(meeting.approvedAt)} by {meeting.approvedByName || "Staff"}</span></div>}
                        {isRejected && <div><strong>Rejected</strong><span>{getSystemDateFormatted(meeting.rejectedAt)} by {meeting.rejectedByName || "Staff"}</span></div>}
                    </div>
                )}

                <div className="mm-event-meta-grid">
                    <span className="mm-event-meta"><Clock size={16} /> <span><strong>Date & Time</strong>{formatDate(meeting.date)}, {meeting.time}</span></span>

                    {meeting.location && (
                        <span className="mm-event-meta"><MapPin size={16} /> <span><strong>Location</strong>{meeting.location}</span></span>
                    )}

                    {meeting.link && (
                        <span className="mm-event-meta"><LinkIcon size={16} /> <span><strong>Meeting Link</strong><a href={meeting.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{meeting.link}</a></span></span>
                    )}

                    {meeting.submittedByName && !isStaff && (
                        <span className="mm-event-meta"><span className="mm-event-meta-dot" /><span><strong>Submitted by</strong>{meeting.submittedByName}</span></span>
                    )}
                </div>

                {meeting.description && (
                    <div className="mm-event-description">
                        <span className="mm-event-label">Meeting Overview & Details</span>
                        <p>{meeting.description}</p>
                    </div>
                )}
            </div>

            {/* Attendees List */}
            {meeting.attendeeNames && meeting.attendeeNames.length > 0 && (
                <div className="mm-event-section mm-event-section-participants">
                    <div className="mm-event-section-heading">
                        <span className="mm-event-section-icon"><Users size={18} /></span>
                        <div><span className="mm-event-label">Attendance</span><h2>Attendees & Participants ({meeting.attendeeCount})</h2></div>
                    </div>
                    <div className="mm-event-participants">
                        {(meeting.attendeeIds || []).map((uid: string, i: number) => {
                            const u = usersMap[uid];
                            const name = u?.name || meeting.attendeeNames?.[i] || uid;
                            return (
                                <div key={uid} className="bg-slate-50 border border-slate-200 pr-4 pl-1.5 py-1.5 rounded-full flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                    <Avatar name={name} photoUrl={u?.profilePhoto} size="sm" className="w-[28px] h-[28px]" />
                                    <span className="text-[13px] font-bold text-slate-800 tracking-tight shrink-0">
                                        {name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
