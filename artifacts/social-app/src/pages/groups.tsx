import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateGroup, useGetGroups, useJoinGroup, useLeaveGroup } from "@workspace/api-client-react";
import { Eye, Lock, MapPin, Plus, Users } from "lucide-react";
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

export default function Groups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
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
                <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
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

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : isError ? (
        <QueryErrorState title="Could not load scenes" description="The scenes request failed. Check the API and retry." onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data?.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="cursor-pointer overflow-hidden rounded-[1.9rem] border border-border/50 bg-card/45 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.82)] backdrop-blur-xl transition-colors hover:border-primary/35">
                <div className="h-32 bg-gradient-to-br from-primary/20 via-background to-cyan-500/10" style={group.coverImageUrl ? { backgroundImage: `url(${group.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                <CardHeader className="space-y-3">
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="truncate">{group.name}</span>
                    <Badge variant={group.visibility === "private" ? "secondary" : "outline"}>{group.visibility}</Badge>
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {group.memberCount} members</span>
                    {group.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {group.location}</span>}
                    <span className="inline-flex items-center gap-1">{group.visibility === "private" ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{group.visibility}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{group.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.category && <Badge variant="secondary">{group.category}</Badge>}
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
