import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Link2,
  Newspaper,
  Plus,
  Radio,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCreateCustomFeed,
  useCreatePost,
  useGetCustomFeeds,
  useGetFeed,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FeedPostCard } from "@/components/feed-post-card";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/query-error-state";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload-image";
import { getEmbedDescriptor } from "@/lib/embeds";

const FEED_MODES = [
  { value: "following", label: "Following", helper: "People you chose to keep up with." },
  { value: "local", label: "Local", helper: "Creators and scenes tied to a city." },
  { value: "discovery", label: "Discovery", helper: "Fresh creators and tagged creative pockets." },
];

function activeFeedLabel(mode: string, selectedCustomFeedName?: string | null) {
  if (selectedCustomFeedName) return selectedCustomFeedName;
  return FEED_MODES.find((feed) => feed.value === mode)?.label || "Feed";
}

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState("following");
  const [city, setCity] = useState("");
  const [selectedCustomFeed, setSelectedCustomFeed] = useState<number | null>(null);
  const [postForm, setPostForm] = useState({ content: "", imageUrl: "", linkUrl: "" });
  const [feedForm, setFeedForm] = useState({ name: "", description: "", categories: "", tags: "", locations: "", includedUserIds: "" });
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [showLinkField, setShowLinkField] = useState(false);

  const feedParams = {
    mode: (selectedCustomFeed ? "custom" : mode) as "following" | "local" | "discovery" | "custom",
    city: city || undefined,
    customFeedId: selectedCustomFeed || undefined,
  };

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetFeed(feedParams, {
    query: {
      queryKey: ["feed", feedParams.mode, city, selectedCustomFeed],
      enabled: !!user,
    },
  });

  const { data: customFeeds } = useGetCustomFeeds({
    query: {
      queryKey: ["custom-feeds"],
      enabled: !!user,
    },
  });

  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        setPostForm({ content: "", imageUrl: "", linkUrl: "" });
        setShowLinkField(false);
        setIsPostDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "posts"] });
        toast({ title: "Post published", description: "Your update is now live in the feed." });
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
        toast({ title: "Custom feed saved", description: "You can switch back to it anytime from the sidebar." });
      },
      onError: () => {
        toast({ title: "Could not save custom feed", variant: "destructive" });
      },
    },
  });

  const selectedFeed = customFeeds?.find((feed) => feed.id === selectedCustomFeed) || null;

  const handlePostImageUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingPostImage(true);
    try {
      const uploaded = await uploadImage(file, "post");
      setPostForm((current) => ({ ...current, imageUrl: uploaded.url }));
      toast({ title: "Image uploaded" });
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
        content: postForm.content,
        imageUrl: postForm.imageUrl || undefined,
        media: [
          postForm.imageUrl ? { type: "image", url: postForm.imageUrl } : null,
          linkMedia ? { type: linkMedia.kind, url: linkMedia.href, title: linkMedia.label } : null,
        ].filter(Boolean) as Array<{ type: string; url: string }>,
      },
    });
  };

  const clearComposer = () => {
    setPostForm({ content: "", imageUrl: "", linkUrl: "" });
    setShowLinkField(false);
  };

  const openPostDialog = () => {
    setIsPostDialogOpen(true);
  };

  const openPostDialogWithLink = () => {
    setShowLinkField(true);
    setIsPostDialogOpen(true);
  };

  const openPostDialogWithImage = () => {
    setShowLinkField(false);
    setIsPostDialogOpen(true);
    window.setTimeout(() => fileInputRef.current?.click(), 50);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:py-8">
      <Card className="border-border/50 bg-card/60 md:hidden">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-primary">
                <SlidersHorizontal className="h-3 w-3" /> Feed
              </div>
              <h1 className="mt-3 text-xl font-bold">ArtistHub</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeFeedLabel(mode, selectedFeed?.name)} / {data?.posts?.length || 0} posts loaded
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Feed Controls</DialogTitle>
                    <DialogDescription>Switch feed modes, set a city, or save a custom feed.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h2 className="mb-2 font-semibold">Feeds</h2>
                      <div className="space-y-2">
                        {FEED_MODES.map((feed) => (
                          <button
                            key={feed.value}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${mode === feed.value && !selectedCustomFeed ? "border-primary bg-primary/10" : "border-border/50 bg-card/40 hover:border-primary/30"}`}
                            onClick={() => {
                              setSelectedCustomFeed(null);
                              setMode(feed.value);
                            }}
                          >
                            <div className="font-medium">{feed.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{feed.helper}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Local city filter</div>
                      <Input placeholder="Los Angeles" value={city} onChange={(e) => setCity(e.target.value)} />
                      {city && (
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{city}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => setCity("")}>Clear city</Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Custom Feeds</h3>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Custom Feed</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <Input placeholder="Feed name" value={feedForm.name} onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })} />
                              <Textarea placeholder="Description" value={feedForm.description} onChange={(e) => setFeedForm({ ...feedForm, description: e.target.value })} />
                              <Input placeholder="Categories: DJ, photographer" value={feedForm.categories} onChange={(e) => setFeedForm({ ...feedForm, categories: e.target.value })} />
                              <Input placeholder="Tags: techno, latex, darkwave" value={feedForm.tags} onChange={(e) => setFeedForm({ ...feedForm, tags: e.target.value })} />
                              <Input placeholder="Locations: Los Angeles, San Diego" value={feedForm.locations} onChange={(e) => setFeedForm({ ...feedForm, locations: e.target.value })} />
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
                      <div className="space-y-2">
                        {customFeeds?.length ? customFeeds.map((feed) => (
                          <button
                            key={feed.id}
                            className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${selectedCustomFeed === feed.id ? "border-primary bg-primary/10" : "border-border/50 bg-card/40 hover:border-primary/30"}`}
                            onClick={() => setSelectedCustomFeed(feed.id)}
                          >
                            <div className="font-medium">{feed.name}</div>
                            {feed.description && <div className="mt-1 text-xs text-muted-foreground">{feed.description}</div>}
                          </button>
                        )) : (
                          <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-4 text-sm text-muted-foreground">
                            No custom feeds yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={isPostDialogOpen}
                onOpenChange={(open) => {
                  setIsPostDialogOpen(open);
                  if (!open) setShowLinkField(false);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="icon" className="h-10 w-10 rounded-full">
                    <Send className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Post</DialogTitle>
                    <DialogDescription>Post into {activeFeedLabel(mode, selectedFeed?.name)}.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full">
                        <Radio className="mr-1 h-3 w-3" />
                        Posting into {activeFeedLabel(mode, selectedFeed?.name)}
                      </Badge>
                      {city && <Badge variant="secondary">{city}</Badge>}
                    </div>
                    <Textarea
                      placeholder="Share a release, appearance, drop, call-for-collab, or update..."
                      value={postForm.content}
                      onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                      className="min-h-40 border-0 bg-background/20 px-0 text-base shadow-none focus-visible:ring-0"
                    />
                    {(postForm.imageUrl || postForm.linkUrl) ? (
                      <div className="flex flex-wrap gap-2">
                        {postForm.imageUrl ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-2 text-xs">
                            <ImageIcon className="h-3.5 w-3.5 text-primary" />
                            Image attached
                            <button type="button" onClick={() => setPostForm((current) => ({ ...current, imageUrl: "" }))}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                        {postForm.linkUrl ? (
                          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-2 text-xs">
                            <Link2 className="h-3.5 w-3.5 text-primary" />
                            <span className="truncate">{postForm.linkUrl}</span>
                            <button type="button" onClick={() => setPostForm((current) => ({ ...current, linkUrl: "" }))}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {showLinkField ? (
                      <div className="space-y-2">
                        <Input placeholder="Paste a video, audio, article, or post link" value={postForm.linkUrl} onChange={(e) => setPostForm({ ...postForm, linkUrl: e.target.value })} />
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setShowLinkField(false)}>Done</Button>
                        </div>
                      </div>
                    ) : null}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePostImageUpload(e.target.files?.[0] || null)}
                      disabled={isUploadingPostImage}
                    />
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">Add to your post</div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => fileInputRef.current?.click()}>
                            <ImageIcon className="h-5 w-5 text-primary" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => setShowLinkField((current) => !current)}>
                            <Link2 className="h-5 w-5 text-primary" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Paste a normal link when you add one. YouTube, Vimeo, Spotify, SoundCloud, and generic links are detected automatically.
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={clearComposer}>
                        Reset
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={submitPost}
                        disabled={createPost.isPending || isUploadingPostImage || !postForm.content.trim()}
                      >
                        <Send className="mr-2 h-4 w-4" /> Post
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer border-border/50 bg-card/70 transition-colors hover:border-primary/30" onClick={openPostDialog}>
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 md:h-11 md:w-11">
              <AvatarImage src={user?.avatarUrl || ""} />
              <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <button type="button" className="flex-1 rounded-full border border-border/60 bg-background/50 px-4 py-3 text-left text-sm text-muted-foreground">
              Share a release, appearance, drop, call-for-collab, or update...
            </button>
            <div className="hidden items-center gap-1 sm:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={(event) => {
                  event.stopPropagation();
                  openPostDialogWithImage();
                }}
              >
                <ImageIcon className="h-5 w-5 text-primary" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={(event) => {
                  event.stopPropagation();
                  openPostDialogWithLink();
                }}
              >
                <Link2 className="h-5 w-5 text-primary" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden overflow-hidden border-border/50 bg-card/60 md:block">
        <CardContent className="p-0">
          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_28%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Feed Control
                </div>
                <h1 className="mt-4 text-3xl font-bold md:text-4xl">Browse your social world without a black-box algorithm.</h1>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">
                  Follow scenes, pin local cities, and build custom feed collections around real people, categories, and places.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm md:min-w-80">
                <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                  <div className="text-muted-foreground">Current feed</div>
                  <div className="mt-1 font-semibold">{activeFeedLabel(mode, selectedFeed?.name)}</div>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                  <div className="text-muted-foreground">Posts loaded</div>
                  <div className="mt-1 font-semibold">{data?.posts?.length || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden space-y-4 md:block lg:w-80">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="mb-2 font-semibold">Feeds</h2>
                <div className="space-y-2">
                  {FEED_MODES.map((feed) => (
                    <button
                      key={feed.value}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${mode === feed.value && !selectedCustomFeed ? "border-primary bg-primary/10" : "border-border/50 bg-card/40 hover:border-primary/30"}`}
                      onClick={() => {
                        setSelectedCustomFeed(null);
                        setMode(feed.value);
                      }}
                    >
                      <div className="font-medium">{feed.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{feed.helper}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Local city filter</div>
                <Input placeholder="Los Angeles" value={city} onChange={(e) => setCity(e.target.value)} />
                {city && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{city}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setCity("")}>Clear city</Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Custom Feeds</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Custom Feed</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input placeholder="Feed name" value={feedForm.name} onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })} />
                        <Textarea placeholder="Description" value={feedForm.description} onChange={(e) => setFeedForm({ ...feedForm, description: e.target.value })} />
                        <Input placeholder="Categories: DJ, photographer" value={feedForm.categories} onChange={(e) => setFeedForm({ ...feedForm, categories: e.target.value })} />
                        <Input placeholder="Tags: techno, latex, darkwave" value={feedForm.tags} onChange={(e) => setFeedForm({ ...feedForm, tags: e.target.value })} />
                        <Input placeholder="Locations: Los Angeles, San Diego" value={feedForm.locations} onChange={(e) => setFeedForm({ ...feedForm, locations: e.target.value })} />
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
                <div className="space-y-2">
                  {customFeeds?.length ? customFeeds.map((feed) => (
                    <button
                      key={feed.id}
                      className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${selectedCustomFeed === feed.id ? "border-primary bg-primary/10" : "border-border/50 bg-card/40 hover:border-primary/30"}`}
                      onClick={() => setSelectedCustomFeed(feed.id)}
                    >
                      <div className="font-medium">{feed.name}</div>
                      {feed.description && <div className="mt-1 text-xs text-muted-foreground">{feed.description}</div>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {feed.tags?.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        {feed.locations?.slice(0, 1).map((location) => <Badge key={location} variant="outline">{location}</Badge>)}
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-4 text-sm text-muted-foreground">
                      No custom feeds yet.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-5">
          <Card className="border-border/50 bg-card/40">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Newspaper className="h-5 w-5 text-primary" />
                    {activeFeedLabel(mode, selectedFeed?.name)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedFeed?.description || FEED_MODES.find((feed) => feed.value === mode)?.helper || "Chronological social updates."}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFeed ? (
                    <>
                      <Badge variant="outline">Custom feed</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCustomFeed(null)}>Back to defaults</Button>
                    </>
                  ) : (
                    <Badge variant="secondary">{FEED_MODES.find((feed) => feed.value === mode)?.label}</Badge>
                  )}
                  {city && <Badge variant="secondary">{city}</Badge>}
                </div>
              </div>
            </CardHeader>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : isError ? (
            <QueryErrorState title="Could not load feed" description="The feed request failed. Check the API and retry." onRetry={() => refetch()} />
          ) : (
            <div className="space-y-4">
              {data?.posts?.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
              {(!data?.posts || data.posts.length === 0) && (
                <Card className="border-dashed border-border/50 bg-card/40">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <Sparkles className="mx-auto mb-4 h-10 w-10 opacity-30" />
                    <div className="text-foreground font-medium">No posts in this feed yet.</div>
                    <div className="mt-2 text-sm">
                      Try another feed mode, broaden the city filter, or publish the first post into this scene.
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
