import { useState } from "react";
import { Link } from "wouter";
import { useGetFeed, useCreatePost, useLikePost, useUnlikePost } from "@workspace/api-client-react";
import { Post } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Heart, MessageSquare, Image as ImageIcon, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

function PostCard({ post }: { post: Post }) {
  const { mutate: likePost } = useLikePost();
  const { mutate: unlikePost } = useUnlikePost();
  const queryClient = useQueryClient();

  const handleLike = () => {
    if (post.isLiked) {
      unlikePost({ postId: post.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    } else {
      likePost({ postId: post.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    }
  };

  return (
    <Card className="mb-4 bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <Link href={`/profile/${post.author.id}`} className="shrink-0">
          <Avatar className="h-10 w-10 border border-border cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={post.author.avatarUrl || ""} />
            <AvatarFallback>{post.author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col">
          <Link href={`/profile/${post.author.id}`}>
            <span className="font-semibold hover:underline cursor-pointer">{post.author.username}</span>
          </Link>
          <span className="text-xs text-muted-foreground">
            {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-3 text-sm md:text-base">
        <p className="whitespace-pre-wrap mb-3">{post.content}</p>
        {post.imageUrl && (
          <div className="rounded-lg overflow-hidden border border-border/50 mt-2">
            <img src={post.imageUrl} alt="Post content" className="w-full max-h-[500px] object-cover" />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex gap-4 border-t border-border/20 pt-3 text-muted-foreground">
        <button 
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm hover:text-primary transition-colors ${post.isLiked ? 'text-primary' : ''}`}
        >
          <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-primary' : ''}`} />
          <span>{post.likeCount}</span>
        </button>
      </CardFooter>
    </Card>
  );
}

function CreatePostForm() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const { mutate: createPost, isPending } = useCreatePost();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createPost({ data: { content, imageUrl: imageUrl || undefined } }, {
      onSuccess: () => {
        setContent("");
        setImageUrl("");
        setShowImageInput(false);
        queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      }
    });
  };

  return (
    <Card className="mb-6 border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 border border-border hidden sm:block">
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <Textarea 
                placeholder="What's happening in the scene?" 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none bg-background/50 border-border/50 mb-3 focus-visible:ring-1"
              />
              
              {showImageInput && (
                <Input 
                  placeholder="Paste image URL here..." 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mb-3 bg-background/50 border-border/50 text-sm"
                />
              )}
              
              <div className="flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setShowImageInput(!showImageInput)}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
                <Button type="submit" disabled={!content.trim() || isPending} size="sm" className="px-6 rounded-full">
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data, isLoading } = useGetFeed({ limit: 50 });

  return (
    <div className="max-w-2xl mx-auto p-4 md:py-8 w-full min-h-full">
      <h1 className="text-2xl font-bold mb-6 hidden md:block">Feed</h1>
      
      <CreatePostForm />
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : data?.posts && data.posts.length > 0 ? (
        <div className="space-y-4">
          {data.posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-foreground mb-1">No posts yet</h3>
          <p>Follow some artists to see their updates here.</p>
        </div>
      )}
    </div>
  );
}
