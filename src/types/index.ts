// ============================================================
// MentorMesh — TypeScript Types / Data Model
// ============================================================

// ─── User Roles ─────────────────────────────────────────────
export type UserRole = "student" | "staff" | "master";
export type UserStatus = "pending" | "active" | "rejected" | "inactive" | "imported";

// ─── Core User ──────────────────────────────────────────────
export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profilePhoto?: string;
  department?: string;
  year?: string;       // "I" | "II" | "III" | "IV"
  section?: string;
  registerNumber?: string;
  rollNumber?: string;
  phone?: string;
  parentPhoneNumber?: string;  // Parent/Guardian phone number
  dateOfBirth?: string;
  personalEmail?: string;
  alternateEmail?: string;
  collegeEmail?: string;
  bloodGroup?: string;
  address?: string;
  aadhaarNumber?: string;
  github?: string;
  portfolio?: string;
  profileLinks?: string[];
  skills?: string[];
  bio?: string;
  linkedIn?: string;
  createdAt: string;   // ISO timestamp
  updatedAt: string;
}

// ─── Public Profile (what other students see) ───────────────
export interface PublicProfile {
  uid: string;
  name: string;
  profilePhoto?: string;
  department?: string;
  year?: string;
  section?: string;
  registerNumber?: string;
  rollNumber?: string;
  collegeEmail?: string;
  skills?: string[];
  bio?: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
}

// ─── Access Request ─────────────────────────────────────────
export type RequestStatus = "pending" | "approved" | "rejected";

export interface AccessRequest {
  id: string;
  uid: string;
  name: string;
  email: string;
  registerNumber: string;
  rollNumber?: string;
  department: string;
  year: string;
  section: string;
  phone: string;
  message?: string;
  status: RequestStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

// ─── Request Message (approval conversation) ────────────────
export interface RequestMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
}

// ─── Team ───────────────────────────────────────────────────
export type TeamStatus = "draft" | "pending_approval" | "approved" | "active" | "finalized" | "rejected" | "archived";

export interface Team {
  id: string;
  name: string;
  leaderId?: string;
  leaderName?: string;
  memberIds: string[];
  memberNames?: string[];
  eventId?: string;
  eventName?: string;
  eventType?: string;
  track?: string;
  status: TeamStatus;
  description?: string;
  driveLink?: string;
  linkedInPost?: string;
  result?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewFeedback?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}

// ─── Event ──────────────────────────────────────────────────
export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type EventSubmissionStatus = "draft" | "pending_review" | "changes_requested" | "approved" | "rejected";

export interface Event {
  id: string;
  name: string;
  type: string;
  date: string;        // ISO date string
  endDate?: string;
  location?: string;
  venue?: string;
  city?: string;
  state?: string;
  organizer?: string;
  theme?: string;
  description?: string;
  status: EventStatus;
  submissionStatus?: EventSubmissionStatus;
  submittedBy?: string;
  submittedByName?: string;
  submittedByPhoto?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewFeedback?: string;
  teamId?: string;
  teamName?: string;
  teamIds?: string[];
  participantIds?: string[];
  participantNames?: string[];
  roleInEvent?: string;
  eventTrack?: string;
  projectTitle?: string;
  whatBuilt?: string;
  whatLearned?: string;
  challenges?: string;
  driveLink?: string;
  photosLink?: string;
  documentsLink?: string;
  certificatesLink?: string; // Legacy
  certificateFile?: string; // New Cloudinary uploaded file
  geotagPhotos?: string[]; // New Cloudinary geotagged multiple photos (Max 5)
  linkedInPost?: string;
  githubUrl?: string;
  liveUrl?: string;
  result?: string;     // Winner / 1st Runner Up / Finalist / Participant
  cloudinaryFolder?: string;
  coverImage?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}


// ─── Post / Achievement ─────────────────────────────────────
export type PostType = "achievement" | "announcement" | "event-update" | "project" | "general";

export interface Post {
  id: string;
  type: PostType;
  title: string;
  content: string;
  imageUrl?: string;
  link?: string;
  linkLabel?: string;
  eventId?: string;
  eventName?: string;
  teamId?: string;
  teamName?: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorRole: UserRole;
  visibility: "everyone" | "students" | "staff";
  status: "published" | "draft" | "removed";
  createdAt: string;
  updatedAt: string;
}

// ─── Announcement ───────────────────────────────────────────
export type AnnouncementPriority = "normal" | "important" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  link?: string;
  linkLabel?: string;
  eventId?: string;
  priority: AnnouncementPriority;
  expiresAt?: string;
  targetAudience: "everyone" | "students" | "staff";
  authorId: string;
  authorName: string;
  createdAt: string;
}

// ─── Notification ────────────────────────────────────────────
export type NotificationType =
  | "announcement"
  | "approval"
  | "rejection"
  | "team-invite"
  | "team-join-request"
  | "team-join-accepted"
  | "team-join-rejected"
  | "event"
  | "achievement"
  | "system";

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  relatedId?: string;  // postId / teamId / eventId / requestId
  priority: "normal" | "high";
  createdAt: string;
}

// ─── Activity Log ────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: "user" | "team" | "event" | "post" | "request" | "settings";
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Settings ────────────────────────────────────────────────
export interface AppSettings {
  appName: string;
  tagline: string;
  mentorName: string;
  department: string;
  academicYear: string;
  logoUrl?: string;
  eventTypes: string[];
  departments: string[];
  sections: string[];
  years: string[];
  allowStudentTeamCreation: boolean;
  allowStudentPostCreation: boolean;
  maxTeamSize: number;
  updatedAt: string;
}

// ─── Team Draft (for Team Builder) ───────────────────────────
export interface TeamDraft {
  id: string;
  eventId?: string;
  eventName?: string;
  teams: TeamDraftSlot[];
  unassigned: string[];   // uids
  createdBy: string;
  updatedAt: string;
}

export interface TeamDraftSlot {
  id: string;
  name: string;
  memberIds: string[];
  leaderId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
