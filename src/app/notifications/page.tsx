"use client";

// ============================================================
// MentorMesh — Notification Center v2
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getActiveStudents,
} from "@/lib/firebase/firestore";
import { getUpcomingBirthdays, markVirtualNotificationRead, markAllVirtualNotificationsRead } from "@/lib/birthdays";
import type { Notification } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, EmptyState } from "@/components/ui/States";
import {
  Bell, Cake, CheckCheck, CheckCircle, XCircle, MessageSquare,
  Send, Gift, Paperclip, X, Search
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useToast } from "@/components/ui/ToastProvider";

interface Student { uid: string; name: string; email: string; profilePhoto?: string; }

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsContent />
    </AppShell>
  );
}

function NotificationsContent() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose message state
  const [composeOpen, setComposeOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [msgText, setMsgText] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [sending, setSending] = useState(false);

  // Birthday wish modal
  const [wishNotif, setWishNotif] = useState<Notification | null>(null);
  const [wishText, setWishText] = useState("");
  const [wishing, setWishing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const dbList = await getUserNotifications(user.uid);
        const bdayList = await getUpcomingBirthdays(user);
        const all = [...bdayList, ...dbList];
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(all);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      markAllVirtualNotificationsRead();
      await markAllNotificationsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (id.startsWith("bday_")) {
        markVirtualNotificationRead(id);
      } else {
        await markNotificationRead(id);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Open compose and load students
  const openCompose = async () => {
    setComposeOpen(true);
    if (students.length === 0) {
      try {
        const list = await getActiveStudents();
        setStudents(list.filter(s => s.uid !== user?.uid));
      } catch { /* ignore */ }
    }
  };

  const handleSendMessage = async () => {
    if (!user || selectedRecipients.length === 0 || !msgText.trim()) return;
    setSending(true);
    try {
      await Promise.all(selectedRecipients.map(recipientId =>
        addDoc(collection(db, "notifications"), {
          recipientId,
          title: `📩 Message from ${user.name}`,
          message: msgText.trim(),
          type: "system",
          read: false,
          priority: "normal",
          relatedId: user.uid,
          createdAt: serverTimestamp(),
        })
      ));
      success(`Message sent to ${selectedRecipients.length} recipient(s)!`);
      setComposeOpen(false);
      setSelectedRecipients([]);
      setMsgText("");
      setSearchQ("");
    } catch {
      toastError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleSendWish = async () => {
    if (!user || !wishNotif) return;
    const recipientId = wishNotif.relatedId;
    if (!recipientId) return;
    setWishing(true);
    try {
      const wishMsg = wishText.trim() || `Happy Birthday! 🎂 Warm wishes from ${user.name}!`;
      await addDoc(collection(db, "notifications"), {
        recipientId,
        title: `🎉 Birthday Wish from ${user.name}!`,
        message: wishMsg,
        type: "birthday",
        read: false,
        priority: "high",
        relatedId: user.uid,
        createdAt: serverTimestamp(),
      });
      markVirtualNotificationRead(wishNotif.id);
      setNotifications(prev => prev.map(n => n.id === wishNotif.id ? { ...n, read: true } : n));
      success("Birthday wish sent! 🎊");
      setWishNotif(null);
      setWishText("");
    } catch {
      toastError("Failed to send wish.");
    } finally {
      setWishing(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  const iconConfig: Record<string, { icon: React.ReactNode; classes: string }> = {
    approval: { icon: <CheckCircle size={18} />, classes: "bg-emerald-100 text-emerald-600" },
    rejection: { icon: <XCircle size={18} />, classes: "bg-red-100 text-red-600" },
    birthday: { icon: <Cake size={18} />, classes: "bg-pink-100 text-pink-600" },
    system: { icon: <MessageSquare size={18} />, classes: "bg-violet-100 text-violet-600" },
    default: { icon: <Bell size={18} />, classes: "bg-blue-100 text-blue-600" },
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto mm-page-animate relative">
      <PageHeader
        icon={<Bell size={20} />}
        iconClass="bg-blue-100 text-blue-600"
        title="Notification Center"
        subtitle="Approvals, team updates, birthday reminders, and messages."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" icon={<CheckCheck size={14} />} onClick={handleMarkAllRead}>
                Mark All Read
              </Button>
            )}
            <Button variant="primary" size="sm" icon={<MessageSquare size={14} />} onClick={openCompose}>
              New Message
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} />}
          title="No notifications"
          description="You're all caught up! Updates and messages will appear here."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {notifications.map((n) => {
            const cfg = iconConfig[n.type] ?? iconConfig.default;
            const isBdayOther = n.type === "birthday" && n.id.startsWith("bday_other_");
            return (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                  n.read
                    ? "bg-white border-slate-200"
                    : "bg-blue-50/40 border-blue-200 shadow-sm"
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && !n.read && handleMarkRead(n.id)}
                aria-label={n.title}
              >
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.classes)}>
                  {cfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{n.title}</h3>
                    <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap ml-2">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                  {/* Birthday wish button */}
                  {isBdayOther && (
                    <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Gift size={13} />}
                        onClick={() => { setWishNotif(n); setWishText(""); }}
                      >
                        Wish Now 🎂
                      </Button>
                      {n.link && (
                        <a href={n.link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline">WhatsApp / Email</Button>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Link action (non-birthday) */}
                  {n.link && !isBdayOther && (
                    <div className="mt-3" onClick={e => e.stopPropagation()}>
                      <a href={n.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg text-[12px] font-bold transition-colors border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-8 px-4 py-2 shadow-sm"
                        onClick={() => !n.read && handleMarkRead(n.id)}
                      >
                        Action
                      </a>
                    </div>
                  )}
                </div>

                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" title="Unread" aria-label="Unread notification" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Birthday Wish Modal */}
      <Modal
        open={!!wishNotif}
        onClose={() => { setWishNotif(null); setWishText(""); }}
        title="Send Birthday Wish 🎂"
        description="Your wish will be delivered directly to their notification inbox!"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setWishNotif(null); setWishText(""); }}>Cancel</Button>
            <Button variant="primary" icon={<Send size={14} />} loading={wishing} onClick={handleSendWish}>
              Send Wish 🎊
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-sm text-pink-800">
            <strong>{wishNotif?.title}</strong>
            <p className="text-xs mt-1 text-pink-700">{wishNotif?.message}</p>
          </div>
          <div>
            <label className="mm-label">Your Personal Message (optional)</label>
            <textarea
              className="mm-input resize-none w-full"
              rows={3}
              placeholder={`Happy Birthday! 🎂 Warm wishes from ${user?.name}!`}
              value={wishText}
              onChange={e => setWishText(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to send a default greeting.</p>
          </div>
        </div>
      </Modal>

      {/* Compose Message Modal */}
      <Modal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setSelectedRecipients([]); setMsgText(""); setSearchQ(""); }}
        title="Compose Message"
        description="Send a message or announcement to one or multiple students."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setComposeOpen(false); setSelectedRecipients([]); setMsgText(""); }}>Cancel</Button>
            <Button
              variant="primary"
              icon={<Send size={14} />}
              loading={sending}
              onClick={handleSendMessage}
              disabled={selectedRecipients.length === 0 || !msgText.trim()}
            >
              Send to {selectedRecipients.length || ""} {selectedRecipients.length === 1 ? "Person" : selectedRecipients.length > 1 ? "People" : "..."}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* From field */}
          <div>
            <label className="mm-label">From (You)</label>
            <input className="mm-input" value={user?.name || ""} disabled />
          </div>

          {/* To field - searchable multi-select */}
          <div>
            <label className="mm-label">To <span className="text-red-500">*</span></label>
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedRecipients.map(uid => {
                  const s = students.find(st => st.uid === uid);
                  return s ? (
                    <span key={uid} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {s.name}
                      <button onClick={() => setSelectedRecipients(prev => prev.filter(id => id !== uid))} className="hover:text-red-600">
                        <X size={12} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="relative mb-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="mm-input !pl-9"
                placeholder="Search students..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 text-center">No students found</p>
              ) : filteredStudents.map(s => (
                <label key={s.uid} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 w-4 h-4"
                    checked={selectedRecipients.includes(s.uid)}
                    onChange={e => {
                      if (e.target.checked) setSelectedRecipients(prev => [...prev, s.uid]);
                      else setSelectedRecipients(prev => prev.filter(id => id !== s.uid));
                    }}
                  />
                  <span className="text-sm font-medium text-slate-800 flex-1">{s.name}</span>
                  <span className="text-xs text-slate-400">{s.email}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="mm-label">Message <span className="text-red-500">*</span></label>
            <textarea
              className="mm-input resize-none w-full"
              rows={4}
              placeholder="Type your message here..."
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Paperclip size={13} />
            <span>File attachments coming soon (max 5MB per file)</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
