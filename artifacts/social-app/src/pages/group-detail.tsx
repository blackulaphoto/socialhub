import { useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupPosts, useCreatePost, useGetGroup, useJoinGroup, useLeaveGroup } from "@workspace/api-client-react";
import { Eye, Lock, MapPin, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedPostCard } from "@/components/feed-post-card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { QueryErrorState } from "@/components/query-error-state";
import { ReportDialog } from "@/components/report-dialog";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload-image";
import { LoadMoreSentinel } from "@/components/load-more-sentinel";

type SceneView = "all" | "discussion" | "requests" | "castings" | "showcase";

function resolveSceneIdentity(group: { category?: string | null; tags?: string[] | null; postCount?: number | null }) {
  const category = (group.category || "").trim();
  const tags = (group.tags || []).map((tag) => tag.toLowerCase());
  const normalized = category.toLowerCase();

  if (normalized.includes("contest") || tags.some((tag) => tag.includes("contest") || tag.includes("challenge"))) {
    return {
      type: "Contest",
      label: "Challenge / contest",
      helper: "Submission threads, prompts, ranked drops, and competitive scene energy.",
    };
  }
  if (normalized.includes("casting") || tags.some((tag) => tag.includes("casting") || tag.includes("open call") || tag.includes("model call"))) {
    return {
      type: "Casting Hub",
      label: "Casting / open calls",
      helper: "Role calls, crew searches, collaborator requests, and hiring threads.",
    };
  }
  if (normalized.includes("collective") || normalized.includes("crew")) {
    return {
      type: "Collective",
      label: "Collective / crew",
      helper: "Shared group identity, recurring collaborators, and a stable internal scene.",
    };
  }
  if (normalized.includes("event") || tags.some((tag) => tag.includes("event") || tag.includes("party"))) {
    return {
      type: "Event Group",
      label: "Event / happening",
      helper: "Planning, attendance, updates, and post-event memory in one place.",
    };
  }
  return {
    type: category || "Forum",
    label: "Forum / group",
    helper: "Discussion threads, references, local talk, and scene-based community posting.",
  };
}

function classifyScenePost(content: string) {
  const normalized = content.toLowerCase();
  if (normalized.includes("casting") || normalized.includes("model call")) return "castings" as const;
  if (normalized.includes("looking for") || normalized.includes("need a") || normalized.includes("collab") || normalized.includes("request")) return "requests" as const;
  if (normalized.includes("behind the scenes") || normalized.includes("bts") || normalized.includes("shoot recap") || normalized.includes("test shoot") || normalized.includes("editorial")) return "showcase" as const;
  return "discussion" as const;
}

