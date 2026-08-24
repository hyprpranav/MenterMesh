"use client";

// ============================================================
// MentorMesh — Notification Center v3 (fixed FAB + clean alignment)
// ============================================================
import React, { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getActiveStudents,
  getAllUsers,
} from "@/lib/firebase/firestore";
import { getUpcomingBirthdays, markVirtualNotificationRead, markAllVirtualNotificationsRead } from "@/lib/birthdays";
import type { Notification } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, EmptyState } from "@/components/ui/States";
import {
  Bell, Cake, CheckCheck, CheckCircle, XCircle, MessageSquare,
  Send, Gift, X, Search, Paperclip
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useToast } from "@/components/ui/ToastProvider";

interface Student { uid: string; name: string; email: string; }

const MAX_FILE_MB = 5;

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
  const [devPhotoUrl, setDevPhotoUrl] = useState<string | null>(null);

  // Compose message
  const [composeOpen, setComposeOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [msgText, setMsgText] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Birthday wish
  const [wishNotif, setWishNotif] = useState<Notification | null>(null);
  const [wishText, setWishText] = useState("");
  const [wishing, setWishing] = useState(false);

  // Draggable FAB
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const dbList = await getUserNotifications(user.uid);
        const bdayList = await getUpcomingBirthdays(user);
        const all = [...bdayList, ...dbList];
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(all);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  // Fetch developer photo once
  useEffect(() => {
    async function loadDev() {
      try {
        const masters = await getAllUsers("master");
        if (masters.length > 0) {
          const dev = masters[0];
          setDevPhotoUrl(dev.professionalPhoto || dev.profilePhoto || null);
        }
      } catch { /* ignore */ }
    }
    loadDev();
  }, []);

  // Draggable FAB
  const handleFabMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - fabPos.x, y: e.clientY - fabPos.y };
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      setFabPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    markAllVirtualNotificationsRead();
    await markAllNotificationsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (id.startsWith("bday_")) markVirtualNotificationRead(id);
    else await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const openCompose = async () => {
    setComposeOpen(true);
    if (students.length === 0) {
      const list = await getActiveStudents();
      setStudents(list.filter(s => s.uid !== user?.uid));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) { toastError(`File too large. Max ${MAX_FILE_MB}MB.`); return; }
    setAttachedFile(file);
  };

  const handleSendMessage = async () => {
    if (!user || selectedRecipients.length === 0 || !msgText.trim()) return;
    setSending(true);
    try {
      let fileUrl = "";
      if (attachedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", attachedFile);
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "mentormesh");
        formData.append("folder", "mentormesh/messages");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
        const data = await res.json();
        fileUrl = data.secure_url || "";
        setUploading(false);
      }
      const msgBody = msgText.trim() + (fileUrl ? `\n\n📎 Attachment: ${fileUrl}` : "");
      await Promise.all(selectedRecipients.map(recipientId =>
        addDoc(collection(db, "notifications"), {
          recipientId, title: `📩 Message from ${user.name}`,
          message: msgBody, type: "system", read: false, priority: "normal",
          relatedId: user.uid, createdAt: serverTimestamp(),
        })
      ));
      success(`Message sent to ${selectedRecipients.length} recipient(s)!`);
      setComposeOpen(false); setSelectedRecipients([]); setMsgText(""); setSearchQ(""); setAttachedFile(null);
    } catch { toastError("Failed to send message."); }
    finally { setSending(false); setUploading(false); }
  };

  const handleSendWish = async () => {
    if (!user || !wishNotif?.relatedId) return;
    setWishing(true);
    try {
      const wishMsg = wishText.trim() || `Happy Birthday! 🎂 Warm wishes from ${user.name}!`;
      await addDoc(collection(db, "notifications"), {
        recipientId: wishNotif.relatedId, title: `🎉 Birthday Wish from ${user.name}!`,
        message: wishMsg, type: "birthday", read: false, priority: "high",
        relatedId: user.uid, createdAt: serverTimestamp(),
      });
      markVirtualNotificationRead(wishNotif.id);
      setNotifications(prev => prev.map(n => n.id === wishNotif.id ? { ...n, read: true } : n));
      success("Birthday wish sent! 🎊");
      setWishNotif(null); setWishText("");
    } catch { toastError("Failed to send wish."); }
    finally { setWishing(false); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
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

  // Developer photo icon displayed on all birthday notifications
  const devIcon = devPhotoUrl ? (
    <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2.5px solid #F9A8D4", flexShrink: 0, boxShadow: "0 0 0 2px #fbcfe8" }}>
      <img src={devPhotoUrl} alt="Dev" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  ) : (
    <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 mt-0.5">
      <Cake size={18} />
    </div>
  );

  const fabFixed: React.CSSProperties = fabPos.x || fabPos.y
    ? { position: "fixed", left: fabPos.x, top: fabPos.y, zIndex: 9990, cursor: dragging ? "grabbing" : "grab" }
    : { position: "fixed", bottom: "100px", right: "24px", zIndex: 9990, cursor: "grab" };

  return (
    <>
      {/* ── Notification list card ──────────────────────── */}
      <div className="mm-card space-y-6 w-full max-w-4xl mx-auto mm-page-animate">
        <PageHeader
          icon={<Bell size={20} />}
          iconClass="bg-blue-100 text-blue-600"
          title="Notification Center"
          subtitle="Approvals, team updates, birthday reminders, and messages."
          actions={
            unreadCount > 0 ? (
              <Button variant="outline" size="sm" icon={<CheckCheck size={14} />} onClick={handleMarkAllRead}>
                Mark All Read
              </Button>
            ) : undefined
          }
        />

        {loading ? (
          <LoadingState message="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell size={40} />} title="No notifications" description="You're all caught up! Updates and requests will appear here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {notifications.map(n => {
              const cfg = iconConfig[n.type] ?? iconConfig.default;
              const isBdayOther = n.type === "birthday" && n.id.startsWith("bday_other_");
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={cn(
                    "mm-notification-card rounded-xl border transition-all cursor-pointer",
                    n.read ? "bg-white border-slate-200" : "bg-blue-50/40 border-blue-200 shadow-sm"
                  )}
                  role="button" tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && !n.read && handleMarkRead(n.id)}
                  aria-label={n.title}
                >
                  {/* Birthday notifications show developer photo, others use standard icon */}
                  {n.type === "birthday" ? (
                    <div className="shrink-0 mt-0.5">{devIcon}</div>
                  ) : (
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.classes)}>
                      {cfg.icon}
                    </div>
                  )}
                  <div className="mm-notification-content">
                    <div className="mm-notification-heading">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug overflow-wrap-anywhere">{n.title}</h3>
                      <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed overflow-wrap-anywhere">{n.message}</p>
                    {isBdayOther && (
                      <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="primary" icon={<Gift size={13} />} onClick={() => { setWishNotif(n); setWishText(""); }}>Wish Now 🎂</Button>
                        {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline">WhatsApp / Email</Button></a>}
                      </div>
                    )}
                    {n.link && !isBdayOther && (
                      <div className="mt-3" onClick={e => e.stopPropagation()}>
                        <a href={n.link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-lg text-[12px] font-bold transition-colors border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-8 px-4 py-2 shadow-sm"
                          onClick={() => !n.read && handleMarkRead(n.id)}>
                          Action
                        </a>
                      </div>
                    )}
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" title="Unread" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Floating Action Button (outside mm-card, position:fixed works) ── */}
      <button
        ref={fabRef}
        style={fabFixed}
        onMouseDown={handleFabMouseDown}
        onClick={() => { if (!dragging) openCompose(); }}
        className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-transform select-none"
        aria-label="Compose new message"
        title="Send a message"
      >
        <MessageSquare size={24} />
      </button>

      {/* ── Birthday Wish Modal ── */}
      <Modal
        open={!!wishNotif}
        onClose={() => { setWishNotif(null); setWishText(""); }}
        title="Send Birthday Wish 🎂"
        description="Your wish will be delivered directly to their notification inbox!"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setWishNotif(null); setWishText(""); }}>Cancel</Button>
            <Button variant="primary" icon={<Send size={14} />} loading={wishing} onClick={handleSendWish}>Send Wish 🎊</Button>
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
            <textarea className="mm-input resize-none w-full" rows={3} placeholder={`Happy Birthday! 🎂 Warm wishes from ${user?.name}!`} value={wishText} onChange={e => setWishText(e.target.value)} autoFocus />
            <p className="text-xs text-slate-400 mt-1">Leave blank to send a default greeting.</p>
          </div>
        </div>
      </Modal>

      {/* ── Compose Message Modal ── */}
      <Modal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setSelectedRecipients([]); setMsgText(""); setSearchQ(""); setAttachedFile(null); }}
        title="Compose Message"
        description="Send a message to one or multiple students instantly."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setComposeOpen(false); setSelectedRecipients([]); setMsgText(""); setAttachedFile(null); }}>Cancel</Button>
            <Button variant="primary" icon={<Send size={14} />} loading={sending} onClick={handleSendMessage} disabled={selectedRecipients.length === 0 || !msgText.trim()}>
              {uploading ? "Uploading..." : `Send${selectedRecipients.length > 0 ? ` to ${selectedRecipients.length}` : ""}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mm-label">From (You)</label>
            <input className="mm-input bg-slate-50" value={user?.name || ""} disabled />
          </div>
          <div>
            <label className="mm-label">To <span className="text-red-500">*</span></label>
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedRecipients.map(uid => {
                  const s = students.find(st => st.uid === uid);
                  return s ? (
                    <span key={uid} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {s.name}
                      <button onClick={() => setSelectedRecipients(prev => prev.filter(id => id !== uid))} className="hover:text-red-600 ml-0.5"><X size={12} /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="relative mb-1.5">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input className="mm-input !pl-9 !py-2 text-sm" placeholder="Search students..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[160px] overflow-y-auto">
              {filteredStudents.length === 0
                ? <p className="text-xs text-slate-400 p-3 text-center">No students found</p>
                : filteredStudents.map(s => (
                  <label key={s.uid} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                    <input type="checkbox" className="rounded text-blue-600 w-4 h-4" checked={selectedRecipients.includes(s.uid)} onChange={e => setSelectedRecipients(prev => e.target.checked ? [...prev, s.uid] : prev.filter(id => id !== s.uid))} />
                    <span className="text-sm font-medium text-slate-800 flex-1">{s.name}</span>
                    <span className="text-xs text-slate-400 hidden sm:block">{s.email}</span>
                  </label>
                ))}
            </div>
          </div>
          <div>
            <label className="mm-label">Message <span className="text-red-500">*</span></label>
            <textarea className="mm-input resize-none w-full" rows={4} placeholder="Type your message here..." value={msgText} onChange={e => setMsgText(e.target.value)} />
          </div>
          <div>
            <label className="mm-label">Attach File <span className="text-slate-400 text-xs font-normal">(max 5MB)</span></label>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt" onChange={handleFileSelect} />
            {attachedFile ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                <Paperclip size={16} className="text-blue-500 shrink-0" />
                <span className="text-sm text-blue-800 font-medium flex-1 truncate">{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Paperclip size={16} />
                <span>Click to attach a file</span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
