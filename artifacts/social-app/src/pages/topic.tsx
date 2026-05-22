import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarRange, MapPin, Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryErrorState } from "@/components/query-error-state";
import { Spinner } from "@/components/ui/spinner";
import { formatTopicTag, getTopicPath, normalizeTopicTag, type TopicView } from "@/lib/topics";

type TopicPerson = {
  id: number;
  username: string;
  avatarUrl?: string | null;
  hasArtistPage?: boolean;
  location?: string | null;
  city?: string | null;
  about?: string | null;
};

type TopicArtist = {
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

type TopicGroup = {
  id: number;
  name: string;
  description: string;
  location?: string | null;
  visibility: string;
  memberCount?: number;
  tags?: string[];
};

type TopicEvent = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  city?: string | null;
  lineupTags?: string[];
};

type TopicSearchResponse = {
  users: TopicPerson[];
  artists: TopicArtist[];
  groups: TopicGroup[];
  events: TopicEvent[];
  total: number;
  usersTotal: number;
  artistsTotal: number;
  groupsTotal: number;
  eventsTotal: number;
};

const TOPIC_VIEWS: Array<{ value: TopicView; label: string; helper: string }> = [
  { value: "all", label: "All Activity", helper: "Everything connected to this topic." },
  { value: "artists", label: "Artist Pages", helper: "Public artist pages carrying this tag." },
  { value: "events", label: "Events", helper: "Lineups and happenings tagged to the topic." },
  { value: "groups", label: "Scenes", helper: "Forums and communities clustering around the topic." },
  { value: "users", label: "People", helper: "People and artist pages tied into the topic." },
];

