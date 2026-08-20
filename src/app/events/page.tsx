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
  const isRejected = event.submissionStatus === "rejected";

  const statusBadge = isPending ? (
    <Badge variant="pending" icon={<Clock size={11} />}>Pending</Badge>
  ) : isRejected ? (
    <Badge variant="rejected" icon={<XCircle size={11} />}>Rejected</Badge>
  ) : isApproved ? (
    <Badge variant="approved" icon={<CheckCircle2 size={11} />}>Approved</Badge>
  ) : (
    <Badge variant="draft">{event.status?.toUpperCase()}</Badge>
  );

  return (
    <div className="mm-card hover:border-blue-300 transition-all flex flex-col justify-between h-full bg-white">
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2 w-full pr-1">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 truncate max-w-[60%] inline-block">
            {event.type}
          </span>
          <div className="shrink-0">{statusBadge}</div>
        </div>

        <h3 className="font-bold text-slate-900 text-[15px] leading-snug line-clamp-2" title={event.name}>
          {event.name}
        </h3>

        {event.result && (
          <div className="w-full">
            <span
              className="text-xs font-bold text-amber-700 bg-amber-50 px-2 opacity-90 py-1 rounded-md border border-amber-200 inline-block w-auto max-w-full truncate"
              title={event.result}
            >
              {event.result}
            </span>
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-2 pt-1 border-t border-slate-50">
          <p className="flex items-center gap-2">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{formatDate(event.date)}</span>
          </p>
          {(event.location || event.venue) && (
            <p className="flex items-center gap-2">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span className="truncate" title={event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ""}` : event.location}>
                {event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ""}` : event.location}
              </span>
            </p>
          )}
          {event.submittedByName && (
            <p className="text-[11px] text-slate-400 truncate mt-1 bg-slate-50 px-2 py-1 rounded inline-block w-full">
              By <strong className="text-slate-600 font-semibold">{event.submittedByName}</strong>
            </p>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">{event.description}</p>
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between w-full h-[32px]">
        {event.driveLink ? (
          <a
            href={event.driveLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-lg transition-colors hover:bg-blue-50"
          >
            <Folder size={12} className="shrink-0" /> <span className="truncate max-w-[80px]">Folder</span>
          </a>
        ) : (
          <div aria-hidden="true" />
        )}
        <Link href={`/events/${event.id}`}>
          <Button size="sm" variant="ghost" className="h-8 text-xs px-3">View Event →</Button>
        </Link>
      </div>
    </div>
  );
}
