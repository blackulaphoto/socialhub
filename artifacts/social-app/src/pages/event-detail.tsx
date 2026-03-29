import { Link } from "wouter";
import { useGetEvent } from "@workspace/api-client-react";
import { CalendarRange, MapPin, UserRound, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { QueryErrorState } from "@/components/query-error-state";
import { ReportDialog } from "@/components/report-dialog";

export default function EventDetail({ id }: { id: string }) {
  const eventId = Number(id);
  const { data, isLoading, isError, refetch } = useGetEvent(eventId, {
    query: {
      enabled: Number.isFinite(eventId),
      queryKey: ["event", eventId],
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (isError) return <div className="mx-auto w-full max-w-5xl p-4 md:py-8"><QueryErrorState title="Could not load event" description="The event request failed. Check the API and retry." onRetry={() => refetch()} /></div>;
  if (!data) return <div className="p-8">Event not found.</div>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:py-8">
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50">
        <div className="h-56 bg-gradient-to-br from-primary/20 via-background to-cyan-500/10" style={data.imageUrl ? { backgroundImage: `url(${data.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="space-y-5 p-6 md:p-8">
          <div className="flex justify-end">
            <ReportDialog targetType="event" targetId={eventId} variant="outline" />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.lineupTags?.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
          </div>
          <div className="text-3xl font-bold">{data.title}</div>
          <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">{data.description}</p>
          <div className="grid grid-cols-1 gap-4 text-sm text-muted-foreground md:grid-cols-2">
            <div className="inline-flex items-center"><CalendarRange className="mr-2 h-4 w-4 text-primary" /> {new Date(data.startsAt).toLocaleString()}</div>
            <div className="inline-flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> {data.location}{data.city ? `, ${data.city}` : ""}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/50">
          <CardHeader><CardTitle>Host</CardTitle></CardHeader>
          <CardContent>
            {data.host ? (
              <Link href={`/profile/${data.host.id}`}>
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={data.host.avatarUrl || ""} />
                    <AvatarFallback>{data.host.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{data.host.username}</div>
                    <div className="text-xs text-muted-foreground">View profile</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="text-sm text-muted-foreground">No host attached.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 lg:col-span-2">
          <CardHeader><CardTitle>Lineup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.artists?.length ? data.artists.map((artist) => (
              <Link key={artist.id} href={`/artists/${artist.id}`}>
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={artist.avatarUrl || ""} />
                    <AvatarFallback>{artist.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{artist.username}</div>
                    <div className="text-xs text-muted-foreground">{artist.category || artist.profileType}</div>
                  </div>
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </Link>
            )) : (
              <div className="text-sm text-muted-foreground inline-flex items-center"><UserRound className="mr-2 h-4 w-4" /> No linked artists yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
