"use client";

// ============================================================
// MentorMesh — Export Center (CSV / Reports)
// ============================================================
import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getActiveStudents, getTeams, getEvents } from "@/lib/firebase/firestore";
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

  // Team Exports
  const handleExportTeams = async (mode: "teams_members" | "full") => {
    setExporting(`teams_${mode}`);
    try {
      const teams = await getTeams();

      let headers: string[] = ["Team ID", "Team Name", "Event", "Leader Name", "Member Count", "Member Names", "Status", "Drive Link"];
      let rows: string[][] = teams.map((t) => [
        t.id, t.name, t.eventName || "General", t.leaderName || "N/A", String(t.memberIds.length),
        t.memberNames?.join("; ") || "", t.status, t.driveLink || ""
      ]);

      downloadCSV(`mentormesh_teams_${mode}`, [headers, ...rows]);
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

      let headers: string[] = ["Event ID", "Event Name", "Type", "Date", "Location", "Organizer", "Status", "Drive Link"];
      let rows: string[][] = events.map((e) => [
        e.id, e.name, e.type, e.date, e.location || "", e.organizer || "", e.status, e.driveLink || ""
      ]);

      downloadCSV("mentormesh_events", [headers, ...rows]);
      success("Events export generated!");
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
      </div>
    </div>
  );
}
