"use client";

// ============================================================
// MentorMesh — Meetings Page (Student + Staff)
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getMeetingsForViewer } from "@/lib/firebase/firestore";
import type { Meeting } from "@/types";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Presentation, Plus, MapPin, CheckCircle2, Clock, XCircle, Users, Link as LinkIcon, Search } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";

export default function MeetingsPage() {
    return (
        <AppShell>
            <MeetingsContent />
        </AppShell>
    );
}

function MeetingsContent() {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const isStaff = user?.role === "staff" || user?.role === "master";
    const [activeTab, setActiveTab] = useState(isStaff ? "all" : "approved");
    const [sortBy, setSortBy] = useState("Date (Newest)");
    const [globalSearch, setGlobalSearch] = useState("");

    useEffect(() => {
        async function load() {
            try {
                if (!user) return;
                const list = await getMeetingsForViewer(user.uid, user.role);
                setMeetings(list);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user]);

    const pendingCount = meetings.filter((m) => m.status === "pending").length;

    const filteredMeetings = meetings.filter((m) => {
        let matchTab = false;
        if (activeTab === "all") matchTab = true;
        else if (activeTab === "attended") matchTab = m.attendeeIds?.includes(user?.uid || "") ?? false;
        else if (activeTab === "pending") matchTab = m.status === "pending";
        else if (activeTab === "approved") matchTab = m.status === "approved";
        else if (activeTab === "rejected") matchTab = m.status === "rejected";
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

    const tabs = [
        ...(isStaff
            ? [
                { id: "all", label: "All Meetings", count: meetings.length },
                { id: "pending", label: "Pending", count: pendingCount, className: pendingCount > 0 ? "text-amber-700" : undefined },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
            ]
            : [
                { id: "approved", label: "All Approved Meetings" },
                { id: "attended", label: "Meetings I Attended" },
                { id: "pending", label: "My Pending Submissions" }, // To track what they submitted
            ]),
    ];

    // For students, if they view 'pending' or 'rejected', only show their own submissions
    const finalFiltered = (!isStaff && (activeTab === "pending" || activeTab === "rejected"))
        ? filteredMeetings.filter(m => m.submittedBy === user?.uid)
        : (!isStaff && activeTab === "approved")
            ? filteredMeetings.filter(m => m.status === "approved")
            : filteredMeetings;

    finalFiltered.sort((a, b) => {
        if (sortBy === "Date (Newest)") return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === "Date (Oldest)") return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === "Participants (High to Low)") return b.attendeeCount - a.attendeeCount;
        if (sortBy === "Participants (Low to High)") return a.attendeeCount - b.attendeeCount;
        return 0;
    });

    return (
        <div className="space-y-6 mm-page-animate">
            <PageHeader
                icon={<Presentation size={20} />}
                iconClass="bg-blue-100 text-blue-600"
                title="Meetings"
                subtitle="Track your meetings, discussions, and manage attendance."
                actions={
                    (!isStaff || isStaff) && ( // Both can submit meetings if needed, prompt says Student can. We'll allow all.
                        <Link href="/meetings/new">
                            <Button variant="primary" size="md" icon={<Plus size={16} />}>
                                Submit Meeting Details
                            </Button>
                        </Link>
                    )
                }
            />

            <div className="flex flex-wrap lg:flex-nowrap gap-4 justify-between items-center pb-2">
                <div className="overflow-x-auto w-full lg:w-auto max-w-full">
                    <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full lg:w-auto">
                    <div
                        style={{ display: "flex", alignItems: "center", background: "white", padding: "0 12px", border: "1px solid #e2e8f0", borderRadius: "8px", height: "40px", minWidth: "240px", flex: "1 1 auto", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                    >
                        <Search size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
                        <input
                            type="search"
                            placeholder="Search meetings..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            style={{ border: "none", outline: "none", width: "100%", marginLeft: "8px", fontSize: "14px", background: "transparent", color: "#334155" }}
                        />
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="mm-select shrink-0 w-full sm:w-auto"
                        style={{ height: "40px", minWidth: "200px" }}
                    >
                        <option value="Date (Newest)">Date (Newest)</option>
                        <option value="Date (Oldest)">Date (Oldest)</option>
                        <option value="Participants (High to Low)">Participants (High to Low)</option>
                        <option value="Participants (Low to High)">Participants (Low to High)</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <LoadingState message="Loading meetings..." />
            ) : finalFiltered.length === 0 ? (
                <EmptyState
                    icon={<Presentation size={40} />}
                    title="No meetings found"
                    description="No meeting records match the selected filter."
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {finalFiltered.map((m) => (
                        <MeetingCard key={m.id} meeting={m} currentUserId={user?.uid} isStaff={isStaff} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MeetingCard({ meeting, currentUserId, isStaff }: { meeting: Meeting; currentUserId?: string; isStaff: boolean }) {
    const isPending = meeting.status === "pending";
    const isApproved = meeting.status === "approved";
    const isRejected = meeting.status === "rejected";
    const isAttendee = currentUserId ? (meeting.attendeeIds || []).includes(currentUserId) : false;
    const isOwner = currentUserId === meeting.submittedBy;
    // If not owner, but attendee
    // Student view requires: "Clearly indicate whether the currently logged-in student attended that meeting"

    const statusBadge = isPending ? (
        <Badge variant="pending" icon={<Clock size={11} />}>Pending Review</Badge>
    ) : isRejected ? (
        <Badge variant="rejected" icon={<XCircle size={11} />}>Rejected</Badge>
    ) : isApproved ? (
        <Badge variant="approved" icon={<CheckCircle2 size={11} />}>Approved</Badge>
    ) : null;

    const cardStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.2s ease",
        position: "relative",
        ...(isAttendee
            ? {
                background: "linear-gradient(135deg, #F5F3FF 0%, #FAFAF9 50%, #FFFFFF 100%)",
                border: "2px solid #8B5CF6", // Purple highlight for attended
                boxShadow: "0 4px 16px rgba(139, 92, 246, 0.12), 0 1px 4px rgba(139, 92, 246, 0.08)",
            }
            : isPending && isStaff
                ? { background: "#FFFBF0", border: "1.5px solid #FCD34D", boxShadow: "0 2px 8px rgba(252, 211, 77, 0.12)" }
                : isRejected && isStaff
                    ? { background: "#FFF5F5", border: "1.5px solid #FCA5A5", boxShadow: "0 2px 8px rgba(252, 165, 165, 0.1)" }
                    : { background: "var(--color-surface)", border: "1.5px solid var(--color-border)", boxShadow: "var(--shadow-xs)" }),
    };

    return (
        <div style={cardStyle} className="hover:shadow-lg h-full">
            {isAttendee && (
                <div style={{ height: 4, background: "linear-gradient(90deg, #8B5CF6, #A855F7, #D946EF)", borderRadius: "0 0 0 0", flexShrink: 0 }} />
            )}

            <div style={{ padding: "1.25rem 1.25rem 0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "4px 10px", borderRadius: 99, border: "1px solid #BFDBFE", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {meeting.mode}
                    </span>
                    <div className="shrink-0">{statusBadge}</div>
                </div>

                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={meeting.title}>
                    {meeting.title}
                </h3>

                <div style={{ paddingTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>
                        <Clock size={14} color="#94A3B8" /> <span>{formatDate(meeting.date)}, {meeting.time}</span>
                    </p>
                    {(meeting.location) && (
                        <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>
                            <MapPin size={14} color="#94A3B8" /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={meeting.location}>{meeting.location}</span>
                        </p>
                    )}
                    {(meeting.link) && (
                        <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>
                            <LinkIcon size={14} color="#94A3B8" /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Online Link Available</span>
                        </p>
                    )}
                    <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>
                        <Users size={14} color="#94A3B8" /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meeting.attendeeCount} Attendees</span>
                    </p>
                </div>

                {meeting.purpose && (
                    <p style={{ fontSize: "0.8125rem", color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginTop: "4px" }}>
                        <span className="font-semibold text-slate-700">Purpose: </span>{meeting.purpose}
                    </p>
                )}
            </div>

            <div style={{ padding: "0.75rem 1.25rem 1.25rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, minWidth: "80px" }}>
                    <p style={{ fontSize: "0.75rem", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        By {meeting.submittedByName}
                    </p>
                    {!isStaff && isApproved && isAttendee && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit capitalize flex items-center gap-1">
                            ✓ You attended this meeting
                        </span>
                    )}
                    {!isStaff && isApproved && !isAttendee && (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                            Meeting details available
                        </span>
                    )}
                </div>
                <Link href={`/meetings/${meeting.id}`}>
                    <Button size="md" variant={isAttendee ? "primary" : "outline"}>
                        View Details
                    </Button>
                </Link>
            </div>
        </div>
    );
}
