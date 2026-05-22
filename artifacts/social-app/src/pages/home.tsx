import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Link2, Newspaper, Plus, Save, Send, Sparkles, X } from "lucide-react";
import {
  getFeed,
  useCreateCustomFeed,
  useCreatePost,
  useFollowUser,
  useGetCustomFeeds,
  useUnfollowUser,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FeedPostCard } from "@/components/feed-post-card";
import { Input } from "@/components/ui/input";
import { LoadMoreSentinel } from "@/components/load-more-sentinel";
import { QueryErrorState } from "@/components/query-error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getEmbedDescriptor } from "@/lib/embeds";
import { getTopicPath } from "@/lib/topics";
import { uploadImage } from "@/lib/upload-image";

const POST_DRAFT_KEY = "socialhub:post-draft";

function extractTopicTags(content: string) {
  const matches = content.match(/#[a-z0-9_]{2,32}/gi) || [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
}

function getSuggestedCreatorReason(
  artist: { location?: string | null; category: string; tags?: string[]; tagline?: string | null },
) {
  if (artist.tags?.[0]) return artist.tags[0];
  if (artist.location?.trim()) return artist.location.trim();
  if (artist.tagline?.trim()) return artist.tagline.trim();
  return artist.category;
}

export default function Home() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCustomFeed, setSelectedCustomFeed] = useState<number | null>(null);
  const [postForm, setPostForm] = useState<{ content: string; imageUrls: string[]; linkUrl: string; visibility: "public" | "friends" | "private" }>({
    content: "",
    imageUrls: [],
    linkUrl: "",
    visibility: "public",
  });
  const [feedForm, setFeedForm] = useState({ name: "", description: "", categories: "", tags: "", locations: "", includedUserIds: "" });
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [showLinkField, setShowLinkField] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const feedParams = {
    mode: (selectedCustomFeed ? "custom" : "following") as "following" | "custom",
    customFeedId: selectedCustomFeed || undefined,
  };

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed", feedParams.mode, selectedCustomFeed],
    enabled: !!user,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => getFeed(
      {
        ...feedParams,
        cursor: pageParam,
        limit: 10,
      },
      { signal },
    ),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined),
  });

  const { data: suggestedCreators } = useQuery({
    queryKey: ["suggested-creators", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${user!.id}/suggested-creators?limit=4`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load suggested creators");
      return response.json() as Promise<{
        artists: Array<{
          userId: number;
          displayName?: string | null;
          avatarUrl?: string | null;
          category: string;
          location?: string | null;
          tagline?: string | null;
          tags?: string[];
          isFollowing?: boolean;
          user: { username: string; avatarUrl?: string | null };
        }>;
      }>;
    },
  });

  const { data: followingPreview, isLoading: isLoadingFollowingPreview } = useQuery({
    queryKey: ["/api/users", user?.id, "following"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${user!.id}/following`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load following list");
      return response.json() as Promise<
        Array<{ id: number; username: string; avatarUrl?: string | null; location?: string | null; city?: string | null }>
      >;
    },
  });

  const { data: trendingTopics } = useQuery({
    queryKey: ["trending-topics"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trending-topics`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load trending topics");
      return response.json() as Promise<{ topics: Array<{ tag: string; count: number }> }>;
    },
  });

  const { data: customFeeds } = useGetCustomFeeds({
    query: { queryKey: ["custom-feeds"], enabled: !!user },
  });

  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        setPostForm({ content: "", imageUrls: [], linkUrl: "", visibility: "public" });
        setShowLinkField(false);
        setIsPostDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["trending-topics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "posts", "artist"] });
        toast({ title: "Update published", description: "Your post is live." });
      },
      onError: () => {
        toast({ title: "Could not publish post", variant: "destructive" });
      },
    },
  });

  const createCustomFeed = useCreateCustomFeed({
    mutation: {
      onSuccess: (feed) => {
        setFeedForm({ name: "", description: "", categories: "", tags: "", locations: "", includedUserIds: "" });
        queryClient.invalidateQueries({ queryKey: ["custom-feeds"] });
        setSelectedCustomFeed(feed.id);
        toast({ title: "Saved feed ready" });
      },
      onError: () => toast({ title: "Could not save custom feed", variant: "destructive" }),
    },
  });

  const followCreator = useFollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suggested-creators", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "following"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      },
      onError: () => toast({ title: "Could not follow artist", variant: "destructive" }),
    },
  });

  const unfollowCreator = useUnfollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suggested-creators", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "following"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      },
      onError: () => toast({ title: "Could not update follow", variant: "destructive" }),
    },
  });

  const feedPosts = useMemo(() => data?.pages.flatMap((page) => page.posts) || [], [data]);
  const fallbackTrendingTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of feedPosts.slice(0, 40)) {
      for (const tag of extractTopicTags(post.content || "")) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  }, [feedPosts]);

  const resolvedTrendingTopics = trendingTopics?.topics?.length ? trendingTopics.topics : fallbackTrendingTopics;
  const selectedFeed = customFeeds?.find((feed) => feed.id === selectedCustomFeed) || null;
  const followingCount = followingPreview?.length || 0;
  const suggestedArtists = suggestedCreators?.artists || [];
  const shouldNudgeDiscovery = followingCount === 0 && !selectedCustomFeed;

  const handlePostImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploadingPostImage(true);
    try {
      const uploadedItems = await Promise.all(Array.from(files).map((file) => uploadImage(file, "post")));
      setPostForm((current) => ({
        ...current,
        imageUrls: [...current.imageUrls, ...uploadedItems.map((item) => item.url)],
      }));
      toast({ title: uploadedItems.length > 1 ? `${uploadedItems.length} images uploaded` : "Image uploaded" });
    } catch (error) {
      toast({
        title: "Could not upload image",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploadingPostImage(false);
    }
  };

  const submitPost = () => {
    const linkMedia = postForm.linkUrl.trim() ? getEmbedDescriptor(postForm.linkUrl.trim()) : null;
    createPost.mutate({
      data: {
        content: postForm.content.trim(),
        imageUrl: postForm.imageUrls[0] || undefined,
        visibility: postForm.visibility,
        actorSurface: "artist",
        media: [
          ...postForm.imageUrls.map((url) => ({ type: "image", url })),
          linkMedia ? { type: linkMedia.kind, url: linkMedia.href, title: linkMedia.label } : null,
        ].filter(Boolean) as Array<{ type: string; url: string; title?: string }>,
      },
    });
  };

  const clearComposer = () => {
    setPostForm({ content: "", imageUrls: [], linkUrl: "", visibility: "public" });
    setShowLinkField(false);
    if (typeof window !== "undefined" && user?.id) {
      window.localStorage.removeItem(`${POST_DRAFT_KEY}:${user.id}`);
    }
  };

  const openPostDialog = () => setIsPostDialogOpen(true);
  const openPostDialogWithLink = () => {
    setShowLinkField(true);
    setIsPostDialogOpen(true);
  };
  const openPostDialogWithImage = () => {
    setShowLinkField(false);
    setIsPostDialogOpen(true);
    window.setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const saveDraft = () => {
    if (typeof window === "undefined" || !user?.id) return;
    window.localStorage.setItem(`${POST_DRAFT_KEY}:${user.id}`, JSON.stringify(postForm));
    toast({ title: "Draft saved" });
  };

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id || draftLoaded) return;
    const saved = window.localStorage.getItem(`${POST_DRAFT_KEY}:${user.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<typeof postForm> & { imageUrl?: string };
        const nextImageUrls = Array.isArray(parsed.imageUrls)
          ? parsed.imageUrls
          : parsed.imageUrl
            ? [parsed.imageUrl]
            : [];
        setPostForm((current) => ({ ...current, ...parsed, imageUrls: nextImageUrls }));
        setShowLinkField(Boolean(parsed.linkUrl));
      } catch {
        window.localStorage.removeItem(`${POST_DRAFT_KEY}:${user.id}`);
      }
    }
    setDraftLoaded(true);
  }, [draftLoaded, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id || !draftLoaded) return;
    const hasContent = Boolean(postForm.content.trim() || postForm.imageUrls.length || postForm.linkUrl);
    if (!hasContent) {
      window.localStorage.removeItem(`${POST_DRAFT_KEY}:${user.id}`);
      return;
    }
    window.localStorage.setItem(`${POST_DRAFT_KEY}:${user.id}`, JSON.stringify(postForm));
  }, [draftLoaded, postForm, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || location !== "/") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") !== "1") return;
    setIsPostDialogOpen(true);
    setShowLinkField(params.get("with") === "link");
    window.history.replaceState({}, "", window.location.pathname);
  }, [location]);

  return (
    <div className="space-y-6">
      <section className="hh-panel hh-studio-banner">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="hh-page-kicker">Home · Following feed</div>
            <h1 className="hh-page-title !text-[clamp(2rem,4vw,3.2rem)]">
              Good evening, <span className="hh-brand-wordmark-accent">{user?.username || "artist"}</span>
            </h1>
            <p className="hh-page-subtitle mt-3">
              {followingCount
                ? `${followingCount} people shape this stream. Home stays chronological and follow-based.`
                : "Home is ready. Follow a few artists and scenes to bring the stream to life."}
            </p>
            <div className="mt-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--hh-ink-muted)]">
              {feedPosts.length} posts loaded · {resolvedTrendingTopics.length} active scene tags
            </div>
          </div>
          <div className="hh-studio-banner-actions">
            <Link href="/discover">
              <Button variant="outline" className="rounded-none border-[var(--hh-rule)] bg-transparent text-[var(--hh-ink)] hover:bg-transparent">
                Discover
              </Button>
            </Link>
            <Button className="hh-solid-btn rounded-none" onClick={openPostDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>
      </section>

      <div className="hh-studio-grid">
        <aside className="hh-panel hidden md:flex md:flex-col md:p-5">
          <div className="hh-studio-section">
            <div className="hh-rail-title">Feed</div>
            <div className="mt-3 hh-rail-list">
              <button type="button" className="hh-rail-link is-active">
                <span className="hh-rail-link-dot" />
                <span>Following</span>
                <span className="hh-rail-count">{feedPosts.length} live</span>
              </button>
              <Link href="/discover" className="hh-rail-link">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Discover</span>
                <span className="hh-rail-count">wander</span>
              </Link>
              <Link href="/groups" className="hh-rail-link">
                <Newspaper className="h-3.5 w-3.5" />
                <span>Scenes</span>
                <span className="hh-rail-count">{resolvedTrendingTopics.length}</span>
              </Link>
            </div>
          </div>

          <div className="hh-studio-section">
            <div className="hh-rail-heading">
              <div>
                <div className="hh-rail-title">Saved feeds</div>
                <div className="mt-1 text-xs text-[var(--hh-ink-muted)]">Optional side collections</div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className="hh-rail-count text-[var(--hh-accent)]">+ New</button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Feed</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Feed name" value={feedForm.name} onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })} />
                    <Textarea placeholder="Description" value={feedForm.description} onChange={(e) => setFeedForm({ ...feedForm, description: e.target.value })} />
                    <Input placeholder="Categories: photographer, stylist" value={feedForm.categories} onChange={(e) => setFeedForm({ ...feedForm, categories: e.target.value })} />
                    <Input placeholder="Tags: editorial, film, latex" value={feedForm.tags} onChange={(e) => setFeedForm({ ...feedForm, tags: e.target.value })} />
                    <Input placeholder="Locations: Los Angeles, New York" value={feedForm.locations} onChange={(e) => setFeedForm({ ...feedForm, locations: e.target.value })} />
                    <Input placeholder="Specific user IDs: 4, 5, 8" value={feedForm.includedUserIds} onChange={(e) => setFeedForm({ ...feedForm, includedUserIds: e.target.value })} />
                    <Button
                      className="w-full"
                      onClick={() =>
                        createCustomFeed.mutate({
                          data: {
                            name: feedForm.name,
                            description: feedForm.description,
                            categories: feedForm.categories.split(",").map((item) => item.trim()).filter(Boolean),
                            tags: feedForm.tags.split(",").map((item) => item.trim()).filter(Boolean),
                            locations: feedForm.locations.split(",").map((item) => item.trim()).filter(Boolean),
                            includedUserIds: feedForm.includedUserIds.split(",").map((item) => Number(item.trim())).filter(Boolean),
                          },
                        })
                      }
                      disabled={createCustomFeed.isPending || !feedForm.name.trim()}
                    >
                      Save Feed
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="hh-rail-list">
              {customFeeds?.length ? customFeeds.map((feed) => (
                <button
                  key={feed.id}
                  type="button"
                  className={`hh-rail-link ${selectedCustomFeed === feed.id ? "is-active" : ""}`}
                  onClick={() => setSelectedCustomFeed(feed.id)}
                >
                  <span className="hh-rail-count">◇</span>
                  <span className="truncate">{feed.name}</span>
                  <span className="hh-rail-count">{feed.tags?.length || 0}</span>
                </button>
              )) : (
                <div className="border border-dashed border-[var(--hh-rule)] p-3 text-sm text-[var(--hh-ink-muted)]">
                  No saved feeds yet.
                </div>
              )}
            </div>
          </div>

          <div className="hh-studio-section">
            <div className="hh-rail-title">Following</div>
            <div className="mt-3 hh-rail-list">
              {isLoadingFollowingPreview ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : followingPreview?.length ? followingPreview.slice(0, 5).map((person) => (
                <Link key={person.id} href={`/artists/${person.id}`} className="hh-rail-link">
                  <Avatar className="h-7 w-7 border border-border/50">
                    <AvatarImage src={person.avatarUrl || ""} />
                    <AvatarFallback>{person.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{person.username}</span>
                  <span className="hh-rail-count">{person.city || person.location || "live"}</span>
                </Link>
              )) : (
                <div className="border border-dashed border-[var(--hh-rule)] p-3 text-sm text-[var(--hh-ink-muted)]">
                  No follows yet.
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="space-y-5 md:border-x md:border-[var(--hh-rule)] md:px-7 md:py-5">
          <div className="hh-tabstrip">
            <button type="button" className="hh-tabstrip-item is-active">
              Following
              <span className="hh-tabstrip-badge">{feedPosts.length} live</span>
            </button>
            <button type="button" className="hh-tabstrip-item">
              Saved feeds
              {customFeeds?.length ? <span className="hh-tabstrip-badge">{customFeeds.length}</span> : null}
            </button>
            <button type="button" className="hh-tabstrip-item">Latest</button>
            <span className="ml-auto hidden font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--hh-ink-muted)] md:inline">
              no algorithm
            </span>
          </div>

          {shouldNudgeDiscovery ? (
            <div className="hh-panel p-5">
              <div className="hh-rail-kicker">Start here</div>
              <div className="mt-2 font-serif text-3xl text-[var(--hh-ink)]">Build the feed fast.</div>
              <div className="mt-2 max-w-2xl text-sm leading-6 text-[var(--hh-ink-muted)]">
                Follow a few artists and your scenes will start to speak. Discovery is where you roam; Home is where the people you chose show up.
              </div>
              <Link href="/discover" className="mt-4 inline-block">
                <Button className="hh-solid-btn rounded-none">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Find Artists to Follow
                </Button>
              </Link>
            </div>
          ) : null}

          <Card className="hh-panel cursor-pointer overflow-hidden rounded-none border-[var(--hh-rule)] bg-transparent shadow-none" onClick={openPostDialog}>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border border-border/50 md:h-11 md:w-11">
                  <AvatarImage src={user?.avatarUrl || ""} />
                  <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  data-testid="open-post-composer"
                  className="flex-1 border border-[var(--hh-rule)] bg-[color:color-mix(in_srgb,white_2%,transparent)] px-4 py-4 text-left transition-colors hover:border-[var(--hh-accent)]"
                >
                  <div className="font-serif text-xl text-[var(--hh-ink)]">Share a new post.</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--hh-ink-muted)]">
                    Work, thoughts, references, a frame from set, a note from the night.
                  </div>
                </button>
                <div className="hidden items-center gap-2 sm:flex">
                  <Button type="button" variant="ghost" size="icon" className="rounded-none" onClick={(event) => { event.stopPropagation(); openPostDialogWithImage(); }}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="rounded-none" onClick={(event) => { event.stopPropagation(); openPostDialogWithLink(); }}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : isError ? (
            <QueryErrorState title="Could not load feed" description="The feed request failed. Check the API and retry." onRetry={() => refetch()} />
          ) : (
            <div className="space-y-5">
              {feedPosts.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
              {feedPosts.length === 0 ? (
                <Card className="hh-panel rounded-none border-dashed border-[var(--hh-rule)] bg-transparent shadow-none">
                  <CardContent className="p-12 text-center text-[var(--hh-ink-muted)]">
                    <Sparkles className="mx-auto mb-4 h-10 w-10 opacity-40" />
                    <div className="font-serif text-2xl text-[var(--hh-ink)]">No posts in this feed yet.</div>
                    <div className="mt-2 text-sm">Follow more people or publish the first piece of work into your circle.</div>
                  </CardContent>
                </Card>
              ) : null}
              <LoadMoreSentinel
                enabled={Boolean(hasNextPage)}
                isLoading={isFetchingNextPage}
                onVisible={() => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
              />
            </div>
          )}
        </main>

        <aside className="hh-studio-rail">
          <div className="hh-panel p-5">
            <div className="hh-rail-kicker">Open inquiries</div>
            <div className="mt-2 font-serif text-2xl text-[var(--hh-ink)]">Keep it social, keep it moving.</div>
            <div className="mt-2 text-sm leading-6 text-[var(--hh-ink-muted)]">
              Messages stay simple. Inquiries stay visible when they arrive, but the feed stays the heart of the platform.
            </div>
            <Link href="/messages" className="mt-4 inline-block font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--hh-accent)]">
              Open the desk →
            </Link>
          </div>

          <div className="hh-panel p-5">
            <div className="hh-display-title text-[1.15rem]">Suggested artists</div>
            <div className="mt-3 space-y-3">
              {suggestedArtists.length ? suggestedArtists.slice(0, 3).map((artist) => (
                <div key={artist.userId} className="flex items-start gap-3 border-t border-[var(--hh-rule-soft)] pt-3 first:border-t-0 first:pt-0">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarImage src={artist.avatarUrl || artist.user.avatarUrl || ""} />
                    <AvatarFallback>{(artist.displayName || artist.user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={`/artists/${artist.userId}`} className="font-medium text-[var(--hh-ink)]">
                      {artist.displayName || artist.user.username}
                    </Link>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                      {[artist.category, artist.location].filter(Boolean).join(" · ")}
                    </div>
                    <div className="mt-2 text-xs text-[var(--hh-ink-muted)]">{getSuggestedCreatorReason(artist)}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={artist.isFollowing ? "outline" : "default"}
                    onClick={() => artist.isFollowing ? unfollowCreator.mutate({ userId: artist.userId }) : followCreator.mutate({ userId: artist.userId })}
                    disabled={followCreator.isPending || unfollowCreator.isPending}
                  >
                    {artist.isFollowing ? "Following" : "Follow"}
                  </Button>
                </div>
              )) : (
                <div className="text-sm text-[var(--hh-ink-muted)]">Nothing surfaced here yet.</div>
              )}
            </div>
          </div>

          <div className="hh-panel p-5">
            <div className="hh-display-title text-[1.15rem]">Trending in your scenes</div>
            <div className="mt-3 space-y-3">
              {resolvedTrendingTopics.length ? resolvedTrendingTopics.slice(0, 5).map((topic) => (
                <Link key={topic.tag} href={getTopicPath(topic.tag)} className="flex items-center justify-between border-t border-[var(--hh-rule-soft)] pt-3 first:border-t-0 first:pt-0">
                  <span className="font-serif text-lg text-[var(--hh-ink)]">{topic.tag}</span>
                  <span className="hh-rail-count">{topic.count} new</span>
                </Link>
              )) : (
                <div className="text-sm text-[var(--hh-ink-muted)]">Scene tags will show up as the public feed grows.</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Dialog
        open={isPostDialogOpen}
        onOpenChange={(open) => {
          setIsPostDialogOpen(open);
          if (!open) setShowLinkField(false);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Feed Update</DialogTitle>
            <DialogDescription>
              Just post. Save the hiring details and logistics for castings or direct inquiries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              data-testid="post-composer-textarea"
              placeholder="Share what you made, what you saw, what happened on set, what reference is stuck in your head..."
              value={postForm.content}
              onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
              className="min-h-44 rounded-none border-border/60 bg-background/50 px-4 py-4 text-base"
            />
            <div className="space-y-3 border border-border/50 bg-background/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Add media</div>
                  <div className="mt-1 text-xs text-muted-foreground">Attach one or more images, or drop in a link.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon" className="rounded-none" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="rounded-none" onClick={() => setShowLinkField((current) => !current)}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(postForm.imageUrls.length || postForm.linkUrl) ? (
                <div className="space-y-3">
                  {postForm.imageUrls.length ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {postForm.imageUrls.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative overflow-hidden border border-border/60 bg-background/40">
                          <img src={url} alt={`Upload ${index + 1}`} className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                            onClick={() => setPostForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((_, imageIndex) => imageIndex !== index) }))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {postForm.linkUrl ? (
                    <div className="inline-flex max-w-full items-center gap-2 border border-border/60 px-3 py-2 text-xs">
                      <Link2 className="h-3.5 w-3.5" />
                      <span className="truncate">{postForm.linkUrl}</span>
                      <button type="button" onClick={() => setPostForm((current) => ({ ...current, linkUrl: "" }))}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showLinkField ? (
                <Input placeholder="Paste a video, article, playlist, or reference link" value={postForm.linkUrl} onChange={(e) => setPostForm({ ...postForm, linkUrl: e.target.value })} />
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handlePostImageUpload(e.target.files);
                e.currentTarget.value = "";
              }}
              disabled={isUploadingPostImage}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium">Who can see this?</div>
              <Select value={postForm.visibility} onValueChange={(value) => setPostForm((current) => ({ ...current, visibility: value as "public" | "friends" | "private" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose post visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="friends">Friends only</SelectItem>
                  <SelectItem value="private">Only me</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={saveDraft}>
                <Save className="mr-2 h-4 w-4" /> Save Draft
              </Button>
              <Button variant="outline" className="flex-1" onClick={clearComposer}>
                Reset
              </Button>
              <Button
                data-testid="submit-post"
                className="flex-1"
                onClick={submitPost}
                disabled={createPost.isPending || isUploadingPostImage || !(postForm.content.trim() || postForm.imageUrls.length || postForm.linkUrl.trim())}
              >
                <Send className="mr-2 h-4 w-4" /> Publish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
