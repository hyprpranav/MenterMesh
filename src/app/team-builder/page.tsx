"use client";

// ============================================================
// MentorMesh — Visual Team Builder Workspace (DnD + Randomizer)
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveStudents, getEvents, createTeam } from "@/lib/firebase/firestore";
import type { User, Event } from "@/types";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Shuffle, RefreshCw, Star, Lock, Save, Trash2, Plus, Users, Layers, AlertTriangle
} from "lucide-react";
import { shuffleArray, distributeEvenly } from "@/lib/utils";
import {
  DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent, DragStartEvent
} from "@dnd-kit/core";

interface BuilderTeam {
  id: string;
  name: string;
  memberIds: string[];
  leaderId?: string;
}

export default function TeamBuilderPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [students, setStudents] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration
  const [numTeams, setNumTeams] = useState(4);
  const [selectedEventId, setSelectedEventId] = useState("");

  // Builder State
  const [teams, setTeams] = useState<BuilderTeam[]>([]);
  const [unassignedIds, setUnassignedIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Dialogs
  const [clearOpen, setClearOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    async function load() {
      try {
        const [stList, evList] = await Promise.all([
          getActiveStudents(),
          getEvents(),
        ]);
        setStudents(stList);
        setEvents(evList);

        // Initial setup
        const initialUnassigned = stList.map((s) => s.uid);
        setUnassignedIds(initialUnassigned);

        // Initial teams
        const initTeams: BuilderTeam[] = Array.from({ length: 4 }, (_, i) => ({
          id: `team_${i + 1}`,
          name: `Team ${String(i + 1).padStart(2, "0")}`,
          memberIds: [],
        }));
        setTeams(initTeams);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Update number of team columns
  const handleNumTeamsChange = (count: number) => {
    const newCount = Math.max(1, Math.min(20, count));
    setNumTeams(newCount);

    setTeams((prev) => {
      if (newCount > prev.length) {
        const added: BuilderTeam[] = Array.from({ length: newCount - prev.length }, (_, i) => ({
          id: `team_${prev.length + i + 1}`,
          name: `Team ${String(prev.length + i + 1).padStart(2, "0")}`,
          memberIds: [],
        }));
        return [...prev, ...added];
      } else {
        // Return unassigned members from removed columns
        const removed = prev.slice(newCount);
        const returnedIds = removed.flatMap((t) => t.memberIds);
        setUnassignedIds((un) => [...un, ...returnedIds]);
        return prev.slice(0, newCount);
      }
    });
  };

  // Randomize Distribution (#27 spec rule: Distribute all eligible students evenly)
  const handleRandomize = () => {
    if (students.length === 0) return;

    const allStudentIds = students.map((s) => s.uid);
    const shuffled = shuffleArray(allStudentIds);
    const distributed = distributeEvenly(shuffled, teams.length);

    const updatedTeams = teams.map((t, idx) => {
      const assigned = distributed[idx] || [];
      return {
        ...t,
        memberIds: assigned,
        leaderId: assigned[0] || undefined, // auto assign first as leader
      };
    });

    setTeams(updatedTeams);
    setUnassignedIds([]);
    success(`Randomized ${students.length} students into ${teams.length} teams.`);
  };

  // Shuffle existing assignments
  const handleShuffle = () => {
    const allAssigned = teams.flatMap((t) => t.memberIds);
    if (allAssigned.length === 0) {
      warning("No assigned students to shuffle. Click Randomize to assign all students.");
      return;
    }
    const shuffled = shuffleArray(allAssigned);
    const distributed = distributeEvenly(shuffled, teams.length);

    const updatedTeams = teams.map((t, idx) => ({
      ...t,
      memberIds: distributed[idx] || [],
    }));

    setTeams(updatedTeams);
    success("Shuffled team assignments.");
  };

  // Clear all assignments
  const handleClear = () => {
    setTeams((prev) => prev.map((t) => ({ ...t, memberIds: [], leaderId: undefined })));
    setUnassignedIds(students.map((s) => s.uid));
    setClearOpen(false);
    success("Cleared team assignments.");
  };

  // Assign Team Leader
  const handleToggleLeader = (teamId: string, memberId: string) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          leaderId: t.leaderId === memberId ? undefined : memberId,
        };
      })
    );
  };

  // Quick move to team
  const handleMoveToTeam = (studentId: string, targetTeamId: string) => {
    // Remove from unassigned
    setUnassignedIds((prev) => prev.filter((id) => id !== studentId));
    // Remove from current team if present
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === targetTeamId) {
          if (!t.memberIds.includes(studentId)) {
            return { ...t, memberIds: [...t.memberIds, studentId] };
          }
        } else {
          return {
            ...t,
            memberIds: t.memberIds.filter((id) => id !== studentId),
            leaderId: t.leaderId === studentId ? undefined : t.leaderId,
          };
        }
        return t;
      })
    );
  };

  // Move back to unassigned
  const handleMoveToUnassigned = (studentId: string) => {
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        memberIds: t.memberIds.filter((id) => id !== studentId),
        leaderId: t.leaderId === studentId ? undefined : t.leaderId,
      }))
    );
    setUnassignedIds((prev) => [...prev.filter((id) => id !== studentId), studentId]);
  };

  // Finalize All Teams to Firestore
  const handleFinalizeAll = async () => {
    // Validation
    const emptyTeams = teams.filter((t) => t.memberIds.length === 0);
    if (emptyTeams.length > 0) {
      error(`Cannot finalize: ${emptyTeams.length} team(s) are empty.`);
      return;
    }

    setFinalizing(true);
    const selectedEv = events.find((ev) => ev.id === selectedEventId);

    try {
      for (const t of teams) {
        const teamMemberNames = t.memberIds
          .map((id) => students.find((s) => s.uid === id)?.name)
          .filter(Boolean) as string[];

        const leaderObj = students.find((s) => s.uid === t.leaderId);

        await createTeam({
          name: t.name,
          memberIds: t.memberIds,
          memberNames: teamMemberNames,
          leaderId: t.leaderId,
          leaderName: leaderObj?.name,
          eventId: selectedEventId || undefined,
          eventName: selectedEv?.name || undefined,
          status: "finalized",
          createdBy: user?.uid || "",
          createdByName: user?.name || "Staff",
        });
      }

      success(`Successfully finalized and saved ${teams.length} teams to Firestore! 🎉`);
    } catch (err) {
      console.error(err);
      error("Failed to finalize teams.");
    } finally {
      setFinalizing(false);
    }
  };

  // Drag Target Highlight State
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [randomizeConfirmOpen, setRandomizeConfirmOpen] = useState(false);

  if (loading) return <AppShell><LoadingState message="Loading Team Builder Workspace..." /></AppShell>;

  const assignedCount = students.length - unassignedIds.length;

  const handleRandomizeClick = () => {
    if (assignedCount > 0) {
      setRandomizeConfirmOpen(true);
    } else {
      handleRandomize();
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="text-blue-600" size={24} />
              <h1 className="mm-page-title">Team Builder Workspace</h1>
            </div>
            <p className="mm-page-subtitle">
              Visual drag-and-drop team generator. Assign leaders, randomize, and finalize group teams.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={handleRandomizeClick}>
              Randomize
            </Button>
            <Button variant="outline" size="sm" icon={<Shuffle size={14} />} onClick={handleShuffle}>
              Shuffle
            </Button>
            <Button variant="secondary" size="sm" icon={<Trash2 size={14} />} onClick={() => setClearOpen(true)}>
              Clear
            </Button>
            <Button variant="primary" size="sm" icon={<Lock size={14} />} loading={finalizing} onClick={handleFinalizeAll}>
              Finalize Teams
            </Button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Number of Teams */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Number of Teams:</span>
              <input
                type="number"
                min={1}
                max={20}
                className="mm-input py-1 px-2 w-16 text-center"
                value={numTeams}
                onChange={(e) => handleNumTeamsChange(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Event Selector */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Event:</span>
              <select
                className="mm-input py-1 px-2 mm-select w-auto"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">General Project</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900">{assignedCount} / {students.length}</span>
            <span className="text-slate-500">students assigned</span>
            {unassignedIds.length === 0 ? (
              <span className="text-emerald-600 font-bold ml-1">✓ Complete</span>
            ) : (
              <span className="text-amber-600 font-medium ml-1">({unassignedIds.length} remaining)</span>
            )}
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="mm-team-builder">
          {/* Left Column: Unassigned Pool (Drop Zone for returning students) */}
          <div
            className={`mm-team-pool transition-all ${
              dragTargetId === "unassigned" ? "border-blue-500 bg-blue-50/30" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragTargetId("unassigned");
            }}
            onDragLeave={() => setDragTargetId(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragTargetId(null);
              const studentId = e.dataTransfer.getData("text/plain");
              if (studentId) handleMoveToUnassigned(studentId);
            }}
          >
            <div className="mm-team-pool-header flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Unassigned Students ({unassignedIds.length})
              </span>
            </div>

            <div className="mm-team-pool-list">
              {unassignedIds.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  All students assigned to teams!
                </div>
              ) : (
                unassignedIds.map((uId) => {
                  const s = students.find((st) => st.uid === uId);
                  if (!s) return null;
                  return (
                    <div
                      key={s.uid}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", s.uid);
                        setActiveDragId(s.uid);
                      }}
                      onDragEnd={() => setActiveDragId(null)}
                      className={`mm-draggable-student justify-between group cursor-grab active:cursor-grabbing transition-all ${
                        activeDragId === s.uid ? "opacity-40 scale-95 border-blue-400" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={s.name} photoUrl={s.profilePhoto} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.department} • {s.registerNumber}</p>
                        </div>
                      </div>

                      {/* Quick Assign Dropdown Fallback */}
                      <select
                        className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1 py-0.5 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.value) handleMoveToTeam(s.uid, e.target.value);
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Move to...</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Team Columns (Drop Zones) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => {
              const isTarget = dragTargetId === team.id;
              return (
                <div
                  key={team.id}
                  className={`mm-team-column transition-all duration-150 ${
                    isTarget ? "border-blue-500 bg-blue-50/40 shadow-md ring-2 ring-blue-400/20" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragTargetId(team.id);
                  }}
                  onDragLeave={() => setDragTargetId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragTargetId(null);
                    const studentId = e.dataTransfer.getData("text/plain");
                    if (studentId) handleMoveToTeam(studentId, team.id);
                  }}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <input
                      className="font-bold text-slate-900 text-sm bg-transparent border-none focus:outline-none focus:bg-white focus:px-1 rounded"
                      value={team.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, name: newName } : t)));
                      }}
                    />
                    <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {team.memberIds.length} members
                    </span>
                  </div>

                  {/* Team Member List */}
                  <div className="p-2 flex-1 space-y-1.5 overflow-y-auto max-h-[400px] min-h-[140px]">
                    {team.memberIds.length === 0 ? (
                      <div className={`text-center py-8 text-xs rounded-lg border border-dashed transition-colors flex flex-col items-center justify-center gap-1 ${
                        isTarget ? "border-blue-400 text-blue-600 font-bold bg-blue-50/50" : "border-slate-200 text-slate-400"
                      }`}>
                        <span>Drop student here</span>
                      </div>
                    ) : (
                      team.memberIds.map((mId) => {
                        const s = students.find((st) => st.uid === mId);
                        if (!s) return null;
                        const isLeader = team.leaderId === s.uid;

                        return (
                          <div
                            key={s.uid}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", s.uid);
                              setActiveDragId(s.uid);
                            }}
                            onDragEnd={() => setActiveDragId(null)}
                            className={`flex items-center justify-between p-2 bg-white rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-all ${
                              isLeader ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
                            } ${activeDragId === s.uid ? "opacity-40 scale-95" : ""}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={s.name} photoUrl={s.profilePhoto} size="sm" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                                  {isLeader && (
                                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1 py-0.2 rounded shrink-0">
                                      Leader
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400">{s.department}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Leader Toggle */}
                              <button
                                title={isLeader ? "Remove Leader status" : "Set as Team Leader"}
                                onClick={() => handleToggleLeader(team.id, s.uid)}
                                className={`p-1 rounded transition-colors ${
                                  isLeader ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-amber-500"
                                }`}
                              >
                                <Star size={14} fill={isLeader ? "currentColor" : "none"} />
                              </button>

                              {/* Move to unassigned */}
                              <button
                                title="Remove from team"
                                onClick={() => handleMoveToUnassigned(s.uid)}
                                className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm Clear */}
      <ConfirmDialog
        open={clearOpen}
        title="Clear Current Team Arrangements?"
        message="This will return all assigned students back to the unassigned pool."
        confirmLabel="Clear Arrangements"
        onConfirm={handleClear}
        onCancel={() => setClearOpen(false)}
      />

      {/* Confirm Randomize */}
      <ConfirmDialog
        open={randomizeConfirmOpen}
        title="Randomize Teams?"
        message="Randomizing will replace the current team arrangement. Continue?"
        confirmLabel="Randomize"
        onConfirm={() => {
          setRandomizeConfirmOpen(false);
          handleRandomize();
        }}
        onCancel={() => setRandomizeConfirmOpen(false)}
      />
    </AppShell>
  );
}

