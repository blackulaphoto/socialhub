import { useState } from "react";
import { Link } from "wouter";
import { useGetArtists } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { MapPin, Search, Mic2 } from "lucide-react";
import { QueryErrorState } from "@/components/query-error-state";

export default function Discover() {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [tags, setTags] = useState("");

  const { data, isLoading, isError, refetch } = useGetArtists({
    location: location || undefined,
    category: category !== "all" ? category : undefined,
    tags: tags || undefined,
    limit: 50
  }, { query: { queryKey: ["/api/artists", location, category, tags] } });

  return (
    <div className="max-w-6xl mx-auto p-4 md:py-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Discover Artists</h1>
        <p className="text-muted-foreground">Find the best talent in the underground scene.</p>
      </div>

      <Card className="mb-8 border-border/50 bg-card/30 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by tags (e.g. techno, visual, dj)" 
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
                <SelectItem value="Music">Music</SelectItem>
                <SelectItem value="Visual Arts">Visual Arts</SelectItem>
                <SelectItem value="Photography">Photography</SelectItem>
                <SelectItem value="Performance">Performance</SelectItem>
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <QueryErrorState title="Could not load artists" description="Check that the API server is running on port 3001, then retry." onRetry={() => refetch()} />
      ) : data?.artists && data.artists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.artists.map((artist) => (
            <Link key={artist.id} href={`/artists/${artist.userId}`}>
              <Card className="h-full cursor-pointer hover:border-primary/50 transition-colors border-border/50 bg-card/50 overflow-hidden group">
                <div className="aspect-square w-full bg-muted relative overflow-hidden">
                  {artist.gallery && artist.gallery[0] ? (
                    <img 
                      src={artist.gallery[0].url} 
                      alt={artist.user.username} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                      <Mic2 className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                    <Avatar className="w-12 h-12 border-2 border-background shadow-lg">
                      <AvatarImage src={artist.user.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {artist.user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pb-1">
                      <h3 className="font-bold text-lg truncate leading-tight">{artist.user.username}</h3>
                      <p className="text-xs text-primary font-medium">{artist.category}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  {artist.location && (
                    <div className="flex items-center text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{artist.location}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {artist.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm bg-secondary/50 hover:bg-secondary">
                        {tag}
                      </Badge>
                    ))}
                    {artist.tags && artist.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm bg-secondary/50">
                        +{artist.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-card/10">
          <Mic2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-foreground mb-1">No artists found</h3>
          <p>Try adjusting your filters to discover more talent.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => { setLocation(""); setCategory("all"); setTags(""); }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
