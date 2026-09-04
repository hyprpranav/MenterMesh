// src/app/api/ai-chat/route.ts
// ============================================================
// MentorMesh — Secure AI Chat API Route (Server-Side)
// Uses Gemini + Firebase Admin SDK for real database queries
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Firebase Admin Init ────────────────────────────────────────
if (!getApps().length) {
    const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
    const privateKey = rawKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (clientEmail && privateKey && privateKey.includes("BEGIN PRIVATE KEY")) {
        initializeApp({
            credential: cert({ projectId: projectId!, clientEmail, privateKey }),
        });
    } else {
        initializeApp({ projectId: projectId! });
    }
}

const db = getFirestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── Role helpers ───────────────────────────────────────────────
function isStaffOrMaster(role: string) {
    return role === "staff" || role === "master";
}

// ── Normalise string for fuzzy matching ───────────────────────
function norm(s: string) {
    return (s || "").toLowerCase().trim();
}

function tokenize(s: string) {
    const skipWords = new Set([
        "student", "staff", "mentor", "details", "of", "about", "find", "search",
        "show", "who", "is", "the", "get", "for", "a", "an", "what", "can", "you",
        "tell", "me", "hi", "hello", "hey", "i", "need", "some", "my", "give",
        "create", "make", "draft", "write", "meeting", "event", "team"
    ]);
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !skipWords.has(w));
}

// ── Secure Data Fetchers (server-side only) ───────────────────
async function getCurrentUser(uid: string) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return { uid: snap.id, ...snap.data() } as Record<string, any>;
}

async function searchStudents(query: string, requestingUserRole: string) {
    const snap = await db.collection("users").get();
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Record<string, any>));
    const tokens = tokenize(query);

    if (tokens.length === 0) return []; // No useful keywords to search

    const matches = users.filter((u) => {
        const searchableText = [
            u.name, u.registerNumber, u.rollNumber, u.email, u.department, u.section, u.role
        ].map(s => norm(s)).join(" ");

        return tokens.some((token) => searchableText.includes(token));
    });

    return matches.map((u) => sanitizeUser(u, requestingUserRole));
}

