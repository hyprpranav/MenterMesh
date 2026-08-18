"use client";

// ============================================================
// MentorMesh — Access Request Review & Private Conversation Thread
// ============================================================
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessRequest, approveRequest, rejectRequest } from "@/lib/firebase/firestore";
import type { AccessRequest, RequestMessage } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Check, X, MessageSquare, Send, ShieldCheck, Clock } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { formatDateTime } from "@/lib/utils";

export default function RequestDetailPage() {
  const { reqId } = useParams() as { reqId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { success, error } = useToast();

  const [req, setReq] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Discussion Messages
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Approval / Rejection Actions
  const [approving, setApproving] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!reqId) return;
      try {
        const data = await getAccessRequest(reqId);
        if (data) setReq(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reqId]);

  // Realtime conversation listener
  useEffect(() => {
    if (!reqId) return;
    const q = query(
      collection(db, "requestMessages"),
      where("requestId", "==", reqId),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RequestMessage)));
    });
    return () => unsub();
  }, [reqId]);

  if (loading) return <AppShell><LoadingState message="Loading request details..." /></AppShell>;
  if (!req) return <AppShell><ErrorState message="Request not found." onRetry={() => router.push("/admin/requests")} /></AppShell>;

  // Approve Request
  const handleApprove = async () => {
    if (!user) return;
    setApproving(true);
    try {
      await approveRequest(req.id, user.uid, user.name);
      setReq({ ...req, status: "approved", reviewedByName: user.name, reviewedAt: new Date().toISOString() });
      success(`Access request for ${req.name} APPROVED! 🎉`);
    } catch {
      error("Failed to approve request.");
    } finally {
      setApproving(false);
    }
  };

  // Reject Request
  const handleReject = async () => {
    if (!user || !rejectionReason.trim()) return;
    setRejecting(true);
    try {
      await rejectRequest(req.id, user.uid, user.name, rejectionReason.trim());
      setReq({ ...req, status: "rejected", reviewedByName: user.name, reviewedAt: new Date().toISOString(), rejectionReason });
      setRejectModal(false);
      success(`Access request for ${req.name} REJECTED.`);
    } catch {
      error("Failed to reject request.");
    } finally {
      setRejecting(false);
    }
  };

  // Send Message in Thread
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    setSending(true);
    try {
      await addDoc(collection(db, "requestMessages"), {
        requestId: req.id,
        senderId: user.uid,
        senderName: user.name,
        senderRole: user.role,
        message: newMessage.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewMessage("");
    } catch {
      error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto w-full mm-page-animate">
        <Link href="/admin/requests" className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Requests
        </Link>

        {/* Details Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{req.name}</h1>
                <span className={`mm-badge border ${req.status === "approved" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : req.status === "rejected" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>{req.status.toUpperCase()}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{req.email} • Phone: {req.phone}</p>
            </div>

            {req.status === "pending" && (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" icon={<X size={16} />} onClick={() => setRejectModal(true)}>
                  Reject Request
                </Button>

                <Button variant="primary" size="sm" icon={<Check size={16} />} loading={approving} onClick={handleApprove}>
                  Approve Request
                </Button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Register Number:</span><span className="font-mono font-bold text-slate-900">{req.registerNumber}</span></div>
            {req.rollNumber && <div className="flex justify-between"><span className="text-slate-500">Roll Number:</span><span className="font-mono font-bold text-slate-900">{req.rollNumber}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Department / Year:</span><span className="font-bold text-slate-900">{req.department} - {req.year} Yr ({req.section})</span></div>
            {req.message && <div className="pt-2 border-t border-slate-200"><span className="text-slate-500">Message from student:</span><p className="text-slate-700 italic mt-0.5">&quot;{req.message}&quot;</p></div>}
          </div>

          {/* Audit Record display (#12 spec requirement) */}
          {req.reviewedByName && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs space-y-1">
              <p className="font-bold text-blue-900">Audit Record:</p>
              <p className="text-blue-800">
                Status: <strong className="uppercase">{req.status}</strong> by <strong>{req.reviewedByName}</strong> on {formatDateTime(req.reviewedAt || "")}
              </p>
              {req.rejectionReason && (
                <p className="text-red-700 font-semibold mt-1">Rejection Reason: {req.rejectionReason}</p>
              )}
            </div>
          )}
        </div>

        {/* Private Approval Discussion Thread (#13 spec requirement) */}
        <div className="mm-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <MessageSquare size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900 text-base">Private Approval Discussion Thread</h2>
          </div>
          <p className="text-xs text-slate-500">
            This private thread is visible only to the requesting student and authorized faculty mentors.
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No messages in this discussion thread yet.</p>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-slate-700">{m.senderName}</span>
                      <span className="text-[10px] text-slate-400">({m.senderRole})</span>
                    </div>
                    <div className={`px-3.5 py-2 rounded-xl text-sm max-w-[85%] ${isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-100 text-slate-800 rounded-bl-none"}`}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-100">
            <input
              className="mm-input flex-1 text-sm"
              placeholder="Write a private message to the student..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button type="submit" variant="primary" loading={sending} icon={<Send size={16} />}>
              Send
            </Button>
          </form>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title={req ? `Reject Request for ${req.name}` : "Reject Request"}
        description="Please provide a reason for rejecting this access request. The student will see this reason."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={rejecting}
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </>
        }
      >
        <div>
          <label className="mm-label">Rejection Reason <span className="required">*</span></label>
          <textarea
            className="mm-input resize-none"
            rows={3}
            placeholder="e.g. Invalid register number / Not in ECE group..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </AppShell>
  );
}
