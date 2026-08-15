"use client";

// ============================================================
// MentorMesh — Community Feed & Showcase
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getPosts, createPost } from "@/lib/firebase/firestore";
import type { Post } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { BookOpen, Trophy, Plus, ExternalLink, Share2, Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function CommunityPage() {
  return (
    <AppShell>
      <CommunityContent />
    </AppShell>
  );
}

function CommunityContent() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [postType, setPostType] = useState<"achievement" | "project" | "general">("achievement");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await getPosts();
        setPosts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;
    setPosting(true);
    try {
      await createPost({
        type: postType,
        title: title.trim(),
        content: content.trim(),
        link: link.trim() || undefined,
        linkLabel: link.includes("linkedin.com") ? "View LinkedIn Post" : "View Link",
        authorId: user.uid,
        authorName: user.name,
        authorPhoto: user.profilePhoto,
        authorRole: user.role,
        visibility: "everyone",
        status: "published",
      });
      success("Showcase post published! 🎉");
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setLink("");
      const updated = await getPosts();
      setPosts(updated);
    } catch {
      error("Failed to publish post.");
    } finally {
      setPosting(false);
    }
  };

  const postTypeVariant = {
    achievement: "active",
    project: "finalized",
    general: "draft",
  } as const;

  return (
    <div className="space-y-6 max-w-3xl mx-auto mm-page-animate">
      <PageHeader
        icon={<BookOpen size={20} />}
        iconClass="bg-violet-100 text-violet-600"
        title="Community & Showcase"
        subtitle="Share achievements, hackathon wins, LinkedIn updates, and project milestones."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            Share Achievement
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Loading community feed..." />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Trophy size={40} />}
          title="No achievements posted yet"
          description="Be the first to share your hackathon win or project milestone!"
          action={{ label: "Share Achievement", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="mm-card space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar name={post.authorName} photoUrl={post.authorPhoto} size="md" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{post.authorName}</h3>
                    <p className="text-[11px] text-slate-400">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>
                <Badge variant={postTypeVariant[post.type as keyof typeof postTypeVariant] ?? "draft"}>
                  {post.type}
                </Badge>
              </div>

              <div>
                <h2 className="font-bold text-slate-900 text-base mb-1.5 leading-snug">{post.title}</h2>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
              </div>

              {post.link && (
                <div className="pt-1">
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
                  >
                    {post.link.includes("linkedin.com") ? (
                      <Share2 size={13} />
                    ) : (
                      <ExternalLink size={13} />
                    )}
                    {post.linkLabel || "View Link"}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Share Achievement / Update"
        description="Celebrate your wins, share projects, or post general updates."
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="community-post-form"
              variant="primary"
              loading={posting}
              icon={<Sparkles size={14} />}
            >
              Publish Post
            </Button>
          </>
        }
      >
        <form id="community-post-form" onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label className="mm-label">Post Type</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {(["achievement", "project", "general"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPostType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    postType === t ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mm-label">
              Title <span className="required">*</span>
            </label>
            <input
              className="mm-input"
              placeholder="e.g. 1st Place in XYZ National Hackathon!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mm-label">
              Description / Experience <span className="required">*</span>
            </label>
            <textarea
              className="mm-input resize-none"
              rows={4}
              placeholder="Share details about what you built, learned, or achieved..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mm-label">LinkedIn Post or Project URL (optional)</label>
            <input
              className="mm-input"
              placeholder="https://www.linkedin.com/posts/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
