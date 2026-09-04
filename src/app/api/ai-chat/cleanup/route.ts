// src/app/api/ai-chat/cleanup/route.ts
// ============================================================
// Purges AI chat messages older than 24 hours (per-message TTL)
// GET /api/ai-chat/cleanup  (protected with CLEANUP_SECRET)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function ensureAdminInit() {
    if (!getApps().length) {
        const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
        const privateKey = rawKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (clientEmail && privateKey && privateKey.includes("BEGIN PRIVATE KEY")) {
            initializeApp({ credential: cert({ projectId: projectId!, clientEmail, privateKey }) });
        } else {
            initializeApp({ projectId: projectId! });
        }
    }
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const cleanupSecret = process.env.CLEANUP_SECRET || "mm-cleanup-secret";

    if (authHeader !== `Bearer ${cleanupSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    ensureAdminInit();
    const db = getFirestore();

    try {
        const now = Date.now();
        const usersRefs = await db.collection("aiChats").listDocuments();
        let totalDeleted = 0;

        for (const userRef of usersRefs) {
            const messagesSnap = await userRef.collection("messages")
                .where("expiresAt", "<=", now)
                .get();

            if (!messagesSnap.empty) {
                const batch = db.batch();
                messagesSnap.docs.forEach((d) => batch.delete(d.ref));
                await batch.commit();
                totalDeleted += messagesSnap.docs.length;
            }
        }

        return NextResponse.json({
            success: true,
            deleted: totalDeleted,
            timestamp: new Date().toISOString(),
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Cleanup error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