export default function GroupDetail({ id }: { id: string }) {
  const groupId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [postForm, setPostForm] = useState({ content: "", imageUrl: "", videoUrl: "", audioUrl: "" });
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const [sceneView, setSceneView] = useState<SceneView>("all");

  const { data, isLoading, isError, refetch } = useGetGroup(groupId, {
    query: {
      queryKey: ["group", groupId],
      enabled: Number.isFinite(groupId),
    },
  });
  const {
    data: groupPostsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["group-posts", groupId],
    enabled: Number.isFinite(groupId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => getGroupPosts(groupId, {
      cursor: pageParam,
      limit: 10,
    }, { signal }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  const joinGroup = useJoinGroup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      },
    },
  });

  const leaveGroup = useLeaveGroup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      },
    },
  });

  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        setPostForm({ content: "", imageUrl: "", videoUrl: "", audioUrl: "" });
        queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        queryClient.invalidateQueries({ queryKey: ["group-posts", groupId] });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast({ title: "Post added to scene" });
      },
      onError: () => {
        toast({ title: "Could not post to scene", variant: "destructive" });
      },
    },
  });

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

  const groupPosts = useMemo(
    () => groupPostsData?.pages.flatMap((page) => page.posts) || data?.posts || [],
    [data?.posts, groupPostsData],
  );
  const scenePosts = useMemo(
    () => sceneView === "all" ? groupPosts : groupPosts.filter((post) => classifyScenePost(post.content || "") === sceneView),
    [groupPosts, sceneView],
  );

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (isError) return <div className="mx-auto w-full max-w-5xl p-4 md:py-8"><QueryErrorState title="Could not load scene" description="The scene detail request failed. Check the API and retry." onRetry={() => refetch()} /></div>;
  if (!data) return <div className="p-8">Scene not found.</div>;

  const isOwner = data.group.ownerId === user?.id;
  const canPost = Boolean(data.group.isMember || isOwner);
  const sceneIdentity = resolveSceneIdentity(data.group);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:py-8">
      <div className="overflow-hidden rounded-[2rem] border border-border/50 bg-card/42 shadow-[0_28px_70px_-54px_rgba(0,0,0,0.84)] backdrop-blur-xl">
        <div className="h-48 bg-gradient-to-r from-primary/15 via-background to-cyan-500/10" style={data.group.coverImageUrl ? { backgroundImage: `url(${data.group.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="flex flex-col gap-4 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{data.group.name}</h1>
                <Badge variant={data.group.visibility === "private" ? "secondary" : "outline"}>{data.group.visibility}</Badge>
                {isOwner && <Badge>Owner</Badge>}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-primary/80">{sceneIdentity.label}</div>
              <p className="mt-2 max-w-2xl text-muted-foreground">{data.group.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{sceneIdentity.type}</Badge>
                <Badge variant="outline">Forums</Badge>
                <Badge variant="outline">Groups</Badge>
                <Badge variant="outline">{sceneIdentity.type === "Contest" ? "Submissions" : sceneIdentity.type === "Casting Hub" ? "Open calls" : "Threads"}</Badge>
              </div>
            </div>
            {isOwner ? (
              <Button variant="outline" disabled>Owner</Button>
            ) : (
              <div className="flex gap-3">
                <ReportDialog targetType="group" targetId={groupId} variant="outline" />
                <Button
                  onClick={() => (data.group.isMember ? leaveGroup.mutate({ groupId }) : joinGroup.mutate({ groupId }))}
                  disabled={joinGroup.isPending || leaveGroup.isPending}
                >
                  {data.group.isMember ? "Leave Scene" : "Join Scene"}
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {data.group.memberCount} members</span>
            {data.group.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {data.group.location}</span>}
            <span className="inline-flex items-center gap-1">{data.group.visibility === "private" ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{data.group.visibility}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{sceneIdentity.type}</Badge>
            {data.group.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-[1.9rem] border border-border/50 bg-card/42 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.82)] backdrop-blur-xl">
          <CardHeader><CardTitle>Scene Members</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {[
                { label: "Members", value: String(data.group.memberCount) },
                { label: "Posts", value: String(groupPosts.length) },
                { label: "Format", value: sceneIdentity.type },
                { label: "Visibility", value: data.group.visibility },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.2rem] border border-border/50 bg-background/28 p-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                  <div className="mt-2 text-sm font-medium">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-[1.2rem] border border-border/50 bg-background/28 p-3 text-sm text-muted-foreground">
              {sceneIdentity.helper}
            </div>
            {data.group.owner && (
              <div className="flex items-center gap-3 rounded-[1.2rem] border border-border/50 bg-background/32 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={data.group.owner.avatarUrl || ""} />
                  <AvatarFallback>{data.group.owner.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{data.group.owner.username}</div>
                  <div className="text-xs text-muted-foreground">Owner</div>
                </div>
              </div>
            )}
            {data.group.membersPreview?.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatarUrl || ""} />
                  <AvatarFallback>{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{member.username}</div>
                  <div className="text-xs text-muted-foreground">{member.profileType}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="overflow-hidden rounded-[1.9rem] border border-border/50 bg-card/45 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.82)] backdrop-blur-xl">
            <CardHeader><CardTitle>{sceneIdentity.type} Forum</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: "Discussion", detail: "General scene talk, planning, local updates, and loose conversation." },
                  { label: "Requests", detail: "Collaborator asks, crew needs, references, and production support." },
                  { label: "Castings", detail: "Model calls, role calls, and date-specific pull requests." },
                  { label: sceneIdentity.type === "Contest" ? "Submissions" : "Showcase", detail: sceneIdentity.type === "Contest" ? "Entry drops, prompts, finalists, and challenge recaps." : "BTS drops, test shoots, fresh edits, and scene recaps." },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.2rem] border border-border/50 bg-background/28 p-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{item.detail}</div>
                  </div>
                ))}
              </div>
              {canPost ? (
                <div className="space-y-3 rounded-[1.6rem] border border-border/50 bg-background/28 p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatarUrl || ""} />
                      <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Open call", starter: "Open call: looking for " },
                          { label: "Collab request", starter: "Collab request: need a " },
                          { label: "Location scout", starter: "Location scout: looking for " },
                          { label: "Wardrobe pull", starter: "Wardrobe pull: seeking stylist support for " },
                          { label: "Shoot recap", starter: "Shoot recap: " },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setPostForm((current) => ({
                              ...current,
                              content: current.content.trim() ? current.content : item.starter,
                            }))}
                            className="rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="Post an update, open call, collaboration request, or local scene note..."
                        value={postForm.content}
                        onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                        className="min-h-24 bg-background/60"
                      />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                          <Input placeholder="Image URL" value={postForm.imageUrl} onChange={(e) => setPostForm({ ...postForm, imageUrl: e.target.value })} />
                          <Input type="file" accept="image/*" onChange={(e) => handlePostImageUpload(e.target.files?.[0] || null)} disabled={isUploadingPostImage} />
                        </div>
                        <Input placeholder="Video URL" value={postForm.videoUrl} onChange={(e) => setPostForm({ ...postForm, videoUrl: e.target.value })} />
                        <Input placeholder="Audio URL" value={postForm.audioUrl} onChange={(e) => setPostForm({ ...postForm, audioUrl: e.target.value })} />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={() =>
                            createPost.mutate({
                              data: {
                                groupId,
                                content: postForm.content,
                                imageUrl: postForm.imageUrl || undefined,
                                media: [
                                  postForm.imageUrl ? { type: "image", url: postForm.imageUrl } : null,
                                  postForm.videoUrl ? { type: "video", url: postForm.videoUrl } : null,
                                  postForm.audioUrl ? { type: "audio", url: postForm.audioUrl } : null,
                                ].filter(Boolean) as Array<{ type: string; url: string }>,
                              },
                            })
                          }
                          disabled={createPost.isPending || isUploadingPostImage || !postForm.content.trim()}
                        >
                          Publish to Scene
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-border/50 bg-background/24 p-4 text-sm text-muted-foreground">
                  Join this scene to post inside the forum and become part of the conversation.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: "All" },
              { key: "discussion", label: "Discussion" },
              { key: "requests", label: "Requests" },
              { key: "castings", label: "Castings" },
              { key: "showcase", label: "Showcase" },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSceneView(item.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${sceneView === item.key ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/50 bg-background/35 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {scenePosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
          <LoadMoreSentinel
            enabled={Boolean(hasNextPage)}
            isLoading={isFetchingNextPage}
            onVisible={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
          />
          {scenePosts.length === 0 && <Card className="rounded-[1.9rem] border border-border/50 bg-card/40 shadow-[0_20px_50px_-42px_rgba(0,0,0,0.78)] backdrop-blur-xl"><CardContent className="p-8 text-muted-foreground">{sceneView === "all" ? "No posts in this scene yet." : `No ${sceneView} posts in this scene yet.`}</CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
