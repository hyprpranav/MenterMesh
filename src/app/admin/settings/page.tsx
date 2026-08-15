"use client";

// ============================================================
// MentorMesh — System Settings Page
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getSettings, updateSettings } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { DEFAULT_SETTINGS } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [appName, setAppName] = useState(DEFAULT_SETTINGS.appName);
  const [tagline, setTagline] = useState(DEFAULT_SETTINGS.tagline);
  const [mentorName, setMentorName] = useState("");
  const [department, setDepartment] = useState("ECE");
  const [academicYear, setAcademicYear] = useState(DEFAULT_SETTINGS.academicYear);
  const [maxTeamSize, setMaxTeamSize] = useState(DEFAULT_SETTINGS.maxTeamSize);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings();
        if (data) {
          setAppName(data.appName || DEFAULT_SETTINGS.appName);
          setTagline(data.tagline || DEFAULT_SETTINGS.tagline);
          setMentorName(data.mentorName || "");
          setDepartment(data.department || "ECE");
          setAcademicYear(data.academicYear || DEFAULT_SETTINGS.academicYear);
          setMaxTeamSize(data.maxTeamSize || DEFAULT_SETTINGS.maxTeamSize);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        appName,
        tagline,
        mentorName,
        department,
        academicYear,
        maxTeamSize,
      });
      success("System configuration saved successfully!");
    } catch {
      error("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="mm-page-title">System Settings</h1>
        <p className="mm-page-subtitle">Configure application branding, mentor group parameters, and team constraints.</p>
      </div>

      <div className="mm-card space-y-6">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="mm-label">Application Name</label>
            <input
              className="mm-input"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>

          <div>
            <label className="mm-label">Tagline</label>
            <input
              className="mm-input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mm-label">Faculty Mentor Name</label>
              <input
                className="mm-input"
                placeholder="e.g. Dr. Saravana Kumar"
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
              />
            </div>

            <div>
              <label className="mm-label">Primary Department</label>
              <input
                className="mm-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mm-label">Academic Year</label>
              <input
                className="mm-input"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>

            <div>
              <label className="mm-label">Maximum Members Per Team</label>
              <input
                type="number"
                min={1}
                max={20}
                className="mm-input"
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(parseInt(e.target.value) || 5)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={16} />}>
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
