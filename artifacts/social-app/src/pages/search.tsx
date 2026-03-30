import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFollowUser, useUnfollowUser } from "@workspace/api-client-react";
import { useState } from "react";
import { CalendarRange, MapPin, Search as SearchIcon, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { QueryErrorState } from "@/components/query-error-state";
import { FriendActionButton } from "@/components/friend-action-button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type SearchType = "all" | "users" | "artists" | "groups" | "events";
type FriendshipState = {
  id?: number | null;
  status: "self" | "none" | "outgoing" | "incoming" | "friends";
  isFriend: boolean;
};

type SearchPerson = {
  id: number;
  username: string;
  avatarUrl?: string | null;
  hasArtistPage?: boolean;
  location?: string | null;
  city?: string | null;
  about?: string | null;
  friendship?: FriendshipState;
  isFollowing?: boolean;
};

type SearchArtist = {
  id: number;
  userId: number;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  category: string;
  location?: string | null;
  tagline?: string | null;
  tags?: string[];
  isFollowing?: boolean;
  user: {
    username: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
  };
};

type SearchGroup = {
  id: number;
  name: string;
  description: string;
  location?: string | null;
  visibility: string;
  memberCount?: number;
  tags?: string[];
};

type SearchEvent = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  city?: string | null;
  lineupTags?: string[];
};

type SearchResponse = {
  users: SearchPerson[];
  artists: SearchArtist[];
  groups: SearchGroup[];
  events: SearchEvent[];
  total: number;
  usersTotal: number;
  artistsTotal: number;
  groupsTotal: number;
  eventsTotal: number;
};

export default function Search() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");

  const enabled = query.length > 0 || location.length > 0 || category.length > 0 || tags.length > 0;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["site-search", query, type, location, category, tags],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("type", type);
      if (location.trim()) params.set("location", location.trim());
      if (category.trim()) params.set("category", category.trim());
      if (tags.trim()) params.set("tags", tags.trim());
      params.set("limit", "30");
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/search?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not search right now");
      return response.json() as Promise<SearchResponse>;
    },
  });

  const follow = useFollowUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["site-search"] });
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
        queryClient.invalidateQueries({ queryKey: ["site-search"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "following"] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast({ title: "Unfollowed creator" });
      },
      onError: () => toast({ title: "Could not unfollow creator", variant: "destructive" }),
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:py-8 w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground">Search people, creator pages, groups, and events across the whole platform.</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search people, groups, events, creators..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={type} onValueChange={(value) => setType(value as SearchType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everything</SelectItem>
              <SelectItem value="users">People</SelectItem>
              <SelectItem value="artists">Creator Pages</SelectItem>
              <SelectItem value="groups">Groups</SelectItem>
              <SelectItem value="events">Events</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="City / location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input placeholder="Tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} />
        </CardContent>
      </Card>

      {enabled && (
        <Card className="bg-card/40 border-border/50">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Sitewide results across people, creator pages, groups, and events.
            </div>
            {data ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{data.total} total</Badge>
                <Badge variant="outline">{data.usersTotal} people</Badge>
                <Badge variant="outline">{data.artistsTotal} creators</Badge>
                <Badge variant="outline">{data.groupsTotal} groups</Badge>
                <Badge variant="outline">{data.eventsTotal} events</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : isError ? (
        <QueryErrorState title="Could not search right now" description="The search request failed. Retry after the API is back up." onRetry={() => refetch()} />
      ) : data ? (
        <div className="space-y-8">
          {data.artists?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Creator Pages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.artists.map((artist) => (
                  <Card key={artist.id} className="bg-card/60 border-border/50 overflow-hidden">
                    <div className="h-28 bg-gradient-to-r from-primary/15 via-background to-cyan-500/10" style={(artist.bannerUrl || artist.user.bannerUrl) ? { backgroundImage: `url(${artist.bannerUrl || artist.user.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                    <CardContent className="p-4 space-y-4">
                      <div className="flex gap-4">
                        <Avatar className="w-14 h-14 -mt-10 border-4 border-background">
                          <AvatarImage src={artist.avatarUrl || artist.user.avatarUrl || ""} />
                          <AvatarFallback>{(artist.displayName || artist.user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{artist.displayName || artist.user.username}</div>
                          <div className="text-sm text-primary">{artist.category}</div>
                          {artist.location && <div className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="w-3 h-3 mr-1" /> {artist.location}</div>}
                        </div>
                      </div>
                      {artist.tagline ? <div className="text-xs text-muted-foreground line-clamp-2">{artist.tagline}</div> : null}
                      <div className="flex flex-wrap gap-2">
                        {artist.tags?.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/artists/${artist.userId}`}><Button variant="outline" size="sm">View Page</Button></Link>
                        <Button size="sm" onClick={() => (artist.isFollowing ? unfollow : follow).mutate({ userId: artist.userId })}>
                          {artist.isFollowing ? "Following" : "Follow"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {data.users?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">People</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.users.map((person) => (
                  <Card key={person.id} className="bg-card/60 border-border/50">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex gap-4 items-center">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={person.avatarUrl || ""} />
                          <AvatarFallback>{person.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{person.username}</div>
                          <div className="text-xs text-muted-foreground">{person.hasArtistPage ? "Personal profile + artist page" : "Personal profile"}</div>
                          {person.location && <div className="text-xs text-muted-foreground mt-1">{person.location}</div>}
                        </div>
                      </div>
                      {person.about ? <div className="line-clamp-2 text-xs text-muted-foreground">{person.about}</div> : null}
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/profile/${person.id}`}><Button variant="outline" size="sm">View Profile</Button></Link>
                        <FriendActionButton userId={person.id} friendship={person.friendship} invalidateKeys={[["site-search"], ["/api/users", person.id]]} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {data.groups?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Groups</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.groups.map((group) => (
                  <Card key={group.id} className="bg-card/60 border-border/50">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{group.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[group.location, group.visibility].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <Badge variant="outline">{group.visibility}</Badge>
                      </div>
                      <div className="line-clamp-3 text-sm text-muted-foreground">{group.description}</div>
                      <div className="flex flex-wrap gap-2">
                        {group.tags?.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                      </div>
                      <Link href={`/groups/${group.id}`}><Button variant="outline" size="sm">View Group</Button></Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {data.events?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.events.map((event) => (
                  <Card key={event.id} className="bg-card/60 border-border/50">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="font-semibold">{event.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground flex items-center"><CalendarRange className="mr-1 h-3 w-3" /> {new Date(event.startsAt).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="mr-1 h-3 w-3" /> {event.location}{event.city ? `, ${event.city}` : ""}</div>
                      </div>
                      <div className="line-clamp-3 text-sm text-muted-foreground">{event.description}</div>
                      <div className="flex flex-wrap gap-2">
                        {event.lineupTags?.slice(0, 4).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                      </div>
                      <Link href={`/events/${event.id}`}><Button variant="outline" size="sm">View Event</Button></Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card className="bg-card/40 border-dashed border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-25" />
            Search the whole site by person, creator, group, event, city, or tag.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