export default function Topic({ tag }: { tag: string }) {
  const [locationPath] = useLocation();
  const normalizedTag = normalizeTopicTag(decodeURIComponent(tag || ""));
  const topicLabel = formatTopicTag(normalizedTag);
  const currentView = useMemo<TopicView>(() => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    const rawView = params.get("view") || "all";
    return TOPIC_VIEWS.some((view) => view.value === rawView) ? rawView as TopicView : "all";
  }, [locationPath]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["topic-hub", normalizedTag],
    enabled: Boolean(normalizedTag),
    queryFn: async () => {
      const params = new URLSearchParams({
        tags: normalizedTag,
        type: "all",
        limit: "24",
      });
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/search?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load topic hub");
      return response.json() as Promise<TopicSearchResponse>;
    },
  });

  const viewConfig = TOPIC_VIEWS.find((view) => view.value === currentView) || TOPIC_VIEWS[0];
  const fullSearchHref = `/search?tags=${encodeURIComponent(normalizedTag)}${currentView === "all" ? "" : `&type=${encodeURIComponent(currentView)}`}`;
  const showArtists = currentView === "all" || currentView === "artists";
  const showEvents = currentView === "all" || currentView === "events";
  const showGroups = currentView === "all" || currentView === "groups";
  const showUsers = currentView === "all" || currentView === "users";

  if (!normalizedTag) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:py-8">
        <QueryErrorState
          title="Topic missing"
          description="Open a topic from a hashtag or trending surface to load its hub."
          onRetry={() => window.location.assign("/discover")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:py-8">
      <Card className="overflow-hidden border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94),rgba(224,242,254,0.9))] shadow-[0_26px_80px_-60px_rgba(15,23,42,0.6)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94),rgba(22,78,99,0.88))]">
        <CardContent className="relative space-y-6 p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Topic Hub
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{topicLabel}</h1>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                {viewConfig.helper} Use this page as the main landing spot for the topic, then branch into full search only when you need deeper results.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {TOPIC_VIEWS.map((view) => (
                  <Link key={view.value} href={getTopicPath(normalizedTag, view.value)}>
                    <Button variant={currentView === view.value ? "default" : "outline"}>{view.label}</Button>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={fullSearchHref}>
                <Button variant="outline">
                  Open Full Search
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/discover">
                <Button variant="ghost">Back to Discover</Button>
              </Link>
            </div>
          </div>
          {data ? (
            <div className="relative grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Artist pages</div>
                <div className="mt-1 text-2xl font-semibold">{data.artistsTotal}</div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">Events</div>
                <div className="mt-1 text-2xl font-semibold">{data.eventsTotal}</div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                  <div className="text-sm text-muted-foreground">Scenes</div>
                <div className="mt-1 text-2xl font-semibold">{data.groupsTotal}</div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                <div className="text-sm text-muted-foreground">People</div>
                <div className="mt-1 text-2xl font-semibold">{data.usersTotal}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : isError ? (
        <QueryErrorState title="Could not load topic hub" description="The topic search request failed." onRetry={() => refetch()} />
      ) : data ? (
        <div className="space-y-8">
          {showArtists ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Featured Artist Pages</h2>
                  <p className="text-sm text-muted-foreground">Artists carrying {topicLabel} in their public page signals.</p>
                </div>
                <Link href={`/search?tags=${encodeURIComponent(normalizedTag)}&type=artists`}>
                  <Button variant="ghost">See all artists</Button>
                </Link>
              </div>
              {data.artists.length ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.artists.slice(0, currentView === "artists" ? 12 : 3).map((artist) => (
                    <Card key={artist.id} className="overflow-hidden border-border/50 bg-card/70">
                      <div
                        className="h-28 bg-gradient-to-r from-primary/15 via-background to-cyan-500/10"
                        style={(artist.bannerUrl || artist.user.bannerUrl)
                          ? { backgroundImage: `url(${artist.bannerUrl || artist.user.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : undefined}
                      />
                      <CardContent className="space-y-4 p-5">
                        <div className="flex gap-4">
                          <Avatar className="h-14 w-14 -mt-10 border-4 border-background">
                            <AvatarImage src={artist.avatarUrl || artist.user.avatarUrl || ""} />
                            <AvatarFallback>{(artist.displayName || artist.user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{artist.displayName || artist.user.username}</div>
                            <div className="text-sm text-primary">{artist.category}</div>
                            {artist.location ? <div className="mt-1 text-xs text-muted-foreground">{artist.location}</div> : null}
                          </div>
                        </div>
                        {artist.tagline ? <p className="line-clamp-2 text-sm text-muted-foreground">{artist.tagline}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          {artist.tags?.slice(0, 4).map((artistTag) => <Badge key={artistTag} variant="secondary">{artistTag}</Badge>)}
                        </div>
                        <Link href={`/artists/${artist.userId}`}>
                          <Button variant="outline" size="sm">Open Artist Page</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-border/50 bg-card/20">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    No artist pages are tagged with {topicLabel} yet.
                  </CardContent>
                </Card>
              )}
            </section>
          ) : null}

          {showEvents ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Events In This Topic</h2>
                  <p className="text-sm text-muted-foreground">Upcoming activity and lineups carrying the same tag.</p>
                </div>
                <Link href={`/search?tags=${encodeURIComponent(normalizedTag)}&type=events`}>
                  <Button variant="ghost">See all events</Button>
                </Link>
              </div>
              {data.events.length ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.events.slice(0, currentView === "events" ? 12 : 3).map((event) => (
                    <Card key={event.id} className="border-border/50 bg-card/70">
                      <CardContent className="space-y-4 p-5">
                        <div>
                          <div className="font-semibold">{event.title}</div>
                          <div className="mt-1 inline-flex items-center text-xs text-muted-foreground">
                            <CalendarRange className="mr-1 h-3 w-3" />
                            {new Date(event.startsAt).toLocaleString()}
                          </div>
                          <div className="mt-1 inline-flex items-center text-xs text-muted-foreground">
                            <MapPin className="mr-1 h-3 w-3" />
                            {event.location}{event.city ? `, ${event.city}` : ""}
                          </div>
                        </div>
                        <p className="line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {event.lineupTags?.slice(0, 4).map((eventTag) => <Badge key={eventTag} variant="secondary">{eventTag}</Badge>)}
                        </div>
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">Open Event</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-border/50 bg-card/20">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    No events are connected to {topicLabel} yet.
                  </CardContent>
                </Card>
              )}
            </section>
          ) : null}

          {showGroups ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Scenes Around {topicLabel}</h2>
                  <p className="text-sm text-muted-foreground">Forums, scenes, and collectives orbiting this topic.</p>
                </div>
                <Link href={`/search?tags=${encodeURIComponent(normalizedTag)}&type=groups`}>
                  <Button variant="ghost">See all scenes</Button>
                </Link>
              </div>
              {data.groups.length ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.groups.slice(0, currentView === "groups" ? 12 : 3).map((group) => (
                    <Card key={group.id} className="border-border/50 bg-card/70">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{group.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{[group.location, group.visibility].filter(Boolean).join(" · ")}</div>
                          </div>
                          <Badge variant="outline">{group.visibility}</Badge>
                        </div>
                        <p className="line-clamp-3 text-sm text-muted-foreground">{group.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.tags?.slice(0, 4).map((groupTag) => <Badge key={groupTag} variant="secondary">{groupTag}</Badge>)}
                        </div>
                        <Link href={`/groups/${group.id}`}>
                          <Button variant="outline" size="sm">Open Scene</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-border/50 bg-card/20">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    No scenes are clustered around {topicLabel} yet.
                  </CardContent>
                </Card>
              )}
            </section>
          ) : null}

          {showUsers ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">People Around This Topic</h2>
                  <p className="text-sm text-muted-foreground">People surfacing this topic in their account context and public presence.</p>
                </div>
                <Link href={`/search?tags=${encodeURIComponent(normalizedTag)}&type=users`}>
                  <Button variant="ghost">See all people</Button>
                </Link>
              </div>
              {data.users.length ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.users.slice(0, currentView === "users" ? 12 : 3).map((person) => (
                    <Card key={person.id} className="border-border/50 bg-card/70">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border border-border">
                            <AvatarImage src={person.avatarUrl || ""} />
                            <AvatarFallback>{person.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{person.username}</div>
                            <div className="text-xs text-muted-foreground">{[person.city || person.location, "Artist page"].filter(Boolean).join(" · ")}</div>
                          </div>
                        </div>
                        {person.about ? <p className="line-clamp-3 text-sm text-muted-foreground">{person.about}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          {person.location ? <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{person.location}</Badge> : null}
                          <Badge variant="secondary"><Users className="mr-1 h-3 w-3" />Public identity</Badge>
                        </div>
                        <Link href={`/artists/${person.id}`}>
                          <Button variant="outline" size="sm">Open Artist Page</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-border/50 bg-card/20">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    No people are surfacing {topicLabel} yet.
                  </CardContent>
                </Card>
              )}
            </section>
          ) : null}
        </div>
      ) : (
        <Card className="border-dashed border-border/50 bg-card/30">
          <CardContent className="p-12 text-center text-muted-foreground">
            Topic activity will appear here as more artists, events, scenes, and people use {topicLabel}.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
