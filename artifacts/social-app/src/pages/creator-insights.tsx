import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, Eye, MessageCircle, Newspaper } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { QueryErrorState } from "@/components/query-error-state";
import { useAuth } from "@/hooks/useAuth";

type CreatorAnalytics = {
  views: { total: number; last7d: number; last30d: number };
  followers: { total: number; last30d: number };
  posts: { total: number; last30d: number };
  inquiries: { total: number; last30d: number };
};

export default function CreatorInsights() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["creator-analytics", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/analytics/creator`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Could not load creator analytics");
      }
      return response.json() as Promise<CreatorAnalytics>;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4">
        <QueryErrorState title="Could not load insights" description="Creator analytics failed to load." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:py-8">
      <Card className="border-border/50 bg-card/60">
        <CardHeader>
          <CardTitle>Creator Insights</CardTitle>
          <CardDescription>Track how people discover your page, follow you, and reach out.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Page views</div>
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{data.views.total}</div>
            <div className="mt-2 text-xs text-muted-foreground">{data.views.last7d} in the last 7 days</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Followers</div>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{data.followers.total}</div>
            <div className="mt-2 text-xs text-muted-foreground">+{data.followers.last30d} in the last 30 days</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Artist posts</div>
              <Newspaper className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{data.posts.total}</div>
            <div className="mt-2 text-xs text-muted-foreground">{data.posts.last30d} in the last 30 days</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Inquiries</div>
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{data.inquiries.total}</div>
            <div className="mt-2 text-xs text-muted-foreground">{data.inquiries.last30d} in the last 30 days</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Momentum</CardTitle>
          <CardDescription>Quick snapshot of growth signals.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Views 30d</div>
            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              {data.views.last30d}
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">New followers 30d</div>
            <div className="mt-2 text-2xl font-semibold">+{data.followers.last30d}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Inquiries 30d</div>
            <div className="mt-2 text-2xl font-semibold">{data.inquiries.last30d}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
