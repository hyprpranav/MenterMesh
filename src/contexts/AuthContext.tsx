"use client";

// ============================================================
// MentorMesh — Authentication Context
// ============================================================
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, getDocFromCache, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { User, UserRole } from "@/types";

// ─── Context Shape ───────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface SignUpData {
  name: string;
  email: string;
  password: string;
  registerNumber: string;
  rollNumber?: string;
  department: string;
  year: string;
  section: string;
  phone: string;
  message?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Auth Provider ───────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Firestore user document (checks cache first for instant load)
  const fetchUserDoc = async (fbUser: FirebaseUser): Promise<User | null> => {
    const ref = doc(db, "users", fbUser.uid);
    try {
      // Fast path: Try reading from local cache
      const cachedSnap = await getDocFromCache(ref);
      if (cachedSnap.exists()) {
        const cachedData = { uid: cachedSnap.id, ...cachedSnap.data() } as User;
        // Asynchronously update in background
        getDoc(ref).then((freshSnap) => {
          if (freshSnap.exists()) {
            setUser({ uid: freshSnap.id, ...freshSnap.data() } as User);
          }
        }).catch(() => {});
        return cachedData;
      }
    } catch {
      // Cache miss — fetch from server
    }
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as User;
  };

  // Refresh user document from Firestore
  const refreshUser = async () => {
    if (!firebaseUser) return;
    const userData = await fetchUserDoc(firebaseUser);
    setUser(userData);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userData = await fetchUserDoc(fbUser);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ─── Sign In ─────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will update user state
  };

  // ─── Sign Up (Registration Request) ──────────────────────
  const signUp = async (data: SignUpData) => {
    const { name, email, password, registerNumber, rollNumber, department, year, section, phone, message } = data;

    // Create Firebase Auth account
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const now = new Date().toISOString();

    // Create user document with "pending" status
    const userDoc: Omit<User, "uid"> = {
      name,
      email,
      role: "student",
      status: "pending",
      department,
      year,
      section,
      registerNumber,
      rollNumber: rollNumber || "",
      phone,
      skills: [],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, "users", cred.user.uid), {
      ...userDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create access request document
    await setDoc(doc(db, "accessRequests", cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      registerNumber,
      rollNumber: rollNumber || "",
      department,
      year,
      section,
      phone,
      message: message || "",
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Create system notification for staff/master
    await setDoc(doc(db, "systemNotifications", `req_${cred.user.uid}`), {
      type: "new_request",
      title: "New Access Request",
      message: `${name} (${registerNumber}) has requested access.`,
      requestId: cred.user.uid,
      targetAudience: "staff",
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  // ─── Log Out ─────────────────────────────────────────────
  const logOut = async () => {
    await signOut(auth);
  };

  // ─── Password Reset ───────────────────────────────────────
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signIn, signUp, logOut, resetPassword, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export type { SignUpData };
