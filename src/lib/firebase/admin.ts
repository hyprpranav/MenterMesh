import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

export const adminDb = getFirestore();
