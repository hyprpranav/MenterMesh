"use client";

// ============================================================
// MentorMesh — Access Request Queue
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { getAccessRequests } from "@/lib/firebase/firestore";
import type { AccessRequest } from "@/types";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { UserCheck } from "lucide-react";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { formatDateTime, timeAgo } from "@/lib/utils";

export default function AccessRequestsPage() {
  return (
    <AppShell>
      <RequestsContent />
    </AppShell>
  );
}

function RequestsContent() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    async function load() {
      try {
        const list = await getAccessRequests();
        setRequests(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const tabs = [
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "all", label: "All Requests", count: requests.length },
  ];

  const badgeVariant = (status: string) =>
    status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto mm-page-animate">
      <PageHeader
        icon={<UserCheck size={20} />}
        iconClass="bg-sky-100 text-sky-600"
        title="Registration Access Requests"
        subtitle="Review, approve, or reject student registration access requests."
      />

      <Tabs tabs={tabs} activeTab={statusFilter} onTabChange={setStatusFilter} />

      {loading ? (
        <LoadingState message="Loading requests..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<UserCheck size={40} />} title={`No ${statusFilter} requests`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="mm-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{r.name}</h3>
                  <Badge variant={badgeVariant(r.status) as "approved" | "rejected" | "pending"}>
                    {r.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Reg No:{" "}
                  <span className="font-mono font-semibold text-slate-700">
                    {r.registerNumber}
                  </span>{" "}
                  • {r.department} — {r.year} Yr ({r.section})
                </p>
                <p className="text-[11px] text-slate-400">
                  Submitted {timeAgo(r.createdAt)} ({r.email})
                </p>
                {r.reviewedByName && (
                  <p className="text-[11px] text-slate-500">
                    Reviewed by <strong>{r.reviewedByName}</strong> on{" "}
                    {formatDateTime(r.reviewedAt || "")}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                <Link href={`/admin/requests/${r.id}`}>
                  <Button
                    size="sm"
                    variant={r.status === "pending" ? "primary" : "outline"}
                  >
                    {r.status === "pending" ? "Review & Decide →" : "View Details"}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
