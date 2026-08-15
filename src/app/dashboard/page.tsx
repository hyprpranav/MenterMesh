"use client";

// ============================================================
// MentorMesh — Main Dynamic Dashboard (Student / Staff / Master)
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, UsersRound, Calendar, UserCheck, Download, Plus,
  Layers, Megaphone, Trophy, ArrowRight, ShieldCheck, Settings, Upload, CheckCircle, Clock
} from "lucide-react";
import {
  getActiveStudents,
  getAllUsers,
  getTeams,
  getEvents,
  getAccessRequests,
  getAnnouncements,
  getPosts,
  getUserTeams,
} from "@/lib/firebase/firestore";
import type { Team, Event, AccessRequest, Announcement, Post, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { formatDate, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [loadingData, setLoadingData] = useState(true);

  // Stats & Entities
  const [students, setStudents] = useState<User[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);

  useEffect(() => {
    async function loadAll() {
      if (!user) return;
      try {
        const [stList, tmList, evList, reqList, annList, postList, mTeams, staffList] = await Promise.all([
          getActiveStudents(),
          getTeams(),
          getEvents(),
          user.role !== "student" ? getAccessRequests("pending") : Promise.resolve([]),
          getAnnouncements(),
          getPosts(5),
          getUserTeams(user.uid),
          user.role === "master" ? getAllUsers("staff") : Promise.resolve([]),
        ]);
        setStudents(stList);
        setTeams(tmList);
        setEvents(evList);
        setRequests(reqList);
        setAnnouncements(annList);
        setPosts(postList);
        setMyTeams(mTeams);
        setStaffUsers(staffList);
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
    return (
      <MasterDashboard
        user={user}
        students={students}
        staffUsers={staffUsers}
        teams={teams}
        events={events}
        requests={requests}
        announcements={announcements}
        loading={loadingData}
      />
    );
  }

  if (user.role === "staff") {
    return (
      <StaffDashboard
        user={user}
        students={students}
        teams={teams}
        events={events}
        requests={requests}
        announcements={announcements}
        loading={loadingData}
      />
    );
  }

  return (
    <StudentDashboard
      user={user}
      myTeams={myTeams}
      events={events}
      announcements={announcements}
      posts={posts}
      loading={loadingData}
    />
  );
}

// ────────────────────────────────────────────────────────────
// 1. STUDENT DASHBOARD
// ────────────────────────────────────────────────────────────
function StudentDashboard({
  user, myTeams, events, announcements, posts, loading
}: {
  user: User; myTeams: Team[]; events: Event[]; announcements: Announcement[]; posts: Post[]; loading: boolean;
}) {
  const activeTeam = myTeams[0];
  const upcomingEvents = events.filter(e => e.status !== "completed").slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="mm-hero-banner">
        <div className="mm-hero-bg-circle -top-8 -right-8 w-40 h-40" />
        <div className="mm-hero-bg-circle -bottom-6 right-16 w-24 h-24" />

        <div className="mm-hero-content">
          <div className="mm-hero-text">
            <span className="inline-block bg-white/20 text-white text-[11px] font-bold px-3 py-0.5 rounded-full border border-white/20 uppercase tracking-wider">
              Student Portal
            </span>
            <h1 className="mm-hero-title mt-2">
              Welcome back, {user.name} 👋
            </h1>
            <p className="mm-hero-subtitle">
              {[user.department, user.year && `${user.year} Year`, user.section && `Section ${user.section}`].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="mm-hero-reg-card">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-blue-200 font-medium">Reg No:</span>
                <span className="font-mono font-bold text-white tracking-wide">{user.registerNumber || "N/A"}</span>
              </div>
              {user.rollNumber && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-blue-200 font-medium">Roll No:</span>
                  <span className="font-mono font-bold text-white tracking-wide">{user.rollNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Find a Student Search Box */}
      <div className="mm-find-student">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Find a Student</h3>
              <p className="text-xs text-slate-500 mt-0.5">Search by name, register number, department, year, or technical skills.</p>
            </div>
          </div>
          <Link href="/students" className="w-full sm:w-auto">
            <Button variant="primary" icon={<ArrowRight size={16} />} fullWidth className="sm:w-auto">
              Open Student Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: My Team & Upcoming Events */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Team Card */}
          <div className="mm-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="mm-section-icon bg-blue-100 text-blue-600">
                  <UsersRound size={16} />
                </div>
                <h2 className="font-bold text-slate-900 text-base">My Team</h2>
              </div>
              <Link href="/teams" className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
                View All <ArrowRight size={12} />
              </Link>
            </div>

            {activeTeam ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{activeTeam.name}</h3>
                    {activeTeam.eventName && (
                      <p className="text-xs text-slate-500 mt-0.5">Event: {activeTeam.eventName}</p>
                    )}
                  </div>
                  <span className={`mm-badge border ${activeTeam.status === "finalized" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    {activeTeam.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Members ({activeTeam.memberIds.length}):</span>{" "}
                  {activeTeam.memberNames?.join(", ") || `${activeTeam.memberIds.length} students`}
                </div>

                {activeTeam.driveLink && (
                  <a
                    href={activeTeam.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
                  >
                    📁 Open Team Documentation Folder
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center">
                <div className="w-12 h-12 mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <UsersRound size={22} />
                </div>
                <p className="text-slate-900 text-sm font-bold">Not assigned to a team yet</p>
                <p className="text-slate-500 text-xs mt-1 mb-4 max-w-xs">Explore available teams or wait for mentor assignment.</p>
                <Link href="/teams">
                  <Button size="sm" variant="outline">Browse Teams</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="mm-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="mm-section-icon bg-indigo-100 text-indigo-600">
                  <Calendar size={16} />
                </div>
                <h2 className="font-bold text-slate-900 text-base">Upcoming Events</h2>
              </div>
              <Link href="/events" className="text-xs font-semibold text-blue-600 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center">
                  <Calendar size={24} className="mb-2 opacity-40 text-slate-500" />
                  <p className="text-xs font-medium text-slate-600">No upcoming events scheduled right now.</p>
                </div>
              ) : (
                upcomingEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">{ev.type}</span>
                        <h4 className="font-semibold text-slate-900 text-sm truncate">{ev.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">📅 {formatDate(ev.date)} {ev.location && `· 📍 ${ev.location}`}</p>
                    </div>
                    <Link href={`/events/${ev.id}`} className="shrink-0 ml-2">
                      <Button size="sm" variant="ghost">Details</Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Announcements & Achievements */}
        <div className="space-y-5">
          {/* Announcements */}
          <div className="mm-card">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={16} className="text-amber-500 shrink-0" />
              <h2 className="font-bold text-slate-900 text-base">Announcements</h2>
            </div>
            <div className="space-y-2.5">
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No recent announcements.</p>
              ) : (
                announcements.slice(0, 3).map((a) => (
                  <div key={a.id} className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs leading-snug">{a.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{a.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="mm-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500 shrink-0" />
                <h2 className="font-bold text-slate-900 text-base">Recent Showcase</h2>
              </div>
              <Link href="/community" className="text-xs text-blue-600 font-semibold hover:underline">Feed</Link>
            </div>
            <div className="space-y-2.5">
              {posts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No community achievements posted yet.</p>
              ) : (
                posts.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-semibold text-slate-900 text-xs">{p.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{p.content}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>By {p.authorName}</span>
                      <span>{timeAgo(p.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 2. STAFF DASHBOARD (Reusable for Staff & Master)
// ────────────────────────────────────────────────────────────
function StaffDashboard({
  user, students, teams, events, requests, announcements, loading
}: {
  user: User; students: User[]; teams: Team[]; events: Event[]; requests: AccessRequest[]; announcements: Announcement[]; loading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Section Header (Outside Cards) */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Mentor Workspace</h2>
        <p className="text-sm text-slate-500 mt-1">Manage student groups, teams, events, and access requests.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="mm-stat-card">
          <div className="mm-stat-icon bg-blue-100 text-blue-600"><Users size={20} /></div>
          <div>
            <div className="mm-stat-number">{students.length}</div>
            <div className="mm-stat-label">Active Students</div>
          </div>
        </div>

        <div className="mm-stat-card">
          <div className="mm-stat-icon bg-amber-100 text-amber-600"><UserCheck size={20} /></div>
          <div>
            <div className="mm-stat-number">{requests.length}</div>
            <div className="mm-stat-label">Pending Requests</div>
          </div>
        </div>

        <div className="mm-stat-card">
          <div className="mm-stat-icon bg-emerald-100 text-emerald-600"><UsersRound size={20} /></div>
          <div>
            <div className="mm-stat-number">{teams.length}</div>
            <div className="mm-stat-label">Total Teams</div>
          </div>
        </div>

        <div className="mm-stat-card">
          <div className="mm-stat-icon bg-violet-100 text-violet-600"><Calendar size={20} /></div>
          <div>
            <div className="mm-stat-number">{events.length}</div>
            <div className="mm-stat-label">Events</div>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="mm-card p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/team-builder"><Button size="sm" variant="secondary" icon={<Layers size={14} />}>Team Builder</Button></Link>
          <Link href="/admin/requests"><Button size="sm" variant="secondary" icon={<UserCheck size={14} />}>Review Access Requests</Button></Link>
          <Link href="/admin/students"><Button size="sm" variant="secondary" icon={<Users size={14} />}>Manage Students</Button></Link>
          <Link href="/events/new"><Button size="sm" variant="secondary" icon={<Plus size={14} />}>Create Event</Button></Link>
          <Link href="/admin/export"><Button size="sm" variant="secondary" icon={<Download size={14} />}>Export Reports</Button></Link>
        </div>
      </div>

      {/* Pending Requests Table Preview */}
      {requests.length > 0 && (
        <div className="mm-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">Pending Access Requests ({requests.length})</h3>
            </div>
            <Link href="/admin/requests" className="text-xs font-semibold text-blue-600 hover:underline">
              Review All
            </Link>
          </div>

          <div className="mm-table-wrap">
            <table className="mm-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Dept / Yr / Sec</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold text-slate-900">{r.name}</td>
                    <td className="font-mono text-xs">{r.registerNumber}</td>
                    <td>{r.department} - {r.year} Yr ({r.section})</td>
                    <td className="text-xs text-slate-500">{timeAgo(r.createdAt)}</td>
                    <td>
                      <Link href={`/admin/requests/${r.id}`}>
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

      {/* Active Teams Overview */}
      <div className="mm-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base">Active Teams ({teams.length})</h3>
          <Link href="/teams" className="text-xs font-semibold text-blue-600 hover:underline">Manage Teams</Link>
        </div>
        {teams.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No teams formed yet. Use Team Builder to randomize or assign teams.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {teams.slice(0, 6).map((t) => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                  <span className={`mm-badge ${t.status === "finalized" ? "mm-badge-finalized" : "mm-badge-draft"}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.memberIds.length} Members {t.leaderName && `• Leader: ${t.leaderName}`}</p>
                <Link href={`/teams/${t.id}`} className="block pt-1">
                  <span className="text-xs text-blue-600 font-semibold hover:underline">View Details →</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 3. MASTER DASHBOARD
// ────────────────────────────────────────────────────────────
function MasterDashboard({
  user, students, staffUsers, teams, events, requests, announcements, loading
}: {
  user: User; students: User[]; staffUsers: User[]; teams: Team[]; events: Event[]; requests: AccessRequest[]; announcements: Announcement[]; loading: boolean;
}) {
  return (
    <div className="space-y-8">
      {/* 1. MASTER CONTROL CENTER */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-purple-600" size={24} />
            <h1 className="mm-page-title">Master Control Center</h1>
          </div>
          <p className="mm-page-subtitle">Full administrative authorization over users, system roles, imports, and configuration.</p>
        </div>

        {/* Master Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="mm-stat-card">
            <div className="mm-stat-icon bg-blue-100 text-blue-600"><Users size={20} /></div>
            <div>
              <div className="mm-stat-number">{students.length}</div>
              <div className="mm-stat-label">Students</div>
            </div>
          </div>

          <div className="mm-stat-card">
            <div className="mm-stat-icon bg-purple-100 text-purple-600"><ShieldCheck size={20} /></div>
            <div>
              <div className="mm-stat-number">{staffUsers.length || 1}</div>
              <div className="mm-stat-label">Staff Members</div>
            </div>
          </div>

          <div className="mm-stat-card">
            <div className="mm-stat-icon bg-amber-100 text-amber-600"><UserCheck size={20} /></div>
            <div>
              <div className="mm-stat-number">{requests.length}</div>
              <div className="mm-stat-label">Requests</div>
            </div>
          </div>

          <div className="mm-stat-card">
            <div className="mm-stat-icon bg-emerald-100 text-emerald-600"><UsersRound size={20} /></div>
            <div>
              <div className="mm-stat-number">{teams.length}</div>
              <div className="mm-stat-label">Teams</div>
            </div>
          </div>

          <div className="mm-stat-card">
            <div className="mm-stat-icon bg-indigo-100 text-indigo-600"><Calendar size={20} /></div>
            <div>
              <div className="mm-stat-number">{events.length}</div>
              <div className="mm-stat-label">Events</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MASTER OPERATIONS HUB (Heading Outside Cards) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Master Operations Hub</h2>
          <p className="text-sm text-slate-500 mt-1">Execute system operations, user role management, and database utilities.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/import"
            className="mm-card p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-purple-500 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Upload size={22} />
            </div>
            <p className="font-bold text-slate-900 text-sm">Import Database</p>
          </Link>

          <Link
            href="/admin/staff"
            className="mm-card p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-purple-500 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck size={22} />
            </div>
            <p className="font-bold text-slate-900 text-sm">Manage Staff & Roles</p>
          </Link>

          <Link
            href="/admin/export"
            className="mm-card p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Download size={22} />
            </div>
            <p className="font-bold text-slate-900 text-sm">Export Data</p>
          </Link>

          <Link
            href="/admin/settings"
            className="mm-card p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-slate-400 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Settings size={22} />
            </div>
            <p className="font-bold text-slate-900 text-sm">System Settings</p>
          </Link>
        </div>
      </section>

      {/* 3. MENTOR WORKSPACE SECTION */}
      <section className="pt-2">
        <StaffDashboard user={user} students={students} teams={teams} events={events} requests={requests} announcements={announcements} loading={loading} />
      </section>
    </div>
  );
}


