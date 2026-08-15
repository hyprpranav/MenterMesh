"use client";

// ============================================================
// MentorMesh — Pending Approval Page
// ============================================================
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Clock, MessageSquare, LogOut, Send } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { RequestMessage } from "@/types";
import { formatDate } from "@/lib/utils";

export default function PendingPage() {
  const { user, logOut, refreshUser } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.status === "active") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Realtime conversation listener for this request
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "requestMessages"),
      where("requestId", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RequestMessage)));
    });
    return () => unsub();
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    setSending(true);
    try {
      await addDoc(collection(db, "requestMessages"), {
        requestId: user.uid,
        senderId: user.uid,
        senderName: user.name,
        senderRole: user.role,
        message: newMessage.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Main Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Awaiting Approval</h1>
          <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
            Thank you for registering, <span className="font-semibold text-slate-900">{user.name}</span>! Your request has been submitted to your faculty mentor.
          </p>

          {/* Details Box */}
          <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 text-sm space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Register Number:</span>
              <span className="font-medium text-slate-900">{user.registerNumber || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department / Year:</span>
              <span className="font-medium text-slate-900">{user.department} - {user.year} Yr ({user.section} Sec)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Submitted On:</span>
              <span className="font-medium text-slate-900">{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500">Status:</span>
              <span className="mm-badge border bg-amber-100 text-amber-800 border-amber-200">PENDING</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="secondary" onClick={refreshUser}>
              Check Status
            </Button>
            <Button variant="ghost" icon={<LogOut size={16} />} onClick={() => logOut().then(() => router.push("/login"))}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Approval Discussion Thread */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <MessageSquare size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-base">Approval Discussion</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Need to provide extra details to your mentor? Send a message directly to the approval queue below.
          </p>

          {/* Message List */}
          <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No messages yet in this discussion.</p>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === user.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-slate-700">{m.senderName}</span>
                      <span className="text-[10px] text-slate-400">({m.senderRole})</span>
                    </div>
                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-100 text-slate-800 rounded-bl-none"}`}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              className="mm-input flex-1 text-sm"
              placeholder="Type a message to staff/mentor..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button type="submit" variant="primary" loading={sending} icon={<Send size={16} />}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
