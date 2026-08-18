"use client";

// ============================================================
// MentorMesh — Announcements Page
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getAnnouncements, createAnnouncement } from "@/lib/firebase/firestore";
import type { Announcement } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { Megaphone, Plus } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function AnnouncementsPage() {
  return (
    <AppShell>
      <AnnouncementsContent />
    </AppShell>
  );
}

function AnnouncementsContent() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("important");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await getAnnouncements();
        setAnnouncements(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isStaff = user?.role === "staff" || user?.role === "master";

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !user) return;
    setPublishing(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        priority,
        targetAudience: "everyone",
        authorId: user.uid,
        authorName: user.name,
      });
      success("Announcement published successfully!");
      setCreateOpen(false);
      setTitle("");
      setMessage("");
      const updated = await getAnnouncements();
      setAnnouncements(updated);
    } catch {
      error("Failed to publish announcement.");
    } finally {
      setPublishing(false);
    }
  };

  const priorityConfig = {
    urgent:    { bar: "border-l-red-500 bg-red-50/40",     badge: "bg-red-100 text-red-700" },
    important: { bar: "border-l-amber-500 bg-amber-50/40", badge: "bg-amber-100 text-amber-800" },
    normal:    { bar: "border-l-blue-500 bg-blue-50/20",   badge: "bg-blue-100 text-blue-700" },
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto mm-page-animate">
      <PageHeader
        icon={<Megaphone size={20} />}
        iconClass="bg-amber-100 text-amber-600"
        title="Announcements"
        subtitle="Official broadcasts and urgent updates from faculty mentors."
        actions={
          isStaff ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setCreateOpen(true)}
            >
              New Announcement
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState message="Loading announcements..." />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={40} />}
          title="No announcements broadcasted"
          description="Faculty announcements will appear here."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const cfg = priorityConfig[ann.priority as keyof typeof priorityConfig] ?? priorityConfig.normal;
            return (
              <div key={ann.id} className={`mm-card space-y-3 border-l-4 ${cfg.bar}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.badge}`}>
                    {ann.priority}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(ann.createdAt)}</span>
                </div>
                <h2 className="font-bold text-slate-900 text-base leading-snug">{ann.title}</h2>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ann.message}</p>
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                  Broadcasted by <strong className="text-slate-600">{ann.authorName}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Announcement Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Faculty Announcement"
        description="Publish an announcement visible to all students and staff."
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="announcement-form"
              variant="primary"
              loading={publishing}
            >
              Send Announcement
            </Button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="mm-label">
              Title <span className="required">*</span>
            </label>
            <input
              className="mm-input"
              placeholder="e.g. Registration deadline extended!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mm-label">Priority Level</label>
            <div className="flex gap-2 mt-1">
              {(["normal", "important", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    priority === p
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mm-label">
              Message <span className="required">*</span>
            </label>
            <textarea
              className="mm-input resize-none"
              rows={4}
              placeholder="Enter full announcement details..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
