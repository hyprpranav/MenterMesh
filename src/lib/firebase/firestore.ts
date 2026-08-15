// ============================================================
// MentorMesh — Firestore Service Functions
// ============================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
  type DocumentSnapshot,
  type QuerySnapshot,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "./config";
import type { User, Team, Event, Post, Announcement, Notification, AccessRequest, ActivityLog } from "@/types";

// Helper to safely extract milliseconds from Firestore Timestamp object, Date string, or number
function getTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && typeof val.seconds === "number") return val.seconds * 1000;
  if (typeof val === "string") return new Date(val).getTime() || 0;
  return 0;
}

// ─── Users ───────────────────────────────────────────────────
export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getAllUsers(roleFilter?: string): Promise<User[]> {
  try {
    let snap;
    if (roleFilter) {
      snap = await getDocs(query(collection(db, "users"), where("role", "==", roleFilter)));
    } else {
      snap = await getDocs(collection(db, "users"));
    }
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
    return users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } catch (err) {
    console.error("getAllUsers error:", err);
    return [];
  }
}

export async function getActiveStudents(): Promise<User[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "student"))
    );
    const users = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() } as User))
      .filter((u) => u.status === "active" || u.status === "imported");
    return users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } catch (err) {
    console.error("getActiveStudents error:", err);
    return [];
  }
}

export async function getStudentByRegisterNumber(regNo: string): Promise<User | null> {
  if (!regNo) return null;
  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("registerNumber", "==", regNo.trim().toUpperCase()))
    );
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { uid: docSnap.id, ...docSnap.data() } as User;
  } catch (err) {
    console.error("getStudentByRegisterNumber error:", err);
    return null;
  }
}

export async function enrichStudentProfile(uid: string, data: Partial<User>): Promise<void> {
  const cleanData: Record<string, any> = {};
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      cleanData[key] = val;
    }
  });
  cleanData.updatedAt = serverTimestamp();
  await updateDoc(doc(db, "users", uid), cleanData);
}

export function subscribeToUser(uid: string, callback: (user: User | null) => void) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ uid: snap.id, ...snap.data() } as User);
  });
}

// ─── Access Requests ─────────────────────────────────────────
export async function getAccessRequests(status?: string): Promise<AccessRequest[]> {
  try {
    let snap;
    if (status) {
      snap = await getDocs(query(collection(db, "accessRequests"), where("status", "==", status)));
    } else {
      snap = await getDocs(collection(db, "accessRequests"));
    }
    const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessRequest));
    return reqs.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
  } catch (err) {
    console.error("getAccessRequests error:", err);
    return [];
  }
}

export async function getAccessRequest(uid: string): Promise<AccessRequest | null> {
  const snap = await getDoc(doc(db, "accessRequests", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AccessRequest;
}

export async function approveRequest(
  requestId: string,
  reviewerId: string,
  reviewerName: string
): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.update(doc(db, "accessRequests", requestId), {
    status: "approved",
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: now,
  });

  batch.update(doc(db, "users", requestId), {
    status: "active",
    updatedAt: now,
  });

  // Send notification to student
  batch.set(doc(db, "notifications", `approval_${requestId}`), {
    recipientId: requestId,
    title: "Access Approved! 🎉",
    message: `Your account has been approved by ${reviewerName}. Welcome to MentorMesh!`,
    type: "approval",
    read: false,
    priority: "high",
    createdAt: now,
  });

  await batch.commit();
}

export async function rejectRequest(
  requestId: string,
  reviewerId: string,
  reviewerName: string,
  reason: string
): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.update(doc(db, "accessRequests", requestId), {
    status: "rejected",
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: now,
    rejectionReason: reason,
  });

  batch.update(doc(db, "users", requestId), {
    status: "rejected",
    updatedAt: now,
  });

  batch.set(doc(db, "notifications", `rejection_${requestId}`), {
    recipientId: requestId,
    title: "Access Request Update",
    message: `Your access request was not approved. Reason: ${reason}`,
    type: "rejection",
    read: false,
    priority: "high",
    createdAt: now,
  });

  await batch.commit();
}

// ─── Teams ───────────────────────────────────────────────────
export async function getTeams(statusFilter?: string): Promise<Team[]> {
  try {
    let snap;
    if (statusFilter) {
      snap = await getDocs(query(collection(db, "teams"), where("status", "==", statusFilter)));
    } else {
      snap = await getDocs(collection(db, "teams"));
    }
    const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
    return teams.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
  } catch (err) {
    console.error("getTeams error:", err);
    return [];
  }
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, "teams", teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Team;
}

