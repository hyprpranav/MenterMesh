"use client";

// ============================================================
// MentorMesh — Visual Team Builder Workspace  (v2 – Side-by-Side + Touch DnD)
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveStudents, getEvents, createTeam } from "@/lib/firebase/firestore";
import type { User, Event } from "@/types";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { Shuffle, RefreshCw, Star, Lock, Trash2, Layers, Search, GripVertical } from "lucide-react";
import { shuffleArray, distributeEvenly } from "@/lib/utils";

interface BuilderTeam {
  id: string;
  name: string;
  memberIds: string[];
  leaderId?: string;
}

// ── Drag state shared across components ──
let _dragId: string | null = null;
let _dragSource: string | null = null;

export default function TeamBuilderPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [students, setStudents] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Config
  const [numTeams, setNumTeams] = useState(4);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSec, setFilterSec] = useState("All");
  const [filterDept, setFilterDept] = useState("All");

  // Builder state
  const [teams, setTeams] = useState<BuilderTeam[]>([]);
  const [unassignedIds, setUnassignedIds] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragSource, setActiveDragSource] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  // Dialogs
  const [clearOpen, setClearOpen] = useState(false);
  const [randomizeConfirmOpen, setRandomizeConfirmOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [stList, evList] = await Promise.all([getActiveStudents(), getEvents()]);
        setStudents(stList);
        setEvents(evList);
        setUnassignedIds(stList.map((s) => s.uid));
        setTeams(Array.from({ length: 4 }, (_, i) => ({
          id: `team_${i + 1}`,
          name: `Team ${String(i + 1).padStart(2, "0")}`,
          memberIds: [],
        })));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // ── Team Count ──
  const handleNumTeamsChange = (count: number) => {
    const n = Math.max(1, Math.min(20, count));
    setNumTeams(n);
    setTeams((prev) => {
      if (n > prev.length) {
        const added: BuilderTeam[] = Array.from({ length: n - prev.length }, (_, i) => ({
          id: `team_${prev.length + i + 1}`,
          name: `Team ${String(prev.length + i + 1).padStart(2, "0")}`,
          memberIds: [],
        }));
        return [...prev, ...added];
      } else {
        const removed = prev.slice(n);
        const returnedIds = removed.flatMap((t) => t.memberIds);
        setUnassignedIds((un) => [...un, ...returnedIds]);
        return prev.slice(0, n);
      }
    });
  };

  // ── Move helpers ──
  const handleMoveToTeam = useCallback((studentId: string, targetTeamId: string, source: string) => {
    // If pulling directly from unassigned, it shouldn't strip them from other teams
    // allowing them to exist in multiple teams (duplication support).
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === targetTeamId) {
          // Add to target
          return t.memberIds.includes(studentId) ? t : { ...t, memberIds: [...t.memberIds, studentId] };
        }
        if (t.id === source && source !== "unassigned") {
          // If we dragged from another team (Move), remove them from THAT source team
          return { ...t, memberIds: t.memberIds.filter((id) => id !== studentId), leaderId: t.leaderId === studentId ? undefined : t.leaderId };
        }
        // Don't modify other teams the student might belong to
        return t;
      })
    );

    // If source was unassigned, DO NOT remove them from the pool permanently (so they can be duplicated).
    // Or, remove them from unassigned, and they can click "Duplicate" to put them back.
    // User requested "a button Duplicate to make the person available for another team".
    if (source === "unassigned") {
      setUnassignedIds((prev) => prev.filter((id) => id !== studentId));
    }
  }, []);

  const handleDuplicateToPool = useCallback((studentId: string) => {
    // Puts student back into the unassigned pool so they can be assigned to a 2nd team
    setUnassignedIds((prev) => prev.includes(studentId) ? prev : [studentId, ...prev]);
  }, []);

  const handleMoveToUnassigned = useCallback((studentId: string, source: string) => {
    if (source && source !== "unassigned") {
      setTeams((prev) => prev.map((t) => (t.id === source ? {
        ...t, memberIds: t.memberIds.filter((id) => id !== studentId),
        leaderId: t.leaderId === studentId ? undefined : t.leaderId,
      } : t)));
    } else {
      // If we don't know source, just wipe them from all teams to be safe
      setTeams((prev) => prev.map((t) => ({
        ...t, memberIds: t.memberIds.filter((id) => id !== studentId),
        leaderId: t.leaderId === studentId ? undefined : t.leaderId,
      })));
    }
    setUnassignedIds((prev) => prev.includes(studentId) ? prev : [studentId, ...prev]);
  }, []);

  // ── Drop handler (shared) ──
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragTargetId(null);
    const dataStr = e.dataTransfer.getData("text/plain");
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (targetId === "unassigned") handleMoveToUnassigned(data.id, data.source);
      else handleMoveToTeam(data.id, targetId, data.source);
    } catch {
      // Fallback
      if (targetId === "unassigned") handleMoveToUnassigned(dataStr, "unknown");
      else handleMoveToTeam(dataStr, targetId, "unknown");
    }
  }, [handleMoveToUnassigned, handleMoveToTeam]);

  // ── Touch DnD ──
  // We use a ghost element approach for mobile
  const ghostRef = React.useRef<HTMLDivElement | null>(null);
  const touchStudentRef = React.useRef<string | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, studentId: string, studentName: string, source: string) => {
    touchStudentRef.current = studentId;
    _dragId = studentId;
    _dragSource = source;
    setActiveDragId(studentId);
    setActiveDragSource(source);

    // Create ghost
    const ghost = document.createElement("div");
    ghost.id = "mm-touch-ghost";
    ghost.textContent = studentName;
    ghost.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none;
      background:#2563EB; color:#fff; font-size:13px; font-weight:700;
      padding:8px 16px; border-radius:20px; white-space:nowrap;
      box-shadow:0 8px 24px rgba(0,0,0,0.25); opacity:0.9;
      transform:translate(-50%,-50%); top:-100px; left:-100px;
    `;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!ghostRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    ghostRef.current.style.left = `${touch.clientX}px`;
    ghostRef.current.style.top = `${touch.clientY}px`;

    // Highlight drop target
    ghostRef.current.style.display = "none";
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    ghostRef.current.style.display = "";
    const dropZone = el?.closest("[data-dropzone]") as HTMLElement | null;

    document.querySelectorAll("[data-dropzone]").forEach((z) => z.classList.remove("mm-drop-active"));
    if (dropZone) { dropZone.classList.add("mm-drop-active"); setDragTargetId(dropZone.dataset.dropzone || null); }
    else setDragTargetId(null);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const ghost = ghostRef.current;
    if (ghost) { ghost.remove(); ghostRef.current = null; }

    const studentId = touchStudentRef.current;
    const source = _dragSource;
    touchStudentRef.current = null;
    _dragId = null;
    _dragSource = null;
    setActiveDragId(null);
    setActiveDragSource(null);
    setDragTargetId(null);
    document.querySelectorAll("[data-dropzone]").forEach((z) => z.classList.remove("mm-drop-active"));

    if (!studentId || !dragTargetId) return;
    const target = dragTargetId;
    if (target === "unassigned") handleMoveToUnassigned(studentId, source || "unknown");
    else handleMoveToTeam(studentId, target, source || "unknown");
  }, [dragTargetId, handleMoveToUnassigned, handleMoveToTeam]);

  // ── Randomize ──
  const handleRandomize = () => {
    if (!students.length) return;
    const shuffled = shuffleArray(students.map((s) => s.uid));
    const distributed = distributeEvenly(shuffled, teams.length);
    setTeams(teams.map((t, idx) => ({ ...t, memberIds: distributed[idx] || [], leaderId: distributed[idx]?.[0] })));
    setUnassignedIds([]);
    success(`Randomized ${students.length} students into ${teams.length} teams.`);
  };

  const handleShuffle = () => {
    const allAssigned = teams.flatMap((t) => t.memberIds);
    if (!allAssigned.length) { warning("No assigned students to shuffle. Click Randomize first."); return; }
    const distributed = distributeEvenly(shuffleArray(allAssigned), teams.length);
    setTeams(teams.map((t, idx) => ({ ...t, memberIds: distributed[idx] || [] })));
    success("Shuffled team assignments.");
  };

  const handleClear = () => {
    setTeams((prev) => prev.map((t) => ({ ...t, memberIds: [], leaderId: undefined })));
    setUnassignedIds(students.map((s) => s.uid));
    setClearOpen(false);
    success("Cleared team assignments.");
  };

  const handleToggleLeader = (teamId: string, memberId: string) => {
    setTeams((prev) => prev.map((t) => t.id !== teamId ? t : { ...t, leaderId: t.leaderId === memberId ? undefined : memberId }));
  };

  const handleFinalizeAll = async () => {
    const emptyTeams = teams.filter((t) => t.memberIds.length === 0);
    if (emptyTeams.length) { error(`Cannot finalize: ${emptyTeams.length} team(s) are empty.`); return; }
    setFinalizing(true);
    const selectedEv = events.find((ev) => ev.id === selectedEventId);
    try {
      for (const t of teams) {
        const memberNames = t.memberIds.map((id) => students.find((s) => s.uid === id)?.name).filter(Boolean) as string[];
        const leaderObj = students.find((s) => s.uid === t.leaderId);
        await createTeam({
          name: t.name, memberIds: t.memberIds, memberNames,
          leaderId: t.leaderId, leaderName: leaderObj?.name,
          eventId: selectedEventId || undefined, eventName: selectedEv?.name || undefined,
          status: "finalized", createdBy: user?.uid || "", createdByName: user?.name || "Staff",
        });
      }
      success(`Finalized and saved ${teams.length} teams! 🎉`);
    } catch { error("Failed to finalize teams."); }
    finally { setFinalizing(false); }
  };

  if (loading) return <AppShell><LoadingState message="Loading Team Builder Workspace..." /></AppShell>;

  const assignedCount = students.length - unassignedIds.length;
  const visibleUnassigned = unassignedIds.filter((uId) => {
    const s = students.find((st) => st.uid === uId);
    if (!s) return false;
    if (filterDept !== "All" && s.department !== filterDept) return false;
    if (filterSec !== "All" && s.section?.toUpperCase() !== filterSec.toUpperCase()) return false;
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.registerNumber && s.registerNumber.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <AppShell>
      <style>{`
        .mm-drop-active { border-color:#3B82F6 !important; background:rgba(59,130,246,0.08) !important; }
        .mm-builder-layout { display:grid; grid-template-columns:260px 1fr; gap:1rem; height:calc(100dvh - 200px); min-height:500px; }
        @media(max-width:768px){ .mm-builder-layout { grid-template-columns:1fr; height:auto; } }
        .mm-pool-panel { display:flex; flex-direction:column; border:1.5px solid var(--color-border); border-radius:14px; background:var(--color-surface); overflow:hidden; min-height:0; }
        .mm-pool-header { padding:0.75rem; border-bottom:1px solid var(--color-border); background:var(--color-bg); flex-shrink:0; }
        .mm-pool-list { flex:1; overflow-y:auto; padding:0.5rem; min-height:0; }
        
        /* Mobile horizontal layout for unassigned pool avoiding "no team" illusion */
        @media(max-width:768px){ 
          .mm-pool-panel { max-height: 200px; }
          .mm-pool-list { display: flex; flex-direction: row; overflow-x: auto; overflow-y: hidden; max-height: none; gap: 0.5rem; flex-wrap: nowrap; padding-bottom: 0.75rem; }
          .mm-drag-chip { min-width: 140px; max-width: 140px; flex-shrink: 0; margin-bottom: 0; }
        }

        .mm-teams-panel { display:flex; flex-direction:column; min-height:0; overflow:hidden; }
        .mm-teams-grid { flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0.75rem; padding:0.25rem; align-content:start; }
        @media(max-width:768px){ .mm-teams-grid { grid-template-columns:1fr 1fr; overflow-y:visible; } }
        @media(max-width:480px){ .mm-teams-grid { grid-template-columns:1fr; } }
        .mm-team-col { border:1.5px solid var(--color-border); border-radius:12px; background:var(--color-surface); display:flex; flex-direction:column; transition:all 0.15s; min-height:160px; }
        .mm-team-col-header { padding:0.5rem 0.625rem; border-bottom:1px solid var(--color-border); background:var(--color-bg); display:flex; align-items:center; justify-content:space-between; border-radius:10px 10px 0 0; flex-shrink:0; }
        .mm-team-col-body { padding:0.375rem; flex:1; overflow-y:auto; max-height:260px; }
        .mm-drag-chip { display:flex; align-items:center; gap:0.5rem; padding:0.375rem 0.5rem; background:#fff; border:1px solid var(--color-border); border-radius:8px; cursor:grab; transition:all 0.1s; margin-bottom:3px; }
        .mm-drag-chip:active { cursor:grabbing; opacity:0.5; transform:scale(0.97); }
        .mm-drag-chip:hover { border-color:#93C5FD; background:#F0F9FF; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={22} color="#2563EB" />
              <h1 className="mm-page-title">Team Builder</h1>
            </div>
            <p className="mm-page-subtitle">Drag & drop students into teams. Works on mobile too.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => assignedCount > 0 ? setRandomizeConfirmOpen(true) : handleRandomize()}>Randomize</Button>
            <Button variant="outline" size="sm" icon={<Shuffle size={14} />} onClick={handleShuffle}>Shuffle</Button>
            <Button variant="secondary" size="sm" icon={<Trash2 size={14} />} onClick={() => setClearOpen(true)}>Clear</Button>
            <Button variant="primary" size="sm" icon={<Lock size={14} />} loading={finalizing} onClick={handleFinalizeAll}>Finalize Teams</Button>
          </div>
        </div>

        {/* Config Bar */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "0.625rem 1rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexShrink: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "var(--color-text-2)" }}>Teams:</span>
              <input type="number" min={1} max={20} className="mm-input" style={{ width: 60, padding: "4px 8px", textAlign: "center" }}
                value={numTeams} onChange={(e) => handleNumTeamsChange(parseInt(e.target.value) || 1)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "var(--color-text-2)" }}>Event:</span>
              <select className="mm-input mm-select" style={{ padding: "4px 8px", width: "auto" }} value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                <option value="">General Project</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", padding: "4px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13 }}>
            <span style={{ fontWeight: 800, color: "var(--color-text)" }}>{assignedCount}/{students.length}</span>
            <span style={{ color: "var(--color-muted)" }}>assigned</span>
            {unassignedIds.length === 0
              ? <span style={{ color: "#16A34A", fontWeight: 700 }}>✓ Complete</span>
              : <span style={{ color: "#D97706", fontWeight: 500 }}>({unassignedIds.length} left)</span>}
          </div>
        </div>

        {/* ── Main Builder Layout: Pool | Teams ── */}
        <div className="mm-builder-layout">

          {/* ── Left: Unassigned Pool ── */}
          <div className="mm-pool-panel"
            data-dropzone="unassigned"
            style={{ borderColor: dragTargetId === "unassigned" ? "#3B82F6" : undefined, background: dragTargetId === "unassigned" ? "rgba(59,130,246,0.05)" : undefined }}
            onDragOver={(e) => { e.preventDefault(); setDragTargetId("unassigned"); }}
            onDragLeave={() => setDragTargetId(null)}
            onDrop={(e) => handleDrop(e, "unassigned")}
          >
            <div className="mm-pool-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "var(--color-text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Unassigned ({unassignedIds.length})
                </span>
              </div>
              {/* Mini Filters */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <div style={{ position: "relative" }}>
                  <Search size={12} style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                  <input type="text" placeholder="Search student..." style={{ width: "100%", paddingLeft: 26, paddingRight: 8, paddingTop: 5, paddingBottom: 5, fontSize: 11, border: "1px solid var(--color-border)", borderRadius: 7, outline: "none", background: "#F8FAFC", boxSizing: "border-box" }}
                    value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem" }}>
                  <select style={{ fontSize: 11, padding: "4px 6px", border: "1px solid var(--color-border)", borderRadius: 7, background: "#F8FAFC", outline: "none" }} value={filterSec} onChange={(e) => setFilterSec(e.target.value)}>
                    <option value="All">All Secs</option>
                    {["A", "B", "C", "D", "E", "F", "VLSI-1", "VLSI-2"].map((s) => <option key={s} value={s}>Sec {s}</option>)}
                  </select>
                  <select style={{ fontSize: 11, padding: "4px 6px", border: "1px solid var(--color-border)", borderRadius: 7, background: "#F8FAFC", outline: "none" }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                    <option value="All">All Depts</option>
                    {["ECE", "CSE", "EEE", "MECH", "IT", "AI & DS"].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mm-pool-list">
              {visibleUnassigned.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 0.5rem", fontSize: 12, color: "var(--color-muted)" }}>
                  {unassignedIds.length === 0 ? "All students assigned! 🎉" : "No matches"}
                </div>
              ) : visibleUnassigned.map((uId) => {
                const s = students.find((st) => st.uid === uId);
                if (!s) return null;
                const isDragging = activeDragId === s.uid;
                return (
                  <div key={s.uid}
                    className="mm-drag-chip"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ id: s.uid, source: "unassigned" })); setActiveDragId(s.uid); setActiveDragSource("unassigned"); }}
                    onDragEnd={() => { setActiveDragId(null); setActiveDragSource(null); }}
                    onTouchStart={(e) => handleTouchStart(e, s.uid, s.name, "unassigned")}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ opacity: isDragging ? 0.35 : 1 }}
                  >
                    <GripVertical size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
                    <Avatar name={s.name} photoUrl={s.profilePhoto} size="xs" />
                    <div style={{ minWidth: 0, flex: 1, whiteSpace: "nowrap" }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
                      <p style={{ fontSize: 10, color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{s.department} · {s.registerNumber}</p>
                    </div>
                    {/* Quick assign */}
                    <select defaultValue="" style={{ fontSize: 10, border: "1px solid var(--color-border)", borderRadius: 6, padding: "2px 4px", background: "#F1F5F9", cursor: "pointer", flexShrink: 0, outline: "none", width: 34 }}
                      onChange={(e) => { if (e.target.value) { handleMoveToTeam(s.uid, e.target.value, "unassigned"); e.target.value = ""; } }}>
                      <option value="" disabled>→</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Teams Grid ── */}
          <div className="mm-teams-panel">
            <div className="mm-teams-grid">
              {teams.map((team) => {
                const isTarget = dragTargetId === team.id;
                return (
                  <div key={team.id}
                    className="mm-team-col"
                    data-dropzone={team.id}
                    style={{ borderColor: isTarget ? "#3B82F6" : undefined, boxShadow: isTarget ? "0 0 0 3px rgba(59,130,246,0.15)" : undefined }}
                    onDragOver={(e) => { e.preventDefault(); setDragTargetId(team.id); }}
                    onDragLeave={() => setDragTargetId(null)}
                    onDrop={(e) => handleDrop(e, team.id)}
                  >
                    {/* Team Header */}
                    <div className="mm-team-col-header">
                      <input
                        style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text)", background: "transparent", border: "none", outline: "none", minWidth: 0, flex: 1 }}
                        value={team.name}
                        onChange={(e) => setTeams((prev) => prev.map((t) => t.id === team.id ? { ...t, name: e.target.value } : t))}
                      />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 99, padding: "2px 7px", flexShrink: 0 }}>
                        {team.memberIds.length}
                      </span>
                    </div>

                    {/* Members */}
                    <div className="mm-team-col-body"
                      style={{ background: isTarget ? "rgba(59,130,246,0.04)" : undefined }}>
                      {team.memberIds.length === 0 ? (
                        <div style={{ border: "1.5px dashed", borderColor: isTarget ? "#3B82F6" : "#D1D5DB", borderRadius: 8, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: isTarget ? "#2563EB" : "#9CA3AF", fontWeight: isTarget ? 700 : 400, margin: "4px" }}>
                          Drop here
                        </div>
                      ) : (
                        team.memberIds.map((mId) => {
                          const s = students.find((st) => st.uid === mId);
                          if (!s) return null;
                          const isLeader = team.leaderId === s.uid;
                          const isDragging = activeDragId === s.uid;
                          return (
                            <div key={s.uid}
                              className="mm-drag-chip"
                              draggable
                              onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ id: s.uid, source: team.id })); setActiveDragId(s.uid); setActiveDragSource(team.id); }}
                              onDragEnd={() => { setActiveDragId(null); setActiveDragSource(null); }}
                              onTouchStart={(e) => handleTouchStart(e, s.uid, s.name, team.id)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              style={{ opacity: isDragging ? 0.35 : 1, borderColor: isLeader ? "#FDE68A" : undefined, background: isLeader ? "#FFFBEB" : undefined, flexDirection: "column", alignItems: "stretch", padding: "0.25rem 0.5rem" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <GripVertical size={11} color="#94A3B8" style={{ flexShrink: 0 }} />
                                <Avatar name={s.name} photoUrl={s.profilePhoto} size="xs" />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p style={{ fontSize: 11, fontWeight: isLeader ? 700 : 600, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
                                  {isLeader && <p style={{ fontSize: 10, color: "#D97706", fontWeight: 700 }}>★ Leader</p>}
                                </div>
                                <div style={{ display: "flex", flexShrink: 0, gap: 1 }}>
                                  <button title="Duplicate & return copy to Pool" onClick={() => handleDuplicateToPool(s.uid)}
                                    style={{ border: "none", background: "none", cursor: "pointer", padding: 3, color: "#9CA3AF", borderRadius: 4 }}>
                                    <Layers size={11} />
                                  </button>
                                  <button title={isLeader ? "Remove Leader" : "Set as Leader"} onClick={() => handleToggleLeader(team.id, s.uid)}
                                    style={{ border: "none", background: "none", cursor: "pointer", padding: 3, color: isLeader ? "#F59E0B" : "#CBD5E1", borderRadius: 4 }}>
                                    <Star size={12} fill={isLeader ? "currentColor" : "none"} />
                                  </button>
                                  <button title="Remove from team" onClick={() => handleMoveToUnassigned(s.uid, team.id)}
                                    style={{ border: "none", background: "none", cursor: "pointer", padding: 3, color: "#CBD5E1", borderRadius: 4 }}>
                                    <Trash2 size={11} />
                                  </button>
                                </div>
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
      </div>

      <ConfirmDialog open={clearOpen} title="Clear Team Arrangements?" message="All assigned students will return to the unassigned pool." confirmLabel="Clear" onConfirm={handleClear} onCancel={() => setClearOpen(false)} />
      <ConfirmDialog open={randomizeConfirmOpen} title="Randomize Teams?" message="This will replace the current arrangement. Continue?" confirmLabel="Randomize"
        onConfirm={() => { setRandomizeConfirmOpen(false); handleRandomize(); }}
        onCancel={() => setRandomizeConfirmOpen(false)} />
    </AppShell>
  );
}
