import { useState } from "react";
import { Link } from "wouter";
import { 
  useGetUser, 
  useGetUserPosts, 
  useFollowUser, 
  useUnfollowUser 
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Grid, Calendar, Settings, Compass } from "lucide-react";

export default function Profile({ id }: { id: string }) {
  const userId = parseInt(id);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isOwnProfile = currentUser?.id === userId;

  const { data: profile, isLoading: isLoadingProfile } = useGetUser(userId, {
    query: { enabled: !!userId }
  });

  const { data: postsData, isLoading: isLoadingPosts } = useGetUserPosts(userId, { limit: 50 }, {
    query: { 
      queryKey: ["/api/users", userId, "posts"],
      enabled: !!userId 
    }
  });

  const { mutate: follow } = useFollowUser();
  const { mutate: unfollow } = useUnfollowUser();

  const handleFollowToggle = () => {
    if (!profile) return;
    
    if (profile.isFollowing) {
      unfollow({ userId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
      });
    } else {
      follow({ userId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
      });
    }
  };

  if (isLoadingProfile) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!profile) {
    return <div className="text-center py-20">User not found</div>;
  }

  const { user, isFollowing, artistProfile } = profile;

  return (
    <div className="w-full">
      {/* Banner & Header */}
      <div className="h-32 md:h-48 bg-muted relative border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 relative h-full flex items-end pb-4">
          {user.profileType === 'artist' && artistProfile?.category && (
            <div className="absolute top-4 right-4">
              <Link href={`/artists/${user.id}`}>
                <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-md border-primary/30 hover:border-primary">
                  <Compass className="w-4 h-4 mr-2 text-primary" />
                  View Artist Page
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12 -mt-12 md:-mt-16 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-xl">
            <AvatarImage src={user.avatarUrl || ""} />
            <AvatarFallback className="text-3xl bg-primary/20 text-primary">
              {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 pb-2">
            <h1 className="text-2xl md:text-3xl font-bold">{user.username}</h1>
            <p className="text-muted-foreground capitalize flex items-center gap-2">
              {user.profileType} 
              {user.profileType === 'artist' && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>}
            </p>
          </div>
          
          <div className="flex gap-3 pb-2 w-full md:w-auto">
            {isOwnProfile ? (
              <Link href="/settings" className="w-full md:w-auto">
                <Button variant="outline" className="w-full">
                  <Settings className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </Link>
            ) : (
              <>
                <Button 
                  onClick={handleFollowToggle} 
                  variant={isFollowing ? "outline" : "default"}
                  className="flex-1 md:flex-none"
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <Link href={`/messages/${user.id}`} className="flex-1 md:flex-none">
                  <Button variant="secondary" className="w-full">Message</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {user.bio && (
          <div className="mb-6 max-w-2xl text-sm md:text-base">
            <p className="whitespace-pre-wrap">{user.bio}</p>
          </div>
        )}

        <div className="flex gap-6 mb-8 text-sm">
          <div className="flex flex-col">
            <span className="font-bold text-lg">{user.postCount}</span>
            <span className="text-muted-foreground">Posts</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg">{user.followerCount}</span>
            <span className="text-muted-foreground">Followers</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg">{user.followingCount}</span>
            <span className="text-muted-foreground">Following</span>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full justify-start border-b border-border/50 rounded-none bg-transparent h-12 p-0">
            <TabsTrigger value="posts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-6 h-full font-medium">
              <Grid className="w-4 h-4 mr-2" /> Posts
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="pt-6">
            {isLoadingPosts ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : postsData?.posts && postsData.posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {postsData.posts.map(post => (
                  <Card key={post.id} className="bg-card/50 border-border/50 overflow-hidden flex flex-col">
                    {post.imageUrl && (
                      <div className="aspect-video w-full bg-muted relative">
                        <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <p className="text-sm line-clamp-3 mb-4 flex-1">{post.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likeCount}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-card/20 rounded-xl border border-dashed border-border/50">
                <Grid className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No posts yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
