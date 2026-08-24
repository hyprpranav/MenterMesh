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
import { BookOpen, Trophy, Plus, ExternalLink, Share2, Sparkles, Rocket, ArrowUpRight } from "lucide-react";
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

  const postStyles = {
    achievement: { color: "from-amber-400 to-orange-500", badge: "bg-amber-100 text-amber-800 border border-amber-200/60", icon: <Trophy size={14} />, label: "Achievement" },
    project: { color: "from-emerald-400 to-teal-500", badge: "bg-emerald-100 text-emerald-800 border border-emerald-200/60", icon: <Rocket size={14} />, label: "Project Update" },
    general: { color: "from-blue-400 to-indigo-500", badge: "bg-blue-100 text-blue-800 border border-blue-200/60", icon: <Sparkles size={14} />, label: "Development" }
  } as const;

  const renderContent = (text: string) => {
    // Regex matches **bold text** OR http/https URLs
    return text.split(/(\*\*.*?\*\*|\bhttps?:\/\/\S+\b)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-slate-900 font-extrabold">{part.slice(2, -2)}</strong>;
      }
      if (part.match(/^https?:\/\//)) {
        return (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 font-bold hover:text-blue-700 hover:underline decoration-blue-300 underline-offset-4 break-all px-1 bg-blue-50/50 rounded-md">
            {part} <ArrowUpRight size={14} className="inline opacity-70" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto mm-page-animate">
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
        <div className="flex flex-col gap-6">
          {posts.map((post) => {
            const config = postStyles[post.type as keyof typeof postStyles] || postStyles.general;

            return (
              <div key={post.id} className="relative bg-white rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-slate-200/80 mb-6 overflow-hidden flex flex-col">
                {/* Top colored accent using a normal block, totally preventing any border-overlap/clipping issues */}
                <div className={`w-full h-3 bg-gradient-to-r ${config.color} shrink-0`} />

                {/* Body of the card with massive safety padding */}
                <div className="p-8 sm:p-12">

                  {/* Section 1: Author Information */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-5">
                      {/* Avatar container strictly bounds the image to ensure it never touches borders */}
                      <div className="shrink-0 p-1.5 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
                        <Avatar name={post.authorName} photoUrl={post.authorPhoto} size="lg" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <h3 className="font-extrabold text-slate-900 text-lg">{post.authorName}</h3>
                        <p className="text-sm text-slate-500 font-semibold">{timeAgo(post.createdAt)}</p>
                      </div>
                    </div>

                    {/* Badge with massive safety padding */}
                    <div className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest ${config.badge} self-start sm:self-auto`}>
                      {config.icon}
                      <span>{config.label}</span>
                    </div>
                  </div>

                  {/* Section 2: Project Heading */}
                  <div className="mb-6">
                    <h2 className="font-black text-slate-900 text-3xl sm:text-4xl leading-[1.25] tracking-tight">
                      {post.title}
                    </h2>
                  </div>

                  {/* Section 3 & 4: Main Description & Update Details */}
                  <div className="text-lg text-slate-700 whitespace-pre-wrap leading-[1.9] font-medium break-words">
                    {renderContent(post.content)}
                  </div>

                  {/* Section 5: Massive Prominent Action Link Area */}
                  {post.link && (
                    <div className="mt-12 pt-10 border-t-2 border-slate-100 flex flex-col items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mb-5">
                        Project Resources
                      </span>
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-center gap-3 px-10 py-4 sm:px-12 sm:py-5 rounded-2xl font-black text-[17px] sm:text-xl text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:shadow-2xl hover:-translate-y-1 transition-all outline-none focus:ring-4 focus:ring-offset-2 w-full sm:w-auto text-center ${post.link.includes("linkedin.com")
                            ? "bg-[#0A66C2] hover:bg-[#004182] focus:ring-[#0A66C2]/50"
                            : "bg-slate-900 hover:bg-slate-800 focus:ring-slate-900/50 border border-slate-900"
                          }`}
                      >
                        <ArrowUpRight size={24} className={post.link.includes("linkedin.com") ? "hidden" : "block"} />
                        <span>{post.link.includes("linkedin.com") ? "Open Full Post on LinkedIn" : (post.linkLabel || "Explore Detailed Update")}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
            <label className="mm-label mb-2 block">Post Type</label>
            <div className="flex gap-2 flex-wrap">
              {(["achievement", "project", "general"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPostType(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all border ${postType === t
                    ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700"
                    }`}
                  style={{ minWidth: "max-content" }}
                >
                  {t === "achievement" && "🏆 "}
                  {t === "project" && "🚀 "}
                  {t === "general" && "📢 "}
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
