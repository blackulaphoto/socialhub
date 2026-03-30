import { Link } from "wouter";
import { useMemo } from "react";
import {
  Camera,
  Compass,
  ExternalLink,
  HeartHandshake,
  Grid,
  Link2,
  MapPin,
  Settings,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  useFollowUser,
  getUserPosts,
  useGetUser,
  useGetUserPhotos,
  useUnfollowUser,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedPostCard } from "@/components/feed-post-card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { QueryErrorState } from "@/components/query-error-state";
import { ReportDialog } from "@/components/report-dialog";
import { FriendActionButton } from "@/components/friend-action-button";
import { ProfileReactionBar } from "@/components/profile-reaction-bar";
import { BlockActionButton } from "@/components/block-action-button";
import { LoadMoreSentinel } from "@/components/load-more-sentinel";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { cn } from "@/lib/utils";

function formatPlace(parts: Array<string | null | undefined>) {
  const normalized = parts
    .map((part) => part?.trim())
    .filter(Boolean) as string[];

  return normalized.filter((part, index) => normalized.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index).join(", ");
}

const PROFILE_THEME_STYLES: Record<string, { shell: string; overlay: string; card: string }> = {
  nocturne: {
    shell: "linear-gradient(135deg, var(--profile-accent), rgba(12,12,18,0.92) 35%, rgba(20,28,44,0.9) 100%)",
    overlay: "bg-gradient-to-t from-background via-background/70 to-background/10",
    card: "bg-background/40",
  },
  ember: {
    shell: "linear-gradient(135deg, var(--profile-accent), rgba(40,12,10,0.92) 32%, rgba(88,34,8,0.88) 100%)",
    overlay: "bg-gradient-to-t from-background via-background/75 to-amber-950/10",
    card: "bg-background/45",
  },
  afterhours: {
    shell: "linear-gradient(135deg, var(--profile-accent), rgba(24,7,42,0.92) 34%, rgba(9,42,57,0.88) 100%)",
    overlay: "bg-gradient-to-t from-background via-background/68 to-fuchsia-950/10",
    card: "bg-background/38",
  },
};

