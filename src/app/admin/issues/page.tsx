"use client";

// ============================================================
// MentorMesh — Developer Issues Inbox (Staff/Master only)
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import {
    collection, getDocs, doc, updateDoc, orderBy, query, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { timeAgo } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, Send } from "lucide-react";

interface Issue {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
    issueType: string;
    description: string;
    status: "open" | "in_progress" | "resolved";
    createdAt: any;
    staffReply?: string;
    repliedAt?: string;
    repliedByName?: string;
}

export default function IssuesPage() {
    return (
        <AppShell>
            <IssuesContent />
        </AppShell>
    );
}

function IssuesContent() {
    const { user } = useAuth();
    const { success, error } = useToast();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [replyText, setReplyText] = useState("");
    const [replying, setReplying] = useState(false);
    const isStaff = user?.role === "staff" || user?.role === "master";

    useEffect(() => {
        if (!isStaff) return;
        async function load() {
            try {
                const snap = await getDocs(query(collection(db, "developerIssues"), orderBy("createdAt", "desc")));
                setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() } as Issue)));
            } catch { error("Failed to load issues."); }
            finally { setLoading(false); }
        }
        load();
    }, [isStaff]);

    const handleReply = async () => {
        if (!selectedIssue || !replyText.trim() || !user) return;
        setReplying(true);
        try {
            const repliedAt = new Date().toISOString();
            await updateDoc(doc(db, "developerIssues", selectedIssue.id), {
                staffReply: replyText.trim(),
                repliedAt,
                repliedByName: user.name,
                status: "resolved",
            });
            // Send a notification to the user
            await addDoc(collection(db, "notifications"), {
                recipientId: selectedIssue.userId,
                title: "Developer Replied to Your Issue 🛠️",
                message: `"${selectedIssue.issueType}": ${replyText.trim().substring(0, 120)}`,
                type: "system",
                read: false,
                priority: "high",
                relatedId: selectedIssue.id,
                createdAt: serverTimestamp(),
            });
            setIssues(prev => prev.map(i => i.id === selectedIssue.id
                ? { ...i, staffReply: replyText.trim(), repliedAt, repliedByName: user.name, status: "resolved" }
                : i
            ));
            success("Reply sent! The student will be notified.");
            setSelectedIssue(null);
            setReplyText("");
        } catch { error("Failed to send reply."); }
        finally { setReplying(false); }
    };

    const handleStatusChange = async (issue: Issue, status: Issue["status"]) => {
        try {
            await updateDoc(doc(db, "developerIssues", issue.id), { status });
            setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status } : i));
            success("Status updated.");
        } catch { error("Failed to update status."); }
    };

    if (!isStaff) return <AppShell><div className="mm-card text-center p-8 text-slate-500">Access denied.</div></AppShell>;

    const openCount = issues.filter(i => i.status === "open").length;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <PageHeader
                icon={<AlertTriangle size={20} />}
                iconClass="bg-amber-100 text-amber-600"
                title="Developer Issues Inbox"
                subtitle="View and respond to bugs, feature requests, and student reports."
                actions={
                    openCount > 0 ? (
                        <span className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1.5 rounded-full border border-red-200">
                            {openCount} Open Issue{openCount > 1 ? "s" : ""}
                        </span>
                    ) : undefined
                }
            />

            {loading ? (
                <LoadingState message="Loading issues..." />
            ) : issues.length === 0 ? (
                <EmptyState icon={<CheckCircle2 size={40} />} title="No issues reported" description="Students haven't reported any issues yet." />
            ) : (
                <div className="space-y-3">
                    {issues.map(issue => (
                        <div key={issue.id} className="mm-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedIssue(issue); setReplyText(issue.staffReply || ""); }}>
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{issue.issueType}</span>
                                        {issue.status === "open" && <Badge variant="pending" icon={<Clock size={11} />}>Open</Badge>}
                                        {issue.status === "in_progress" && <Badge variant="pending">In Progress</Badge>}
                                        {issue.status === "resolved" && <Badge variant="approved" icon={<CheckCircle2 size={11} />}>Resolved</Badge>}
                                    </div>
                                    <p className="text-sm text-slate-700 font-medium line-clamp-2">{issue.description}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                                        <span>By <strong className="text-slate-600">{issue.userName}</strong></span>
                                        <span>{issue.userEmail}</span>
                                        <span>{typeof issue.createdAt?.toDate === "function" ? timeAgo(issue.createdAt.toDate().toISOString()) : "Just now"}</span>
                                    </div>
                                    {issue.staffReply && (
                                        <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                                            <p className="text-xs text-emerald-700 font-semibold mb-0.5">Your reply — {issue.repliedByName}</p>
                                            <p className="text-xs text-emerald-800">{issue.staffReply}</p>
                                        </div>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" icon={<MessageSquare size={14} />} onClick={e => { e.stopPropagation(); setSelectedIssue(issue); setReplyText(issue.staffReply || ""); }}>
                                    {issue.staffReply ? "Edit Reply" : "Reply"}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reply Modal */}
            <Modal
                open={!!selectedIssue}
                onClose={() => { setSelectedIssue(null); setReplyText(""); }}
                title={`Issue: ${selectedIssue?.issueType}`}
                description={`From ${selectedIssue?.userName} (${selectedIssue?.userEmail})`}
                size="md"
                footer={
                    <>
                        <div className="flex items-center gap-2 mr-auto">
                            <Button variant="outline" size="sm" onClick={() => selectedIssue && handleStatusChange(selectedIssue, "in_progress")} disabled={selectedIssue?.status === "in_progress"}>In Progress</Button>
                            <Button variant="outline" size="sm" onClick={() => selectedIssue && handleStatusChange(selectedIssue, "resolved")} disabled={selectedIssue?.status === "resolved"}>Mark Resolved</Button>
                        </div>
                        <Button variant="secondary" onClick={() => { setSelectedIssue(null); setReplyText(""); }}>Cancel</Button>
                        <Button variant="primary" icon={<Send size={14} />} loading={replying} onClick={handleReply} disabled={!replyText.trim()}>Send Reply</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Issue Description</p>
                        <p className="text-sm text-slate-700">{selectedIssue?.description}</p>
                    </div>
                    <div>
                        <label className="mm-label">Reply to Student</label>
                        <textarea
                            className="mm-input resize-none w-full"
                            rows={4}
                            placeholder="Tell the student what action you're taking or how the issue is resolved..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            autoFocus
                        />
                        <p className="text-xs text-slate-400 mt-1">The student will receive a notification with your reply.</p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
