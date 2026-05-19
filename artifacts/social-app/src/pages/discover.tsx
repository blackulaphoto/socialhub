import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFollowUser, useUnfollowUser } from "@workspace/api-client-react";
import { useState } from "react";
import { ArrowRight, MapPin, Mic2, Search, Sparkles, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { QueryErrorState } from "@/components/query-error-state";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FriendActionButton } from "@/components/friend-action-button";
import { LocationInput } from "@/components/location-input";
import { getTopicPath } from "@/lib/topics";

type FriendshipState = {
  id?: number | null;
  status: "self" | "none" | "outgoing" | "incoming" | "friends";
  isFriend: boolean;
};

type DiscoverArtist = {
  id: number;
  userId: number;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  category: string;
  location?: string | null;
  tagline?: string | null;
  tags?: string[];
  gallery?: Array<{ id: number; url: string }>;
  isFollowing?: boolean;
  user: {
    username: string;
    avatarUrl?: string | null;
  };
};

type DiscoverPerson = {
  id: number;
  username: string;
  avatarUrl?: string | null;
  about?: string | null;
  location?: string | null;
  city?: string | null;
  hasArtistPage?: boolean;
  mutualFriendCount?: number;
  friendship?: FriendshipState;
};

function getCreatorSuggestionReason(artist: DiscoverArtist) {
  if (artist.location?.trim()) return `Active in ${artist.location.trim()}`;
  if (artist.tags?.[0]) return `Matches the ${artist.tags[0]} scene`;
  if (artist.tagline?.trim()) return "Strong public page signal";
  return "Suggested from creator discovery activity";
}

