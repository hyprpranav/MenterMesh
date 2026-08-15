"use client";

// ============================================================
// MentorMesh — Events & Hackathons Page (Student + Staff)
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getEvents } from "@/lib/firebase/firestore";
import type { Event } from "@/types";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Plus, MapPin, Folder, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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
        const list = await getEvents();
        setEvents(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isStaff = user?.role === "staff" || user?.role === "master";
  const pendingCount = events.filter((e) => e.submissionStatus === "pending_review").length;

  const filteredEvents = events.filter((e) => {
    if (activeTab === "all") return true;
    if (activeTab === "my") return e.submittedBy === user?.uid || e.participantIds?.includes(user?.uid || "");
    if (activeTab === "pending") return e.submissionStatus === "pending_review";
    if (activeTab === "approved") return e.submissionStatus === "approved" || !e.submissionStatus;
    if (activeTab === "draft") return e.submissionStatus === "draft";
    return e.type.toLowerCase() === activeTab.toLowerCase();
  });

  const tabs = [
    { id: "all", label: "All Events", count: events.length },
    ...(!isStaff ? [{ id: "my", label: "My Submissions" }] : []),
    ...(isStaff
      ? [{ id: "pending", label: "Pending Review", count: pendingCount, className: pendingCount > 0 ? "text-amber-700" : undefined }]
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
            <Button variant="primary" size="sm" icon={<Plus size={16} />}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const isPending = event.submissionStatus === "pending_review";
  const isApproved = event.submissionStatus === "approved" || !event.submissionStatus;
  const isChangesReq = event.submissionStatus === "changes_requested";

  const statusBadge = isPending ? (
    <Badge variant="pending" icon={<Clock size={11} />}>Pending Review</Badge>
  ) : isChangesReq ? (
    <Badge variant="changes" icon={<AlertCircle size={11} />}>Action Required</Badge>
  ) : isApproved ? (
    <Badge variant="approved" icon={<CheckCircle2 size={11} />}>Approved</Badge>
  ) : (
    <Badge variant="draft">{event.status?.toUpperCase()}</Badge>
  );

  return (
    <div className="mm-card hover:border-blue-300 transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">
            {event.type}
          </span>
          {statusBadge}
        </div>

        <h3 className="font-bold text-slate-900 text-base leading-snug">{event.name}</h3>

        {event.result && (
          <p className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 inline-block">
            {event.result}
          </p>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>{formatDate(event.date)}</span>
          </p>
          {(event.location || event.venue) && (
            <p className="flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">
                {event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ""}` : event.location}
              </span>
            </p>
          )}
          {event.submittedByName && (
            <p className="text-[11px] text-slate-400">
              By <strong className="text-slate-600">{event.submittedByName}</strong>
            </p>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-slate-600 line-clamp-2">{event.description}</p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        {event.driveLink ? (
          <a
            href={event.driveLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
          >
            <Folder size={12} /> Drive Folder
          </a>
        ) : (
          <span />
        )}
        <Link href={`/events/${event.id}`}>
          <Button size="sm" variant="ghost">View Event →</Button>
        </Link>
      </div>
    </div>
  );
}
