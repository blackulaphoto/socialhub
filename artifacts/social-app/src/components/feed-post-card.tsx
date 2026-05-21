import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Heart,
  Globe2,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Lock,
  Repeat2,
  Share2,
  SmilePlus,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  useCreatePostComment,
  useDeletePost,
  useDeletePostComment,
  useGetPostComments,
  useLikePost,
  useReactToPost,
  useRemovePostReaction,
  useRepostPost,
  useUpdatePost,
  useUnlikePost,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaEmbed } from "@/components/media-embed";
import { MediaLightbox, useMediaLightbox, type MediaLightboxItem } from "@/components/media-lightbox";
import { ReportDialog } from "@/components/report-dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { extractFirstSupportedUrl, stripEmbeddedMarkup } from "@/lib/embeds";
import { getTopicPath } from "@/lib/topics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FeedPost = {
  id: number;
  userId: number;
  actorSurface?: "personal" | "artist";
  content: string;
  hashtags?: string[];
  imageUrl?: string | null;
  visibility?: "public" | "friends" | "private";
  repostOfPostId?: number | null;
  likeCount: number;
  isLiked: boolean;
  reactionCounts?: {
    like: number;
    heart: number;
    wow: number;
    angry: number;
  };
  totalReactionCount?: number;
  currentUserReaction?: string | null;
  repostCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt?: string;
  media?: Array<{ id: number; type: string; url: string; title?: string | null }>;
  comments?: Array<{
    id: number;
    postId: number;
    userId: number;
    parentCommentId?: number | null;
    content: string;
    createdAt: string;
    updatedAt: string;
    author?: {
      id: number;
      username: string;
      avatarUrl?: string | null;
    } | null;
  }>;
  originalPost?: FeedPost | null;
  author?: {
    id: number;
    username: string;
    artistDisplayName?: string | null;
    avatarUrl?: string | null;
    artistAvatarUrl?: string | null;
    city?: string | null;
    location?: string | null;
    category?: string | null;
    tags?: string[];
    profileType?: string;
  } | null;
};

type ParsedPostContext = {
  postType?: string;
  role?: string;
  collaborators?: string;
  location?: string;
  shootType?: string;
};

const POST_CONTEXT_PATTERN = /\n?\[\[context:(.+?)\]\]\s*$/s;

