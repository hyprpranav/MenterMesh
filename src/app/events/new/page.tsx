"use client";

// ============================================================
// MentorMesh — Create / Submit Event Page (Student + Staff)
// ============================================================
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { createEvent, getUserTeams } from "@/lib/firebase/firestore";
import type { Team } from "@/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Calendar, Users, Award, ExternalLink, FileText, X } from "lucide-react";
import { CloudinaryImageUpload } from "@/components/ui/CloudinaryImageUpload";

const EVENT_TYPES = [
  "Hackathon",
  "Designathon",
  "Project Expo",
  "Workshop",
  "Competition",
  "Bootcamp",
  "Internship",
  "Symposium",
  "Seminar",
  "Other",
];

const RESULTS_LIST = [
  "Winner / 1st Place 🏆",
  "1st Runner Up 🥈",
  "2nd Runner Up 🥉",
  "Top 10 Finalist 🌟",
  "Special Jury Award 🎖️",
  "Participant / Completed 📜",
];

export default function CreateEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { success, error } = useToast();

  const isStaff = user?.role === "staff" || user?.role === "master";

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("Hackathon");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [description, setDescription] = useState("");

  // Team & Participation
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [eventTrack, setEventTrack] = useState("");
  const [roleInEvent, setRoleInEvent] = useState("");
  const [participantNames, setParticipantNames] = useState<string[]>([]);

  // Experience & Learnings
  const [whatBuilt, setWhatBuilt] = useState("");
  const [whatLearned, setWhatLearned] = useState("");
  const [challenges, setChallenges] = useState("");
  const [result, setResult] = useState("Participant / Completed 📜");

  // Media & External Links
  const [photosLink, setPhotosLink] = useState("");
  const [documentsLink, setDocumentsLink] = useState("");
  const [certificatesLink, setCertificatesLink] = useState("");
  const [certificateFile, setCertificateFile] = useState("");
  const [geotagPhotos, setGeotagPhotos] = useState<string[]>([]);
  const [driveLink, setDriveLink] = useState("");
  const [linkedInPost, setLinkedInPost] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  const [saving, setSaving] = useState(false);

  // Load user teams if student
  useEffect(() => {
    async function load() {
      if (user?.uid) {
        const teams = await getUserTeams(user.uid);
        setUserTeams(teams);
      }
    }
    load();
  }, [user]);

  // Handle Team Selection (Auto fill team members)
  const handleTeamChange = (tId: string) => {
    setSelectedTeamId(tId);
    const found = userTeams.find((t) => t.id === tId);
    if (found) {
      setParticipantNames(found.memberNames || []);
    } else {
      setParticipantNames([]);
    }
  };

  const handleGeotagUpload = (url: string) => {
    if (geotagPhotos.length >= 5) {
      error("Maximum 5 photos allowed.");
      return;
    }
    setGeotagPhotos((prev) => [...prev, url]);
  };

  const handleSave = async (asDraft = false) => {
    if (!name.trim() || !date || !user) return;

    if (geotagPhotos.length < 1) {
      error("Please upload at least one geotagged photo of the event.");
      return;
    }

    setSaving(true);

    try {
      const selectedTeamObj = userTeams.find((t) => t.id === selectedTeamId);

      const id = await createEvent({
        name: name.trim(),
        type,
        date,
        endDate: endDate || undefined,
        location: location.trim() || undefined,
        venue: venue.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        organizer: organizer.trim() || undefined,
        description: description.trim() || undefined,
        teamId: selectedTeamId || undefined,
        teamName: selectedTeamObj?.name || undefined,
        participantIds: selectedTeamObj?.memberIds || [user.uid],
        participantNames: participantNames.length > 0 ? participantNames : [user.name],
        roleInEvent: roleInEvent.trim() || undefined,
        eventTrack: eventTrack.trim() || undefined,
        projectTitle: projectTitle.trim() || undefined,
        whatBuilt: whatBuilt.trim() || undefined,
        whatLearned: whatLearned.trim() || undefined,
        challenges: challenges.trim() || undefined,
        result,
        photosLink: photosLink.trim() || undefined,
        documentsLink: documentsLink.trim() || undefined,
        certificatesLink: certificatesLink.trim() || undefined,
        certificateFile: certificateFile || undefined,
        geotagPhotos: geotagPhotos.length > 0 ? geotagPhotos : undefined,
        driveLink: driveLink.trim() || undefined,
        linkedInPost: linkedInPost.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        liveUrl: liveUrl.trim() || undefined,
        status: "upcoming",
        submissionStatus: isStaff ? "approved" : asDraft ? "draft" : "pending_review",
        submittedBy: user.uid,
        submittedByName: user.name,
        submittedByPhoto: user.profilePhoto,
        createdBy: user.uid,
      });

      if (asDraft) {
        success("Event submission saved as Draft!");
      } else if (isStaff) {
        success(`Event "${name}" published successfully!`);
      } else {
        success("Event submitted for mentor review! Notification sent to staff.");
      }

      router.push(`/events/${id}`);
    } catch (err) {
      console.error(err);
      error("Failed to submit event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto w-full mm-page-animate">
        <Link href="/events" className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Events
        </Link>

        <div className="mm-card space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isStaff ? "Publish College Event" : "Submit Event Participation"}
              </h1>
              <p className="text-xs text-slate-500">
                {isStaff
                  ? "Publish an event announcement for students across all departments and years."
                  : "Submit hackathon or competition participation for faculty verification."}
              </p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} /> 1. Event Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mm-label">Event Name <span style={{ color: "var(--color-danger)" }}>*</span></label>
                  <input
                    className="mm-input"
                    placeholder="e.g. Smart India Hackathon 2026 / VLSI Designathon"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mm-label">Event Type</label>
                  <select
                    className="mm-input mm-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mm-label">Start Date <span style={{ color: "var(--color-danger)" }}>*</span></label>
                  <input
                    type="date"
                    className="mm-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mm-label">End Date (optional)</label>
                  <input
                    type="date"
                    className="mm-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mm-label">Venue / College</label>
                  <input
                    className="mm-input"
                    placeholder="e.g. Main Auditorium"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mm-label">City</label>
                  <input
                    className="mm-input"
                    placeholder="e.g. Salem / Chennai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mm-label">State</label>
                  <input
                    className="mm-input"
                    placeholder="e.g. Tamil Nadu"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Team & Participation */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} /> 2. Team & Participation
                </h3>
                <Link href="/teams" className="text-xs text-blue-600 hover:underline font-medium">
                  + Create New Team
                </Link>
              </div>

              {userTeams.length > 0 ? (
                <div>
                  <label className="mm-label">Select Your Team (Auto-populates members)</label>
                  <select
                    className="mm-input mm-select"
                    value={selectedTeamId}
                    onChange={(e) => handleTeamChange(e.target.value)}
                  >
                    <option value="">Individual Participation (Just Me)</option>
                    {userTeams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.memberIds.length} members)</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                  <span>Submitting as individual. Have team members? Create a team on the Teams page.</span>
                  <Link href="/teams" className="font-semibold text-blue-700 underline">
                    Teams Page →
                  </Link>
                </div>
              )}

              {participantNames.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Team Members Included:</p>
                  <div className="flex flex-wrap gap-1">
                    {participantNames.map((mn, i) => (
                      <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-700 font-medium">
                        ✓ {mn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mm-label">Project Title / Theme</label>
                  <input
                    className="mm-input"
                    placeholder="e.g. Smart Agriculture Bot"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mm-label">Event Track / Category</label>
                  <input
                    className="mm-input"
                    placeholder="e.g. AI/ML, Hardware, Open Innovation"
                    value={eventTrack}
                    onChange={(e) => setEventTrack(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Experience & Achievements */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award size={14} /> 3. Experience & Result
              </h3>

              <div>
                <label className="mm-label">Result / Achievement</label>
                <select
                  className="mm-input mm-select"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                >
                  {RESULTS_LIST.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mm-label">What did you build / create?</label>
                <textarea
                  className="mm-input resize-none"
                  rows={2}
                  placeholder="Describe your prototype, hardware, or software solution..."
                  value={whatBuilt}
                  onChange={(e) => setWhatBuilt(e.target.value)}
                />
              </div>

              <div>
                <label className="mm-label">Key Learnings & Challenges</label>
                <textarea
                  className="mm-input resize-none"
                  rows={2}
                  placeholder="What key technical skills did you gain or obstacles did you overcome?"
                  value={whatLearned}
                  onChange={(e) => setWhatLearned(e.target.value)}
                />
              </div>
            </div>

            {/* Event Specific Documents & Uploads */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} /> 4. Event Documents & Geotag Photos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-2">Event Certificate</h4>
                  <CloudinaryImageUpload
                    label="Upload Participation/Winner Certificate"
                    buttonText="Select Certificate Image"
                    existingUrl={certificateFile}
                    onUploadSuccess={(url) => setCertificateFile(url)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-800 text-sm">Geotagged Photos *</h4>
                    <span className="text-xs text-slate-500">{geotagPhotos.length} / 5</span>
                  </div>
                  <CloudinaryImageUpload
                    label="Minimum 1, Maximum 5 Photos"
                    buttonText="Upload Geotag Photo"
                    onUploadSuccess={handleGeotagUpload}
                  />

                  {geotagPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 block">
                      {geotagPhotos.map((url, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-200 group">
                          <img src={url} alt="Geotag" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setGeotagPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Media & External Links */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink size={14} /> 5. External Links (Optional)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mm-label">Google Drive Folder Link</label>
                  <input
                    className="mm-input"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mm-label">LinkedIn Post URL</label>
                  <input
                    className="mm-input"
                    placeholder="https://linkedin.com/posts/..."
                    value={linkedInPost}
                    onChange={(e) => setLinkedInPost(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mm-label">GitHub Repository URL</label>
                  <input
                    className="mm-input"
                    placeholder="https://github.com/..."
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mm-label">Live Demo Link (if any)</label>
                  <input
                    className="mm-input"
                    placeholder="https://..."
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Footer Action Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Link href="/events">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>

              <div className="flex items-center gap-2">
                {!isStaff && (
                  <Button
                    type="button"
                    variant="outline"
                    loading={saving}
                    onClick={() => handleSave(true)}
                  >
                    Save Draft
                  </Button>
                )}

                <Button type="submit" variant="primary" loading={saving}>
                  {isStaff ? "Publish Event" : "Submit Event"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

