"use client";

// ============================================================
// MentorMesh — Dashboard v2 (Student / Staff / Master)
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, UsersRound, Calendar, UserCheck, Download, Plus,
  Layers, Megaphone, Trophy, ArrowRight, ShieldCheck,
  Settings, Upload, Clock, BookOpen,
} from "lucide-react";
import {
  getActiveStudents, getAllUsers, getTeams, getEventsForViewer,
  getAccessRequests, getAnnouncements, getPosts, getUserTeams,
} from "@/lib/firebase/firestore";
import type { Team, Event, AccessRequest, Announcement, Post, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge, teamStatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingState } from "@/components/ui/States";
import { formatDate, timeAgo } from "@/lib/utils";
import { getUpcomingBirthdays } from "@/lib/birthdays";
import type { Notification } from "@/types";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

// ── Data loading shell ────────────────────────────────────────
function DashboardContent() {
  const { user } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [students, setStudents] = useState<User[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [bdayNotifs, setBdayNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    async function loadAll() {
      if (!user) return;
      try {
        const [stList, tmList, evList, reqList, annList, postList, mTeams, staffList, bdays] =
          await Promise.all([
            getActiveStudents(),
            getTeams(),
            getEventsForViewer(user.uid, user.role),
            user.role !== "student" ? getAccessRequests("pending") : Promise.resolve([]),
            getAnnouncements(),
            getPosts(5),
            getUserTeams(user.uid),
            user.role === "master" ? getAllUsers("staff") : Promise.resolve([]),
            getUpcomingBirthdays(user),
          ]);
        setStudents(stList); setTeams(tmList); setEvents(evList);
        setRequests(reqList); setAnnouncements(annList); setPosts(postList);
        setMyTeams(mTeams); setStaffUsers(staffList); setBdayNotifs(bdays);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadAll();
  }, [user]);

  if (!user) return null;

  if (user.role === "master") {
    return <MasterDashboard user={user} students={students} staffUsers={staffUsers} teams={teams} events={events} requests={requests} announcements={announcements} birthdays={bdayNotifs} loading={loadingData} />;
  }
  if (user.role === "staff") {
    return <StaffDashboard user={user} students={students} teams={teams} events={events} requests={requests} announcements={announcements} birthdays={bdayNotifs} loading={loadingData} />;
  }
  return <StudentDashboard user={user} myTeams={myTeams} events={events} announcements={announcements} posts={posts} birthdays={bdayNotifs} loading={loadingData} />;
}

// ──────────────────────────────────────────────────────────────
// STUDENT DASHBOARD
// ──────────────────────────────────────────────────────────────
function StudentDashboard({
  user, myTeams, events, announcements, posts, birthdays, loading,
}: {
  user: User; myTeams: Team[]; events: Event[]; announcements: Announcement[]; posts: Post[]; birthdays: Notification[]; loading: boolean;
}) {
  const activeTeam = myTeams[0];
  const upcomingEvents = events.filter(e => e.status !== "completed").slice(0, 3);
  const firstName = user.name.split(" ")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Hero Welcome Card ─────────────────────────────── */}
      <div className="mm-hero-card">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <span style={{
              display: "inline-block",
              background: "rgb(255 255 255 / 0.15)",
              color: "#fff",
              fontSize: "10px", fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "999px",
              letterSpacing: "0.08em", textTransform: "uppercase",
              border: "1px solid rgb(255 255 255 / 0.2)",
            }}>
              Student Portal
            </span>
          </div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#fff", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>
            Welcome back, {firstName} 👋
          </h1>
          <p style={{ fontSize: "0.875rem", color: "rgb(255 255 255 / 0.75)", fontWeight: 500 }}>
            {[user.department, user.year && `${user.year} Year`, user.section && `Sec ${user.section}`].filter(Boolean).join(" · ")}
          </p>

          {/* Academic IDs row */}
          <div style={{
            marginTop: "1.25rem",
            display: "flex", flexWrap: "wrap", gap: "0.75rem",
          }}>
            {user.registerNumber && (
              <div style={{
                background: "rgb(255 255 255 / 0.12)",
                border: "1px solid rgb(255 255 255 / 0.2)",
                borderRadius: "8px",
                padding: "0.5rem 0.875rem",
              }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "rgb(255 255 255 / 0.6)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>Reg No</p>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: "0.05em" }}>{user.registerNumber}</p>
              </div>
            )}
            {user.rollNumber && (
              <div style={{
                background: "rgb(255 255 255 / 0.12)",
                border: "1px solid rgb(255 255 255 / 0.2)",
                borderRadius: "8px",
                padding: "0.5rem 0.875rem",
              }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "rgb(255 255 255 / 0.6)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>Roll No</p>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{user.rollNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Birthday Widget ─────────────────────────────── */}
      {birthdays.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #FDF4FF, #FCE7F3)",
          border: "1px solid #FBCFE8", borderRadius: "12px", padding: "1.25rem",
          display: "flex", flexDirection: "column", gap: "0.75rem",
          boxShadow: "0 4px 14px 0 rgba(244, 114, 182, 0.15)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🎂</span>
            <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#831843" }}>Upcoming Birthdays</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {birthdays.map((b) => (
              <div key={b.id} style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", border: "1px solid #FBCFE8", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#9D174D" }}>{b.title}</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{b.message}</p>
                {b.link && (
                  <a href={b.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#BE185D", color: "#fff", fontSize: "0.75rem", fontWeight: 600, padding: "0.375rem 0.75rem", borderRadius: "6px", textDecoration: "none", alignSelf: "flex-start", marginTop: "0.25rem" }}>
                    Wish Now
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Find Student CTA ─────────────────────────────── */}
      <div className="mm-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--blue-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={22} color="var(--blue-600)" />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", marginBottom: "2px" }}>Find a Student</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>Search by name, reg no, department, year, or skills</p>
          </div>
        </div>
        <Link href="/students">
          <Button variant="primary" size="sm" iconRight={<ArrowRight size={15} />}>
            Open Directory
          </Button>
        </Link>
      </div>

      {/* ── Main Grid ────────────────────────────────────── */}
      {loading ? (
        <LoadingState />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
          {/* Left side (full width mobile, 2/3 desktop) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>

            {/* My Team */}
            <div className="mm-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--blue-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UsersRound size={16} color="var(--blue-600)" />
                  </div>
                  <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>My Team</h2>
                </div>
                <Link href="/teams" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
                  View All <ArrowRight size={12} />
                </Link>
              </div>

              {activeTeam ? (
                <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>{activeTeam.name}</h3>
                      {activeTeam.eventName && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "2px" }}>{activeTeam.eventName}</p>}
                    </div>
                    <Badge {...teamStatusBadge(activeTeam.status)} />
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-text-2)" }}>
                    <strong>Members ({activeTeam.memberIds.length}):</strong>{" "}
                    {activeTeam.memberNames?.join(", ") || `${activeTeam.memberIds.length} students`}
                  </p>
                  {activeTeam.driveLink && (
                    <a href={activeTeam.driveLink} target="_blank" rel="noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      marginTop: "0.75rem", fontSize: "0.8125rem", fontWeight: 600,
                      color: "var(--color-primary)", background: "var(--blue-50)",
                      padding: "5px 12px", borderRadius: "8px", textDecoration: "none",
                      border: "1px solid var(--blue-100)",
                    }}>
                      📁 Open Documentation Folder
                    </a>
                  )}
                </div>
              ) : (
                <div style={{
                  textAlign: "center", padding: "2rem 1rem",
                  border: "1.5px dashed var(--color-border)",
                  borderRadius: "10px",
                  background: "var(--color-bg)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
                }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--color-surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UsersRound size={20} color="var(--color-muted)" />
                  </div>
                  <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Not assigned to a team yet</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", maxWidth: "240px" }}>
                    Explore available teams or wait for mentor assignment.
                  </p>
                  <Link href="/teams" style={{ marginTop: "0.5rem" }}>
                    <Button size="sm" variant="outline">Browse Teams</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="mm-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={16} color="#7C3AED" />
                  </div>
                  <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Upcoming Events</h2>
                </div>
                <Link href="/events" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none" }}>
                  View All
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {upcomingEvents.length === 0 ? (
                  <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-muted)", padding: "1.5rem 0" }}>
                    No upcoming events scheduled.
                  </p>
                ) : (
                  upcomingEvents.map((ev) => (
                    <div key={ev.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
                      padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      transition: "border-color 0.15s, background 0.15s",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "var(--blue-50)", color: "var(--blue-600)", padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>{ev.type}</span>
                          <h4 style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</h4>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "3px" }}>📅 {formatDate(ev.date)}{ev.location && ` · 📍 ${ev.location}`}</p>
                      </div>
                      <Link href={`/events/${ev.id}`} style={{ flexShrink: 0 }}>
                        <Button size="sm" variant="ghost">Details</Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right side — Announcements + Showcase */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>

            {/* Announcements */}
            <div className="mm-card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <Megaphone size={16} color="var(--amber-600)" />
                <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Announcements</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {announcements.length === 0 ? (
                  <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-muted)", padding: "1rem 0" }}>No recent announcements.</p>
                ) : (
                  announcements.slice(0, 3).map((a) => (
                    <div key={a.id} style={{
                      padding: "0.75rem", borderRadius: "10px",
                      background: "var(--amber-50)", border: "1px solid var(--amber-100)",
                      display: "flex", gap: "0.625rem",
                    }}>
                      <div style={{ width: "3px", borderRadius: "99px", background: "var(--amber-500)", flexShrink: 0, alignSelf: "stretch" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "2px" }}>
                          <h4 style={{ fontWeight: 700, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</h4>
                          <span style={{ fontSize: "10px", color: "var(--color-muted)", flexShrink: 0 }}>{timeAgo(a.createdAt)}</span>
                        </div>
                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{a.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Showcase */}
            <div className="mm-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Trophy size={16} color="var(--amber-600)" />
                  <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Recent Showcase</h2>
                </div>
                <Link href="/community" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none" }}>
                  Feed
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {posts.length === 0 ? (
                  <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-muted)", padding: "1rem 0" }}>No community posts yet.</p>
                ) : (
                  posts.slice(0, 3).map((p) => (
                    <div key={p.id} style={{ padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "3px" }}>{p.title}</p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{p.content}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                        <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>By {p.authorName}</span>
                        <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>{timeAgo(p.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// STAFF DASHBOARD
// ──────────────────────────────────────────────────────────────
function StaffDashboard({
  user, students, teams, events, requests, announcements, birthdays, loading,
}: {
  user: User; students: User[]; teams: Team[]; events: Event[]; requests: AccessRequest[]; announcements: Announcement[]; birthdays: Notification[]; loading: boolean;
}) {
  const STATS = [
    { label: "Active Students", value: students.length, color: "#2563EB", bg: "#EFF6FF", Icon: Users },
    { label: "Pending Requests", value: requests.length, color: "#D97706", bg: "#FFFBEB", Icon: UserCheck },
    { label: "Total Teams", value: teams.length, color: "#059669", bg: "#F0FDF4", Icon: UsersRound },
    { label: "Events", value: events.length, color: "#7C3AED", bg: "#F5F3FF", Icon: Calendar },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1 className="mm-page-title">Mentor Workspace</h1>
        <p className="mm-page-subtitle">Manage student groups, teams, events, and access requests.</p>
      </div>

      {/* ── Birthday Widget ─────────────────────────────── */}
      {!loading && birthdays.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #FDF4FF, #FCE7F3)",
          border: "1px solid #FBCFE8", borderRadius: "12px", padding: "1.25rem",
          display: "flex", flexDirection: "column", gap: "0.75rem",
          boxShadow: "0 4px 14px 0 rgba(244, 114, 182, 0.15)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🎂</span>
            <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#831843" }}>Upcoming Birthdays</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {birthdays.map((b) => (
              <div key={b.id} style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", border: "1px solid #FBCFE8", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#9D174D" }}>{b.title}</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{b.message}</p>
                {b.link && (
                  <a href={b.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#BE185D", color: "#fff", fontSize: "0.75rem", fontWeight: 600, padding: "0.375rem 0.75rem", borderRadius: "6px", textDecoration: "none", alignSelf: "flex-start", marginTop: "0.25rem" }}>
                    Wish Now
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <LoadingState /> : (
        <>
          {/* Stat Cards */}
          <div className="mm-grid-4">
            {STATS.map(({ label, value, color, bg, Icon }) => (
              <div key={label} className="mm-stat-card">
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <p className="mm-stat-value">{value}</p>
                  <p className="mm-stat-label">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mm-card">
            <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Quick Actions</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Link href="/team-builder"><Button size="sm" variant="secondary" icon={<Layers size={14} />}>Team Builder</Button></Link>
              <Link href="/admin/requests"><Button size="sm" variant="secondary" icon={<UserCheck size={14} />}>Review Requests</Button></Link>
              <Link href="/admin/students"><Button size="sm" variant="secondary" icon={<Users size={14} />}>Manage Students</Button></Link>
              <Link href="/events/new"><Button size="sm" variant="secondary" icon={<Plus size={14} />}>Create Event</Button></Link>
              <Link href="/admin/export"><Button size="sm" variant="secondary" icon={<Download size={14} />}>Export Reports</Button></Link>
            </div>
          </div>

          {/* Pending Requests */}
          {requests.length > 0 && (
            <div className="mm-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Clock size={18} color="var(--color-warning)" />
                  <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Pending Access Requests ({requests.length})</h2>
                </div>
                <Link href="/admin/requests" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none" }}>Review All</Link>
              </div>

              <div className="mm-table-wrap">
                <table className="mm-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Reg No</th>
                      <th>Dept / Yr</th>
                      <th>Submitted</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Avatar name={r.name} size="xs" />
                            <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{r.registerNumber}</td>
                        <td>{r.department} · {r.year} Yr ({r.section})</td>
                        <td style={{ fontSize: "12px", color: "var(--color-muted)" }}>{timeAgo(r.createdAt)}</td>
                        <td>
                          <Link href={`/admin/requests`}>
                            <Button size="sm" variant="outline">Review</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Teams Grid */}
          <div className="mm-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Active Teams ({teams.length})</h2>
              <Link href="/teams" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none" }}>Manage Teams</Link>
            </div>

            {teams.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-muted)", padding: "1.5rem 0" }}>
                No teams formed yet. Use Team Builder to assign teams.
              </p>
            ) : (
              <div className="mm-grid-3">
                {teams.slice(0, 6).map((t) => {
                  const { variant, label } = teamStatusBadge(t.status);
                  return (
                    <Link key={t.id} href={`/teams/${t.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ padding: "1rem", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-bg)", transition: "border-color 0.15s, box-shadow 0.15s", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.375rem" }}>
                          <h4 style={{ fontWeight: 700, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "0.5rem" }}>{t.name}</h4>
                          <Badge variant={variant}>{label}</Badge>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{t.memberIds.length} members{t.leaderName && ` · ${t.leaderName}`}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// MASTER DASHBOARD
// ──────────────────────────────────────────────────────────────
function MasterDashboard({
  user, students, staffUsers, teams, events, requests, announcements, birthdays, loading,
}: {
  user: User; students: User[]; staffUsers: User[]; teams: Team[]; events: Event[]; requests: AccessRequest[]; announcements: Announcement[]; birthdays: Notification[]; loading: boolean;
}) {
  const MASTER_STATS = [
    { label: "Students", value: students.length, color: "#2563EB", bg: "#EFF6FF", Icon: Users },
    { label: "Staff Members", value: staffUsers.length || 1, color: "#7C3AED", bg: "#F5F3FF", Icon: ShieldCheck },
    { label: "Pending Requests", value: requests.length, color: "#D97706", bg: "#FFFBEB", Icon: UserCheck },
    { label: "Teams", value: teams.length, color: "#059669", bg: "#F0FDF4", Icon: UsersRound },
    { label: "Events", value: events.length, color: "#0891B2", bg: "#ECFEFF", Icon: Calendar },
  ];

  const OPS = [
    { href: "/admin/import", Icon: Upload, label: "Import Database", color: "#7C3AED", bg: "#F5F3FF" },
    { href: "/admin/staff", Icon: ShieldCheck, label: "Manage Staff & Roles", color: "#7C3AED", bg: "#F5F3FF" },
    { href: "/admin/export", Icon: Download, label: "Export Data", color: "#2563EB", bg: "#EFF6FF" },
    { href: "/admin/settings", Icon: Settings, label: "System Settings", color: "#475569", bg: "#F1F5F9" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={22} color="#7C3AED" />
        </div>
        <div>
          <h1 className="mm-page-title">Master Control Center</h1>
          <p className="mm-page-subtitle">Full administrative authorization over users, system roles, and configuration.</p>
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <>
          {/* Master Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            {MASTER_STATS.map(({ label, value, color, bg, Icon }) => (
              <div key={label} className="mm-stat-card" style={{ flexDirection: "row", alignItems: "center", gap: "0.875rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <p className="mm-stat-value">{value}</p>
                  <p className="mm-stat-label">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Master Operations */}
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", marginBottom: "0.75rem" }}>Master Operations</h2>
            <div className="mm-grid-4">
              {OPS.map(({ href, Icon, label, color, bg }) => (
                <Link key={href} href={href} style={{ textDecoration: "none" }}>
                  <div className="mm-card mm-card-hover" style={{ textAlign: "center", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.625rem" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={22} color={color} />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)" }}>{label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Staff Workspace below */}
          <StaffDashboard user={user} students={students} teams={teams} events={events} requests={requests} announcements={announcements} birthdays={birthdays} loading={false} />
        </>
      )}
    </div>
  );
}
