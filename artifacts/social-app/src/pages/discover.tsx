import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFollowUser, useUnfollowUser } from "@workspace/api-client-react";
import { ArrowRight, Mail, Search, Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LocationInput } from "@/components/location-input";
import { QueryErrorState } from "@/components/query-error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FriendActionButton } from "@/components/friend-action-button";
import { getTopicPath } from "@/lib/topics";
import { summarizeBrowseDetails } from "@/lib/browse-details";

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
  category: string;
  location?: string | null;
  tagline?: string | null;
  tags?: string[];
  availabilityStatus?: string | null;
  acceptsCollaborations?: boolean;
  bookingEmail?: string | null;
  pricingSummary?: string | null;
  turnaroundInfo?: string | null;
  customFields?: Array<{ label: string; value: string }>;
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
  mutualFriendCount?: number;
  friendship?: FriendshipState;
};

function getCreatorSuggestionReason(artist: DiscoverArtist) {
  if (artist.location?.trim()) return artist.location.trim();
  if (artist.tags?.[0]) return artist.tags[0];
  if (artist.tagline?.trim()) return artist.tagline.trim();
  return artist.category;
}

const ROLE_OPTIONS = [
  "Model",
  "Photographer",
  "Videographer",
  "Makeup Artist",
  "Stylist",
  "Retoucher",
  "Set Designer",
  "Creative Director",
  "Wardrobe Stylist",
  "Hair Artist",
  "Production Team",
  "Creative Professional",
] as const;

const ROLE_SPECIALTY_HINTS: Record<string, string> = {
  Model: "editorial, runway, beauty, swimwear, alt",
  Photographer: "editorial, portraits, beauty, nightlife, campaign",
  Videographer: "fashion film, BTS, music video, campaign",
  "Makeup Artist": "beauty, bridal, editorial, SFX, body paint",
  Stylist: "wardrobe, pulls, editorial, runway, vintage",
  Retoucher: "beauty retouch, skin, fashion, compositing",
  "Set Designer": "props, editorial sets, installation, production design",
  "Creative Director": "concept, casting, campaign, visual direction",
  "Wardrobe Stylist": "pulls, tailoring, editorial, lookbook",
  "Hair Artist": "texture, color, editorial hair, wigs",
  "Production Team": "producer, PA, lighting, grip, studio support",
  "Creative Professional": "editorial, beauty, campaign, collaboration",
};

