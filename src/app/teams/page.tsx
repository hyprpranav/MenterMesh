"use client";

// ============================================================
// MentorMesh — Teams List Page & Team Creation
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getTeams, createTeam, getEvents } from "@/lib/firebase/firestore";
import type { Team, Event } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { UsersRound, Plus, Layers, Star } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";

export default function TeamsPage() {
  return (
    <AppShell>
      <TeamsContent />
    </AppShell>
  );
}

function TeamsContent() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Create Team Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [tmList, evList] = await Promise.all([getTeams(), getEvents()]);
        setTeams(tmList);
        setEvents(evList);
      } catch (err) {
        console.error("Error loading teams:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredTeams = teams.filter((t) => {
    if (filterStatus === "all") return true;
    return t.status === filterStatus;
  });

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setCreating(true);
    const selectedEv = events.find((ev) => ev.id === eventId);
    try {
      await createTeam({
        name: name.trim(),
        memberIds: [user.uid],
        memberNames: [user.name],
        leaderId: user.uid,
        leaderName: user.name,
        eventId: eventId || undefined,
        eventName: selectedEv?.name || undefined,
        status: "draft",
        description: description.trim() || undefined,
        createdBy: user.uid,
        createdByName: user.name,
      });
      success(`Team "${name}" created successfully.`);
      setCreateOpen(false);
      setName("");
      setEventId("");
      setDescription("");
      const updated = await getTeams();
      setTeams(updated);
    } catch (err) {
      console.error(err);
      error("Failed to create team.");
    } finally {
      setCreating(false);
    }
  };

  const tabs = [
    { id: "all", label: "All Teams", count: teams.length },
    { id: "draft", label: "Draft" },
    { id: "finalized", label: "Finalized" },
  ];

  return (
    <div className="space-y-6 mm-page-animate">
      <PageHeader
        icon={<UsersRound size={20} />}
        iconClass="bg-blue-100 text-blue-600"
        title="Teams"
        subtitle="Form and explore project teams for hackathons and group projects."
        actions={
          <>
            {(user?.role === "staff" || user?.role === "master") && (
              <Link href="/team-builder">
                <Button variant="outline" size="sm" icon={<Layers size={14} />}>
                  Team Builder
                </Button>
              </Link>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setCreateOpen(true)}
            >
              Create Team
            </Button>
          </>
        }
      />

      <Tabs tabs={tabs} activeTab={filterStatus} onTabChange={setFilterStatus} />

      {/* Grid */}
      {loading ? (
        <LoadingState message="Loading teams..." />
      ) : filteredTeams.length === 0 ? (
        <EmptyState
          icon={<UsersRound size={40} />}
          title="No teams found"
          description="Create your first team to get started."
          action={{ label: "Create Team", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Team"
        description="Set up a team for a hackathon or group project."
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-team-form"
              variant="primary"
              loading={creating}
            >
              Create Team
            </Button>
          </>
        }
      >
        <form id="create-team-form" onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="mm-label">
              Team Name <span className="required">*</span>
            </label>
            <input
              className="mm-input"
              placeholder="e.g. Team ByteCrafters / Team 04"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mm-label">Associated Event (optional)</label>
            <select
              className="mm-input mm-select"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">No specific event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mm-label">Project Description (optional)</label>
            <textarea
              className="mm-input resize-none"
              rows={3}
              placeholder="Briefly describe what your team is building..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  return (
    <div className="mm-card flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
      <div className="space-y-2.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-slate-900 text-base leading-snug">{team.name}</h3>
          <Badge variant={team.status === "finalized" ? "finalized" : "draft"}>
            {team.status.toUpperCase()}
          </Badge>
        </div>

        {team.eventName && (
          <p className="text-xs text-blue-600 font-semibold">{team.eventName}</p>
        )}

        {team.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{team.description}</p>
        )}

        <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
          <p>
            <span className="font-semibold text-slate-700">Members ({team.memberIds.length}):</span>
          </p>
          <p className="text-slate-500 truncate mt-0.5">
            {team.memberNames?.join(", ") || `${team.memberIds.length} members`}
          </p>
        </div>

        {team.leaderName && (
          <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 border border-amber-100">
            <Star size={10} fill="currentColor" /> Leader: {team.leaderName}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400">By {team.createdByName}</span>
        <Link
          href={`/teams/${team.id}`}
          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
