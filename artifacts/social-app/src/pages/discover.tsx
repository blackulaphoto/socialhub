import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFollowUser, useUnfollowUser } from "@workspace/api-client-react";
import { useState } from "react";
import { MapPin, Mic2, Palette, Search, Sparkles, Users } from "lucide-react";
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

  const follow = useFollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/artists", "discover"] });
        queryClient.invalidateQueries({ queryKey: ["suggested-creators", "discover", user?.id] });
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Discover</h1>
        <p className="text-muted-foreground">Artists you may like and people you may want to know nearby.</p>
      </div>

      {!user?.hasArtistPage && (
        <Card className="overflow-hidden border-border/50 bg-card/40">
          <CardContent className="relative p-6 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_32%)]" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Creator Upgrade
                </div>
                <div className="text-2xl font-bold">Turn your profile into a real artist page.</div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Add a media-rich creator homepage with gallery, booking button, featured work, and event presence, all linked to your personal account.
                </p>
              </div>
              <Link href="/settings?tab=creator">
                <Button className="rounded-full">
                  <Palette className="mr-2 h-4 w-4" />
                  Create Artist Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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
                <SelectItem value="Musician / Band / DJ">Music</SelectItem>
                <SelectItem value="Visual Artist">Visual Arts</SelectItem>
                <SelectItem value="Photographer">Photography</SelectItem>
                <SelectItem value="Designer">Design</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-64 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Location"
              className="pl-9 bg-background/50 border-border/50"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{filtersActive ? "Browse creators" : "Artists you may like"}</h2>
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
              <Card key={artist.id} className="overflow-hidden border-border/50 bg-card/60">
                <div className="h-44 bg-muted relative overflow-hidden">
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
                        {[person.city || person.location, person.hasArtistPage ? "Personal + artist page" : "Personal profile"].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  {person.about ? <p className="line-clamp-2 text-sm text-muted-foreground">{person.about}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {!!person.mutualFriendCount && <Badge variant="secondary"><Users className="mr-1 h-3 w-3" /> {person.mutualFriendCount} mutual</Badge>}
                    {person.location ? <Badge variant="outline">{person.location}</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/profile/${person.id}`}><Button variant="outline" size="sm">View Profile</Button></Link>
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