export default function Discover() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [tags, setTags] = useState("");
  const [availability, setAvailability] = useState("all");
  const [collaboration, setCollaboration] = useState("all");

  const filtersActive = Boolean(location.trim() || tags.trim() || category !== "all" || availability !== "all" || collaboration !== "all");

  const { data: artistDirectory, isLoading: isLoadingArtists, isError: isArtistsError, refetch: refetchArtists } = useQuery({
    queryKey: ["/api/artists", "discover", location, category, tags, availability, collaboration],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (location.trim()) params.set("location", location.trim());
      if (category !== "all") params.set("category", category);
      if (tags.trim()) params.set("tags", tags.trim());
      if (availability !== "all") params.set("availability", availability);
      if (collaboration !== "all") params.set("collaboration", collaboration);
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
        toast({ title: "Following artist" });
      },
      onError: () => toast({ title: "Could not follow artist", variant: "destructive" }),
    },
  });

  const unfollow = useUnfollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/artists", "discover"] });
        queryClient.invalidateQueries({ queryKey: ["suggested-creators", "discover", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "following"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast({ title: "Unfollowed artist" });
      },
      onError: () => toast({ title: "Could not unfollow artist", variant: "destructive" }),
    },
  });

  const creatorCards = filtersActive
    ? (artistDirectory?.artists || [])
    : ((suggestedCreators?.artists?.length ? suggestedCreators.artists : artistDirectory?.artists) || []);
  const specialtyPlaceholder = ROLE_SPECIALTY_HINTS[category] || "editorial, beauty, alt, runway, test shoot";

  return (
    <div className="space-y-6">
      <section>
        <div className="hh-page-kicker">Discover · Search the network</div>
        <h1 className="hh-page-title mt-3 !text-[clamp(2.4rem,6vw,4.4rem)]">
          Find the right people <span className="hh-brand-wordmark-accent">for the shoot.</span>
        </h1>
      </section>

      <section className="hh-search-stage">
        <div className="hh-discover-input">
          <Search className="h-5 w-5 text-[var(--hh-ink-muted)]" />
          <Input
            placeholder="latex stylist · LA · weekend availability"
            className="border-0 bg-transparent px-0 font-serif text-lg italic text-foreground shadow-none focus-visible:ring-0"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <Button variant="ghost" size="sm" onClick={() => setTags("")}>Clear</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_220px_1fr]">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-none border-[var(--hh-rule)] bg-transparent">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
            </SelectContent>
          </Select>
          <LocationInput
            placeholder="Los Angeles"
            className="rounded-none border-[var(--hh-rule)] bg-transparent"
            value={location}
            onValueChange={setLocation}
          />
          <div className="hh-filter-row">
            <button type="button" className={`hh-filter-chip ${filtersActive ? "is-active" : ""}`}>
              <strong>Filters</strong> {filtersActive ? "active" : "all open"}
            </button>
            {location.trim() ? <button type="button" className="hh-filter-chip is-active"><strong>City</strong> {location.trim()}</button> : null}
            {category !== "all" ? <button type="button" className="hh-filter-chip is-active"><strong>Role</strong> {category}</button> : null}
            {tags.trim() ? <button type="button" className="hh-filter-chip is-active"><strong>Tags</strong> {tags.trim()}</button> : null}
            {availability !== "all" ? <button type="button" className="hh-filter-chip is-active"><strong>Availability</strong> now</button> : null}
            {collaboration !== "all" ? <button type="button" className="hh-filter-chip is-active"><strong>Collaboration</strong> open</button> : null}
            {filtersActive ? <button type="button" className="hh-filter-chip" onClick={() => { setLocation(""); setCategory("all"); setTags(""); setAvailability("all"); setCollaboration("all"); }}>Reset</button> : null}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger className="rounded-none border-[var(--hh-rule)] bg-transparent"><SelectValue placeholder="Availability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any availability</SelectItem>
              <SelectItem value="available">Available now</SelectItem>
            </SelectContent>
          </Select>
          <Select value={collaboration} onValueChange={setCollaboration}>
            <SelectTrigger className="rounded-none border-[var(--hh-rule)] bg-transparent"><SelectValue placeholder="Collaboration" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All profiles</SelectItem>
              <SelectItem value="open">Open to collaborate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="hh-tabstrip">
        <button type="button" className="hh-tabstrip-item is-active">
          Artists
          <span className="hh-tabstrip-badge">{artistDirectory?.total ?? creatorCards.length}</span>
        </button>
        <button type="button" className="hh-tabstrip-item">
          Scenes
          {trendingTopics?.topics?.length ? <span className="hh-tabstrip-badge">{trendingTopics.topics.length}</span> : null}
        </button>
        <button type="button" className="hh-tabstrip-item">
          People
          {suggestedPeople?.users?.length ? <span className="hh-tabstrip-badge">{suggestedPeople.users.length}</span> : null}
        </button>
      </section>

      {isLoadingArtists || (!filtersActive && isLoadingSuggestedCreators) ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : isArtistsError ? (
        <QueryErrorState title="Could not load discovery" description="The artist directory request failed." onRetry={() => refetchArtists()} />
      ) : creatorCards.length ? (
        <section className="hh-result-grid">
          {creatorCards.map((artist) => (
            <article key={artist.id} className="hh-result-card">
              <div className="hh-result-media">
                {artist.gallery?.[0]?.url ? (
                  <img src={artist.gallery[0].url} alt={artist.displayName || artist.user.username} loading="lazy" decoding="async" />
                ) : null}
              </div>
              <div className="hh-result-card-body">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarImage src={artist.avatarUrl || artist.user.avatarUrl || ""} />
                    <AvatarFallback>{(artist.displayName || artist.user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-xl text-[var(--hh-ink)]">{artist.displayName || artist.user.username}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                      {[artist.category, artist.location].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>

                {artist.tagline ? <p className="text-sm leading-6 text-[var(--hh-ink-muted)]">{artist.tagline}</p> : null}

                <div className="flex flex-wrap gap-2">
                  {artist.tags?.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="rounded-none">{tag}</Badge>)}
                  {artist.availabilityStatus ? <Badge variant="outline" className="rounded-none">{artist.availabilityStatus}</Badge> : null}
                  {artist.acceptsCollaborations ? <Badge variant="outline" className="rounded-none">Open to collaborate</Badge> : null}
                </div>

                {(() => {
                  const browseSummary = summarizeBrowseDetails(artist.customFields).slice(0, 2);
                  if (!browseSummary.length) return null;
                  return (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {browseSummary.map((item) => (
                        <div key={`${item.label}-${item.value}`} className="rounded-none border border-[var(--hh-rule-soft)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--hh-ink-muted)]">{item.label}</div>
                          <div className="mt-1 text-sm text-[var(--hh-ink)]">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3 border-t border-[var(--hh-rule-soft)] pt-3 text-xs uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                  <div>
                    <div>Signal</div>
                    <div className="mt-1 text-[var(--hh-ink)]">{getCreatorSuggestionReason(artist)}</div>
                  </div>
                  <div>
                    <div>Booking</div>
                    <div className="mt-1 text-[var(--hh-ink)]">{artist.pricingSummary || artist.turnaroundInfo || (artist.bookingEmail ? "Available" : "Message first")}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {artist.userId !== user?.id ? (
                    <>
                      <Link href={`/artists/${artist.userId}?inquiry=1`} className="flex-1">
                        <Button size="sm" className="w-full rounded-none">
                          <Mail className="mr-2 h-4 w-4" />Reach Out
                        </Button>
                      </Link>
                      <Link href={`/artists/${artist.userId}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full rounded-none">View Portfolio</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={artist.isFollowing ? "outline" : "secondary"}
                        className="rounded-none"
                        onClick={() => (artist.isFollowing ? unfollow : follow).mutate({ userId: artist.userId })}
                      >
                        {artist.isFollowing ? "Following" : "Follow"}
                      </Button>
                    </>
                  ) : (
                    <Link href={`/artists/${artist.userId}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-none">View Your Page</Button>
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <Card className="hh-panel rounded-none border-dashed border-[var(--hh-rule)] bg-transparent shadow-none">
          <CardContent className="p-12 text-center text-[var(--hh-ink-muted)]">No matching artists yet. Try another city, tag, or role.</CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="hh-panel rounded-none border-[var(--hh-rule)] bg-transparent shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="hh-display-title text-[1.25rem]">Trending scenes</div>
            {trendingTopics?.topics?.length ? trendingTopics.topics.slice(0, 4).map((topic) => (
              <Link key={topic.tag} href={getTopicPath(topic.tag, "artists")} className="flex items-center justify-between border-t border-[var(--hh-rule-soft)] pt-3 first:border-t-0 first:pt-0">
                <span className="font-serif text-lg text-[var(--hh-ink)]">{topic.tag}</span>
                <span className="hh-rail-count">{topic.count} posts</span>
              </Link>
            )) : <div className="text-sm text-[var(--hh-ink-muted)]">Scene tags will appear here as posting grows.</div>}
          </CardContent>
        </Card>

        <Card className="hh-panel rounded-none border-[var(--hh-rule)] bg-transparent shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="hh-display-title text-[1.25rem]">People around your orbit</div>
            {isLoadingSuggestedPeople ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : suggestedPeople?.users?.length ? suggestedPeople.users.slice(0, 3).map((person) => (
              <div key={person.id} className="flex items-start gap-3 border-t border-[var(--hh-rule-soft)] pt-3 first:border-t-0 first:pt-0">
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={person.avatarUrl || ""} />
                  <AvatarFallback>{person.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--hh-ink)]">{person.username}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                    {[person.city || person.location, "artist page"].filter(Boolean).join(" · ")}
                  </div>
                  {person.about ? <div className="mt-2 text-sm text-[var(--hh-ink-muted)]">{person.about}</div> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!!person.mutualFriendCount && <Badge variant="outline" className="rounded-none"><Users className="mr-1 h-3 w-3" />{person.mutualFriendCount} mutual</Badge>}
                    <Link href={`/artists/${person.id}?inquiry=1`}><Button size="sm" className="rounded-none">Inquiry</Button></Link>
                    <FriendActionButton userId={person.id} friendship={person.friendship} invalidateKeys={[["suggested-people", user?.id], ["/api/users", person.id]]} />
                  </div>
                </div>
              </div>
            )) : <div className="text-sm text-[var(--hh-ink-muted)]">More people will surface here as your scenes grow.</div>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
