import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Heart,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Repeat2,
  Share2,
  SmilePlus,
  Trash2,
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
import { ReportDialog } from "@/components/report-dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { extractFirstSupportedUrl, stripEmbeddedMarkup } from "@/lib/embeds";

type FeedPost = {
  id: number;
  userId: number;
  content: string;
  imageUrl?: string | null;
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
    avatarUrl?: string | null;
    city?: string | null;
    location?: string | null;
    category?: string | null;
    tags?: string[];
    profileType?: string;
  } | null;
};

export function FeedPostCard({
  post,
  showAuthor = true,
}: {
  post: FeedPost;
  showAuthor?: boolean;
}) {
  const { user } = useAuth();
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
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [currentReaction, setCurrentReaction] = useState(post.currentUserReaction || (post.isLiked ? "like" : null));
  const [reactionCounts, setReactionCounts] = useState<{ like: number; heart: number; wow: number; angry: number }>(post.reactionCounts || { like: post.likeCount, heart: 0, wow: 0, angry: 0 });
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
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
  }, [post.isLiked, post.likeCount, post.currentUserReaction, post.reactionCounts, post.repostCount, post.commentCount]);

  const refreshPostSurfaces = () => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
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
    const url = `${window.location.origin}/profile/${post.userId}`;
    const shareText = `${url}#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.author?.username || "Post", url: shareText });
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

  const canDelete = user?.id === post.userId || user?.isAdmin;
  const authorLocation = post.author?.city || post.author?.location;
  const activeReaction = reactions.find((reaction) => reaction.type === currentReaction);
  const totalReactions = Object.values(reactionCounts).reduce((sum, value) => sum + Number(value || 0), 0);
  const comments = commentsData || post.comments || [];
  const fallbackLink = !post.media?.length ? extractFirstSupportedUrl(post.content) : null;
  const cleanedContent = stripEmbeddedMarkup(post.content);

  return (
    <Card id={`post-${post.id}`} className="overflow-hidden border-border/50 bg-card/60">
      {showAuthor && post.author && (
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar className="h-10 w-10 cursor-pointer">
              <AvatarImage src={post.author.avatarUrl || ""} />
              <AvatarFallback>{post.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/profile/${post.author.id}`} className="block truncate font-semibold hover:text-primary">
                  {post.author.username}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                  {authorLocation && (
                    <span className="inline-flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {authorLocation}
                    </span>
                  )}
                </div>
              </div>
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={isDeleting}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {post.repostOfPostId && post.originalPost ? (
          <div className="rounded-2xl border border-dashed border-primary/35 bg-background/35 p-4 text-sm">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Reposted from {post.originalPost.author?.username}</div>
            <div className="whitespace-pre-wrap text-muted-foreground">{post.originalPost.content}</div>
          </div>
        ) : null}
        {cleanedContent ? <p className="whitespace-pre-wrap text-sm leading-6">{cleanedContent}</p> : null}
        {post.media?.length ? (
          <div className="space-y-3">
            {post.media.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-border/50 bg-background/50">
                <MediaEmbed type={item.type} url={item.url} title={item.title || undefined} />
              </div>
            ))}
          </div>
        ) : fallbackLink ? (
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/50">
            <MediaEmbed type="link" url={fallbackLink} />
          </div>
        ) : null}
        <div className="space-y-3 border-t border-border/50 pt-3">
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
              <Button variant="ghost" size="sm" className="h-9 rounded-full px-2" onClick={() => setCommentsOpen((open) => !open)}>
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
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setCommentsOpen((open) => !open)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              {commentCount}
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
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
                          <div className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</div>
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
                placeholder="Write a comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                className="min-h-20 bg-background/60"
              />
              <Button onClick={handleCreateComment} disabled={createComment.isPending || !commentDraft.trim()}>
                Post
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