export default function Profile({ id }: { id: string }) {
  const userId = parseInt(id, 10);
  const { user: currentUser } = useAuth();
  const { setActiveIdentity } = useActiveIdentity();
  const queryClient = useQueryClient();
  const isOwnProfile = currentUser?.id === userId;

  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: ["/api/users", userId] },
  });

  const {
    data: postsData,
    isLoading: isLoadingPosts,
    isError: isPostsError,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/users", userId, "posts", "personal"],
    enabled: !!userId,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => getUserPosts(userId, {
      cursor: pageParam,
      limit: 10,
      surface: "personal",
    }, { signal }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });
  const { data: userPhotos } = useGetUserPhotos(userId, {
    query: {
      queryKey: ["/api/users", userId, "photos"],
      enabled: !!userId,
    },
  });

  const { mutate: follow } = useFollowUser();
  const { mutate: unfollow } = useUnfollowUser();
  const profilePosts = useMemo(
    () => postsData?.pages.flatMap((page) => page.posts) || [],
    [postsData],
  );
  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${userId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.user.username || "Profile", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // no-op: share is best-effort
    }
  };

  const handleFollowToggle = () => {
    if (!profile) return;
    const mutation = profile.isFollowing ? unfollow : follow;
    mutation(
      { userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
          queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "following"] });
          queryClient.invalidateQueries({ queryKey: ["feed"] });
          queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
      },
    );
  };

  if (isLoadingProfile) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (isProfileError) return <div className="mx-auto max-w-5xl px-4 py-8"><QueryErrorState title="Could not load profile" description="The profile request failed. If the API was restarted, retry." onRetry={() => refetchProfile()} /></div>;
  if (!profile) return <div className="py-20 text-center">User not found.</div>;

  const { user, isFollowing, artistProfile, creatorSettings, customFeeds, friendship, profileReactions, blockState, canInteract } = profile;
  const accent = user.accentColor || "#8b5cf6";
  const locationLine = formatPlace([user.city, user.location]);
  const profileTheme = PROFILE_THEME_STYLES[user.themeName || "nocturne"] || PROFILE_THEME_STYLES.nocturne;
  const photoPosts = profilePosts.filter((post) => post.imageUrl || post.media?.some((media) => media.type === "image"));

  return (
    <div className="w-full pb-14">
      <section
        className="relative border-b border-border/60"
        style={{ background: profileTheme.shell.replace("var(--profile-accent)", `${accent}35`) }}
      >
        {user.bannerUrl && (
          <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${user.bannerUrl})` }} />
        )}
        <div className={cn("absolute inset-0", profileTheme.overlay)} />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 md:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <Avatar className="h-28 w-28 border-4 border-background shadow-2xl md:h-36 md:w-36">
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback className="text-3xl" style={{ backgroundColor: `${accent}33`, color: accent }}>
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">{user.profileType}</Badge>
                    {artistProfile?.category && <Badge variant="secondary">{artistProfile.category}</Badge>}
                    {creatorSettings?.primaryActionLabel && artistProfile && <Badge>{creatorSettings.primaryActionLabel}</Badge>}
                  </div>
                  <h1 className="text-3xl font-bold md:text-5xl">{user.username}</h1>
                  {locationLine && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center">
                        <MapPin className="mr-1.5 h-4 w-4" /> {locationLine}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {isOwnProfile ? (
                    <>
                      <Link href="/settings">
                        <Button variant="outline">
                          <Settings className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                      </Link>
                      {!artistProfile && (
                        <Link href="/settings">
                          <Button variant="secondary">
                            <Sparkles className="mr-2 h-4 w-4" /> Create Artist Page
                          </Button>
                        </Link>
                      )}
                      {artistProfile && (
                        <Link href={`/artists/${user.id}`}>
                          <Button
                            variant="secondary"
                            onClick={() => setActiveIdentity("artist")}
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Switch To Artist Page
                          </Button>
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      {canInteract ? <FriendActionButton userId={userId} friendship={friendship} invalidateKeys={[[ "/api/users", userId ]]} /> : null}
                      <Button onClick={handleFollowToggle} variant={isFollowing ? "outline" : "default"} disabled={!canInteract}>
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                      <BlockActionButton userId={userId} blockState={blockState} invalidateKeys={[[ "/api/users", userId ]]} />
                      <Button variant="outline" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </Button>
                      <ReportDialog targetType="profile" targetId={user.id} variant="outline" />
                      {artistProfile ? (
                        <Link href={`/artists/${user.id}`}>
                          <Button variant="secondary">
                            <Compass className="mr-2 h-4 w-4" /> Creator Page
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/messages">
                          <Button variant="secondary">Inbox</Button>
                        </Link>
                      )}
                    </>
                  )}
                  {artistProfile?.category && (
                    <Link href={`/artists/${user.id}`}>
                      <Button variant="outline">
                        <Sparkles className="mr-2 h-4 w-4" /> View Artist Page
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {(artistProfile?.tags?.length || user.links?.length) ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {artistProfile?.tags?.slice(0, 6).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  {user.links?.slice(0, 2).map((link) => (
                    <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                      <Badge variant="outline" className="hover:border-primary/50">
                        <ExternalLink className="mr-1 h-3 w-3" /> {link.label}
                      </Badge>
                    </a>
                  ))}
                </div>
              ) : null}

              {(artistProfile?.bio || user.bio) && (
                <p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground md:text-base">
                  {artistProfile?.bio || user.bio}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:max-w-xl">
            <div className={cn("rounded-2xl border border-border/50 p-4", profileTheme.card)}>
              <div className="text-xs text-muted-foreground">Posts</div>
              <div className="mt-1 text-2xl font-semibold">{user.postCount}</div>
            </div>
            <div className={cn("rounded-2xl border border-border/50 p-4", profileTheme.card)}>
              <div className="text-xs text-muted-foreground">Followers</div>
              <div className="mt-1 text-2xl font-semibold">{user.followerCount}</div>
            </div>
            <div className={cn("rounded-2xl border border-border/50 p-4", profileTheme.card)}>
              <div className="text-xs text-muted-foreground">Following</div>
              <div className="mt-1 text-2xl font-semibold">{user.followingCount}</div>
            </div>
          </div>
          {!isOwnProfile ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                <HeartHandshake className="mr-2 h-4 w-4 text-primary" />
                {user.friendCount} friends
              </div>
              {canInteract ? <ProfileReactionBar userId={userId} summary={profileReactions} invalidateKeys={[[ "/api/users", userId ]]} /> : null}
            </div>
          ) : null}
          {!isOwnProfile && !canInteract ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {blockState?.hasBlockedUser
                ? "You blocked this user. Their posts and interactions are hidden until you unblock them."
                : "This user has blocked you. Social interactions are unavailable."}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 px-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="h-12 w-full justify-start rounded-none border-b border-border/50 bg-transparent p-0">
              <TabsTrigger value="posts" className="h-full rounded-none border-primary px-6 font-medium data-[state=active]:border-b-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Grid className="mr-2 h-4 w-4" /> Posts
              </TabsTrigger>
              <TabsTrigger value="photos" className="h-full rounded-none border-primary px-6 font-medium data-[state=active]:border-b-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Camera className="mr-2 h-4 w-4" /> Photos
              </TabsTrigger>
              <TabsTrigger value="about" className="h-full rounded-none border-primary px-6 font-medium data-[state=active]:border-b-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                About
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="pt-6">
              {creatorSettings?.pinnedPost && (
                <div className="mb-4 space-y-2">
                  <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Pinned</div>
                  <FeedPostCard post={creatorSettings.pinnedPost} showAuthor={false} />
                </div>
              )}
              {isLoadingPosts ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : isPostsError ? (
                <QueryErrorState title="Could not load posts" description="The profile loaded, but posts could not be fetched." onRetry={() => refetchPosts()} />
              ) : profilePosts.length ? (
                <div className="space-y-4">
                  {profilePosts.map((post) => (
                    <FeedPostCard key={post.id} post={post} showAuthor={false} />
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
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/50 bg-card/20 py-12 text-center text-muted-foreground">
                  <Grid className="mx-auto mb-3 h-8 w-8 opacity-20" />
                  <p>No posts yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="photos" className="pt-6">
              <div className="space-y-6">
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>Photo Gallery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userPhotos?.length ? (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {userPhotos.map((photo) => (
                          <div key={photo.id} className="overflow-hidden rounded-2xl border border-border/50 bg-background/40">
                            <img src={photo.imageUrl} alt={photo.caption || `${user.username} photo`} loading="lazy" decoding="async" className="h-56 w-full object-cover" />
                            <div className="space-y-2 p-4">
                              {photo.caption && <div className="text-sm">{photo.caption}</div>}
                              <div className="text-xs text-muted-foreground">{new Date(photo.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/50 bg-card/20 py-12 text-center text-muted-foreground">
                        No gallery photos yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>Photo Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {photoPosts.length ? (
                      <div className="space-y-4">
                        {photoPosts.map((post) => (
                          <FeedPostCard key={post.id} post={post} showAuthor={false} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/50 bg-card/20 py-12 text-center text-muted-foreground">
                        No image posts yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="about" className="pt-6">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {user.about ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{user.about}</p>
                  ) : (
                    <div className="text-sm text-muted-foreground">No about section added yet.</div>
                  )}

                  {(user.age || user.work || user.school) && (
                    <div className="grid gap-3 md:grid-cols-3">
                      {user.age ? <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-sm"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Age</div><div className="mt-1 font-medium">{user.age}</div></div> : null}
                      {user.work ? <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-sm"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Work</div><div className="mt-1 font-medium">{user.work}</div></div> : null}
                      {user.school ? <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-sm"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">School</div><div className="mt-1 font-medium">{user.school}</div></div> : null}
                    </div>
                  )}

                  {user.interests?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map((interest) => (
                        <Badge key={interest} variant="secondary">{interest}</Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          {(user.featuredContent || creatorSettings?.featuredTitle || creatorSettings?.featuredDescription) && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Featured</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creatorSettings?.featuredTitle && <div className="font-medium">{creatorSettings.featuredTitle}</div>}
                {creatorSettings?.featuredDescription && <div className="text-sm text-muted-foreground">{creatorSettings.featuredDescription}</div>}
                {user.featuredContent && (
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-sm text-muted-foreground">
                    {user.featuredContent}
                  </div>
                )}
                {creatorSettings?.featuredUrl && (
                  <a href={creatorSettings.featuredUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline">
                    Open featured link <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {(user.about || user.work || user.school || user.age || user.interests?.length || user.links?.length || artistProfile?.tags?.length || artistProfile?.bookingEmail) && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.about && (
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">About</div>
                    <div className="whitespace-pre-wrap text-sm text-muted-foreground">{user.about}</div>
                  </div>
                )}
                {(user.age || user.work || user.school) && (
                  <div className="grid gap-3">
                    {user.age ? (
                      <div className="text-sm text-muted-foreground">
                        Age: <span className="text-foreground">{user.age}</span>
                      </div>
                    ) : null}
                    {user.work ? (
                      <div className="text-sm text-muted-foreground">
                        Work: <span className="text-foreground">{user.work}</span>
                      </div>
                    ) : null}
                    {user.school ? (
                      <div className="text-sm text-muted-foreground">
                        School: <span className="text-foreground">{user.school}</span>
                      </div>
                    ) : null}
                  </div>
                )}
                {artistProfile?.bookingEmail && (
                  <div className="text-sm text-muted-foreground">
                    Booking: <span className="text-foreground">{artistProfile.bookingEmail}</span>
                  </div>
                )}
                {user.interests?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))}
                  </div>
                ) : null}
                {artistProfile?.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {artistProfile.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        <Tag className="mr-1 h-3 w-3" /> {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {user.links?.length ? (
                  <div className="space-y-2">
                    {user.links.map((link) => (
                      <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm hover:border-primary/40">
                        <span className="inline-flex items-center"><Link2 className="mr-2 h-4 w-4 text-primary" /> {link.label}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {isOwnProfile && customFeeds?.length ? (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Your Custom Feeds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {customFeeds.slice(0, 4).map((feed) => (
                  <div key={feed.id} className="rounded-xl border border-border/50 bg-background/40 px-3 py-3">
                    <div className="font-medium">{feed.name}</div>
                    {feed.description && <div className="mt-1 text-sm text-muted-foreground">{feed.description}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