export async function createTeam(data: Omit<Team, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, "teams"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTeam(teamId: string, data: Partial<Team>): Promise<void> {
  await updateDoc(doc(db, "teams", teamId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function finalizeTeam(teamId: string): Promise<void> {
  await updateDoc(doc(db, "teams", teamId), {
    status: "finalized",
    finalizedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  await updateDoc(doc(db, "teams", teamId), {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}

export async function getUserTeams(uid: string): Promise<Team[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "teams"), where("memberIds", "array-contains", uid))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
  } catch (err) {
    console.error("getUserTeams error:", err);
    return [];
  }
}

// ─── Events ──────────────────────────────────────────────────
export async function getEvents(): Promise<Event[]> {
  try {
    const snap = await getDocs(collection(db, "events"));
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
    return events.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  } catch (err) {
    console.error("getEvents error:", err);
    return [];
  }
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, "events", eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Event;
}

export async function createEvent(data: Omit<Event, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, "events"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(eventId: string, data: Partial<Event>): Promise<void> {
  await updateDoc(doc(db, "events", eventId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function reviewEventSubmission(
  eventId: string,
  reviewerId: string,
  reviewerName: string,
  status: "approved" | "changes_requested" | "rejected",
  feedback?: string
): Promise<void> {
  const eventRef = doc(db, "events", eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;

  const eventData = snap.data() as Event;
  const now = serverTimestamp();

  await updateDoc(eventRef, {
    submissionStatus: status,
    status: status === "approved" ? "completed" : eventData.status || "upcoming",
    reviewedBy: reviewerId,
    reviewedByName: reviewerName,
    reviewedAt: now,
    reviewFeedback: feedback || undefined,
    updatedAt: now,
  });

  // Notify student
  if (eventData.submittedBy) {
    const title = status === "approved"
      ? `Event Approved! 🎉 (${eventData.name})`
      : status === "changes_requested"
      ? `Changes Requested for ${eventData.name}`
      : `Event Submission Update (${eventData.name})`;

    const message = status === "approved"
      ? `Your event "${eventData.name}" has been approved by ${reviewerName}.`
      : status === "changes_requested"
      ? `Mentor ${reviewerName} requested changes: ${feedback}`
      : `Your event submission for "${eventData.name}" was rejected. Reason: ${feedback}`;

    await addDoc(collection(db, "notifications"), {
      recipientId: eventData.submittedBy,
      title,
      message,
      type: "event",
      read: false,
      priority: status === "approved" ? "normal" : "high",
      link: `/events/${eventId}`,
      createdAt: now,
    });
  }
}

export async function getStudentEvents(uid: string): Promise<Event[]> {
  try {
    const snap = await getDocs(collection(db, "events"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
    return list.filter((e) => e.submittedBy === uid || e.participantIds?.includes(uid) || e.createdBy === uid);
  } catch (err) {
    console.error("getStudentEvents error:", err);
    return [];
  }
}

export async function getPendingEvents(): Promise<Event[]> {
  try {
    const snap = await getDocs(collection(db, "events"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
    return list.filter((e) => e.submissionStatus === "pending_review");
  } catch (err) {
    console.error("getPendingEvents error:", err);
    return [];
  }
}


// ─── Posts ───────────────────────────────────────────────────
export async function getPosts(limitCount = 20): Promise<Post[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "posts"), where("status", "==", "published"))
    );
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
    posts.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
    return posts.slice(0, limitCount);
  } catch (err) {
    console.error("getPosts error:", err);
    return [];
  }
}

export async function createPost(data: Omit<Post, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, "posts"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deletePost(postId: string): Promise<void> {
  await updateDoc(doc(db, "posts", postId), {
    status: "removed",
    updatedAt: serverTimestamp(),
  });
}

// ─── Announcements ───────────────────────────────────────────
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const snap = await getDocs(collection(db, "announcements"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
    list.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
    return list.slice(0, 50);
  } catch (err) {
    console.error("getAnnouncements error:", err);
    return [];
  }
}

export async function createAnnouncement(data: Omit<Announcement, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "announcements"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Notifications ───────────────────────────────────────────
export async function getUserNotifications(uid: string): Promise<Notification[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "notifications"), where("recipientId", "==", uid))
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    list.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
    return list.slice(0, 50);
  } catch (err) {
    console.error("getUserNotifications error:", err);
    return [];
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notifId), { read: true });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("recipientId", "==", uid),
      where("read", "==", false)
    )
  );
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export function subscribeToNotifications(
  uid: string,
  callback: (notifs: Notification[]) => void
) {
  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("recipientId", "==", uid)
    ),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Notification))
        .filter((n) => !n.read);
      list.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
      callback(list.slice(0, 10));
    },
    (err) => {
      console.error("subscribeToNotifications error:", err);
      callback([]);
    }
  );
}

// ─── Activity Logs ───────────────────────────────────────────
export async function logActivity(data: Omit<ActivityLog, "id" | "createdAt">): Promise<void> {
  await addDoc(collection(db, "activityLogs"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getActivityLogs(limitCount = 50): Promise<ActivityLog[]> {
  try {
    const snap = await getDocs(collection(db, "activityLogs"));
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
    logs.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
    return logs.slice(0, limitCount);
  } catch (err) {
    console.error("getActivityLogs error:", err);
    return [];
  }
}


// ─── Settings ────────────────────────────────────────────────
export async function getSettings() {
  const snap = await getDoc(doc(db, "settings", "app"));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function updateSettings(data: Record<string, unknown>): Promise<void> {
  await setDoc(doc(db, "settings", "app"), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
