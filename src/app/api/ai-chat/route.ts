// src/app/api/ai-chat/route.ts
// ============================================================
// MentorMesh — Secure AI Chat API Route (Server-Side)
// Role-aware, Fuzzy Database Search, 24h Conversational Context
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

// ── Levenshtein Distance for fuzzy matching ────────────────────
function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const d: number[][] = [];
    for (let i = 0; i <= m; i++) d[i] = [i];
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
                d[i - 1][j - 1] + cost
            );
        }
    }
    return d[m][n];
}

function norm(s: string) {
    return (s || "").toLowerCase().trim();
}

function isStaffOrMaster(role: string) {
    return role === "staff" || role === "master";
}

function tokenize(s: string) {
    const skipWords = new Set([
        "student", "staff", "mentor", "details", "of", "about", "find", "search",
        "show", "who", "is", "the", "get", "for", "a", "an", "what", "can", "you",
        "tell", "me", "hi", "hello", "hey", "i", "need", "some", "my", "give",
        "create", "make", "draft", "write", "meeting", "event", "team", "his", "her",
        "their", "profile", "information", "info"
    ]);
    return s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !skipWords.has(w));
}

// ── Sanitize user fields based on role ─────────────────────────
function sanitizeUser(u: Record<string, any>, requestingRole: string) {
    const base = {
        uid: u.uid,
        name: u.name || "",
        role: u.role || "student",
        gender: u.gender || "",
        department: u.department || "",
        year: u.year || "",
        section: u.section || "",
        registerNumber: u.registerNumber || "",
        rollNumber: u.rollNumber || "",
        email: u.email || "",
        personalEmail: u.personalEmail || "",
        phone: u.phone || "",
        parentPhoneNumber: requestingRole === "master" || requestingRole === "staff" ? u.parentPhoneNumber || "" : undefined,
        bloodGroup: u.bloodGroup || "",
        dateOfBirth: u.dateOfBirth || "",
        address: requestingRole === "master" || requestingRole === "staff" ? u.address || "" : undefined,
        github: u.github || "",
        linkedIn: u.linkedIn || "",
        portfolio: u.portfolio || "",
        bio: u.bio || "",
        skills: u.skills || [],
        status: u.status || "active",
    };

    // Sensitive field: Aadhaar number only for master
    if (requestingRole === "master") {
        return { ...base, aadhaarNumber: u.aadhaarNumber || "" };
    }
    return base;
}

// ── Secure Data Fetchers (server-side only) ───────────────────
async function getCurrentUser(uid: string) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return { uid: snap.id, ...snap.data() } as Record<string, any>;
}

async function searchStudents(queryStr: string, requestingUserRole: string) {
    const snap = await db.collection("users").get();
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Record<string, any>));
    const cleanQ = norm(queryStr);
    const tokens = tokenize(queryStr);

    if (!cleanQ && tokens.length === 0) return [];

    const matches: { user: Record<string, any>; score: number }[] = [];

    for (const u of users) {
        const reg = norm(u.registerNumber);
        const roll = norm(u.rollNumber);
        const name = norm(u.name);
        const email = norm(u.email);
        const dept = norm(u.department);

        let score = 0;

        // Exact register number match (high priority)
        if (reg && cleanQ.includes(reg)) score += 100;
        else if (reg && reg.includes(cleanQ) && cleanQ.length > 3) score += 80;

        // Exact roll number match
        if (roll && cleanQ.includes(roll)) score += 90;

        // Name match
        if (name && (name === cleanQ || name.includes(cleanQ) || cleanQ.includes(name))) {
            score += 80;
        } else if (name) {
            // Check fuzzy Levenshtein on words
            const nameParts = name.split(/\s+/);
            for (const token of tokens) {
                if (name.includes(token)) {
                    score += 40;
                } else {
                    for (const part of nameParts) {
                        const dist = levenshtein(token, part);
                        const maxLen = Math.max(token.length, part.length);
                        if (maxLen > 3 && dist <= 2) {
                            score += 30; // Minor typo match
                        }
                    }
                }
            }
        }

        // Email match
        if (email && (email.includes(cleanQ) || cleanQ.includes(email))) score += 70;

        // Department match
        if (tokens.some((t) => dept.includes(t))) score += 15;

        if (score > 0) {
            matches.push({ user: u, score });
        }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5).map((m) => sanitizeUser(m.user, requestingUserRole));
}