export default function Discover() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [tags, setTags] = useState("");

  const filtersActive = Boolean(location.trim() || tags.trim() || category !== "all");

  const { data: artistDirectory, isLoading: isLoadingArtists, isError: isArtistsError, refetch: refetchArtists } = useQuery({
    queryKey: ["/api/artists", "discover", location, category, tags],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (location.trim()) params.set("location", location.trim());
      if (category !== "all") params.set("category", category);
      if (tags.trim()) params.set("tags", tags.trim());
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/artists${params.toString() ? `?${params.toString()}` : ""}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load artists");
      return response.json() as Promise<{ artists: DiscoverArtist[]; total: number }>;
    },
  });

  const { data: suggestedCreators, isLoading: isLoadingSuggestedCreators } = useQuery({
    queryKey: ["suggested-creators", "discover", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${user!.id}/suggested-creators?limit=6`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load suggested creators");
      return response.json() as Promise<{ artists: DiscoverArtist[]; total: number }>;
    },
  });

  const { data: suggestedPeople, isLoading: isLoadingSuggestedPeople } = useQuery({
    queryKey: ["suggested-people", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${user!.id}/suggested-people?limit=6`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load suggested people");
      return response.json() as Promise<{ users: DiscoverPerson[]; total: number }>;
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

  const follow = useFollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/artists", "discover"] });
        queryClient.invalidateQueries({ queryKey: ["suggested-creators", "discover", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "following"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast({ title: "Following creator" });
      },
      onError: () => toast({ title: "Could not follow creator", variant: "destructive" }),
    },
  });

  const unfollow = useUnfollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/artists", "discover"] });
        queryClient.invalidateQueries({ queryKey: ["suggested-creators", "discover", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "following"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast({ title: "Unfollowed creator" });
      },
      onError: () => toast({ title: "Could not unfollow creator", variant: "destructive" }),
    },
  });

  const creatorCards = filtersActive
    ? (artistDirectory?.artists || [])
    : ((suggestedCreators?.artists?.length ? suggestedCreators.artists : artistDirectory?.artists) || []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:py-8 w-full space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94),rgba(224,242,254,0.9))] p-6 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.6)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94),rgba(22,78,99,0.88))] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Discovery Surface
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Find creators with enough context to decide fast.</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Browse by city, medium, and tags, then jump directly into the public page. This should feel like scouting a scene, not digging through a directory.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[20rem]">
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
              <div className="text-muted-foreground">Creator results</div>
              <div className="mt-1 text-lg font-semibold">{artistDirectory?.total ?? creatorCards.length}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
              <div className="text-muted-foreground">Suggested people</div>
              <div className="mt-1 text-lg font-semibold">{suggestedPeople?.users?.length ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
              <div className="text-muted-foreground">Current city filter</div>
              <div className="mt-1 text-lg font-semibold">{location.trim() || "Any city"}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
              <div className="text-muted-foreground">Category</div>
              <div className="mt-1 text-lg font-semibold">{category === "all" ? "All creators" : category}</div>
            </div>
          </div>
        </div>
      </section>

      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Refine creators by tags"
              className="pl-9 bg-background/50 border-border/50"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Model">Models</SelectItem>
                <SelectItem value="Photographer">Photography</SelectItem>
                <SelectItem value="Makeup Artist">Makeup</SelectItem>
                <SelectItem value="Stylist">Styling</SelectItem>
                <SelectItem value="Retoucher">Retouching</SelectItem>
                <SelectItem value="Set Designer">Set Design</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-64">
            <LocationInput
              placeholder="City / state"
              className="bg-background/50 border-border/50"
              value={location}
              onValueChange={setLocation}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Trending Topics</div>
            <div className="mt-1 text-sm text-muted-foreground">Use current hashtag momentum as another way into the graph.</div>
          </div>
          {trendingTopics?.topics?.length ? (
            <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4">
              {trendingTopics.topics.map((topic) => (
                <div key={topic.tag} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{topic.tag}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{topic.count} recent public posts</div>
                    </div>
                    <Badge variant="outline">Live topic</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setTags(topic.tag.slice(1))}>
                      Filter here
                    </Button>
                    <Link href={getTopicPath(topic.tag, "artists")}>
                      <Button size="sm" variant="ghost">Creators</Button>
                    </Link>
                    <Link href={getTopicPath(topic.tag, "events")}>
                      <Button size="sm" variant="ghost">Events</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Trending topics will appear here as public posts adopt hashtags.</div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{filtersActive ? "Browse creators" : "Featured creators for your graph"}</h2>
            <p className="text-sm text-muted-foreground">
              {filtersActive ? "Filtered creator pages based on your current browse settings." : "Suggested from your interests, city, and recent activity."}
            </p>
          </div>
          {filtersActive && (
            <Button variant="outline" onClick={() => { setLocation(""); setCategory("all"); setTags(""); }}>
              Clear filters
            </Button>
          )}
        </div>

        {isLoadingArtists || (!filtersActive && isLoadingSuggestedCreators) ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : isArtistsError ? (
          <QueryErrorState title="Could not load discovery" description="The creator directory request failed." onRetry={() => refetchArtists()} />
        ) : creatorCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {creatorCards.map((artist) => (
              <Card key={artist.id} className="overflow-hidden border-border/50 bg-card/75 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.5)]">
                <div className="relative h-48 overflow-hidden bg-muted">
                  {artist.gallery && artist.gallery[0] ? (
                    <img
                      src={artist.gallery[0].url}
                      alt={artist.displayName || artist.user.username}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                      <Mic2 className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                    Why it matches
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white">
                    {getCreatorSuggestionReason(artist)}
                  </div>
                </div>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border border-border">
                      <AvatarImage src={artist.avatarUrl || artist.user.avatarUrl || ""} />
                      <AvatarFallback>{(artist.displayName || artist.user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{artist.displayName || artist.user.username}</div>
                      <div className="text-sm text-primary">{artist.category}</div>
                      {artist.location ? <div className="mt-1 flex items-center text-xs text-muted-foreground"><MapPin className="mr-1 h-3 w-3" /> {artist.location}</div> : null}
                    </div>
                  </div>
                  {artist.tagline ? <p className="line-clamp-2 text-sm text-muted-foreground">{artist.tagline}</p> : null}
                  <div className="rounded-2xl border border-border/50 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                    {artist.tags?.length
                      ? `Signals: ${artist.tags.slice(0, 3).join(", ")}`
                      : "Signals: public creator page, category, and location context"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {artist.tags?.slice(0, 4).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/artists/${artist.userId}`}><Button variant="outline" size="sm">View Page</Button></Link>
                    <Button
                      size="sm"
                      onClick={() => (artist.isFollowing ? unfollow : follow).mutate({ userId: artist.userId })}
                    >
                      {artist.isFollowing ? "Following" : "Follow"}
                    </Button>
                    <Link href={`/artists/${artist.userId}`} className="ml-auto">
                      <Button variant="ghost" size="sm">
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border/50 bg-card/10">
            <CardContent className="p-12 text-center text-muted-foreground">
              No creator matches yet. Try a different city, tag, or category.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">People you may know</h2>
          <p className="text-sm text-muted-foreground">Suggested from mutual friends, location, and overlapping interests.</p>
        </div>
        {isLoadingSuggestedPeople ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : suggestedPeople?.users?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {suggestedPeople.users.map((person) => (
              <Card key={person.id} className="border-border/50 bg-card/60">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border border-border">
                      <AvatarImage src={person.avatarUrl || ""} />
                      <AvatarFallback>{person.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{person.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {[person.city || person.location, "Creator profile"].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  {person.about ? <p className="line-clamp-2 text-sm text-muted-foreground">{person.about}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {!!person.mutualFriendCount && <Badge variant="secondary"><Users className="mr-1 h-3 w-3" /> {person.mutualFriendCount} mutual</Badge>}
                    {person.location ? <Badge variant="outline">{person.location}</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/artists/${person.id}`}><Button variant="outline" size="sm">View Profile</Button></Link>
                    <FriendActionButton userId={person.id} friendship={person.friendship} invalidateKeys={[["suggested-people", user?.id], ["/api/users", person.id]]} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border/50 bg-card/10">
            <CardContent className="p-12 text-center text-muted-foreground">
              Friend suggestions will appear here as the social graph grows.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
