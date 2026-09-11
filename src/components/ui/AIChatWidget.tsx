"use client";

// ============================================================
// MentorMesh — Intelligent Floating AI Assistant
// Database-aware, Role-based, CCTV-style 24h Rolling Expiry
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  X,
  Send,
  Trash2,
  ChevronDown,
  Loader2,
  Clock,
  ShieldAlert,
  Copy,
  Check,
  FileSpreadsheet,
  Users,
  Calendar,
  Presentation,
  Megaphone,
  UserCheck,
} from "lucide-react";
import { MentorMeshRobot } from "./MentorMeshRobot";
import * as XLSX from "xlsx";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  senderId: string;
  createdAt: number;
  expiresAt: number;
  exportData?: Record<string, any>[];
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RETENTION_HOURS = 24;

export function AIChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [speechBubbleDismissed, setSpeechBubbleDismissed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Drag state with viewport clamping
  const [pos, setPos] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const hasMoved = useRef(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const isStaffOrMaster = user?.role === "staff" || user?.role === "master";

  // Load saved bubble state
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("mm_ai_bubble_dismissed");
      if (dismissed === "true") setSpeechBubbleDismissed(true);

      const savedPos = localStorage.getItem("mm_ai_fab_pos");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Clamp to current viewport
          const clampedX = Math.max(16, Math.min(window.innerWidth - 76, parsed.x));
          const clampedY = Math.max(16, Math.min(window.innerHeight - 76, parsed.y));
          setPos({ x: clampedX, y: clampedY });
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Window resize bounds clamping
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (prev.x === null || prev.y === null) return prev;
        const clampedX = Math.max(16, Math.min(window.innerWidth - 76, prev.x));
        const clampedY = Math.max(16, Math.min(window.innerHeight - 76, prev.y));
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Drag Handlers ───────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    // Only drag with primary button / touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    hasMoved.current = false;
    setDragging(true);

    const rect = fabRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : window.innerWidth - 80;
    const currentY = rect ? rect.top : window.innerHeight - 80;

    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: currentX,
      startY: currentY,
    };

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
    }

    const newX = Math.max(16, Math.min(window.innerWidth - 76, dragStart.current.startX + dx));
    const newY = Math.max(16, Math.min(window.innerHeight - 76, dragStart.current.startY + dy));

    setPos({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    if (hasMoved.current && pos.x !== null && pos.y !== null) {
      localStorage.setItem("mm_ai_fab_pos", JSON.stringify(pos));
    }
  };

  const handleFabClick = () => {
    if (hasMoved.current) {
      hasMoved.current = false;
      return;
    }
    setOpen((o) => !o);
    if (!speechBubbleDismissed) {
      setSpeechBubbleDismissed(true);
      try {
        sessionStorage.setItem("mm_ai_bubble_dismissed", "true");
      } catch {
        // ignore
      }
    }
  };

  // ── Subscribe to messages with 24h rolling TTL ───────────────
  const subscribeToMessages = useCallback(() => {
    if (!user?.uid) return;
    const colRef = collection(db, "aiChats", user.uid, "messages");
    const q = query(colRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const msgs: ChatMessage[] = [];
      const expiredIds: string[] = [];

      snap.docs.forEach((d) => {
        const data = d.data() as Omit<ChatMessage, "id">;
        if (data.expiresAt && data.expiresAt <= now) {
          expiredIds.push(d.id);
        } else {
          msgs.push({ id: d.id, ...data });
        }
      });

      // Automatically prune expired messages from Firestore (CCTV rolling deletion)
      expiredIds.forEach((id) => {
        deleteDoc(doc(db, "aiChats", user.uid, "messages", id)).catch(() => {});
      });

      setMessages(msgs);
    });

    unsubRef.current = unsub;
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (open && user?.uid) {
      const unsub = subscribeToMessages();
      return () => {
        if (unsub) unsub();
      };
    }
  }, [open, user?.uid, subscribeToMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [messages, open]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // ── Save message to Firestore ────────────────────────────────
  const saveMessage = async (
    role: "user" | "assistant",
    text: string,
    exportData?: Record<string, any>[]
  ) => {
    if (!user?.uid) return;
    const now = Date.now();
    const docData: any = {
      role,
      text,
      senderId: user.uid,
      createdAt: now,
      expiresAt: now + TTL_MS,
    };
    if (exportData && exportData.length > 0) {
      docData.exportData = exportData;
    }
    await addDoc(collection(db, "aiChats", user.uid, "messages"), docData);
  };

  // ── Send message to AI API ────────────────────────────────────
  const executeSend = async (messageText: string) => {
    if (!messageText.trim() || loading || !user) return;
    const userText = messageText.trim();
    setInput("");
    setLoading(true);

    // Save user message
    await saveMessage("user", userText);

    try {
      // Send last 8 visible messages as conversational context
      const history = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          uid: user.uid,
          userRole: user.role,
          conversationHistory: history,
        }),
      });

      const data = await res.json();
      const reply =
        data.reply || data.error || "Sorry, I couldn't retrieve that information right now. Please try again.";
      await saveMessage("assistant", reply, data.exportData);
    } catch {
      await saveMessage(
        "assistant",
        "Sorry, I couldn't connect to the MentorMesh AI service right now. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => executeSend(input);

  // ── Clear All History ─────────────────────────────────────────
  const handleClearAll = async () => {
    if (!user?.uid || clearing) return;
    setClearing(true);
    try {
      const snap = await getDocs(collection(db, "aiChats", user.uid, "messages"));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      setMessages([]);
    } catch {
      console.error("Failed to clear chat");
    } finally {
      setClearing(false);
    }
  };

  // ── Copy helper ───────────────────────────────────────────────
  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Export Excel helper (Staff/Master only) ───────────────────
  const handleExportExcel = (data: Record<string, any>[], title: string = "MentorMesh_Export") => {
    if (!isStaffOrMaster || !data || data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
    XLSX.writeFile(workbook, `${title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── Quick Actions ─────────────────────────────────────────────
  const quickActions = [
    { label: "Find a Student", prompt: "Find student ", icon: <UserCheck size={14} /> },
    { label: "Show My Team", prompt: "Show my team details", icon: <Users size={14} /> },
    { label: "Find an Event", prompt: "What events are currently available or upcoming?", icon: <Calendar size={14} /> },
    { label: "My Meeting History", prompt: "Show my meeting history and attendance", icon: <Presentation size={14} /> },
    { label: "Announcements", prompt: "Show latest announcements", icon: <Megaphone size={14} /> },
  ];

  if (!user) return null;

  // Fab position styles
  const fabStyle: React.CSSProperties =
    pos.x !== null && pos.y !== null
      ? { left: `${pos.x}px`, top: `${pos.y}px` }
      : { bottom: "24px", right: "24px" };

  return (
    <>
      {/* ── Draggable Floating Trigger ───────────────────────────── */}
      <div
        ref={fabRef}
        style={{
          position: "fixed",
          zIndex: 9998,
          touchAction: "none",
          ...fabStyle,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Speech Bubble (when closed & not dismissed) */}
        {!open && !speechBubbleDismissed && (
          <div
            style={{
              position: "absolute",
              bottom: "70px",
              right: "0",
              width: "260px",
              background: "#FFFFFF",
              color: "#0F172A",
              borderRadius: "16px",
              padding: "12px 14px",
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)",
              border: "1px solid #E2E8F0",
              fontSize: "12px",
              lineHeight: 1.45,
              animation: "mmAiPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
              <span style={{ fontWeight: 700, color: "#2563EB", fontSize: "12px" }}>MentorMesh AI</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSpeechBubbleDismissed(true);
                  try {
                    sessionStorage.setItem("mm_ai_bubble_dismissed", "true");
                  } catch {}
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94A3B8",
                  padding: 2,
                  display: "flex",
                }}
                aria-label="Dismiss greeting"
              >
                <X size={14} />
              </button>
            </div>
            <p style={{ margin: "4px 0 0", color: "#334155" }}>
              Hi! How may I help you? If you need any help, just come and chat with me.
            </p>
            {/* Bubble Tail */}
            <div
              style={{
                position: "absolute",
                bottom: "-6px",
                right: "26px",
                width: "12px",
                height: "12px",
                background: "#FFFFFF",
                transform: "rotate(45deg)",
                borderRight: "1px solid #E2E8F0",
                borderBottom: "1px solid #E2E8F0",
              }}
            />
          </div>
        )}

        {/* Mascot FAB Button */}
        <button
          onClick={handleFabClick}
          aria-label={open ? "Close AI Assistant" : "Open MentorMesh AI Assistant"}
          title="MentorMesh AI Assistant"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 60%, #EA580C 100%)",
            border: "2.5px solid #FFFFFF",
            boxShadow: "0 10px 25px rgba(37, 99, 235, 0.35), 0 4px 10px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: dragging ? "grabbing" : "pointer",
            transition: dragging ? "none" : "transform 0.2s ease, box-shadow 0.2s ease",
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (!dragging) (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            if (!dragging) (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          {open ? (
            <X size={24} color="white" />
          ) : (
            <div style={{ pointerEvents: "none" }}>
              <MentorMeshRobot size={38} expression={loading ? "thinking" : "happy"} />
            </div>
          )}

          {/* Online beacon pulse */}
          {!open && (
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#10B981",
                border: "2px solid #FFFFFF",
                boxShadow: "0 0 8px rgba(16, 185, 129, 0.8)",
              }}
            />
          )}
        </button>
      </div>

      {/* ── AI Assistant Panel ───────────────────────────────────── */}
      {open && (
        <div
          className="mm-ai-assistant-container"
          style={{
            position: "fixed",
            zIndex: 9999,
            background: "#FFFFFF",
            boxShadow: "0 24px 64px rgba(15, 23, 42, 0.22), 0 4px 20px rgba(37, 99, 235, 0.12)",
            border: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "mmAiPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <style>{`
            @keyframes mmAiPop {
              from { opacity: 0; transform: translateY(16px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @media (min-width: 641px) {
              .mm-ai-assistant-container {
                bottom: 96px;
                right: 24px;
                width: 400px;
                height: 610px;
                border-radius: 20px;
              }
            }
            @media (max-width: 640px) {
              .mm-ai-assistant-container {
                inset: 0;
                width: 100vw;
                height: 100vh;
                border-radius: 0;
              }
            }
          `}</style>

          {/* ── Header ──────────────────────────────────────────── */}
          <div
            style={{
              background: "linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #EA580C 100%)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              color: "#FFFFFF",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <MentorMeshRobot size={26} expression={loading ? "thinking" : "happy"} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <p style={{ fontWeight: 800, fontSize: "14px", margin: 0, letterSpacing: "-0.01em" }}>
                  MentorMesh AI
                </p>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.2)",
                    padding: "2px 6px",
                    borderRadius: 99,
                    textTransform: "uppercase",
                  }}
                >
                  Secure
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name} · <span className="capitalize">{user.role}</span>
              </p>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={handleClearAll}
                title="Clear current session messages"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "8px",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#FFFFFF",
                }}
              >
                {clearing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Minimize AI panel"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "8px",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#FFFFFF",
                }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* ── 24-Hour Rolling Expiration Notice ────────────────── */}
          <div
            style={{
              background: "#FFF7ED",
              borderBottom: "1px solid #FED7AA",
              padding: "8px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <Clock size={13} color="#C2410C" style={{ flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "11px", color: "#9A3412", margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
              <strong>Note:</strong> AI chat history is temporary. Your messages will remain for {RETENTION_HOURS} hours only and will be automatically deleted afterward.
            </p>
          </div>

          {/* ── Role Notice for Students ─────────────────────────── */}
          {!isStaffOrMaster && (
            <div
              style={{
                background: "#EFF6FF",
                borderBottom: "1px solid #BFDBFE",
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={12} color="#1D4ED8" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: "11px", color: "#1E40AF", margin: 0, fontWeight: 500 }}>
                Student access: Data export is restricted to Staff & Developer accounts.
              </p>
            </div>
          )}

          {/* ── Messages Stream ──────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#F8FAFC",
            }}
          >
            {messages.length === 0 && !loading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "16px 8px",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "#EFF6FF",
                    border: "2px solid #DBEAFE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MentorMeshRobot size={40} expression="happy" />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1E293B", margin: 0 }}>
                    Hello, {user.name.split(" ")[0]}!
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0", maxWidth: "280px", lineHeight: 1.5 }}>
                    I can search actual MentorMesh data, analyze your teams, event participation, and meetings.
                  </p>
                </div>

                {/* Quick Prompts */}
                <div style={{ width: "100%", marginTop: "6px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px", textAlign: "left" }}>
                    Quick Prompts
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {quickActions.map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (qa.prompt.endsWith(" ")) {
                            setInput(qa.prompt);
                            inputRef.current?.focus();
                          } else {
                            executeSend(qa.prompt);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "10px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#334155",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#2563EB";
                          (e.currentTarget as HTMLElement).style.color = "#2563EB";
                          (e.currentTarget as HTMLElement).style.background = "#EFF6FF";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0";
                          (e.currentTarget as HTMLElement).style.color = "#334155";
                          (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                        }}
                      >
                        <span style={{ color: "#2563EB" }}>{qa.icon}</span>
                        <span>{qa.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const expiresIn = Math.max(0, msg.expiresAt - Date.now());
              const hoursLeft = Math.max(0, Math.round(expiresIn / (1000 * 60 * 60)));

              // Detect copyable key-value lines (e.g., "Name: ...", "Register Number: ...")
              const lines = msg.text.split("\n");

              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "88%",
                      padding: "10px 14px",
                      borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                      background: isUser
                        ? "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)"
                        : "#FFFFFF",
                      color: isUser ? "#FFFFFF" : "#0F172A",
                      fontSize: "13px",
                      lineHeight: 1.55,
                      boxShadow: isUser
                        ? "0 2px 8px rgba(37, 99, 235, 0.25)"
                        : "0 1px 4px rgba(15, 23, 42, 0.06)",
                      border: isUser ? "none" : "1px solid #E2E8F0",
                      wordBreak: "break-word",
                    }}
                  >
                    {isUser ? (
                      msg.text
                    ) : (
                      <div>
                        {lines.map((line, idx) => {
                          const kvMatch = line.match(/^([A-Za-z\s]+):\s*(.+)$/);
                          const isCopyable =
                            kvMatch &&
                            [
                              "name",
                              "register number",
                              "roll number",
                              "college email",
                              "email",
                              "phone",
                              "department",
                              "meeting link",
                            ].includes(kvMatch[1].trim().toLowerCase());

                          if (isCopyable) {
                            const fieldLabel = kvMatch[1].trim();
                            const fieldValue = kvMatch[2].trim();
                            const copyKey = `${msg.id}_${idx}`;
                            const isCopied = copiedField === copyKey;

                            return (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                  background: "#F8FAFC",
                                  border: "1px solid #E2E8F0",
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  margin: "4px 0",
                                  fontSize: "12px",
                                }}
                              >
                                <span>
                                  <strong style={{ color: "#475569" }}>{fieldLabel}:</strong>{" "}
                                  <span style={{ color: "#0F172A", fontWeight: 600 }}>{fieldValue}</span>
                                </span>
                                <button
                                  onClick={() => copyToClipboard(fieldValue, copyKey)}
                                  title={`Copy ${fieldLabel}`}
                                  style={{
                                    border: "none",
                                    background: isCopied ? "#DCFCE7" : "#E2E8F0",
                                    color: isCopied ? "#15803D" : "#475569",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    flexShrink: 0,
                                  }}
                                >
                                  {isCopied ? <Check size={10} /> : <Copy size={10} />}
                                  {isCopied ? "Copied" : "Copy"}
                                </button>
                              </div>
                            );
                          }

                          return (
                            <p key={idx} style={{ margin: "2px 0" }}>
                              {line.startsWith("**") && line.endsWith("**") ? (
                                <strong style={{ color: "#1E293B" }}>{line.replace(/\*\*/g, "")}</strong>
                              ) : (
                                line
                              )}
                            </p>
                          );
                        })}

                        {/* Staff / Developer Excel Export button if tabular data present */}
                        {isStaffOrMaster && msg.exportData && msg.exportData.length > 0 && (
                          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #CBD5E1" }}>
                            <button
                              onClick={() => handleExportExcel(msg.exportData!, "MentorMesh_Report")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#10B981",
                                color: "#FFFFFF",
                                border: "none",
                                borderRadius: "8px",
                                padding: "6px 12px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              <FileSpreadsheet size={13} />
                              Download as Excel (.xlsx)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: "10px", color: "#94A3B8", marginTop: "3px", paddingInline: "4px" }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" · "}expires in {hoursLeft}h
                  </span>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <MentorMeshRobot size={20} expression="thinking" />
                  <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Thinking...</span>
                  <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#2563EB",
                          animation: `mmAiBounce 1.2s ease infinite ${i * 0.2}s`,
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                  <style>{`
                    @keyframes mmAiBounce {
                      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                      30% { transform: translateY(-4px); opacity: 1; }
                    }
                  `}</style>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input Box ────────────────────────────────────────── */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexShrink: 0,
              background: "#FFFFFF",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isStaffOrMaster
                  ? "Ask about students, teams, events, meetings, or request export…"
                  : "Ask about your profile, teams, events, meetings…"
              }
              disabled={loading}
              style={{
                flex: 1,
                border: "1.5px solid #CBD5E1",
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "13px",
                outline: "none",
                background: "#F8FAFC",
                color: "#0F172A",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#2563EB";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#CBD5E1";
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                background:
                  !input.trim() || loading
                    ? "#E2E8F0"
                    : "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                border: "none",
                cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0,
                boxShadow: !input.trim() || loading ? "none" : "0 2px 6px rgba(37, 99, 235, 0.3)",
              }}
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 size={16} color="#94A3B8" className="animate-spin" />
              ) : (
                <Send size={16} color={!input.trim() ? "#94A3B8" : "#FFFFFF"} />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
