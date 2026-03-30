import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateEvent, useGetArtists, useGetEvents, useSearch } from "@workspace/api-client-react";
import { CalendarRange, MapPin, Plus, Search, Sparkles, Users, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { QueryErrorState } from "@/components/query-error-state";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload-image";

export default function Events() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [artistSearch, setArtistSearch] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<Array<{
    userId: number;
    name: string;
    category?: string;
    location?: string | null;
  }>>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    location: "",
    city: "",
    imageUrl: "",
    lineupTags: "",
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data, isLoading, isError, refetch } = useGetEvents(
    { city: city || undefined, q: query || undefined },
    { query: { queryKey: ["events", city, query] } },
  );

  const { data: suggestedArtists } = useGetArtists(
    {
      location: form.city || undefined,
      limit: 6,
    },
    {
      query: {
        enabled: isCreateOpen,
        queryKey: ["/api/artists", "event-form", form.city],
      },
    },
  );

  const { data: artistSearchResults, isLoading: isSearchingArtists } = useSearch(
    {
      q: artistSearch || undefined,
      type: "artists",
      location: form.city || undefined,
      limit: 8,
    },
    {
      query: {
        enabled: isCreateOpen && artistSearch.trim().length > 1,
        queryKey: ["event-lineup-search", artistSearch, form.city],
      },
    },
  );

  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: () => {
        setForm({ title: "", description: "", startsAt: "", location: "", city: "", imageUrl: "", lineupTags: "" });
        setSelectedArtists([]);
        setArtistSearch("");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: ["events"] });
        toast({ title: "Event created" });
      },
      onError: () => {
        toast({ title: "Could not create event", variant: "destructive" });
      },
    },
  });

  const handleEventImageUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const uploaded = await uploadImage(file, "event");
      setForm((current) => ({ ...current, imageUrl: uploaded.url }));
      toast({ title: "Event image uploaded" });
    } catch (error) {
      toast({
        title: "Could not upload image",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const lineupResults = (artistSearch.trim().length > 1 ? artistSearchResults?.artists : suggestedArtists?.artists) || [];

  const addArtistToLineup = (artist: typeof lineupResults[number]) => {
    if (selectedArtists.some((item) => item.userId === artist.userId)) return;
    setSelectedArtists((current) => [
      ...current,
      {
        userId: artist.userId,
        name: artist.displayName || artist.user.username,
        category: artist.category,
        location: artist.location,
      },
    ]);
    setArtistSearch("");
  };

  const removeArtistFromLineup = (userId: number) => {
    setSelectedArtists((current) => current.filter((artist) => artist.userId !== userId));
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Track lineups, appearances, and local creative happenings.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              <Input placeholder="Venue / address" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <div className="space-y-2">
                <Input placeholder="Event image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
                <Input type="file" accept="image/*" onChange={(e) => handleEventImageUpload(e.target.files?.[0] || null)} disabled={isUploadingImage} />
              </div>
              <Input placeholder="Lineup tags: techno, darkwave" value={form.lineupTags} onChange={(e) => setForm({ ...form, lineupTags: e.target.value })} />
              <div className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4">
                <div>
                  <div className="text-sm font-medium">Lineup artists</div>
                  <div className="text-xs text-muted-foreground">Search creator pages and add them to the lineup. No internal IDs needed.</div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search artist pages..."
                    className="pl-9"
                    value={artistSearch}
                    onChange={(e) => setArtistSearch(e.target.value)}
                  />
                </div>
                {selectedArtists.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedArtists.map((artist) => (
                      <Badge key={artist.userId} variant="secondary" className="gap-1 pr-1">
                        <span>{artist.name}</span>
                        <button
                          type="button"
                          className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                          onClick={() => removeArtistFromLineup(artist.userId)}
                          aria-label={`Remove ${artist.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {isSearchingArtists ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : lineupResults.length > 0 ? (
                    lineupResults
                      .filter((artist) => !selectedArtists.some((selected) => selected.userId === artist.userId))
                      .map((artist) => (
                        <button
                          key={artist.id}
                          type="button"
                          onClick={() => addArtistToLineup(artist)}
                          className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-background/60 px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/40"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">{artist.displayName || artist.user.username}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {[artist.category, artist.location].filter(Boolean).join(" · ") || "Creator page"}
                            </div>
                          </div>
                          <Badge variant="outline">Add</Badge>
                        </button>
                      ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
                      {artistSearch.trim().length > 1 ? "No artist pages matched that search." : "Suggested artist pages will show up here."}
                    </div>
                  )}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  createEvent.mutate({
                    data: {
                      title: form.title,
                      description: form.description,
                      startsAt: form.startsAt,
                      location: form.location,
                      city: form.city || undefined,
                      imageUrl: form.imageUrl || undefined,
                      lineupTags: form.lineupTags.split(",").map((tag) => tag.trim()).filter(Boolean),
                      lineupArtistIds: selectedArtists.map((artist) => artist.userId),
                    },
                  })
                }
                disabled={createEvent.isPending || isUploadingImage || !form.title.trim() || !form.description.trim() || !form.startsAt || !form.location.trim()}
              >
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <Input placeholder="Search title or description..." value={query} onChange={(e) => setQuery(e.target.value)} className="bg-card/50" />
          <Input placeholder="Filter by city..." value={city} onChange={(e) => setCity(e.target.value)} className="bg-card/50" />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : isError ? (
        <QueryErrorState title="Could not load events" description="The events request failed. Check the API and retry." onRetry={() => refetch()} />
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {data.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="overflow-hidden border-border/50 bg-card/60 transition-colors hover:border-primary/40">
                <div className="h-40 bg-gradient-to-br from-primary/20 via-background to-cyan-500/10" style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                <CardHeader className="space-y-3">
                  <CardTitle>{event.title}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {event.lineupTags?.slice(0, 4).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
                  <div className="text-sm flex items-center"><CalendarRange className="mr-2 h-4 w-4 text-primary" /> {new Date(event.startsAt).toLocaleString()}</div>
                  <div className="text-sm flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> {event.location}{event.city ? `, ${event.city}` : ""}</div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {event.host && <span>Hosted by {event.host.username}</span>}
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {event.artists?.length || 0} linked artists</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/50 bg-card/40">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Sparkles className="mx-auto mb-4 h-10 w-10 opacity-30" />
            No events matched this filter yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
