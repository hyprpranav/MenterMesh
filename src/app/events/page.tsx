"use client";

// ============================================================
// MentorMesh — Events & Hackathons Page (Student + Staff)
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getEventsForViewer } from "@/lib/firebase/firestore";
import type { Event } from "@/types";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Plus, MapPin, Folder, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";

export default function EventsPage() {
  return (
    <AppShell>
      <EventsContent />
    </AppShell>
  );
}

function EventsContent() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [globalSearch, setGlobalSearch] = useState("");
  const [sortBy, setSortBy] = useState("Date (Newest)");

  useEffect(() => {
    async function load() {
      try {
        if (!user) return;
        const list = await getEventsForViewer(user.uid, user.role);
        setEvents(list);
        if (typeof window !== "undefined") {
          localStorage.setItem("last_visited_events", Date.now().toString());
          window.dispatchEvent(new Event("mentormesh_notifications_read"));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const isStaff = user?.role === "staff" || user?.role === "master";
  const pendingCount = events.filter((e) => e.submissionStatus === "pending_review").length;

  const filteredEvents = events.filter((e) => {
    let matchTab = false;
    if (activeTab === "all") matchTab = true;
    else if (activeTab === "my") matchTab = e.submittedBy === user?.uid;
    else if (activeTab === "pending") matchTab = e.submissionStatus === "pending_review";
    else if (activeTab === "approved") matchTab = e.submissionStatus === "approved" || !e.submissionStatus;
    else if (activeTab === "rejected") matchTab = e.submissionStatus === "rejected";
    else if (activeTab === "draft") matchTab = e.submissionStatus === "draft";
    else matchTab = e.type.toLowerCase() === activeTab.toLowerCase();

    if (!matchTab) return false;

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      return (
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.type && e.type.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "Date (Newest)") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === "Date (Oldest)") return new Date(a.date).getTime() - new Date(b.date).getTime();

    const countA = (a.participantIds?.length || 0) + (a.externalParticipants?.length || 0);
    const countB = (b.participantIds?.length || 0) + (b.externalParticipants?.length || 0);

    if (sortBy === "Participants (High to Low)") return countB - countA;
    if (sortBy === "Participants (Low to High)") return countA - countB;

    return 0;
  });

  const tabs = [
    { id: "all", label: "All Events", count: events.length },
    ...(!isStaff ? [
      { id: "my", label: "My Submissions" },
      { id: "rejected", label: "Rejected" }
    ] : []),
    ...(isStaff
      ? [
        { id: "pending", label: "Pending Review", count: pendingCount, className: pendingCount > 0 ? "text-amber-700" : undefined },
        { id: "rejected", label: "Rejected" }
      ]
      : []),
    { id: "approved", label: "Approved" },
    { id: "hackathon", label: "Hackathon" },
    { id: "project expo", label: "Project Expo" },
    { id: "workshop", label: "Workshop" },
  ];

  return (
    <div className="space-y-6 mm-page-animate">
      <PageHeader
        icon={<Calendar size={20} />}
        iconClass="bg-indigo-100 text-indigo-600"
        title="Events & Hackathons"
        subtitle="Track hackathons, project expos, workshops, and student achievements."
        actions={
          <Link href="/events/new">
            <Button variant="primary" size="md" icon={<Plus size={16} />}>
              {isStaff ? "Create Event" : "Submit Event"}
            </Button>
          </Link>
        }
      />

      {/* Filter Tabs and Sort */}
      <div className="flex flex-wrap lg:flex-nowrap gap-4 justify-between items-center pb-2">
        <div className="overflow-x-auto w-full lg:w-auto max-w-full">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full lg:w-auto">
          {/* Search Box */}
          <div
            style={{ display: "flex", alignItems: "center", background: "white", padding: "0 12px", border: "1px solid #e2e8f0", borderRadius: "8px", height: "40px", minWidth: "240px", flex: "1 1 auto", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
          >
            <Search size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search events..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%", marginLeft: "8px", fontSize: "14px", background: "transparent", color: "#334155" }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="mm-select shrink-0 w-full sm:w-auto"
            style={{ height: "40px", minWidth: "200px" }}
          >
            <option value="Date (Newest)">Date (Newest)</option>
            <option value="Date (Oldest)">Date (Oldest)</option>
            <option value="Participants (High to Low)">Participants (High to Low)</option>
            <option value="Participants (Low to High)">Participants (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingState message="Loading events..." />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title="No events found"
          description={
            activeTab === "my"
              ? "You haven't submitted any events yet. Click '+ Submit Event' to record your participation."
              : "No events match the selected filter."
          }
          action={
            activeTab === "my" || activeTab === "all"
              ? undefined
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} currentUserId={user?.uid} isStaff={isStaff} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, currentUserId, isStaff }: { event: Event; currentUserId?: string; isStaff: boolean }) {
  const isPending = event.submissionStatus === "pending_review";
  const isApproved = event.submissionStatus === "approved" || !event.submissionStatus;
  const isRejected = event.submissionStatus === "rejected";
  const isParticipant = currentUserId ? (event.participantIds || []).includes(currentUserId) : false;
  const isOwner = currentUserId === event.submittedBy;
  const isParticipantOnly = !isOwner && isParticipant;
  // Master/Staff don't get the premium blue owner highlight unless they submitted it themselves
  const isOwnerHighlight = isOwner;

  const statusBadge = isPending ? (
    <Badge variant="pending" icon={<Clock size={11} />}>Pending</Badge>
  ) : isRejected ? (
    <Badge variant="rejected" icon={<XCircle size={11} />}>Rejected</Badge>
  ) : isApproved ? (
    <Badge variant="approved" icon={<CheckCircle2 size={11} />}>Approved</Badge>
  ) : (
    <Badge variant="draft">{event.status?.toUpperCase()}</Badge>
  );

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRadius: 16,
    overflow: "hidden",
    transition: "all 0.2s ease",
    position: "relative",
    ...(isOwnerHighlight
      ? {
        background: "linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 50%, #F8FAFC 100%)",
        border: "2px solid #3B82F6",
        boxShadow: "0 4px 16px rgba(59, 130, 246, 0.15), 0 1px 4px rgba(59, 130, 246, 0.08)",
      }
      : isParticipantOnly
        ? {
          background: "linear-gradient(135deg, #F5F3FF 0%, #FAFAF9 50%, #FFFFFF 100%)",
          border: "2px solid #8B5CF6",
          boxShadow: "0 4px 16px rgba(139, 92, 246, 0.12), 0 1px 4px rgba(139, 92, 246, 0.08)",
        }
        : isPending
          ? { background: "#FFFBF0", border: "1.5px solid #FCD34D", boxShadow: "0 2px 8px rgba(252, 211, 77, 0.12)" }
          : isRejected
            ? { background: "#FFF5F5", border: "1.5px solid #FCA5A5", boxShadow: "0 2px 8px rgba(252, 165, 165, 0.1)" }
            : { background: "var(--color-surface)", border: "1.5px solid var(--color-border)", boxShadow: "var(--shadow-xs)" }),
  };

  return (
    <div style={cardStyle} className="hover:shadow-lg h-full">
      {isOwnerHighlight && (
        <div style={{ height: 4, background: "linear-gradient(90deg, #3B82F6, #6366F1, #8B5CF6)", borderRadius: "0 0 0 0", flexShrink: 0 }} />
      )}
      {isParticipantOnly && (
        <div style={{ height: 4, background: "linear-gradient(90deg, #8B5CF6, #A855F7, #D946EF)", borderRadius: "0 0 0 0", flexShrink: 0 }} />
      )}

      <div style={{ padding: "1.25rem 1.25rem 0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "4px 10px", borderRadius: 99, border: "1px solid #BFDBFE", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {event.type}
          </span>
          <div className="shrink-0">{statusBadge}</div>
        </div>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={event.name}>
          {event.name}
        </h3>

        {event.result && (
          <span style={{ display: "inline-block", fontSize: "0.75rem", fontWeight: 700, color: "#B45309", background: "#FFFBEB", padding: "4px 8px", borderRadius: 6, border: "1px solid #FDE68A", width: "fit-content", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={event.result}>
            🏆 {event.result}
          </span>
        )}

        <div style={{ paddingTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>
            <Calendar size={14} color="#94A3B8" /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatDate(event.date)}</span>
          </p>
          {(event.location || event.venue) && (
            <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>
              <MapPin size={14} color="#94A3B8" /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ""}` : event.location}>
                {event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ""}` : event.location}
              </span>
            </p>
          )}
        </div>

        {event.description && (
          <p style={{ fontSize: "0.8125rem", color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{event.description}</p>
        )}
      </div>

      <div style={{ padding: "0.75rem 1.25rem 1.25rem", borderTop: "1px solid rgba(148, 163, 184, 0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, minWidth: "80px" }}>
          <p style={{ fontSize: "0.75rem", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            By {event.submittedByName}
          </p>
          {isParticipantOnly && (
            <span style={{
              display: "inline-block",
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#7C3AED",
              background: "#F3E8FF",
              padding: "2px 6px",
              borderRadius: "4px",
              width: "fit-content",
              textTransform: "uppercase"
            }}>
              Participated
            </span>
          )}
        </div>
        <Link href={`/events/${event.id}`}>
          <Button size="md" variant={isOwnerHighlight ? "primary" : "outline"}>
            View Event
          </Button>
        </Link>
      </div>
    </div>
  );
}
