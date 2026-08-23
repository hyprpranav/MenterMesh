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
import { Calendar, Plus, MapPin, Folder, CheckCircle2, Clock, XCircle } from "lucide-react";
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
    if (activeTab === "all") return true;
    if (activeTab === "my") return e.submittedBy === user?.uid;
    if (activeTab === "pending") return e.submissionStatus === "pending_review";
    if (activeTab === "approved") return e.submissionStatus === "approved" || !e.submissionStatus;
    if (activeTab === "rejected") return e.submissionStatus === "rejected";
    if (activeTab === "draft") return e.submissionStatus === "draft";
    return e.type.toLowerCase() === activeTab.toLowerCase();
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

      {/* Filter Tabs */}
      <div className="overflow-x-auto pb-1">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
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
  // Highlight events if you submitted it, if you are a participant, or if you are staff looking at it
  const isHighlighted = isParticipant || isOwner || isStaff;

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
    ...(isHighlighted
      ? {
        background: "linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 50%, #F8FAFC 100%)",
        border: "2px solid #3B82F6",
        boxShadow: "0 4px 16px rgba(59, 130, 246, 0.15), 0 1px 4px rgba(59, 130, 246, 0.08)",
      }
      : isPending
        ? { background: "#FFFBF0", border: "1.5px solid #FCD34D", boxShadow: "0 2px 8px rgba(252, 211, 77, 0.12)" }
        : isRejected
          ? { background: "#FFF5F5", border: "1.5px solid #FCA5A5", boxShadow: "0 2px 8px rgba(252, 165, 165, 0.1)" }
          : { background: "var(--color-surface)", border: "1.5px solid var(--color-border)", boxShadow: "var(--shadow-xs)" }),
  };

  return (
    <div style={cardStyle} className="hover:shadow-lg h-full">
      {isHighlighted && (
        <div style={{ height: 4, background: "linear-gradient(90deg, #3B82F6, #6366F1, #8B5CF6)", borderRadius: "0 0 0 0", flexShrink: 0 }} />
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
        <p style={{ fontSize: "0.75rem", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: "80px" }}>
          By {event.submittedByName}
        </p>
        <Link href={`/events/${event.id}`}>
          <Button size="md" variant={isHighlighted ? "primary" : "outline"}>
            View Event
          </Button>
        </Link>
      </div>
    </div>
  );
}
