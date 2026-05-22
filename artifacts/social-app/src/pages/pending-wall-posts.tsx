import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FeedPostCard } from "@/components/feed-post-card";
import { Spinner } from "@/components/ui/spinner";
import { QueryErrorState } from "@/components/query-error-state";

interface PendingPost {
  id: number;
  userId: number;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  media?: Array<{
    type: string;
    url: string;
    title?: string;
    thumbnailUrl?: string;
  }>;
  likeCount: number;
  isLiked: boolean;
}

export default function PendingWallPostsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingPosts = [], isLoading, error } = useQuery<PendingPost[]>({
    queryKey: ["pending-wall-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/wall-posts/pending`, {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch pending posts" }));
        throw new Error(error.error || "Failed to fetch pending posts");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const moderatePost = useMutation({
    mutationFn: async ({ postId, action }: { postId: number; action: "approve" | "deny" }) => {
      const response = await fetch(`/api/wall-posts/${postId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to moderate post" }));
        throw new Error(error.error || "Failed to moderate post");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      const action = variables.action;
      toast({
        title: action === "approve" ? "Post approved" : "Post denied",
        description: action === "approve"
          ? "The post is now visible on your page."
          : "The post has been removed from pending.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-wall-posts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["artist-posts", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <QueryErrorState
          title="Could not load pending posts"
          description={(error as Error).message}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Pending Wall Posts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review posts that other people have submitted to your page
          </p>
        </CardHeader>
        <CardContent>
          {pendingPosts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No pending wall posts</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Posts submitted to your page will appear here for review
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <FeedPostCard post={post as any} />
                    <div className="flex gap-3 border-t border-border bg-background/50 p-4">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => moderatePost.mutate({ postId: post.id, action: "approve" })}
                        disabled={moderatePost.isPending}
                      >
                        {moderatePost.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => moderatePost.mutate({ postId: post.id, action: "deny" })}
                        disabled={moderatePost.isPending}
                      >
                        {moderatePost.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Deny
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
