"use client";

// ============================================================
// MentorMesh — Event Details & Staff Review Workflow Page
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getEvent, updateEvent, reviewEventSubmission } from "@/lib/firebase/firestore";
import type { Event } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ArrowLeft, Calendar, MapPin, Folder, Image as ImageIcon, Share2, Edit,
  CheckCircle2, AlertCircle, XCircle, Users, Code, Globe, Lightbulb, ShieldAlert
} from "lucide-react";

export default function EventDetailPage() {
  const { eventId } = useParams() as { eventId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { success, error, warning } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Review Dialogs
  const [reviewing, setReviewing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState("");

  // Edit Mode
  const [editing, setEditing] = useState(false);
  const [driveLink, setDriveLink] = useState("");
  const [photosLink, setPhotosLink] = useState("");
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!eventId) return;
      try {
        const data = await getEvent(eventId);
        if (data) {
          setEvent(data);
          setDriveLink(data.driveLink || "");
          setPhotosLink(data.photosLink || "");
          setResult(data.result || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  if (loading) return <AppShell><LoadingState message="Loading event details..." /></AppShell>;
  if (!event) return <AppShell><ErrorState message="Event not found." onRetry={() => router.push("/events")} /></AppShell>;

  const isStaff = user?.role === "staff" || user?.role === "master";
  const isPending = event.submissionStatus === "pending_review";
  const isApproved = event.submissionStatus === "approved" || !event.submissionStatus;
  const isChangesReq = event.submissionStatus === "changes_requested";

  const handleApprove = async () => {
    if (!user) return;
    setReviewing(true);
    try {
      await reviewEventSubmission(event.id, user.uid, user.name, "approved");
      setEvent({ ...event, submissionStatus: "approved", reviewedByName: user.name });
      success("Event submission approved!");
    } catch {
      error("Failed to approve event.");
    } finally {
      setReviewing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!user || !feedbackReason.trim()) return;
    setReviewing(true);
    try {
      await reviewEventSubmission(event.id, user.uid, user.name, "changes_requested", feedbackReason.trim());
      setEvent({ ...event, submissionStatus: "changes_requested", reviewFeedback: feedbackReason });
      setChangesModalOpen(false);
      setFeedbackReason("");
      warning("Changes requested from student.");
    } catch {
      error("Failed to update status.");
    } finally {
      setReviewing(false);
    }
  };

  const handleReject = async () => {
    if (!user || !feedbackReason.trim()) return;
    setReviewing(true);
    try {
      await reviewEventSubmission(event.id, user.uid, user.name, "rejected", feedbackReason.trim());
      setEvent({ ...event, submissionStatus: "rejected", reviewFeedback: feedbackReason });
      setRejectModalOpen(false);
      setFeedbackReason("");
      error("Event submission rejected.");
    } catch {
      error("Failed to reject event.");
    } finally {
      setReviewing(false);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await updateEvent(event.id, {
        driveLink,
        photosLink,
        result,
      });
      setEvent({ ...event, driveLink, photosLink, result });
      setEditing(false);
      success("Event details updated!");
    } catch {
      error("Failed to update event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/events" className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Events
          </Link>
          {isStaff && (
            <Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => setEditing(!editing)}>
              {editing ? "Cancel Edit" : "Edit Details"}
            </Button>
          )}
        </div>

        {/* Staff Review Banner if Pending */}
        {isStaff && isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Student Event Submission Pending Review</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Submitted by <strong>{event.submittedByName || "Student"}</strong>. Please review details below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 size={14} />}
                loading={reviewing}
                onClick={handleApprove}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<AlertCircle size={14} />}
                onClick={() => setChangesModalOpen(true)}
              >
                Request Changes
              </Button>
              <Button
                variant="destructive"
                size="sm"
                icon={<XCircle size={14} />}
                onClick={() => setRejectModalOpen(true)}
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Changes Requested Banner for Student */}
        {isChangesReq && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-xs text-rose-900 space-y-1">
            <p className="font-bold text-sm flex items-center gap-1.5">
              <AlertCircle size={16} className="text-rose-600" /> Mentor Requested Changes:
            </p>
            <p className="text-rose-700 bg-white/70 p-2.5 rounded-lg border border-rose-100">
              {event.reviewFeedback || "Please review and update your event submission."}
            </p>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {event.type}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-2">{event.name}</h1>
              {event.organizer && (
                <p className="text-xs text-slate-500 mt-0.5">Organized by {event.organizer}</p>
              )}
            </div>

            {/* Status Badge */}
            {isPending ? (
              <Badge variant="pending">PENDING REVIEW</Badge>
            ) : isApproved ? (
              <Badge variant="approved">APPROVED</Badge>
            ) : (
              <Badge variant="draft">{event.status.toUpperCase()}</Badge>
            )}
          </div>

          {event.result && (
            <div className="inline-block bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold text-amber-800">
              {event.result}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1"><Calendar size={14} /> {event.date} {event.endDate && `- ${event.endDate}`}</span>
            {(event.location || event.venue) && (
              <span className="flex items-center gap-1"><MapPin size={14} /> {event.venue ? `${event.venue}, ${event.city || ""}` : event.location}</span>
            )}
            {event.submittedByName && (
              <span className="text-slate-400">Submitted by <strong className="text-slate-700">{event.submittedByName}</strong></span>
            )}
          </div>

          {event.description && (
            <p className="text-sm text-slate-600">{event.description}</p>
          )}
        </div>

        {/* Team & Participants */}
        {event.participantNames && event.participantNames.length > 0 && (
          <div className="mm-card space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users size={16} className="text-blue-600" /> Team Members & Participants
              {event.teamName && <span className="text-xs text-slate-500">({event.teamName})</span>}
            </h3>

            <div className="flex flex-wrap gap-2">
              {event.participantNames.map((name, i) => (
                <span key={i} className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold text-slate-800">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Student Experience & Learnings */}
        {(event.whatBuilt || event.whatLearned || event.challenges) && (
          <div className="mm-card space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Lightbulb className="text-amber-500" size={18} /> Student Experience & Project Breakdown
            </h3>

            {event.projectTitle && (
              <p className="text-xs text-slate-500">
                Project Title: <strong className="text-slate-800">{event.projectTitle}</strong> {event.eventTrack && `(${event.eventTrack})`}
              </p>
            )}

            {event.whatBuilt && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700">What Was Built / Created</h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                  {event.whatBuilt}
                </p>
              </div>
            )}

            {event.whatLearned && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700">Key Learnings & Challenges</h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                  {event.whatLearned}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Memories & Links */}
        <div className="mm-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <ImageIcon className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-900 text-lg">📸 Memories & Links</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Drive Folder */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Folder size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Event Folder</h4>
                  <p className="text-[11px] text-slate-500">PPTs, Certificates & Docs</p>
                </div>
              </div>
              {event.driveLink ? (
                <a href={event.driveLink} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">Open Folder</Button>
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>

            {/* LinkedIn Post */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">LinkedIn Post</h4>
                  <p className="text-[11px] text-slate-500">Public Event Share</p>
                </div>
              </div>
              {event.linkedInPost ? (
                <a href={event.linkedInPost} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">View Post</Button>
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>

            {/* GitHub Repo */}
            {event.githubUrl && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                    <Code size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">GitHub Code</h4>
                    <p className="text-[11px] text-slate-500">Project Repository</p>
                  </div>
                </div>
                <a href={event.githubUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">View Code</Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Changes Dialog */}
      <Modal
        open={changesModalOpen}
        onClose={() => { setChangesModalOpen(false); setFeedbackReason(""); }}
        title="Request Changes from Student"
        description="Provide constructive feedback on what the student needs to update before approval."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setChangesModalOpen(false); setFeedbackReason(""); }}>Cancel</Button>
            <Button
              variant="primary"
              loading={reviewing}
              onClick={handleRequestChanges}
              disabled={!feedbackReason.trim()}
            >
              Send Request
            </Button>
          </>
        }
      >
        <textarea
          className="mm-input resize-none w-full"
          rows={4}
          placeholder="e.g. Please upload the certificate link or add the project demo link."
          value={feedbackReason}
          onChange={(e) => setFeedbackReason(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* Reject Submission Dialog */}
      <Modal
        open={rejectModalOpen}
        onClose={() => { setRejectModalOpen(false); setFeedbackReason(""); }}
        title="Reject Event Submission"
        description="Please enter the reason for rejecting this event submission. This will notify the student."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectModalOpen(false); setFeedbackReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              loading={reviewing}
              onClick={handleReject}
              disabled={!feedbackReason.trim()}
            >
              Reject Event
            </Button>
          </>
        }
      >
        <textarea
          className="mm-input resize-none w-full"
          rows={4}
          placeholder="Rejection reason (e.g. Insufficient documentation)..."
          value={feedbackReason}
          onChange={(e) => setFeedbackReason(e.target.value)}
          autoFocus
        />
      </Modal>
    </AppShell>
  );
}

