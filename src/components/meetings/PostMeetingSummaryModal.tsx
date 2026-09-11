"use client";

// ============================================================
// MentorMesh — Post-Meeting Short Summary Modal
// Easy, short report submission by Host to Staff/Developer
// ============================================================
import React, { useState } from "react";
import { submitPostMeetingSummary } from "@/lib/firebase/firestore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { FileText, Send, CheckCircle2, Paperclip, Sparkles } from "lucide-react";

interface PostMeetingSummaryModalProps {
  open: boolean;
  meetingId: string;
  meetingTitle: string;
  onClose: () => void;
}

export function PostMeetingSummaryModal({
  open,
  meetingId,
  meetingTitle,
  onClose,
}: PostMeetingSummaryModalProps) {
  const { success, error } = useToast();

  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [decisions, setDecisions] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [momDocumentUrl, setMomDocumentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      error("Meeting summary is required.");
      return;
    }

    try {
      setSubmitting(true);
      await submitPostMeetingSummary(meetingId, {
        summary: summary.trim(),
        keyPoints: keyPoints.trim() || undefined,
        decisions: decisions.trim() || undefined,
        actionItems: actionItems.trim() || undefined,
        momDocumentUrl: momDocumentUrl.trim() || undefined,
      });

      success("Meeting report submitted for Staff review!");
      onClose();
    } catch (err: any) {
      console.error("Failed to submit meeting report:", err);
      error(err.message || "Failed to submit meeting report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post-Meeting Short Summary"
      description={`Meeting '${meetingTitle}' has ended. Please complete this brief summary to submit the meeting report for review.`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Complete Later
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Send size={15} />}
            loading={submitting}
            onClick={handleSubmit}
          >
            Submit Meeting Report
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
          <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <span>
            Keep it brief! Actual attendee list, duration, and timestamps have already been captured automatically.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Meeting Summary * (What was discussed?)
          </label>
          <textarea
            required
            rows={3}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-blue-500"
            placeholder="e.g. Discussed SIH hardware architecture, divided component responsibilities, and finalized testing schedule."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Key Discussion Points
            </label>
            <textarea
              rows={2}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-blue-500"
              placeholder="e.g. Sensor choices, battery life constraints..."
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Decisions / Outcome
            </label>
            <textarea
              rows={2}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-blue-500"
              placeholder="e.g. Approved ESP32 micro-controller..."
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Next Steps & Action Items
          </label>
          <textarea
            rows={2}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-blue-500"
            placeholder="e.g. Harish to order parts; Team to test code by Thursday..."
            value={actionItems}
            onChange={(e) => setActionItems(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            MOM Document / Drive Link (Optional)
          </label>
          <div className="relative">
            <Paperclip size={14} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              type="url"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-blue-500"
              placeholder="https://drive.google.com/..."
              value={momDocumentUrl}
              onChange={(e) => setMomDocumentUrl(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