function extractPostHashtags(content: string) {
  const matches = content.match(/#[a-z0-9_]{2,32}/gi) || [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
}

function parsePostContext(content: string): ParsedPostContext | null {
  const match = content.match(POST_CONTEXT_PATTERN);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as ParsedPostContext;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function stripPostContext(content: string) {
  return content.replace(POST_CONTEXT_PATTERN, "").trimEnd();
}

export function FeedPostCard({
  post,
  showAuthor = true,
}: {
  post: FeedPost;
  showAuthor?: boolean;
}) {
  const { user } = useAuth();
  const inquiryHref = post.author ? `/artists/${post.author.id}?inquiry=1` : null;
  const canInquiry = Boolean(post.author && post.author.id !== user?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: likePost, isPending: isLiking } = useLikePost();
  const { mutate: unlikePost, isPending: isUnliking } = useUnlikePost();
  const reactToPost = useReactToPost();
  const removeReaction = useRemovePostReaction();
  const repostPost = useRepostPost();
  const createComment = useCreatePostComment();
  const deleteComment = useDeletePostComment();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();
  const updatePost = useUpdatePost();
  const { selectedId, openLightbox, closeLightbox } = useMediaLightbox();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [currentReaction, setCurrentReaction] = useState(post.currentUserReaction || (post.isLiked ? "like" : null));
  const [reactionCounts, setReactionCounts] = useState<{ like: number; heart: number; wow: number; angry: number }>(post.reactionCounts || { like: post.likeCount, heart: 0, wow: 0, angry: 0 });
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ content: string; visibility: "public" | "friends" | "private" }>({
    content: post.content,
    visibility: post.visibility || "public",
  });
  const { data: commentsData } = useGetPostComments(post.id, {
    query: {
      enabled: commentsOpen,
      queryKey: ["/api/posts", post.id, "comments"],
    },
  });

  const reactions = [
    { type: "like", emoji: "👍", label: "Like" },
    { type: "heart", emoji: "❤️", label: "Heart" },
    { type: "wow", emoji: "😮", label: "Wow" },
    { type: "angry", emoji: "😠", label: "Angry" },
  ] as const;

  useEffect(() => {
    setIsLiked(post.isLiked);
    setLikeCount(post.likeCount);
    setCurrentReaction(post.currentUserReaction || (post.isLiked ? "like" : null));
    setReactionCounts(post.reactionCounts || { like: post.likeCount, heart: 0, wow: 0, angry: 0 });
    setRepostCount(post.repostCount || 0);
    setCommentCount(post.commentCount || 0);
    setEditForm({
      content: post.content,
      visibility: post.visibility || "public",
    });
  }, [post.isLiked, post.likeCount, post.currentUserReaction, post.reactionCounts, post.repostCount, post.commentCount]);

  const refreshPostSurfaces = () => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["group-posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users", post.userId, "posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users", post.userId] });
    queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "comments"] });
  };

  const handleLikeToggle = () => {
    if (isLiking || isUnliking) return;

    if (isLiked) {
      setIsLiked(false);
      setLikeCount((count) => Math.max(0, count - 1));
      unlikePost(
        { postId: post.id },
        {
          onError: () => {
            setIsLiked(true);
            setLikeCount((count) => count + 1);
            toast({ title: "Could not unlike post", variant: "destructive" });
          },
          onSuccess: refreshPostSurfaces,
        },
      );
      return;
    }

    setIsLiked(true);
    setLikeCount((count) => count + 1);
    likePost(
      { postId: post.id },
      {
        onError: () => {
          setIsLiked(false);
          setLikeCount((count) => Math.max(0, count - 1));
          toast({ title: "Could not like post", variant: "destructive" });
        },
        onSuccess: refreshPostSurfaces,
      },
    );
  };

  const handleReaction = (reactionType: (typeof reactions)[number]["type"]) => {
    reactToPost.mutate(
      { postId: post.id, data: { reactionType } },
      {
        onSuccess: (updatedPost) => {
          setCurrentReaction(updatedPost.currentUserReaction || null);
          setReactionCounts(updatedPost.reactionCounts || reactionCounts);
          setLikeCount(updatedPost.likeCount);
          setIsLiked(updatedPost.isLiked);
          refreshPostSurfaces();
        },
        onError: () => {
          toast({ title: "Could not react to post", variant: "destructive" });
        },
      },
    );
  };

  const handleRemoveReaction = () => {
    removeReaction.mutate(
      { postId: post.id },
      {
        onSuccess: (updatedPost) => {
          setCurrentReaction(updatedPost.currentUserReaction || null);
          setReactionCounts(updatedPost.reactionCounts || { like: 0, heart: 0, wow: 0, angry: 0 });
          setLikeCount(updatedPost.likeCount);
          setIsLiked(updatedPost.isLiked);
          refreshPostSurfaces();
        },
        onError: () => {
          toast({ title: "Could not remove reaction", variant: "destructive" });
        },
      },
    );
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/artists/${post.userId}`;
    const shareText = `${url}#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: authorDisplayName || "Post", url: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }
      toast({ title: "Post link ready to share" });
    } catch {
      toast({ title: "Could not share post", variant: "destructive" });
    }
  };

  const handleRepost = () => {
    repostPost.mutate(
      { postId: post.id, data: { content: "" } },
      {
        onSuccess: () => {
          setRepostCount((count) => count + 1);
          refreshPostSurfaces();
          toast({ title: "Post reposted" });
        },
        onError: () => toast({ title: "Could not repost", variant: "destructive" }),
      },
    );
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this post?")) return;
    deletePost(
      { postId: post.id },
      {
        onError: () => {
          toast({ title: "Could not delete post", variant: "destructive" });
        },
        onSuccess: () => {
          refreshPostSurfaces();
          toast({ title: "Post deleted" });
        },
      },
    );
  };

  const handleUpdatePost = () => {
    const content = editForm.content.trim();
    if (!content) return;
    updatePost.mutate(
      {
        postId: post.id,
        data: {
          content,
          visibility: editForm.visibility,
          imageUrl: post.imageUrl || undefined,
          media: post.media?.map((item) => ({
            type: item.type,
            url: item.url,
            title: item.title || undefined,
          })),
        },
      },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          refreshPostSurfaces();
          toast({ title: "Post updated" });
        },
        onError: () => {
          toast({ title: "Could not update post", variant: "destructive" });
        },
      },
    );
  };

  const handleCreateComment = () => {
    const content = commentDraft.trim();
    if (!content) return;
    createComment.mutate(
      { postId: post.id, data: { content } },
      {
        onSuccess: (comments) => {
          setCommentDraft("");
          setCommentsOpen(true);
          setCommentCount(comments.length);
          refreshPostSurfaces();
        },
        onError: () => {
          toast({ title: "Could not post comment", variant: "destructive" });
        },
      },
    );
  };

  const handleDeleteComment = (commentId: number) => {
    deleteComment.mutate(
      { postId: post.id, commentId },
      {
        onSuccess: (comments) => {
          setCommentCount(comments.length);
          refreshPostSurfaces();
        },
        onError: () => {
          toast({ title: "Could not delete comment", variant: "destructive" });
        },
      },
    );
  };

  const canEdit = user?.id === post.userId;
  const canDelete = user?.id === post.userId || user?.isAdmin;
  const authorHref = post.actorSurface === "artist"
    ? `/artists/${post.author?.id ?? post.userId}`
    : `/artists/${post.author?.id ?? post.userId}`;
  const authorDisplayName = post.actorSurface === "artist"
    ? (post.author?.artistDisplayName || post.author?.username || "Unknown")
    : (post.author?.username || "Unknown");
  const authorAvatar = post.actorSurface === "artist"
    ? (post.author?.artistAvatarUrl || post.author?.avatarUrl || "")
    : (post.author?.avatarUrl || "");
  const authorLocation = post.author?.city || post.author?.location;
  const activeReaction = reactions.find((reaction) => reaction.type === currentReaction);
  const totalReactions = Object.values(reactionCounts).reduce((sum, value) => sum + Number(value || 0), 0);
  const comments = commentsData || post.comments || [];
  const fallbackLink = !post.media?.length ? extractFirstSupportedUrl(post.content) : null;
  const postContext = parsePostContext(post.content);
  const cleanedContent = stripEmbeddedMarkup(stripPostContext(post.content));
  const hashtags = post.hashtags?.length ? post.hashtags : extractPostHashtags(post.content);
  const sceneTags = Array.from(new Set([
    ...hashtags,
    ...(post.author?.tags || []).slice(0, 2).map((tag) => tag.startsWith("#") ? tag : `#${tag}`),
  ])).slice(0, 3);
  const visibilityLabel = post.visibility === "friends" ? "Friends" : post.visibility === "private" ? "Private" : "Public";
  const VisibilityIcon = post.visibility === "friends" ? UsersRound : post.visibility === "private" ? Lock : Globe2;
  const surfaceLabel = post.actorSurface === "artist" ? "Creator Profile" : "Profile";
  const postTimestamp = new Date(post.createdAt).toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const originalAuthorDisplayName = post.originalPost?.actorSurface === "artist"
    ? (post.originalPost.author?.artistDisplayName || post.originalPost.author?.username || "Unknown")
    : (post.originalPost?.author?.username || "Unknown");
  const originalAuthorAvatar = post.originalPost?.actorSurface === "artist"
    ? (post.originalPost.author?.artistAvatarUrl || post.originalPost.author?.avatarUrl || "")
    : (post.originalPost?.author?.avatarUrl || "");
  const originalAuthorHref = post.originalPost?.actorSurface === "artist"
    ? `/artists/${post.originalPost.author?.id ?? post.originalPost.userId}`
    : `/artists/${post.originalPost?.author?.id ?? post.originalPost?.userId ?? post.userId}`;
  const originalPostContext = post.originalPost ? parsePostContext(post.originalPost.content) : null;
  const originalCleanedContent = post.originalPost ? stripEmbeddedMarkup(stripPostContext(post.originalPost.content)) : "";
  const showHeaderIdentity = Boolean(post.author);

  // Separate image media from video/audio media
  const imageMedia = post.media?.filter((item) => item.type === "image") || [];
  const otherMedia = post.media?.filter((item) => item.type !== "image") || [];

  // Convert image media to lightbox items
  const lightboxItems: MediaLightboxItem[] = imageMedia.map((item) => ({
    id: item.id,
    url: item.url,
    type: "image" as const,
    title: item.title,
    thumbnailUrl: item.url,
  }));

  return (
    <Card
      id={`post-${post.id}`}
      data-testid={`post-card-${post.id}`}
      className="overflow-hidden rounded-[1.75rem] border-[color:var(--hh-rule)] bg-[color:var(--hh-bg-raised)] text-[color:var(--hh-ink)] shadow-[0_28px_80px_-56px_rgba(0,0,0,0.78)]"
    >
      {showHeaderIdentity ? (
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 border-b border-[color:var(--hh-rule-soft)] px-5 pb-4 pt-5 md:px-6">
          <Link href={authorHref}>
            <Avatar className="h-10 w-10 cursor-pointer">
              <AvatarImage src={authorAvatar} />
              <AvatarFallback>{authorDisplayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={authorHref} className="block truncate font-semibold text-[color:var(--hh-ink)] hover:text-primary">
                  {authorDisplayName}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--hh-ink-muted)]">
                  <span>{postTimestamp}</span>
                  {post.updatedAt && new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 60_000 ? (
                    <span>edited</span>
                  ) : null}
                  {authorLocation && (
                    <span className="inline-flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {authorLocation}
                    </span>
                  )}
                  {post.actorSurface === "artist" ? (
                    <span className="inline-flex items-center rounded-full border border-[color:var(--hh-rule)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--hh-ink-muted)]">
                      {surfaceLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center">
                    <VisibilityIcon className="mr-1 h-3 w-3" />
                    {visibilityLabel}
                  </span>
                </div>
              </div>
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[color:var(--hh-ink-muted)]" disabled={isDeleting}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit ? <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit post</DropdownMenuItem> : null}
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-5 px-5 py-5 md:px-6 md:py-6">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm((current) => ({ ...current, content: e.target.value }))}
                className="min-h-32"
              />
              <div className="space-y-2">
                <div className="text-sm font-medium">Visibility</div>
                <Select value={editForm.visibility} onValueChange={(value) => setEditForm((current) => ({ ...current, visibility: value as "public" | "friends" | "private" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends only</SelectItem>
                    <SelectItem value="private">Only me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdatePost} disabled={updatePost.isPending || !editForm.content.trim()}>
                  Save changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {post.repostOfPostId && post.originalPost ? (
          <div className="rounded-[1.35rem] border border-dashed border-[color:var(--hh-rule)] bg-black/10 p-4 text-sm">
            <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[color:var(--hh-ink-muted)]">
              Reposted from
            </div>
            <div className="mb-3 flex items-center gap-3">
              <Link href={originalAuthorHref}>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage src={originalAuthorAvatar} />
                  <AvatarFallback>{originalAuthorDisplayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0">
                <Link href={originalAuthorHref} className="block truncate font-semibold text-[color:var(--hh-ink)] hover:text-primary">
                  {originalAuthorDisplayName}
                </Link>
              </div>
            </div>
            {originalPostContext ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {originalPostContext.postType ? <Badge variant="secondary">{originalPostContext.postType}</Badge> : null}
                {originalPostContext.role ? <Badge variant="outline">Role: {originalPostContext.role}</Badge> : null}
                {originalPostContext.shootType ? <Badge variant="outline">Type: {originalPostContext.shootType}</Badge> : null}
                {originalPostContext.location ? <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{originalPostContext.location}</Badge> : null}
              </div>
            ) : null}
            <div className="whitespace-pre-wrap text-[color:var(--hh-ink-muted)]">{originalCleanedContent}</div>
            {(post.originalPost.hashtags?.length ? post.originalPost.hashtags : extractPostHashtags(post.originalPost.content)).length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(post.originalPost.hashtags?.length ? post.originalPost.hashtags : extractPostHashtags(post.originalPost.content)).map((tag) => (
                  <Link key={`${post.originalPost?.id}-${tag}`} href={getTopicPath(tag)}>
                    <Badge variant="outline" className="cursor-pointer text-[11px] uppercase tracking-[0.16em]">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {postContext ? (
          <div className="rounded-[1.35rem] border border-[color:var(--hh-rule)] bg-black/10 p-4">
            <div className="flex flex-wrap gap-2">
              {postContext.postType ? <Badge>{postContext.postType}</Badge> : null}
              {postContext.role ? <Badge variant="secondary">Role: {postContext.role}</Badge> : null}
              {postContext.shootType ? <Badge variant="outline">Shoot type: {postContext.shootType}</Badge> : null}
              {postContext.location ? <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{postContext.location}</Badge> : null}
            </div>
            {postContext.collaborators ? (
              <div className="mt-3 text-sm text-[color:var(--hh-ink-muted)]">
                <span className="font-medium text-[color:var(--hh-ink)]">Collaborators:</span> {postContext.collaborators}
              </div>
            ) : null}
          </div>
        ) : null}
        {cleanedContent ? <p className="whitespace-pre-wrap text-[15px] leading-7 text-[color:var(--hh-ink)]">{cleanedContent}</p> : null}
        {hashtags.length ? (
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <Link key={`${post.id}-${tag}`} href={getTopicPath(tag)}>
                <Badge variant="outline" className="cursor-pointer text-[11px] uppercase tracking-[0.16em]">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
        {sceneTags.length ? (
          <div className="rounded-[1.35rem] border border-[color:var(--hh-rule)] bg-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--hh-ink-muted)]">Scene entry points</div>
                <div className="mt-1 text-sm text-[color:var(--hh-ink-muted)]">Take this post into the related scenes and topic threads where the conversation is already happening.</div>
              </div>
              <UsersRound className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sceneTags.map((tag) => (
                <Link key={`scene-${post.id}-${tag}`} href={getTopicPath(tag, "groups")}>
                  <Badge variant="secondary" className="cursor-pointer text-[11px] uppercase tracking-[0.16em]">
                    {tag} scene
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {imageMedia.length > 0 || otherMedia.length > 0 ? (
          <div className="-mx-4 space-y-4 md:-mx-4">
            {imageMedia.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openLightbox(item.id)}
                className="block w-full overflow-hidden border-y border-[color:var(--hh-rule)] bg-black/10 transition-opacity hover:opacity-95 sm:rounded-[1.5rem] sm:border md:mx-1"
              >
                <img
                  src={item.url}
                  alt={item.title || "Post image"}
                  className="w-full max-h-[44rem] object-cover"
                />
              </button>
            ))}
            {otherMedia.map((item) => (
              <div key={item.id} className="overflow-hidden border-y border-[color:var(--hh-rule)] bg-black/10 sm:rounded-[1.5rem] sm:border md:mx-1">
                <MediaEmbed
                  type={item.type}
                  url={item.url}
                  title={item.title || undefined}
                />
              </div>
            ))}
          </div>
        ) : fallbackLink ? (
          <div className="-mx-4 overflow-hidden border-y border-[color:var(--hh-rule)] bg-black/10 sm:rounded-[1.5rem] sm:border md:mx-1">
            <MediaEmbed type="link" url={fallbackLink} />
          </div>
        ) : null}
        <div className="space-y-3 border-t border-[color:var(--hh-rule-soft)] pt-4">
          <div className="flex items-center gap-2 sm:hidden">
            <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={currentReaction ? "default" : "outline"}
                    size="sm"
                    className="h-9 rounded-full px-2"
                    disabled={reactToPost.isPending || removeReaction.isPending}
                  >
                    <SmilePlus className="h-4 w-4" />
                    <span className="ml-1 text-xs">{totalReactions}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {reactions.map((reaction) => (
                    <DropdownMenuItem key={reaction.type} onClick={() => handleReaction(reaction.type)}>
                      <span className="mr-2">{reaction.emoji}</span>
                      {reaction.label}
                    </DropdownMenuItem>
                  ))}
                  {currentReaction ? (
                    <DropdownMenuItem onClick={handleRemoveReaction}>
                      Clear reaction
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                className="h-9 rounded-full px-2"
                onClick={handleLikeToggle}
                disabled={isLiking || isUnliking}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                <span className="ml-1 text-xs">{likeCount}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-9 rounded-full px-2" onClick={handleRepost}>
                <Repeat2 className="h-4 w-4" />
                <span className="ml-1 text-xs">{repostCount}</span>
              </Button>
              <Button data-testid={`toggle-comments-${post.id}`} variant="ghost" size="sm" className="h-9 rounded-full px-2" onClick={() => setCommentsOpen((open) => !open)}>
                <MessageSquare className="h-4 w-4" />
                <span className="ml-1 text-xs">{commentCount}</span>
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                {canInquiry ? (
                  <DropdownMenuItem asChild>
                    <Link href={inquiryHref!}>
                      <span className="flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        Inquiry
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {post.author ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/messages`}>
                      <span className="flex items-center">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <div>
                    <ReportDialog targetType="post" targetId={post.id} label="Report" variant="ghost" size="sm" />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden items-center justify-between gap-3 sm:flex">
            <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentReaction ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  disabled={reactToPost.isPending || removeReaction.isPending}
                >
                  <SmilePlus className="mr-2 h-4 w-4" />
                  {activeReaction ? `${activeReaction.emoji} ${activeReaction.label}` : "React"}
                  <span className="ml-2">{totalReactions}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {reactions.map((reaction) => (
                  <DropdownMenuItem key={reaction.type} onClick={() => handleReaction(reaction.type)}>
                    <span className="mr-2">{reaction.emoji}</span>
                    {reaction.label}
                  </DropdownMenuItem>
                ))}
                {currentReaction ? (
                  <DropdownMenuItem onClick={handleRemoveReaction}>
                    Clear reaction
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={handleLikeToggle}
              disabled={isLiking || isUnliking}
            >
              <Heart className={`mr-2 h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              {likeCount}
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={handleRepost}>
              <Repeat2 className="mr-2 h-4 w-4" />
              {repostCount}
            </Button>
            <Button data-testid={`toggle-comments-${post.id}`} variant="ghost" size="sm" className="rounded-full" onClick={() => setCommentsOpen((open) => !open)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              {commentCount}
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {canInquiry && (
              <Link href={inquiryHref!}>
                <Button variant="ghost" size="sm" className="rounded-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Inquiry
                </Button>
              </Link>
            )}
            {post.author && (
              <Link href={`/messages`}>
                <Button variant="ghost" size="sm" className="rounded-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </Link>
            )}
            <ReportDialog targetType="post" targetId={post.id} label="Report" variant="ghost" size="sm" />
          </div>
          {post.author && (
            <div className="flex flex-wrap items-center gap-2">
              {reactions.filter((reaction) => Number(reactionCounts[reaction.type] || 0) > 0).map((reaction) => (
                <Badge key={reaction.type} variant="secondary">{reaction.emoji} {reactionCounts[reaction.type] || 0}</Badge>
              ))}
              {post.author.category && <Badge variant="outline">{post.author.category}</Badge>}
              {post.author.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
          </div>
        </div>
        {commentsOpen ? (
          <div className="space-y-3 rounded-2xl border border-border/50 bg-background/35 p-4">
            <div className="space-y-3">
              {comments.length ? comments.map((comment) => {
                const canDeleteComment = user?.id === comment.userId || user?.isAdmin;
                return (
                  <div key={comment.id} className="flex gap-3 rounded-xl border border-border/40 bg-background/40 p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author?.avatarUrl || ""} />
                      <AvatarFallback>{comment.author?.username?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{comment.author?.username || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString([], {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}</div>
                        </div>
                        {canDeleteComment ? (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteComment(comment.id)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{comment.content}</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-sm text-muted-foreground">No comments yet. Start the thread.</div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                data-testid={`comment-input-${post.id}`}
                placeholder="Write a comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                className="min-h-20 bg-background/60"
              />
              <Button data-testid={`submit-comment-${post.id}`} onClick={handleCreateComment} disabled={createComment.isPending || !commentDraft.trim()}>
                Post
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>

      <MediaLightbox
        items={lightboxItems}
        selectedId={selectedId}
        onClose={closeLightbox}
        showThumbnails={imageMedia.length > 1}
        showNavigation={imageMedia.length > 1}
        showMetadata={true}
      />
    </Card>
  );
}
