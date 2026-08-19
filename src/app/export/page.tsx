"use client";

// ============================================================
// MentorMesh — Student Export Center (Minimal Extracts)
// ============================================================
import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getAllUsers, getTeams } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Download, Users, UsersRound } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export default function StudentExportPage() {
    return (
        <AppShell>
            <StudentExportContent />
        </AppShell>
    );
}

function StudentExportContent() {
    const { success, error } = useToast();
    const [exporting, setExporting] = useState<string | null>(null);

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

    const handleExportStudents = async (mode: "contact" | "academic") => {
        setExporting(mode);
        try {
            const users = await getAllUsers();
            const activeUsers = users.filter(u => u.status === "active" || u.status === "imported" || !u.status);

            let headers: string[] = [];
            let rows: string[][] = [];

            if (mode === "contact") {
                headers = ["S.No", "Register Number", "Name", "Email ID", "Phone Number", "College Mail ID"];
                rows = activeUsers.map((u, i) => [
                    String(i + 1), u.registerNumber || "",
                    u.name, u.personalEmail || "", u.phone || "", u.email
                ]);
            } else {
                headers = ["S.No", "Name", "Register Number", "Class/Department", "Year", "Address"];
                rows = activeUsers.map((u, i) => [
                    String(i + 1), u.name, u.registerNumber || "",
                    `${u.department || ""} ${u.section ? `(${u.section})` : ""}`,
                    u.year || "", u.address || ""
                ]);
            }

            downloadCSV(`Directory_${mode}_snapshot`, [headers, ...rows]);
            success(`${mode === "contact" ? "Contact details" : "Academic details"} export generated successfully!`);
        } catch {
            error("Export failed. Please try again.");
        } finally {
            setExporting(null);
        }
    };

    const handleExportTeams = async () => {
        setExporting("teams");
        try {
            const teams = await getTeams();

            const headers = ["S.No", "Team Name", "Event", "Members"];
            const rows = teams.map((t, i) => [
                String(i + 1), t.name, t.eventName || "General", t.memberNames?.join(", ") || ""
            ]);

            downloadCSV(`Teams_snapshot`, [headers, ...rows]);
            success("Minimal teams export generated successfully!");
        } catch {
            error("Export failed. Please try again.");
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto mm-page-animate">
            <div>
                <h1 className="mm-page-title">Export Data</h1>
                <p className="mm-page-subtitle">Download minimal details of students and teams for your records.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Records */}
                <div className="mm-card space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-base">Directory Contact & Academic Data</h2>
                            <p className="text-xs text-slate-500">Download sanitized public records</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            fullWidth
                            size="sm"
                            icon={<Download size={14} />}
                            loading={exporting === "contact"}
                            onClick={() => handleExportStudents("contact")}
                        >
                            Export Contact Details
                        </Button>
                        <Button
                            variant="outline"
                            fullWidth
                            size="sm"
                            icon={<Download size={14} />}
                            loading={exporting === "academic"}
                            onClick={() => handleExportStudents("academic")}
                        >
                            Export Academic & Address Details
                        </Button>
                    </div>
                </div>

                {/* Team Records */}
                <div className="mm-card space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <UsersRound size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-base">Team Directories</h2>
                            <p className="text-xs text-slate-500">Download active team members and groups</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            fullWidth
                            size="sm"
                            icon={<Download size={14} />}
                            loading={exporting === "teams"}
                            onClick={handleExportTeams}
                        >
                            Export Minimal Team List
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