async function getStudentTeams(uid: string) {
    const snap = await db.collection("teams").where("memberIds", "array-contains", uid).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

async function getStudentEvents(uid: string) {
    const [bySubmitter, byParticipant] = await Promise.all([
        db.collection("events").where("submittedBy", "==", uid).get().catch(() => ({ docs: [] })),
        db.collection("events").where("participantIds", "array-contains", uid).get().catch(() => ({ docs: [] })),
    ]);
    const all = new Map<string, Record<string, any>>();
    [...bySubmitter.docs, ...byParticipant.docs].forEach((d) => {
        all.set(d.id, { id: d.id, ...d.data() });
    });
    return Array.from(all.values());
}

async function getStudentMeetings(uid: string) {
    const [manualBySubmitter, manualByAttendee, liveByHost, liveByParticipant] = await Promise.all([
        db.collection("meetings").where("submittedBy", "==", uid).get().catch(() => ({ docs: [] })),
        db.collection("meetings").where("attendeeIds", "array-contains", uid).get().catch(() => ({ docs: [] })),
        db.collection("scheduledMeetings").where("hostId", "==", uid).get().catch(() => ({ docs: [] })),
        db.collection("scheduledMeetings").where("participantIds", "array-contains", uid).get().catch(() => ({ docs: [] })),
    ]);
    const all = new Map<string, Record<string, any>>();
    [...manualBySubmitter.docs, ...manualByAttendee.docs, ...liveByHost.docs, ...liveByParticipant.docs].forEach((d) => {
        all.set(d.id, { id: d.id, ...d.data() });
    });
    return Array.from(all.values());
}

async function getAllTeams() {
    const snap = await db.collection("teams").limit(20).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

async function getAllEvents() {
    const snap = await db.collection("events").limit(20).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

async function getAllMeetings() {
    const [manualSnap, liveSnap] = await Promise.all([
        db.collection("meetings").limit(15).get().catch(() => ({ docs: [] })),
        db.collection("scheduledMeetings").limit(15).get().catch(() => ({ docs: [] })),
    ]);
    const list: Record<string, any>[] = [];
    manualSnap.docs.forEach((d) => list.push({ id: d.id, type: "manual", ...d.data() }));
    liveSnap.docs.forEach((d) => list.push({ id: d.id, type: "scheduled", ...d.data() }));
    return list;
}

async function getAnnouncements() {
    const snap = await db.collection("announcements").orderBy("createdAt", "desc").limit(8).get().catch(() => ({ docs: [] }));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
}

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

// ── Build Context ──────────────────────────────────────────────
async function buildContext(message: string, currentUser: Record<string, any>) {
    const role = currentUser.role as string;
    const uid = currentUser.uid as string;

    let context = "";
    const lowerMsg = message.toLowerCase();

    try {
        // Authenticated user profile context
        context += `\n[CURRENT AUTHENTICATED USER]\n${JSON.stringify(sanitizeUser(currentUser, role), null, 2)}\n`;

        const needsMyData =
            lowerMsg.includes(" my ") ||
            lowerMsg.startsWith("my ") ||
            lowerMsg.includes("who am i") ||
            lowerMsg.includes("what is my") ||
            lowerMsg.includes("show my") ||
            lowerMsg.includes("which events did i") ||
            lowerMsg.includes("which teams am i") ||
            lowerMsg.includes("which meetings did i");

        if (needsMyData || lowerMsg.includes("my team") || lowerMsg.includes("my event") || lowerMsg.includes("my meeting")) {
            const [myTeams, myEvents, myMeetings] = await Promise.all([
                getStudentTeams(uid),
                getStudentEvents(uid),
                getStudentMeetings(uid),
            ]);
            context += `\n[MY TEAMS]\n${JSON.stringify(myTeams.map((t) => ({ id: t.id, name: t.name, eventName: t.eventName, status: t.status, leaderName: t.leaderName, memberNames: t.memberNames })), null, 2)}\n`;
            context += `\n[MY EVENTS]\n${JSON.stringify(myEvents.map((e) => ({ id: e.id, name: e.name, type: e.type, date: e.date, status: e.submissionStatus, result: e.result })), null, 2)}\n`;
            context += `\n[MY MEETINGS]\n${JSON.stringify(myMeetings.map((m) => ({ id: m.id, title: m.title, mode: m.mode, date: m.date, status: m.status })), null, 2)}\n`;
        }

        // Fuzzy student search
        const studentMatches = await searchStudents(message, role);
        if (studentMatches.length > 0) {
            context += `\n[STUDENT SEARCH RESULTS (${studentMatches.length} found)]\n${JSON.stringify(studentMatches, null, 2)}\n`;

            if (studentMatches.length === 1) {
                const foundUid = studentMatches[0].uid;
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

        if (lowerMsg.includes("team") && !lowerMsg.includes("my team")) {
            const teams = await getAllTeams();
            context += `\n[ALL TEAMS]\n${JSON.stringify(teams.map((t) => ({ id: t.id, name: t.name, status: t.status, eventName: t.eventName, leaderName: t.leaderName, memberNames: t.memberNames })), null, 2)}\n`;
        }

        if (lowerMsg.includes("event") && !lowerMsg.includes("my event")) {
            const events = await getAllEvents();
            context += `\n[ALL EVENTS]\n${JSON.stringify(events.map((e) => ({ id: e.id, name: e.name, type: e.type, date: e.date, status: e.submissionStatus, participantNames: e.participantNames })), null, 2)}\n`;
        }

        if (lowerMsg.includes("meeting") && !lowerMsg.includes("my meeting")) {
            const meetings = await getAllMeetings();
            context += `\n[ALL MEETINGS]\n${JSON.stringify(meetings.map((m) => ({ id: m.id, title: m.title, mode: m.mode, date: m.date, status: m.status, type: m.type })), null, 2)}\n`;
        }

        if (lowerMsg.includes("announcement")) {
            const announcements = await getAnnouncements();
            context += `\n[ANNOUNCEMENTS]\n${JSON.stringify(announcements, null, 2)}\n`;
        }
    } catch (err) {
        console.error("AI Context build error:", err);
    }

    return context;
}

// ── POST Handler ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, uid, userRole, conversationHistory = [] } = body;

        if (!message || !uid || !userRole) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Role-based Export Restrictions
        if (!isStaffOrMaster(userRole) && isExportRequest(message)) {
            return NextResponse.json({
                reply: "Sorry, you don't have permission to download or export this data. Export features are available only for Staff and Administrator accounts.",
            });
        }

        // 2. Fetch authenticated user record
        const currentUser = await getCurrentUser(uid);
        if (!currentUser) {
            return NextResponse.json({ error: "Authenticated user record not found" }, { status: 403 });
        }

        // 3. Build verified database context
        const dbContext = await buildContext(message, currentUser);

        // 4. Staff/Master export preparation
        let exportData: Record<string, any>[] | undefined = undefined;
        if (isStaffOrMaster(userRole) && isExportRequest(message)) {
            const searchResults = await searchStudents(message, userRole);
            if (searchResults.length > 0) {
                exportData = searchResults.map((s) => ({
                    Name: s.name,
                    RegisterNumber: s.registerNumber,
                    Department: s.department,
                    Year: s.year,
                    Section: s.section,
                    Email: s.email,
                    Phone: s.phone,
                }));
            }
        }

        // 5. Gemini API Key Protocol Check
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "") {
            // Rule: When Gemini API key must be configured, stop and inform safely.
            return NextResponse.json({
                reply: `⚠️ **Gemini API Key Required**\n\nThe server cannot connect to Gemini because \`GEMINI_API_KEY\` is not configured in the environment variables.\n\nTo activate the AI assistant:\n1. Open Google AI Studio (https://aistudio.google.com/) and generate an API key.\n2. Add \`GEMINI_API_KEY=<your_key>\` to your \`.env.local\` file or Vercel Environment Variables.\n3. Restart the server.\n\n*(Your query was safely verified against the database, but AI generation requires the key).*`,
            });
        }

        // 6. Generative AI Execution
        const genAI = new GoogleGenerativeAI(apiKey);
        const historyText = (conversationHistory as { role: string; text: string }[])
            .map((m) => `${m.role === "user" ? currentUser.name : "MentorMesh AI"}: ${m.text}`)
            .join("\n");

        const systemPrompt = `You are the MentorMesh AI Assistant — an intelligent, professional, and secure assistant for the MentorMesh student management platform.

CURRENT USER:
- Name: ${currentUser.name}
- Register Number: ${currentUser.registerNumber || "N/A"}
- Role: ${userRole}
- UID: ${uid}

CRITICAL RULES:
1. NEVER invent or hallucinate database records. Only state facts that appear in the provided REAL DATABASE CONTEXT.
2. If requested information is not in the context, clearly state: "No matching information was found."
3. For all "my" queries ("who am I", "my profile", "my team", "which events did I participate in", "my meetings"), use the authenticated user's ID/register number (${currentUser.name}, Reg: ${currentUser.registerNumber}). Never guess or confuse with another student.
4. If multiple students match a query, list their names, register numbers, and departments, and ask the user to clarify.
5. If exactly one student is found, format their authorized profile cleanly with structured fields:
   Name: <name>
   Register Number: <reg>
   College Email: <email>
   Department: <dept>
   Year: <year>
   Section: <section>
   Events Participated: <events>
   Meetings Attended: <meetings>
6. Sensitive fields (like Aadhaar) are restricted to Master role only. Never reveal them to others.
7. If a student asks to download/export, politely refuse.
8. Be concise, respectful, and helpful.

REAL DATABASE CONTEXT:
${dbContext}

RECENT CONVERSATION HISTORY:
${historyText}

Now answer this query from ${currentUser.name}:`;

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
        const reply = result.response.text();

        return NextResponse.json({ reply, exportData });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("AI Chat API Error:", msg);
        return NextResponse.json({
            reply: "Sorry, I couldn't retrieve that information right now. Please try again in a moment.",
            error: msg,
        }, { status: 500 });
    }
}
