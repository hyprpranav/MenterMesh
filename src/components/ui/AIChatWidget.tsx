"use client";
// ============================================================
// MentorMesh — AI Chat Widget
// Database-aware, role-based, 24h TTL per message
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    collection, addDoc, getDocs, deleteDoc, doc,
    query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Bot, X, Send, Trash2, ChevronDown, Loader2, Sparkles, ShieldAlert, Clock } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    senderId: string;
    createdAt: number;
    expiresAt: number;
}

// 24 hours in ms
const TTL_MS = 24 * 60 * 60 * 1000;
const RETENTION_HOURS = 24;

// ── Markdown-lite renderer ─────────────────────────────────────
function renderText(text: string) {
    // Bold **text**
    let html = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Bullet lists — wrap each bullet in <li>
    html = html.replace(/^[-•]\s(.+)$/gm, "<li>$1</li>");
    // Consecutive <li> items — wrap in <ul> (no /s flag needed)
    html = html.replace(/(<li>[\w\W]*?<\/li>)+/g, "<ul>$&</ul>");
    // Line breaks
    html = html.split("\n").join("<br/>");
    return html;
}

// ── Main Component ─────────────────────────────────────────────
export function AIChatWidget() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const unsubRef = useRef<(() => void) | null>(null);

    const isStaff = user?.role === "staff" || user?.role === "master";

    // ── Load & subscribe to messages from Firestore ──────────────
    const subscribeToMessages = useCallback(() => {
        if (!user?.uid) return;
        const colRef = collection(db, "aiChats", user.uid, "messages");
        const q = query(colRef, orderBy("createdAt", "asc"));

        const unsub = onSnapshot(q, (snap) => {
            const now = Date.now();
            const msgs: ChatMessage[] = [];
            const expiredIds: string[] = [];

            snap.docs.forEach(d => {
                const data = d.data() as Omit<ChatMessage, "id">;
                if (data.expiresAt && data.expiresAt <= now) {
                    expiredIds.push(d.id);
                } else {
                    msgs.push({ id: d.id, ...data });
                }
            });

            // Auto-delete expired messages from Firestore
            expiredIds.forEach(id => {
                deleteDoc(doc(db, "aiChats", user.uid, "messages", id)).catch(() => { });
            });

            setMessages(msgs);
        });

        unsubRef.current = unsub;
        return unsub;
    }, [user?.uid]);

    useEffect(() => {
        if (open && user?.uid) {
            const unsub = subscribeToMessages();
            return () => { if (unsub) unsub(); };
        }
    }, [open, user?.uid, subscribeToMessages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (open) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
        }
    }, [messages, open]);

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    // ── Save message to Firestore with per-message TTL ───────────
    const saveMessage = async (role: "user" | "assistant", text: string) => {
        if (!user?.uid) return;
        const now = Date.now();
        await addDoc(collection(db, "aiChats", user.uid, "messages"), {
            role,
            text,
            senderId: user.uid,
            createdAt: now,
            expiresAt: now + TTL_MS,
        });
    };

    // ── Send message to AI API ────────────────────────────────────
    const handleSend = async () => {
        if (!input.trim() || loading || !user) return;
        const userText = input.trim();
        setInput("");
        setLoading(true);

        // Save user message
        await saveMessage("user", userText);

        try {
            // Build conversation history (last 10 visible messages)
            const history = messages.slice(-10).map(m => ({ role: m.role, text: m.text }));

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
            const reply = data.reply || data.error || "Sorry, something went wrong. Please try again.";

            // Save AI response
            await saveMessage("assistant", reply);
        } catch {
            await saveMessage("assistant", "I'm having trouble connecting right now. Please try again in a moment.");
        } finally {
            setLoading(false);
        }
    };

    // ── Clear ALL chat history ────────────────────────────────────
    const handleClearAll = async () => {
        if (!user?.uid || clearing) return;
        setClearing(true);
        try {
            const snap = await getDocs(collection(db, "aiChats", user.uid, "messages"));
            await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
            setMessages([]);
        } catch {
            console.error("Failed to clear chat");
        } finally {
            setClearing(false);
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setOpen(o => !o)}
                aria-label="Open AI Assistant"
                style={{
                    position: "fixed", bottom: "24px", right: "24px", zIndex: 9000,
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none", cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(99,102,241,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
                {open ? <X size={22} color="white" /> : <Sparkles size={22} color="white" />}
            </button>

            {/* Chat Panel */}
            {open && (
                <div
                    style={{
                        position: "fixed", bottom: "90px", right: "24px",
                        width: "min(380px, calc(100vw - 32px))",
                        height: "min(560px, calc(100vh - 110px))",
                        background: "white",
                        borderRadius: "20px",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.15)",
                        zIndex: 9001,
                        display: "flex", flexDirection: "column",
                        overflow: "hidden",
                        animation: "mmAiSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                >
                    <style>{`
            @keyframes mmAiSlideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

                    {/* Header */}
                    <div style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        padding: "14px 16px",
                        display: "flex", alignItems: "center", gap: "10px",
                        flexShrink: 0,
                    }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Bot size={20} color="white" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, color: "white", fontSize: "14px", margin: 0 }}>MentorMesh AI</p>
                            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px", margin: 0 }}>
                                {user.name} · {user.role}
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                            <button
                                onClick={handleClearAll}
                                title="Clear all chat"
                                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                            >
                                {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Retention notice */}
                    <div style={{
                        background: "#FFF7ED", borderBottom: "1px solid #FED7AA",
                        padding: "8px 14px",
                        display: "flex", alignItems: "center", gap: "6px",
                        flexShrink: 0,
                    }}>
                        <Clock size={12} color="#C2410C" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: "11px", color: "#9A3412", margin: 0, lineHeight: 1.4 }}>
                            AI chat is temporary. Messages are auto-deleted after {RETENTION_HOURS} hours.
                        </p>
                    </div>

                    {/* Role notice for students */}
                    {!isStaff && (
                        <div style={{
                            background: "#EFF6FF", borderBottom: "1px solid #BFDBFE",
                            padding: "7px 14px",
                            display: "flex", alignItems: "center", gap: "6px",
                            flexShrink: 0,
                        }}>
                            <ShieldAlert size={12} color="#1D4ED8" style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: "11px", color: "#1E40AF", margin: 0 }}>
                                Data exports are restricted to Staff only.
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {messages.length === 0 && !loading && (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#94A3B8", textAlign: "center", padding: "20px" }}>
                                <Bot size={36} color="#C4B5FD" />
                                <p style={{ fontWeight: 600, fontSize: "14px", color: "#6366F1", margin: 0 }}>Hello, {user.name.split(" ")[0]}!</p>
                                <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0 }}>
                                    Ask me anything about your profile, teams, events, or meetings.
                                    {isStaff && " I can also search student records and generate data summaries."}
                                </p>
                            </div>
                        )}

                        {messages.map(msg => {
                            const isUser = msg.role === "user";
                            const expiresIn = msg.expiresAt - Date.now();
                            const hoursLeft = Math.max(0, Math.round(expiresIn / (1000 * 60 * 60)));
                            return (
                                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                                    <div style={{
                                        maxWidth: "88%",
                                        padding: "10px 13px",
                                        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                                        background: isUser
                                            ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                                            : "#F1F5F9",
                                        color: isUser ? "white" : "#1E293B",
                                        fontSize: "13px",
                                        lineHeight: 1.55,
                                        boxShadow: isUser ? "0 2px 8px rgba(99,102,241,0.25)" : "0 1px 3px rgba(0,0,0,0.06)",
                                    }}>
                                        {isUser ? msg.text : (
                                            <span dangerouslySetInnerHTML={{ __html: renderText(msg.text) }} />
                                        )}
                                    </div>
                                    <span style={{ fontSize: "10px", color: "#CBD5E1", marginTop: "3px", paddingInline: "4px" }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        {" · "}expires in {hoursLeft}h
                                    </span>
                                </div>
                            );
                        })}

                        {loading && (
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                <div style={{ background: "#F1F5F9", borderRadius: "4px 18px 18px 18px", padding: "12px 16px", display: "flex", gap: "4px", alignItems: "center" }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} style={{
                                            width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6",
                                            animation: `mmBounce 1.2s ease infinite ${i * 0.2}s`,
                                            display: "inline-block",
                                        }} />
                                    ))}
                                    <style>{`
                    @keyframes mmBounce {
                      0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
                      30% { transform: translateY(-5px); opacity: 1; }
                    }
                  `}</style>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: "10px 12px",
                        borderTop: "1px solid #F1F5F9",
                        display: "flex", gap: "8px", alignItems: "center",
                        flexShrink: 0, background: "white",
                    }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={isStaff ? "Ask anything about students, teams, events…" : "Ask about your profile, teams, events…"}
                            disabled={loading}
                            style={{
                                flex: 1, border: "1.5px solid #E2E8F0", borderRadius: "12px",
                                padding: "10px 14px", fontSize: "13px", outline: "none",
                                background: "#F8FAFC", color: "#1E293B",
                                transition: "border-color 0.15s",
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
                            onBlur={e => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            style={{
                                width: 40, height: 40, borderRadius: "12px",
                                background: !input.trim() || loading ? "#E2E8F0" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                border: "none", cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background 0.2s", flexShrink: 0,
                            }}
                        >
                            {loading
                                ? <Loader2 size={16} color={!input.trim() ? "#94A3B8" : "white"} style={{ animation: "spin 1s linear infinite" }} />
                                : <Send size={16} color={!input.trim() ? "#94A3B8" : "white"} />
                            }
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
