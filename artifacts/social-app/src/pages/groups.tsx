import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateGroup, useGetGroups } from "@workspace/api-client-react";
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

export default function Groups() {
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
    <div className="max-w-6xl mx-auto p-4 md:py-8 w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Join scenes, collectives, and local creative circles.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Textarea placeholder="What is this group for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          <Input placeholder="Search groups..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-card/50" />
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
        <QueryErrorState title="Could not load groups" description="The groups request failed. Check the API and retry." onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data?.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="cursor-pointer bg-card/60 border-border/50 hover:border-primary/40 transition-colors overflow-hidden">
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
