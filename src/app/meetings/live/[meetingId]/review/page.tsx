"use client";

// ============================================================
// MentorMesh — Staff & Developer Live Meeting Review Dashboard
// Real Attendance Audit, Host Summary Review, Approve/Reject/Changes
// ============================================================
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getScheduledMeetingByCodeOrId, reviewLiveMeeting, updateScheduledMeeting } from "@/lib/firebase/firestore";
import type { ScheduledMeeting } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ArrowLeft,
  Video,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Paperclip,
  Check,
  X,
  Send,
  Loader2,
  Shield,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function MeetingReviewPage() {
  return (
    <AppShell>
      <MeetingReviewContent />
    </AppShell>
  );
}

function MeetingReviewContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useToast();
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<ScheduledMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Changes requested feedback dialog
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const isStaff = user?.role === "staff" || user?.role === "master";

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getScheduledMeetingByCodeOrId(meetingId);
        if (!data) {
          error("Meeting not found");
          router.push("/meetings");
          return;
        }
        setMeeting(data);
      } catch (err) {
        console.error("Error loading meeting for review:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId, router, error]);

  const handleDecision = async (decision: "approved" | "rejected" | "changes_requested") => {
    if (!user || !meeting) return;
    try {
      setActionLoading(true);
      await reviewLiveMeeting(meeting.id, user.uid, user.name, decision, feedbackText);

      setMeeting({
        ...meeting,
        status: decision,
        reviewedBy: user.uid,
        reviewedByName: user.name,
        reviewFeedback: feedbackText || meeting.reviewFeedback,
      });

      if (decision === "approved") {
        success("Meeting report approved successfully!");
      } else if (decision === "changes_requested") {
        success("Changes requested. Notification sent to host.");
        setShowFeedbackInput(false);
      } else {
        success("Meeting report marked as rejected.");
      }
    } catch (err: any) {
      error(err.message || "Failed to submit review decision.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-sm font-semibold">Loading Meeting Review Report...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-20 text-slate-500">
        <h2 className="text-xl font-bold text-slate-800">Meeting Not Found</h2>
        <Button variant="primary" className="mt-4" onClick={() => router.push("/meetings")}>
          Back to Meetings
        </Button>
      </div>
    );
  }

  const isUnderReview = meeting.status === "submitted_for_review";
  const isApproved = meeting.status === "approved";
  const isRejected = meeting.status === "rejected";
  const isChangesRequested = meeting.status === "changes_requested";

  const totalAttendees = meeting.attendance?.filter((p) => p.status === "present" || p.joined).length || 0;
  const totalInvited = meeting.attendance?.length || (meeting.participantIds?.length || 0) + 1;
  const totalAbsent = Math.max(0, totalInvited - totalAttendees);
  const attendanceRate = totalInvited > 0 ? Math.round((totalAttendees / totalInvited) * 100) : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 mm-page-animate pb-20">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => router.push("/meetings")}
        >
          Back to Meetings
        </Button>
        <span className="text-xs font-semibold text-slate-500">
          Meeting ID: <code className="text-slate-700">{meeting.id}</code>
        </span>
      </div>

      {/* Action Banner for Staff if Submitted for Review */}
      {isStaff && isUnderReview && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm">Meeting Report Submitted for Review</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Submitted by <strong>{meeting.hostName}</strong>. Please review attendance logs and post-meeting summary.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="primary"
              size="md"
              icon={<CheckCircle2 size={16} />}
              loading={actionLoading}
              onClick={() => handleDecision("approved")}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<AlertTriangle size={15} />}
              loading={actionLoading}
              onClick={() => setShowFeedbackInput(true)}
            >
              Request Changes
            </Button>
            <Button
              variant="destructive"
              size="md"
              icon={<XCircle size={16} />}
              loading={actionLoading}
              onClick={() => handleDecision("rejected")}
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Changes Requested Banner */}
      {isChangesRequested && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-orange-900">
          <AlertTriangle size={18} className="text-orange-600 shrink-0 mt-0.5" />
          <div>
            <strong>Changes Requested by Reviewer:</strong>
            <p className="mt-1 font-medium">{meeting.reviewFeedback || "Please refine the post-meeting summary."}</p>
          </div>
        </div>
      )}

      {/* Dialog for Requesting Changes */}
      {showFeedbackInput && (
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 space-y-3 shadow-md">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            Specify Changes Requested
          </h4>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm outline-none focus:border-amber-500"
            placeholder="Explain what information the host should add or refine in the meeting report..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowFeedbackInput(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="bg-amber-600 hover:bg-amber-700"
              icon={<Send size={13} />}
              onClick={() => handleDecision("changes_requested")}
              disabled={!feedbackText.trim()}
            >
              Submit Change Request
            </Button>
          </div>
        </div>
      )}

      {/* Section 1: Meeting Overview & Automatic Metadata */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {meeting.mode} Meeting
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{meeting.title}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{meeting.purpose}</p>
          </div>

          <div className="shrink-0">
            {isApproved ? (
              <Badge variant="approved">Approved</Badge>
            ) : isRejected ? (
              <Badge variant="rejected">Rejected</Badge>
            ) : isUnderReview ? (
              <Badge variant="pending">Under Review</Badge>
            ) : isChangesRequested ? (
              <Badge variant="warning">Changes Requested</Badge>
            ) : (
              <Badge variant="info">{meeting.status}</Badge>
            )}
          </div>
        </div>

        {/* Automatic Timestamps & Audit Comparison Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Host & Code</span>
            <strong className="text-slate-800 text-xs mt-0.5 block truncate">{meeting.hostName}</strong>
            <span className="text-blue-600 font-mono font-bold text-[11px] block mt-0.5">
              Code: {meeting.code || meeting.id.slice(0, 4).toUpperCase()}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Scheduled Start</span>
            <strong className="text-slate-800 text-xs mt-0.5 block">{meeting.date}</strong>
            <span className="text-slate-500 text-[11px] block mt-0.5">
              {meeting.startTime} ({meeting.expectedDuration}m)
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Actual Started</span>
            <strong className="text-emerald-700 font-mono text-xs mt-0.5 block">
              {meeting.actualStart
                ? new Date(meeting.actualStart as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </strong>
            <span className="text-slate-400 text-[10px] block mt-0.5">Live Session Start</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Actual Ended</span>
            <strong className="text-slate-800 font-mono text-xs mt-0.5 block">
              {meeting.actualEnd
                ? new Date(meeting.actualEnd as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </strong>
            <span className="text-slate-400 text-[10px] block mt-0.5">Session Terminated</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Total Duration</span>
            <strong className="text-blue-700 text-sm mt-0.5 block">
              {meeting.actualDurationMinutes ? `${meeting.actualDurationMinutes} mins` : "In Progress"}
            </strong>
            <span className="text-slate-400 text-[10px] block mt-0.5">Audited Time</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Attendance</span>
            <strong className="text-emerald-700 text-xs mt-0.5 block">
              {totalAttendees} / {totalInvited} Present
            </strong>
            <span className="text-slate-500 text-[11px] block mt-0.5">
              {attendanceRate}% Rate ({totalAbsent} Absent)
            </span>
          </div>
        </div>

        {meeting.description && (
          <div className="pt-2 text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-700 font-bold block mb-1">Description:</strong>
            <p>{meeting.description}</p>
          </div>
        )}
      </div>

      {/* Section 2: Host Post-Meeting Summary Outcome */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText size={18} className="text-blue-600" />
          <span>Host Post-Meeting Report</span>
        </h2>

        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Meeting Discussion Summary
          </span>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 font-medium leading-relaxed">
            {meeting.summary || "No discussion summary submitted yet."}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {meeting.keyPoints && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <strong className="text-slate-700 font-bold block mb-1">Key Discussion Points:</strong>
              <p className="text-slate-600 whitespace-pre-line">{meeting.keyPoints}</p>
            </div>
          )}

          {meeting.decisions && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <strong className="text-slate-700 font-bold block mb-1">Decisions / Outcomes:</strong>
              <p className="text-slate-600 whitespace-pre-line">{meeting.decisions}</p>
            </div>
          )}
        </div>

        {meeting.actionItems && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
            <strong className="text-slate-700 font-bold block mb-1">Action Items & Next Steps:</strong>
            <p className="text-slate-600 whitespace-pre-line">{meeting.actionItems}</p>
          </div>
        )}

        {meeting.momDocumentUrl && (
          <div className="flex items-center gap-2 text-xs pt-1">
            <Paperclip size={14} className="text-slate-400" />
            <span className="text-slate-500 font-medium">Minutes of Meeting (MOM):</span>
            <a
              href={meeting.momDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-bold hover:underline"
            >
              View Document Link
            </a>
          </div>
        )}
      </div>

      {/* Section 3: Verified Attendance Audit Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <span>Attendance Log ({totalAttendees} / {totalInvited} Attended)</span>
          </h2>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {totalAttendees} Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Participant</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Attendance</th>
                <th className="py-2.5 px-3">Join Time</th>
                <th className="py-2.5 px-3">Leave Time</th>
                <th className="py-2.5 px-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meeting.attendance?.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={p.name} size="sm" />
                      <div>
                        <strong className="text-slate-800 block">{p.name}</strong>
                        <span className="text-slate-400 text-[11px]">{p.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 capitalize text-slate-600 font-semibold">
                    {p.role === "external" ? (
                      <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-extrabold">
                        Guest
                      </span>
                    ) : (
                      p.role
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {p.status === "present" || p.joined ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                        <Check size={12} /> Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 text-[11px]">
                        <X size={12} /> Absent
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                    {p.joinTime ? new Date(p.joinTime as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                    {p.leaveTime ? new Date(p.leaveTime as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-bold">
                    {p.joined ? `${p.durationMinutes || meeting.actualDurationMinutes || 1} mins` : "0 mins"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
