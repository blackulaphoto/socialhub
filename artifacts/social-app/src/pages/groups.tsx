import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateGroup, useGetGroups, useJoinGroup, useLeaveGroup } from "@workspace/api-client-react";
import { BriefcaseBusiness, CalendarDays, Eye, Lock, MapPin, MessageSquare, Plus, Trophy, Users, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { QueryErrorState } from "@/components/query-error-state";
import { LocationInput } from "@/components/location-input";
import { uploadImage } from "@/lib/upload-image";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const SCENE_TYPES = [
  { value: "Forum", label: "Forum", helper: "General discussion, local talk, recurring community threads." },
  { value: "Collective", label: "Collective", helper: "Shared creative circle, crew, or scene-based group identity." },
  { value: "Casting Hub", label: "Casting Hub", helper: "Role calls, model searches, crew asks, and open calls." },
  { value: "Contest", label: "Contest", helper: "Challenges, submissions, prompts, and competitive community drops." },
  { value: "Event Group", label: "Event Group", helper: "Night-specific planning, recaps, and attendance coordination." },
] as const;

const SCENE_FILTERS = [
  { key: "all", label: "All" },
  { key: "Forum", label: "Forums" },
  { key: "Casting Hub", label: "Castings" },
  { key: "Contest", label: "Contests" },
  { key: "Collective", label: "Collectives" },
  { key: "Event Group", label: "Event Groups" },
] as const;

function resolveSceneIdentity(group: { category?: string | null; tags?: string[] | null; postCount?: number | null }) {
  const category = (group.category || "").trim();
  const tags = (group.tags || []).map((tag) => tag.toLowerCase());
  const normalized = category.toLowerCase();

  if (normalized.includes("contest") || tags.some((tag) => tag.includes("contest") || tag.includes("challenge"))) {
    return {
      type: "Contest",
      label: "Challenge / contest",
      helper: "Prompts, submissions, ranked drops, and scene challenges.",
    };
  }
  if (normalized.includes("casting") || tags.some((tag) => tag.includes("casting") || tag.includes("open call") || tag.includes("model call"))) {
    return {
      type: "Casting Hub",
      label: "Casting / open calls",
      helper: "Crew searches, role calls, talent asks, and collaboration requests.",
    };
  }
  if (normalized.includes("collective") || normalized.includes("crew")) {
    return {
      type: "Collective",
      label: "Collective / crew",
      helper: "Ongoing creative circle with a stable scene identity.",
    };
  }
  if (normalized.includes("event") || tags.some((tag) => tag.includes("event") || tag.includes("party"))) {
    return {
      type: "Event Group",
      label: "Event / happening",
      helper: "Planning, attendance, updates, and post-event recap threads.",
    };
  }
  return {
    type: category || "Forum",
    label: "Forum / group",
    helper: group.postCount ? "Ongoing community threads, scene talk, and shared references." : "Start local talk, prompts, and recurring threads here.",
  };
}

function getSceneVisuals(type: string) {
  switch (type) {
    case "Casting Hub":
      return {
        icon: BriefcaseBusiness,
        chipClass: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
        panelClass: "border-cyan-400/20 bg-cyan-500/[0.06]",
        glowClass: "from-cyan-500/18 via-cyan-500/4 to-transparent",
      };
    case "Contest":
      return {
        icon: Trophy,
        chipClass: "border-amber-400/30 bg-amber-500/10 text-amber-100",
        panelClass: "border-amber-400/20 bg-amber-500/[0.06]",
        glowClass: "from-amber-500/18 via-amber-500/4 to-transparent",
      };
    case "Collective":
      return {
        icon: UsersRound,
        chipClass: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100",
        panelClass: "border-fuchsia-400/20 bg-fuchsia-500/[0.06]",
        glowClass: "from-fuchsia-500/18 via-fuchsia-500/4 to-transparent",
      };
    case "Event Group":
      return {
        icon: CalendarDays,
        chipClass: "border-rose-400/30 bg-rose-500/10 text-rose-100",
        panelClass: "border-rose-400/20 bg-rose-500/[0.06]",
        glowClass: "from-rose-500/18 via-rose-500/4 to-transparent",
      };
    default:
      return {
        icon: MessageSquare,
        chipClass: "border-violet-400/30 bg-violet-500/10 text-violet-100",
        panelClass: "border-violet-400/20 bg-violet-500/[0.06]",
        glowClass: "from-violet-500/18 via-violet-500/4 to-transparent",
      };
  }
}

export default function Groups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [sceneFilter, setSceneFilter] = useState<(typeof SCENE_FILTERS)[number]["key"]>("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
    coverImageUrl: "",
    visibility: "public",
    tags: "",
  });
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const { data, isLoading, isError, refetch } = useGetGroups(
    { q: search || undefined, location: location || undefined },
    { query: { queryKey: ["groups", search, location] } },
  );

  const filteredGroups = (data || []).filter((group) => {
    if (sceneFilter === "all") return true;
    return resolveSceneIdentity(group).type === sceneFilter;
  });

  const sceneFilterCounts = Object.fromEntries(
    SCENE_FILTERS.map((item) => [
      item.key,
      item.key === "all"
        ? (data || []).length
        : (data || []).filter((group) => resolveSceneIdentity(group).type === item.key).length,
    ]),
  ) as Record<(typeof SCENE_FILTERS)[number]["key"], number>;

  const createGroup = useCreateGroup({
    mutation: {
      onSuccess: () => {
        setForm({ name: "", description: "", category: "", location: "", coverImageUrl: "", visibility: "public", tags: "" });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      },
    },
  });

  const joinGroup = useJoinGroup({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        queryClient.invalidateQueries({ queryKey: ["group", variables.groupId] });
        toast({ title: "Joined scene" });
      },
      onError: () => {
        toast({ title: "Could not join group", variant: "destructive" });
      },
    },
  });

  const leaveGroup = useLeaveGroup({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        queryClient.invalidateQueries({ queryKey: ["group", variables.groupId] });
        toast({ title: "Left scene" });
      },
      onError: () => {
        toast({ title: "Could not leave group", variant: "destructive" });
      },
    },
  });

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const uploaded = await uploadImage(file, "group");
      setForm((current) => ({ ...current, coverImageUrl: uploaded.url }));
      toast({ title: "Cover uploaded" });
    } catch (error) {
      toast({
        title: "Could not upload cover",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-5 p-4 md:space-y-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Hollywood Heartbeats</div>
          <h1 className="text-[2rem] font-bold leading-none md:text-3xl">Scenes</h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">Forums, collectives, and local creative circles where people talk, trade ideas, and pull each other into the next thing.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> New Scene</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Scene</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Scene name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Textarea placeholder="What is this scene for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={form.category || "__none__"} onValueChange={(value) => setForm({ ...form, category: value === "__none__" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Scene type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Scene type</SelectItem>
                    {SCENE_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <LocationInput
                  placeholder="City / state"
                  value={form.location}
                  onValueChange={(value) => setForm({ ...form, location: value })}
                />
              </div>
              <div className="space-y-2">
                <Input placeholder="Cover image URL" value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} />
                <Input type="file" accept="image/*" onChange={(e) => handleCoverUpload(e.target.files?.[0] || null)} disabled={isUploadingCover} />
              </div>
              <Input placeholder="Tags, comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              {form.category ? (
                <div className="rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-xs text-muted-foreground">
                  {SCENE_TYPES.find((item) => item.value === form.category)?.helper}
                </div>
              ) : null}
              <Select value={form.visibility} onValueChange={(value) => setForm({ ...form, visibility: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                onClick={() =>
                  createGroup.mutate({
                    data: {
                      name: form.name,
                      description: form.description,
                      category: form.category || undefined,
                      location: form.location || undefined,
                      coverImageUrl: form.coverImageUrl || undefined,
                      visibility: form.visibility,
                      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
                    },
                  })
                }
                disabled={createGroup.isPending || isUploadingCover}
              >
                Create Scene
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden rounded-[1.9rem] border border-border/50 bg-card/40 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.82)] backdrop-blur-xl">
        <CardContent className="grid grid-cols-2 gap-3 p-3.5 md:grid-cols-4 md:p-4">
          {[
            { label: "Why scenes matter", detail: "This is where the culture lives: local talk, shoot planning, recaps, references, and creative pull." },
            { label: "Typical use", detail: "Open calls, local shoots, wardrobe pulls, retoucher asks, after-hours chatter, and scene notes." },
            { label: "Who joins", detail: "Models, photographers, makeup artists, stylists, set designers, performers, and nightlife creatives." },
            { label: "Current phase", detail: "Keeping scenes social and visible now, without turning them into formal forum software." },
          ].map((item) => (
            <div key={item.label} className={`rounded-[1.45rem] border border-border/50 bg-background/28 p-4 ${item.label === "Current phase" ? "col-span-2 md:col-span-1" : ""}`}>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
              <div className="mt-2 text-sm text-muted-foreground">{item.detail}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[1.9rem] border border-border/50 bg-card/42 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.82)] backdrop-blur-xl">
        <CardContent className="grid grid-cols-1 gap-3 p-3.5 md:grid-cols-2 md:p-4">
          <Input placeholder="Search scenes, forums, and collectives..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card/50" />
          <LocationInput
            placeholder="Filter by city / state..."
            value={location}
            onValueChange={setLocation}
            className="bg-card/50"
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[1.9rem] border border-border/50 bg-card/38 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.82)] backdrop-blur-xl">
        <CardContent className="flex flex-wrap gap-2 p-3.5 md:p-4">
          {SCENE_FILTERS.map((item) => {
            const active = sceneFilter === item.key;
            const sceneType = item.key === "all" ? "Forum" : item.key;
            const visuals = getSceneVisuals(sceneType);
            const Icon = visuals.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSceneFilter(item.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                  active
                    ? `${visuals.chipClass} shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]`
                    : "border-border/50 bg-background/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="text-xs opacity-80">{sceneFilterCounts[item.key]}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : isError ? (
        <QueryErrorState title="Could not load scenes" description="The scenes request failed. Check the API and retry." onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredGroups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              {(() => {
                const sceneIdentity = resolveSceneIdentity(group);
                const visuals = getSceneVisuals(sceneIdentity.type);
                const Icon = visuals.icon;
                return (
              <Card className="cursor-pointer overflow-hidden rounded-[1.9rem] border border-border/50 bg-card/45 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.82)] backdrop-blur-xl transition-colors hover:border-primary/35">
                <div className="relative h-32 bg-gradient-to-br from-primary/20 via-background to-cyan-500/10" style={group.coverImageUrl ? { backgroundImage: `url(${group.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${visuals.glowClass}`} />
                  <div className="absolute left-4 top-4">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] backdrop-blur-md ${visuals.chipClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {sceneIdentity.type}
                    </div>
                  </div>
                </div>
                <CardHeader className="space-y-3">
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="truncate">{group.name}</span>
                    <Badge variant={group.visibility === "private" ? "secondary" : "outline"}>{group.visibility}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-primary/80">
                    <Icon className="h-3.5 w-3.5" />
                    {sceneIdentity.label}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {group.memberCount} members</span>
                    {group.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {group.location}</span>}
                    <span className="inline-flex items-center gap-1">{group.visibility === "private" ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{group.visibility}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{group.description}</p>
                  <div className={`rounded-[1.1rem] border px-3 py-2 text-xs text-muted-foreground ${visuals.panelClass}`}>
                    {sceneIdentity.helper}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={visuals.chipClass}>{sceneIdentity.type}</Badge>
                    {group.tags?.slice(0, 4).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-muted-foreground">
                      {group.postCount} post{group.postCount === 1 ? "" : "s"}
                    </div>
                    {user ? (
                      group.ownerId === user.id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          Owner
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant={group.isMember ? "outline" : "default"}
                          disabled={joinGroup.isPending || leaveGroup.isPending}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (group.isMember) {
                              leaveGroup.mutate({ groupId: group.id });
                            } else {
                              joinGroup.mutate({ groupId: group.id });
                            }
                          }}
                        >
                          {group.isMember ? "Leave Scene" : "Join Scene"}
                        </Button>
                      )
                    ) : null}
                  </div>
                </CardContent>
              </Card>
                );
              })()}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
