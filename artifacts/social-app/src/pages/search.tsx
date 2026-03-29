import { useState } from "react";
import { Link } from "wouter";
import { SearchType, useSearch } from "@workspace/api-client-react";
import { MapPin, Search as SearchIcon, User, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export default function Search() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");

  const searchParams = {
    q: query || undefined,
    type,
    location: location || undefined,
    category: category || undefined,
    tags: tags || undefined,
  };

  const { data, isLoading } = useSearch(searchParams, {
    query: {
      queryKey: ["search", query, type, location, category, tags],
      enabled: query.length > 0 || location.length > 0 || category.length > 0 || tags.length > 0,
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:py-8 w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search & Discovery</h1>
        <p className="text-muted-foreground">Find people, creators, categories, and tags across the scene.</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search names, bios, categories..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={type} onValueChange={(value) => setType(value as SearchType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="artists">Creators</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="City / location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input placeholder="Tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : data ? (
        <div className="space-y-8">
          {data.artists?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Creators</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.artists.map((artist) => (
                  <Link key={artist.id} href={`/artists/${artist.userId}`}>
                    <Card className="cursor-pointer bg-card/60 border-border/50 hover:border-primary/40 transition-colors overflow-hidden">
                      <div className="h-28 bg-gradient-to-r from-primary/15 via-background to-cyan-500/10" style={artist.user.bannerUrl ? { backgroundImage: `url(${artist.user.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                      <CardContent className="p-4 flex gap-4">
                        <Avatar className="w-14 h-14 -mt-10 border-4 border-background">
                          <AvatarImage src={artist.user.avatarUrl || ""} />
                          <AvatarFallback>{artist.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{artist.user.username}</div>
                          <div className="text-sm text-primary">{artist.category}</div>
                          {artist.location && <div className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="w-3 h-3 mr-1" /> {artist.location}</div>}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {artist.tags?.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.users?.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">People</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.users.map((person) => (
                  <Link key={person.id} href={`/profile/${person.id}`}>
                    <Card className="cursor-pointer bg-card/60 border-border/50 hover:border-primary/40 transition-colors">
                      <CardContent className="p-4 flex gap-4 items-center">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={person.avatarUrl || ""} />
                          <AvatarFallback>{person.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{person.username}</div>
                          <div className="text-xs text-muted-foreground">{person.hasArtistPage ? "Personal profile + artist page" : "Personal profile"}</div>
                          {person.location && <div className="text-xs text-muted-foreground mt-1">{person.location}</div>}
                        </div>
                        <User className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card className="bg-card/40 border-dashed border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-25" />
            Start searching by name, category, tag, or city.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
