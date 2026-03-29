import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreatePost, useGetGroup, useJoinGroup, useLeaveGroup } from "@workspace/api-client-react";
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

export default function GroupDetail({ id }: { id: string }) {
  const groupId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [postForm, setPostForm] = useState({ content: "", imageUrl: "", videoUrl: "", audioUrl: "" });
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);

  const { data, isLoading, isError, refetch } = useGetGroup(groupId, {
    query: {
      queryKey: ["group", groupId],
      enabled: Number.isFinite(groupId),
    },
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
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast({ title: "Post added to group" });
      },
      onError: () => {
        toast({ title: "Could not post to group", variant: "destructive" });
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

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (isError) return <div className="mx-auto w-full max-w-5xl p-4 md:py-8"><QueryErrorState title="Could not load group" description="The group detail request failed. Check the API and retry." onRetry={() => refetch()} /></div>;
  if (!data) return <div className="p-8">Group not found.</div>;

  const isOwner = data.group.ownerId === user?.id;
  const canPost = Boolean(data.group.isMember || isOwner);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:py-8">
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50">
        <div className="h-48 bg-gradient-to-r from-primary/15 via-background to-cyan-500/10" style={data.group.coverImageUrl ? { backgroundImage: `url(${data.group.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="flex flex-col gap-4 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{data.group.name}</h1>
                <Badge variant={data.group.visibility === "private" ? "secondary" : "outline"}>{data.group.visibility}</Badge>
                {isOwner && <Badge>Owner</Badge>}
              </div>
              <p className="mt-2 max-w-2xl text-muted-foreground">{data.group.description}</p>
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
                  {data.group.isMember ? "Leave Group" : "Join Group"}
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
            {data.group.category && <Badge variant="secondary">{data.group.category}</Badge>}
            {data.group.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/50">
          <CardHeader><CardTitle>Members</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.group.owner && (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
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
          <Card className="border-border/50 bg-card/60">
            <CardHeader><CardTitle>Group Feed</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {canPost ? (
                <div className="space-y-3 rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatarUrl || ""} />
                      <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        placeholder="Post an update to the group..."
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
                          Publish to Group
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
                  Join this group to post inside the conversation.
                </div>
              )}
            </CardContent>
          </Card>

          {data.posts?.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
          {(!data.posts || data.posts.length === 0) && <Card className="border-border/50 bg-card/40"><CardContent className="p-8 text-muted-foreground">No posts in this group yet.</CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
