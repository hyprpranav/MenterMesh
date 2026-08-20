"use client";

// ============================================================
// MentorMesh — Event Details & Staff Review Workflow Page
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getEvent, reviewEventSubmission, deleteEvent } from "@/lib/firebase/firestore";
import type { Event } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ArrowLeft, Calendar, MapPin, Folder, Image as ImageIcon, Share2, Edit,
  CheckCircle2, XCircle, Users, Code, Lightbulb, ShieldAlert, Trash2, KeyRound
} from "lucide-react";

export default function EventDetailPage() {
  const { eventId } = useParams() as { eventId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { success, error } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Review Dialogs
  const [reviewing, setReviewing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState("");

  useEffect(() => {
    async function load() {
      if (!eventId) return;
      try {
        const data = await getEvent(eventId);
        if (data) {
          setEvent(data);
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

  const handleDelete = async () => {
    if (!isStaff || deletePin !== "927624") return;
    setDeleting(true);
    try {
      await deleteEvent(event.id);
      success("Event deleted permanently.");
      router.push("/events");
    } catch {
      error("Failed to delete event.");
      setDeleting(false);
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
          {(isStaff || (user?.uid === event.submittedBy && event.submissionStatus === "draft")) && (
            <Link href={`/events/${eventId}/edit`}>
              <Button variant="outline" size="sm" icon={<Edit size={14} />}>
                Edit Details
              </Button>
            </Link>
          )}
          {isStaff && (
            <Button variant="destructive" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteModalOpen(true)}>
              Delete Event
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

        {/* Hero Card */}
        <div className="mm-event-hero">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="min-w-0">
              <span className="mm-event-kicker">
                {event.type}
              </span>
              <h1 className="mm-event-title">{event.name}</h1>
              {event.organizer && (
                <p className="mm-event-subtitle">Organized by {event.organizer}</p>
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

          <div className="mm-event-meta-grid">
            <span className="mm-event-meta"><Calendar size={16} /> <span><strong>Date</strong>{event.date} {event.endDate && `- ${event.endDate}`}</span></span>
            {(event.location || event.venue) && (
              <span className="mm-event-meta"><MapPin size={16} /> <span><strong>Location</strong>{event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ""}` : event.location}</span></span>
            )}
            {event.submittedByName && (
              <span className="mm-event-meta"><span className="mm-event-meta-dot" /><span><strong>Submitted by</strong>{event.submittedByName}</span></span>
            )}
          </div>

          {event.description && (
            <div className="mm-event-description">
              <span className="mm-event-label">About this event</span>
              <p>{event.description}</p>
            </div>
          )}
          {event.result && <div className="mm-event-result">{event.result}</div>}
        </div>

        {/* Team & Participants */}
        {event.participantNames && event.participantNames.length > 0 && (
          <div className="mm-event-section mm-event-section-participants">
            <div className="mm-event-section-heading">
              <span className="mm-event-section-icon"><Users size={18} /></span>
              <div><span className="mm-event-label">Participation</span><h2>Team Members & Participants</h2></div>
            </div>
            {event.teamName && <p className="mm-event-context">Team: <strong>{event.teamName}</strong></p>}

            <div className="mm-event-participants">
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
          <div className="mm-event-section mm-event-section-experience">
            <div className="mm-event-section-heading">
              <span className="mm-event-section-icon"><Lightbulb size={18} /></span>
              <div><span className="mm-event-label">Project story</span><h2>Student Experience & Project Breakdown</h2></div>
            </div>

            {event.projectTitle && (
              <div className="mm-event-project">
                <span className="mm-event-label">Project title</span>
                <p>{event.projectTitle} {event.eventTrack && <span>({event.eventTrack})</span>}</p>
              </div>
            )}

            {event.whatBuilt && (
              <div className="mm-event-copy-block mm-event-copy-built">
                <h3>What Was Built / Created</h3>
                <p>
                  {event.whatBuilt}
                </p>
              </div>
            )}

            {event.whatLearned && (
              <div className="mm-event-copy-block mm-event-copy-learning">
                <h3>Key Learnings</h3>
                <p>
                  {event.whatLearned}
                </p>
              </div>
            )}

            {event.challenges && (
              <div className="mm-event-copy-block mm-event-copy-challenges">
                <h3>Challenges</h3>
                <p>
                  {event.challenges}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Memories & Links */}
        <div className="mm-event-section mm-event-section-links">
          <div className="mm-event-section-heading">
            <span className="mm-event-section-icon"><ImageIcon size={18} /></span>
            <div><span className="mm-event-label">Resources</span><h2>Memories & Links</h2></div>
          </div>

          <div className="mm-event-link-grid">
            {/* Drive Folder */}
            <div className="mm-event-link-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Folder size={18} />
                </div>
                <div className="min-w-0">
                  <h3>Event Folder</h3>
                  <p>PPTs, certificates & documents</p>
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
            <div className="mm-event-link-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <div className="min-w-0">
                  <h3>LinkedIn Post</h3>
                  <p>Public event share</p>
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
              <div className="mm-event-link-card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                    <Code size={18} />
                  </div>
                  <div>
                    <h3>GitHub Code</h3>
                    <p>Project repository</p>
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

      <Modal
        open={deleteModalOpen}
        onClose={() => { if (!deleting) { setDeleteModalOpen(false); setDeletePin(""); } }}
        title="Delete Event Permanently"
        description="Staff and developer accounts can permanently remove this event. Enter the authorized PIN to continue."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setDeletePin(""); }} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" icon={<Trash2 size={14} />} loading={deleting} onClick={handleDelete} disabled={deletePin !== "927624"}>
              Delete Event
            </Button>
          </>
        }
      >
        <div>
          <label htmlFor="event-delete-pin" className="mm-label">Authorization PIN</label>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="event-delete-pin" className="mm-input pl-9" type="password" inputMode="numeric" value={deletePin} onChange={(e) => setDeletePin(e.target.value)} autoFocus />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

