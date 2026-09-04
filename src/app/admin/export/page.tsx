"use client";

// ============================================================
// MentorMesh — Export Center (CSV / Reports)
// ============================================================
import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getActiveStudents, getTeams, getEvents, getAllUsers, getMeetingsForViewer } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Download, Users, UsersRound, Calendar, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export default function ExportCenterPage() {
  return (
    <AppShell>
      <ExportCenterContent />
    </AppShell>
  );
}

function ExportCenterContent() {
  const { success, error } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  // Helper to trigger browser download of generated CSV
  const downloadCSV = (filename: string, rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Student Exports
  const handleExportStudents = async (mode: "name_reg" | "full" | "name_email_phone") => {
    setExporting(`students_${mode}`);
    try {
      const students = await getActiveStudents();

      let headers: string[] = [];
      let rows: string[][] = [];

      if (mode === "name_reg") {
        headers = ["Name", "Register Number", "Roll Number", "Department", "Year", "Section"];
        rows = students.map((s) => [s.name, s.registerNumber || "", s.rollNumber || "", s.department || "", s.year || "", s.section || ""]);
      } else if (mode === "name_email_phone") {
        headers = ["Name", "Register Number", "Email", "Phone", "Department"];
        rows = students.map((s) => [s.name, s.registerNumber || "", s.email, s.phone || "", s.department || ""]);
      } else {
        headers = ["UID", "Name", "Email", "Phone", "Register Number", "Roll Number", "Department", "Year", "Section", "Skills", "Created At"];
        rows = students.map((s) => [
          s.uid, s.name, s.email, s.phone || "", s.registerNumber || "", s.rollNumber || "",
          s.department || "", s.year || "", s.section || "", s.skills?.join("; ") || "", s.createdAt
        ]);
      }

      downloadCSV(`mentormesh_students_${mode}`, [headers, ...rows]);
      success("Student export generated!");
    } catch {
      error("Export failed.");
    } finally {
      setExporting(null);
    }
  };

  // Overall System Data Export
  const handleExportOverallSystem = async () => {
    setExporting("overall");
    try {
      const users = await getAllUsers();
      const events = await getEvents();
      const teams = await getTeams();
      const meetings = await getMeetingsForViewer("", "developer"); // get all meetings

      let headers: string[] = [
        "UID", "Name", "Role", "Gender",
        "College Email", "Personal Email", "Alternate Email",
        "Student Phone", "Parent Phone",
        "Register Number", "Roll Number", "Department", "Year", "Section",
        "Date of Birth", "Blood Group", "Aadhaar Number", "Address",
        "LinkedIn", "GitHub", "Portfolio", "Bio", "Skills",
        "Teams Attended", "Events Attended", "Meetings Attended"
      ];

      let rows: string[][] = users.map((u) => {
        // Find teams
        const userTeams = teams.filter(t => t.memberIds.includes(u.uid) || t.leaderId === u.uid).map(t => t.name).join(" | ");
        // Find events
        const userEvents = events.filter(e => e.submittedBy === u.uid || (e.participantIds && e.participantIds.includes(u.uid))).map(e => e.name).join(" | ");
        // Find meetings
        const userMeetings = meetings.filter(m => m.submittedBy === u.uid || (m.attendeeIds && m.attendeeIds.includes(u.uid))).map(m => m.title).join(" | ");

        return [
          u.uid, u.name, u.role, String((u as any).gender || ""),
          u.email, u.personalEmail || "", u.alternateEmail || "",
          u.phone || "", u.parentPhoneNumber || "",
          u.registerNumber || "", u.rollNumber || "", u.department || "", u.year || "", u.section || "",
          u.dateOfBirth || "", u.bloodGroup || "", u.aadhaarNumber || "", (u.address || "").replace(/\n/g, ", "),
          u.linkedIn || "", u.github || "", u.portfolio || "", u.bio || "", (u.skills || []).join(", "),
          userTeams || "None", userEvents || "None", userMeetings || "None"
        ];
      });

      downloadCSV("mentormesh_comprehensive_database", [headers, ...rows]);
      success("Comprehensive system database exported successfully!");
    } catch {
      error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  // State to hold teams for Specific Team Export
  const [allTeams, setAllTeams] = useState<{ id: string, name: string }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  React.useEffect(() => {
    async function loadTeams() {
      const teamsObj = await getTeams();
      setAllTeams(teamsObj);
    }
    loadTeams();
  }, []);

  // Team Exports
  const handleExportTeams = async (mode: "teams_members" | "full" | "specific") => {
    setExporting(`teams_${mode}`);
    try {
      const teams = await getTeams();

      let headers: string[] = ["Team ID", "Team Name", "Event", "Leader Name", "Member Count", "Member Names", "Status", "Drive Link"];
      let rows: string[][] = [];

      if (mode === "specific") {
        if (!selectedTeam) {
          error("Please select a team to export.");
          return;
        }
        const teamObj = teams.find(t => t.id === selectedTeam);
        if (teamObj) {
          rows = [[
            teamObj.id, teamObj.name, teamObj.eventName || "General", teamObj.leaderName || "N/A", String(teamObj.memberIds.length),
            teamObj.memberNames?.join("; ") || "", teamObj.status, teamObj.driveLink || ""
          ]];
        }
      } else {
        rows = teams.map((t) => [
          t.id, t.name, t.eventName || "General", t.leaderName || "N/A", String(t.memberIds.length),
          t.memberNames?.join("; ") || "", t.status, t.driveLink || ""
        ]);
      }

      downloadCSV(mode === "specific" ? `mentormesh_team_${selectedTeam}` : `mentormesh_teams_${mode}`, [headers, ...rows]);
      success("Teams export generated!");
    } catch {
      error("Export failed.");
    } finally {
      setExporting(null);
    }
  };

  // Event Exports
  const handleExportEvents = async () => {
    setExporting("events");
    try {
      const events = await getEvents();

      let headers: string[] = [
        "S.No", "Event Name", "Type", "Track / Category", "Project Title", "Date", "Location",
        "Submitted By", "Team Name/Participation", "Platform Participants", "External Participants",
        "Role", "Result / Prize", "Certificate Link",
        "Geotag Photo 1", "Geotag Photo 2", "Geotag Photo 3", "Geotag Photo 4", "Geotag Photo 5",
        "LinkedIn Post", "GitHub", "Live URL", "Drive/Docs", "Status", "Feedback/Comments"
      ];
      let rows: string[][] = events.map((e, index) => [
        String(index + 1), e.name, e.type, e.eventTrack || "", e.projectTitle || "", e.date || "", e.location || "",
        e.submittedByName || "Unknown", e.teamName || "Individual",
        e.participantNames?.join("; ") || "", e.externalParticipants?.join("; ") || "",
        e.roleInEvent || "", e.result || "",
        e.certificateFile || e.certificatesLink || "",
        e.geotagPhotos?.[0] || "", e.geotagPhotos?.[1] || "", e.geotagPhotos?.[2] || "", e.geotagPhotos?.[3] || "", e.geotagPhotos?.[4] || "",
        e.linkedInPost || "", e.githubUrl || "", e.liveUrl || "",
        [e.driveLink, e.documentsLink].filter(Boolean).join(" | "),
        e.submissionStatus || e.status, e.reviewFeedback || ""
      ]);

      downloadCSV("mentormesh_events", [headers, ...rows]);
      success("Events export generated!");
    } catch {
      error("Export failed.");
    } finally {
      setExporting(null);
    }
  };

  // Meetings Export
  const handleExportMeetings = async () => {
    setExporting("meetings");
    try {
      const meetings = await getMeetingsForViewer("", "developer");
      let headers: string[] = ["S.No", "Meeting Title", "Mode", "Status", "Date", "Time", "Host", "Participants", "Participant Count", "Meeting Link"];
      let rows: string[][] = meetings.map((m, i) => [
        String(i + 1), m.title, m.mode, m.status, m.date, m.time, m.submittedByName || "Unknown",
        String(m.attendeeNames?.join("; ") || m.attendeeIds?.join("; ")), String(m.attendeeCount || (m.attendeeIds || []).length), m.link || ""
      ]);

      downloadCSV("mentormesh_meetings", [headers, ...rows]);
      success("Meetings export generated!");
    } catch {
      error("Export failed.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="mm-page-title">Export Center</h1>
        <p className="mm-page-subtitle">Download sanitized student rosters, team lists, and event reports in CSV format.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student Exports Card */}
        <div className="mm-card space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Student Rosters</h2>
              <p className="text-xs text-slate-500">Export student details</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              fullWidth
              size="sm"
              icon={<Download size={14} />}
              loading={exporting === "students_name_reg"}
              onClick={() => handleExportStudents("name_reg")}
            >
              Name + Register Number
            </Button>
            <Button
              variant="outline"
              fullWidth
              size="sm"
              icon={<Download size={14} />}
              loading={exporting === "students_name_email_phone"}
              onClick={() => handleExportStudents("name_email_phone")}
            >
              Name + Phone + Email
            </Button>
            <Button
              variant="primary"
              fullWidth
              size="sm"
              icon={<FileSpreadsheet size={14} />}
              loading={exporting === "students_full"}
              onClick={() => handleExportStudents("full")}
            >
              Full Student Data (CSV)
            </Button>
          </div>
        </div>

        {/* Teams Export Card */}
        <div className="mm-card space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <UsersRound size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Teams Export</h2>
              <p className="text-xs text-slate-500">Export team arrangements</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              fullWidth
              size="sm"
              icon={<Download size={14} />}
              loading={exporting === "teams_teams_members"}
              onClick={() => handleExportTeams("teams_members")}
            >
              Team Name + Members
            </Button>
            <Button
              variant="primary"
              fullWidth
              size="sm"
              icon={<FileSpreadsheet size={14} />}
              loading={exporting === "teams_full"}
              onClick={() => handleExportTeams("full")}
            >
              Full Team Reports (CSV)
            </Button>
            <div className="pt-2 border-t border-slate-100 mt-2">
              <select
                className="mm-input mm-select text-xs mb-2"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">-- Download Specific Team --</option>
                {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Button
                variant="outline"
                fullWidth
                size="sm"
                icon={<Download size={14} />}
                loading={exporting === "teams_specific"}
                onClick={() => handleExportTeams("specific")}
                disabled={!selectedTeam}
              >
                Download Team Details
              </Button>
            </div>
          </div>
        </div>

        {/* Events Export Card */}
        <div className="mm-card space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Event Reports</h2>
              <p className="text-xs text-slate-500">Export event history</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="primary"
              fullWidth
              size="sm"
              icon={<FileSpreadsheet size={14} />}
              loading={exporting === "events"}
              onClick={handleExportEvents}
            >
              Full Events Summary (CSV)
            </Button>
          </div>
        </div>

        {/* Meetings Export Card */}
        <div className="mm-card space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Meetings Log</h2>
              <p className="text-xs text-slate-500">Export meeting details</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant="primary"
              fullWidth
              size="sm"
              icon={<FileSpreadsheet size={14} />}
              loading={exporting === "meetings"}
              onClick={handleExportMeetings}
            >
              Full Meetings Log (CSV)
            </Button>
          </div>
        </div>

        {/* Developer Override Card */}
        <div className="mm-card space-y-4 md:col-span-3 mt-2 border-slate-300 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-100 flex items-center justify-center">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Overall System Database</h2>
                <p className="text-xs text-slate-500">Master extraction including developers and staff details</p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Download size={14} />}
              loading={exporting === "overall"}
              onClick={handleExportOverallSystem}
            >
              Export Every Data Row (CSV)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
