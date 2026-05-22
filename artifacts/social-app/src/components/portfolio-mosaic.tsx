import { useEffect, useMemo, useState } from "react";
import { Heart, Image as ImageIcon, MessageSquare, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Contributor = {
  id: number;
  username: string;
  artistDisplayName?: string | null;
  avatarUrl?: string | null;
  artistAvatarUrl?: string | null;
};

type PortfolioComment = {
  id: number;
  userId: number;
  galleryItemId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: Contributor | null;
};

export type PortfolioMosaicItem = {
  id: string;
  galleryItemId: number;
  imageUrl: string;
  title?: string | null;
  caption?: string | null;
  meta?: string | null;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  contributors?: Contributor[];
};

type PortfolioMosaicGroup = {
  label: string;
  items: PortfolioMosaicItem[];
};

type PortfolioMosaicProps = {
  userId: number;
  groups: PortfolioMosaicGroup[];
  emptyMessage?: string;
  className?: string;
};

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PortfolioMosaic({
  userId,
  groups,
  emptyMessage = "No images yet.",
  className,
}: PortfolioMosaicProps) {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemState, setItemState] = useState<Record<number, { likeCount: number; commentCount: number; isLiked: boolean }>>({});
  const [commentsByItemId, setCommentsByItemId] = useState<Record<number, PortfolioComment[]>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const selectedItem = flatItems.find((item) => item.galleryItemId === selectedItemId) ?? null;

  useEffect(() => {
    const nextState: Record<number, { likeCount: number; commentCount: number; isLiked: boolean }> = {};
    for (const item of flatItems) {
      nextState[item.galleryItemId] = {
        likeCount: item.likeCount ?? 0,
        commentCount: item.commentCount ?? 0,
        isLiked: Boolean(item.isLiked),
      };
    }
    setItemState(nextState);
  }, [flatItems]);

  useEffect(() => {
    if (!selectedItemId || commentsByItemId[selectedItemId]) return;
    let cancelled = false;
    setLoadingCommentsFor(selectedItemId);
    fetch(`${getApiBaseUrl()}/api/artists/${userId}/gallery/${selectedItemId}/comments`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load image comments");
        }
        return response.json() as Promise<PortfolioComment[]>;
      })
      .then((comments) => {
        if (cancelled) return;
        setCommentsByItemId((current) => ({ ...current, [selectedItemId]: comments }));
      })
      .catch((error) => {
        if (cancelled) return;
        toast({
          title: "Could not load image comments",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingCommentsFor(null);
      });

    return () => {
      cancelled = true;
    };
  }, [commentsByItemId, selectedItemId, toast, userId]);

  if (!flatItems.length) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border/50 bg-card/20 py-12 text-center text-muted-foreground", className)}>
        <ImageIcon className="mx-auto mb-3 h-8 w-8 opacity-20" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const selectedComments = selectedItemId ? (commentsByItemId[selectedItemId] ?? []) : [];
  const selectedCounts = selectedItem ? itemState[selectedItem.galleryItemId] : null;

  const handleToggleLike = async () => {
    if (!selectedItem || isTogglingLike || !selectedCounts) return;
    const nextLiked = !selectedCounts.isLiked;
    setIsTogglingLike(true);
    setItemState((current) => ({
      ...current,
      [selectedItem.galleryItemId]: {
        likeCount: Math.max(0, (current[selectedItem.galleryItemId]?.likeCount ?? 0) + (nextLiked ? 1 : -1)),
        commentCount: current[selectedItem.galleryItemId]?.commentCount ?? 0,
        isLiked: nextLiked,
      },
    }));

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/artists/${userId}/gallery/${selectedItem.galleryItemId}/${nextLiked ? "like" : "unlike"}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(nextLiked ? "Could not like image" : "Could not unlike image");
      }
    } catch (error) {
      setItemState((current) => ({
        ...current,
        [selectedItem.galleryItemId]: {
          likeCount: selectedCounts.likeCount,
          commentCount: selectedCounts.commentCount,
          isLiked: selectedCounts.isLiked,
        },
      }));
      toast({
        title: "Could not update image like",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedItem || isSubmittingComment || !commentDraft.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/artists/${userId}/gallery/${selectedItem.galleryItemId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: commentDraft.trim() }),
      });
      if (!response.ok) {
        throw new Error("Could not add image comment");
      }
      const created = await response.json() as PortfolioComment;
      setCommentsByItemId((current) => ({
        ...current,
        [selectedItem.galleryItemId]: [...(current[selectedItem.galleryItemId] ?? []), created],
      }));
      setItemState((current) => ({
        ...current,
        [selectedItem.galleryItemId]: {
          likeCount: current[selectedItem.galleryItemId]?.likeCount ?? 0,
          commentCount: (current[selectedItem.galleryItemId]?.commentCount ?? 0) + 1,
          isLiked: current[selectedItem.galleryItemId]?.isLiked ?? false,
        },
      }));
      setCommentDraft("");
    } catch (error) {
      toast({
        title: "Could not comment on image",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {groups.map((group) => (
          <section key={group.label} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{group.label}</div>
              <div className="text-xs text-muted-foreground">{group.items.length} item{group.items.length === 1 ? "" : "s"}</div>
            </div>
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {group.items.map((item) => {
                const state = itemState[item.galleryItemId] ?? {
                  likeCount: item.likeCount ?? 0,
                  commentCount: item.commentCount ?? 0,
                  isLiked: Boolean(item.isLiked),
                };
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.galleryItemId)}
                    className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-[1.5rem] border border-border/50 bg-background/30 text-left shadow-sm transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <div className="relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title || item.caption || "Portfolio image"}
                        loading="lazy"
                        decoding="async"
                        className="h-auto w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 text-white">
                        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-white/78">
                          <span>{item.title || "Portfolio image"}</span>
                          {item.contributors?.length ? (
                            <span>{item.contributors.length} tagged</span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-white/86">
                          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {state.likeCount}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {state.commentCount}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => {
        if (!open) {
          setSelectedItemId(null);
          setCommentDraft("");
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-border/60 bg-background/96 sm:max-w-5xl">
          {selectedItem ? (
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
              <div className="space-y-4">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-left text-2xl">{selectedItem.title || "Portfolio image"}</DialogTitle>
                  {selectedItem.caption ? (
                    <p className="text-left text-sm text-muted-foreground">{selectedItem.caption}</p>
                  ) : null}
                </DialogHeader>
                <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-black/40">
                  <img src={selectedItem.imageUrl} alt={selectedItem.title || selectedItem.caption || "Portfolio image"} className="h-auto w-full object-cover" />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-border/50 bg-background/45 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={selectedCounts?.isLiked ? "default" : "outline"}
                      size="sm"
                      onClick={() => void handleToggleLike()}
                      disabled={isTogglingLike}
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      {selectedCounts?.isLiked ? "Liked" : "Like image"}
                    </Button>
                    <Badge variant="secondary">{selectedCounts?.likeCount ?? 0} likes</Badge>
                    <Badge variant="outline">{selectedCounts?.commentCount ?? 0} comments</Badge>
                  </div>
                  {selectedItem.contributors?.length ? (
                    <div className="mt-4 space-y-2">
                      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> Contributors
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.contributors.map((contributor) => (
                          <Badge key={contributor.id} variant="secondary" className="px-3 py-1">
                            @{contributor.artistDisplayName || contributor.username}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-border/50 bg-background/45 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Leave a note on this image</div>
                  <Textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Comment on this image..."
                    className="mt-3 min-h-24 rounded-[1.15rem] border-border/50 bg-background/35"
                  />
                  <Button className="mt-3 w-full" onClick={() => void handleSubmitComment()} disabled={isSubmittingComment || !commentDraft.trim()}>
                    Add comment
                  </Button>
                </div>

                <div className="space-y-3 rounded-[1.5rem] border border-border/50 bg-background/45 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Image discussion</div>
                  {loadingCommentsFor === selectedItem.galleryItemId ? (
                    <div className="text-sm text-muted-foreground">Loading comments…</div>
                  ) : selectedComments.length ? (
                    <div className="space-y-3">
                      {selectedComments.map((comment) => (
                        <div key={comment.id} className="rounded-[1.15rem] border border-border/40 bg-background/35 p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/50">
                              <AvatarImage src={comment.author?.artistAvatarUrl || comment.author?.avatarUrl || ""} />
                              <AvatarFallback>{(comment.author?.artistDisplayName || comment.author?.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{comment.author?.artistDisplayName || comment.author?.username || "Artist"}</div>
                              <div className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</div>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-foreground/90">{comment.content}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No comments on this image yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
