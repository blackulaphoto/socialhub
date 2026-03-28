import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useSearch } from "@workspace/api-client-react";
import { SearchType } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Search as SearchIcon, User, Mic2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useSearch({
    q: debouncedQuery || undefined,
    type: type,
  }, { 
    query: { 
      queryKey: ["/api/search", debouncedQuery, type],
      enabled: debouncedQuery.length > 0 || type !== "all" 
    } 
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:py-8 w-full">
      <div className="mb-6 relative">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search for users, artists, or tags..." 
            className="pl-12 h-14 text-lg bg-card/50 border-border/50 shadow-sm rounded-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as SearchType)} className="mb-8">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="artists">Artists</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !debouncedQuery && type === "all" ? (
        <div className="text-center py-20 text-muted-foreground">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Start typing to search the network</p>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Artists Results */}
          {(type === "all" || type === "artists") && data.artists.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-primary" /> Artists
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.artists.map(artist => (
                  <Link key={artist.id} href={`/artists/${artist.userId}`}>
                    <Card className="cursor-pointer hover:border-primary/50 transition-colors border-border/50 bg-card/50">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Avatar className="w-14 h-14 border border-border">
                          <AvatarImage src={artist.user.avatarUrl || ""} />
                          <AvatarFallback>{artist.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate">{artist.user.username}</h3>
                          <div className="flex items-center text-sm text-muted-foreground gap-2">
                            <span className="text-primary font-medium">{artist.category}</span>
                            {artist.location && (
                              <>
                                <span>•</span>
                                <span className="flex items-center"><MapPin className="w-3 h-3 mr-0.5" />{artist.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users Results */}
          {(type === "all" || type === "users") && data.users.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Users
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.users.map(user => (
                  <Link key={user.id} href={`/profile/${user.id}`}>
                    <Card className="cursor-pointer hover:border-primary/50 transition-colors border-border/50 bg-card/50">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarImage src={user.avatarUrl || ""} />
                          <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{user.username}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{user.profileType}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.users.length === 0 && data.artists.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p>No results found for "{debouncedQuery}"</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