async function getStudentTeams(uid: string) {
    const snap = await db.collection("teams")
        .where("memberIds", "array-contains", uid).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

async function getStudentEvents(uid: string) {
    const [bySubmitter, byParticipant] = await Promise.all([
        db.collection("events").where("submittedBy", "==", uid).get(),
        db.collection("events").where("participantIds", "array-contains", uid).get(),
    ]);
    const all = new Map<string, Record<string, any>>();
    [...bySubmitter.docs, ...byParticipant.docs].forEach((d) => {
        all.set(d.id, { id: d.id, ...d.data() });
    });
    return Array.from(all.values());
}

async function getStudentMeetings(uid: string) {
    const [bySubmitter, byAttendee] = await Promise.all([
        db.collection("meetings").where("submittedBy", "==", uid).get(),
        db.collection("meetings").where("attendeeIds", "array-contains", uid).get(),
    ]);
    const all = new Map<string, Record<string, any>>();
    [...bySubmitter.docs, ...byAttendee.docs].forEach((d) => {
        all.set(d.id, { id: d.id, ...d.data() });
    });
    return Array.from(all.values());
}

async function getAllTeams() {
    const snap = await db.collection("teams").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

async function getAllEvents() {
    const snap = await db.collection("events").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

async function getAllMeetings() {
    const snap = await db.collection("meetings").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

async function getAnnouncements() {
    const snap = await db.collection("announcements").orderBy("createdAt", "desc").limit(10).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

// ── Sanitize user fields based on role ───────────────────────
function sanitizeUser(u: Record<string, any>, requestingRole: string) {
    const base = {
        uid: u.uid,
        name: u.name || "",
        role: u.role || "",
        gender: u.gender || "",
        department: u.department || "",
        year: u.year || "",
        section: u.section || "",
        registerNumber: u.registerNumber || "",
        rollNumber: u.rollNumber || "",
        email: u.email || "",
        personalEmail: u.personalEmail || "",
        alternateEmail: u.alternateEmail || "",
        phone: u.phone || "",
        parentPhoneNumber: u.parentPhoneNumber || "",
        bloodGroup: u.bloodGroup || "",
        dateOfBirth: u.dateOfBirth || "",
        address: u.address || "",
        github: u.github || "",
        linkedIn: u.linkedIn || "",
        portfolio: u.portfolio || "",
        bio: u.bio || "",
        skills: u.skills || [],
        status: u.status || "",
    };

    // Aadhaar only visible to master
    if (requestingRole === "master") {
        return { ...base, aadhaarNumber: u.aadhaarNumber || "" };
    }
    return base;
}

// ── Detect if query is asking for export/download ─────────────
function isExportRequest(text: string) {
    const lower = text.toLowerCase();
    return (
        lower.includes("download") ||
        lower.includes("export") ||
        lower.includes("excel") ||
        lower.includes("csv") ||
        lower.includes("spreadsheet") ||
        lower.includes("generate file") ||
        lower.includes("create file")
    );
}

// ── Build context for Gemini ───────────────────────────────────
async function buildContext(
    message: string,
    currentUser: Record<string, any>,
) {
    const role = currentUser.role as string;
    const uid = currentUser.uid as string;

    let context = "";
    const lowerMsg = message.toLowerCase();

    try {
        // Always include current user info
        context += `\n[CURRENT USER]\n${JSON.stringify(sanitizeUser(currentUser, role), null, 2)}\n`;

        const needsMyData =
            lowerMsg.includes(" my ") || lowerMsg.includes(" i ") ||
            lowerMsg.startsWith("my ") || lowerMsg.startsWith("what am ") ||
            lowerMsg.startsWith("show my") || lowerMsg.startsWith("which events") ||
            lowerMsg.startsWith("which teams") || lowerMsg.startsWith("which meetings") ||
            lowerMsg.startsWith("what events") || lowerMsg.startsWith("what teams");

        const needsAllStudents = isStaffOrMaster(role) && (
            lowerMsg.includes("all student") || lowerMsg.includes("student list") ||
            lowerMsg.includes("how many student") || lowerMsg.includes("total student")
        );

        const searchMatch = message.match(/(?:find|search|show|tell me about|details of|profile of|who is)\s+(.+)/i);

        if (needsMyData || lowerMsg.includes("my team") || lowerMsg.includes("my event") || lowerMsg.includes("my meeting")) {
            const [myTeams, myEvents, myMeetings] = await Promise.all([
                getStudentTeams(uid),
                getStudentEvents(uid),
                getStudentMeetings(uid),
            ]);
            context += `\n[MY TEAMS]\n${JSON.stringify(myTeams.map((t) => ({ id: t.id, name: t.name, eventName: t.eventName, status: t.status, leaderName: t.leaderName, memberNames: t.memberNames })), null, 2)}\n`;
            context += `\n[MY EVENTS]\n${JSON.stringify(myEvents.map((e) => ({ id: e.id, name: e.name, type: e.type, date: e.date, status: e.submissionStatus })), null, 2)}\n`;
            context += `\n[MY MEETINGS]\n${JSON.stringify(myMeetings.map((m) => ({ id: m.id, title: m.title, mode: m.mode, date: m.date, status: m.status })), null, 2)}\n`;
        }

        // Always do a general fuzzy search on the message for any matching students
        const results = await searchStudents(message, role);
        if (results.length > 0) {
            context += `\n[STUDENT SEARCH RESULTS]\n${JSON.stringify(results, null, 2)}\n`;

            if (results.length === 1) {
                const foundUid = results[0].uid;
                const [foundTeams, foundEvents, foundMeetings] = await Promise.all([
                    getStudentTeams(foundUid),
                    getStudentEvents(foundUid),
                    getStudentMeetings(foundUid),
                ]);
                context += `\n[FOUND STUDENT TEAMS]\n${JSON.stringify(foundTeams, null, 2)}\n`;
                context += `\n[FOUND STUDENT EVENTS]\n${JSON.stringify(foundEvents, null, 2)}\n`;
                context += `\n[FOUND STUDENT MEETINGS]\n${JSON.stringify(foundMeetings, null, 2)}\n`;
            }
        }

        if (needsAllStudents) {
            const snap = await db.collection("users").get();
            const users = snap.docs.map((d) => sanitizeUser({ uid: d.id, ...d.data() }, role));
            context += `\n[ALL USERS (${users.length} total)]\n${JSON.stringify(users, null, 2)}\n`;
        }

        if (lowerMsg.includes("team") && !lowerMsg.includes("my team")) {
            const teams = await getAllTeams();
            context += `\n[ALL TEAMS]\n${JSON.stringify(teams.map((t) => ({ id: t.id, name: t.name, status: t.status, eventName: t.eventName, leaderName: t.leaderName, memberNames: t.memberNames, memberIds: t.memberIds })), null, 2)}\n`;
        }

        if (lowerMsg.includes("event") && !lowerMsg.includes("my event")) {
            const events = await getAllEvents();
            context += `\n[ALL EVENTS]\n${JSON.stringify(events.map((e) => ({ id: e.id, name: e.name, type: e.type, date: e.date, status: e.submissionStatus, participantIds: e.participantIds, participantNames: e.participantNames })), null, 2)}\n`;
        }

        if (lowerMsg.includes("meeting") && !lowerMsg.includes("my meeting")) {
            const meetings = await getAllMeetings();
            context += `\n[ALL MEETINGS]\n${JSON.stringify(meetings.map((m) => ({ id: m.id, title: m.title, mode: m.mode, date: m.date, status: m.status, attendeeNames: m.attendeeNames, attendeeCount: m.attendeeCount })), null, 2)}\n`;
        }

        if (lowerMsg.includes("announcement")) {
            const announcements = await getAnnouncements();
            context += `\n[RECENT ANNOUNCEMENTS]\n${JSON.stringify(announcements, null, 2)}\n`;
        }
    } catch (err) {
        console.error("Context build error:", err);
    }

    return context;
}

// ── POST handler ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, uid, userRole, conversationHistory = [] } = body;

        if (!message || !uid || !userRole) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
            return NextResponse.json({
                reply: "⚠️ The AI assistant is not yet configured. Please ask the administrator to add the GEMINI_API_KEY to the server environment variables.",
            });
        }

        // Block export requests from students
        if (!isStaffOrMaster(userRole) && isExportRequest(message)) {
            return NextResponse.json({
                reply: "Sorry, you don't have permission to download or export this data. Export features are available only for Staff and Administrator accounts.",
            });
        }

        // Fetch real database context
        const currentUser = await getCurrentUser(uid);
        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 403 });
        }

        const dbContext = await buildContext(message, currentUser);

        const historyText = (conversationHistory as { role: string; text: string }[])
            .map((m) => `${m.role === "user" ? currentUser.name : "AI"}: ${m.text}`)
            .join("\n");

        const systemPrompt = `You are the MentorMesh AI Assistant — an intelligent, database-aware assistant for the MentorMesh student management platform.

ROLE & PERMISSIONS:
- Currently authenticated user: ${currentUser.name} (UID: ${uid}, Role: ${userRole})
- Staff/Master can request exports. Students CANNOT request exports or downloads.
- Never fabricate database information. If data is not in the context, clearly say it was not found.
- Be concise, structured, and professional. Use markdown for structure.

CAPABILITIES:
- Answer questions about the current user's profile, teams, events, and meetings.
- Search for students, teams, events, and meetings by name, register number, etc.
- Understand follow-up questions using conversation history.
- Fuzzy match student names (e.g. "Harish Pranv" should match "Harish Pranav S.").
- Draft content (e.g., meeting notes, event descriptions) if the user provides keywords or prompts.

RESTRICTIONS:
- Never expose Firebase credentials, API keys, or security rules.
- Never invent data not present in the context.
- If a student asks to download/export, politely deny.
- Aadhaar numbers are only visible to Master role.

REAL DATABASE CONTEXT:
${dbContext}

CONVERSATION HISTORY:
${historyText}

Now answer this message from ${currentUser.name}:`;

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
        const reply = result.response.text();

        return NextResponse.json({ reply });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("AI Chat API Error:", msg);
        return NextResponse.json(
            { error: "AI service error", details: msg },
            { status: 500 }
        );
    }
}
