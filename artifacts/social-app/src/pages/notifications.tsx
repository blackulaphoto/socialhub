import { Bell, Heart, MessageSquare, UserPlus } from "lucide-react";
import { Link } from "wouter";
import {
  useGetActivitySummary,
  useGetNotifications,
  useReadAllNotifications,
  useReadNotification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { QueryErrorState } from "@/components/query-error-state";

function iconForType(type: string) {
  if (type === "follow") return UserPlus;
  if (type === "like") return Heart;
  return MessageSquare;
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const { mutate: readNotification } = useReadNotification();
  const { mutate: readAllNotifications, isPending: isMarkingAllRead } = useReadAllNotifications();
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useGetActivitySummary({
    query: {
      queryKey: ["/api/activity/summary"],
      staleTime: 10_000,
      refetchInterval: 30_000,
    },
  });
  const {
    data: notifications,
    isLoading: isLoadingNotifications,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useGetNotifications(
    { limit: 50 },
    {
      query: {
        queryKey: ["/api/notifications", 50],
        staleTime: 10_000,
        refetchInterval: 30_000,
      },
    },
  );

  const refreshNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  if (isLoadingSummary || isLoadingNotifications) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (isSummaryError || isNotificationsError) return <div className="max-w-4xl mx-auto p-4 md:py-8 w-full"><QueryErrorState title="Could not load notifications" description="The activity service is unavailable right now." onRetry={() => { refetchSummary(); refetchNotifications(); }} /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:py-8 w-full space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Center</h1>
          <p className="text-muted-foreground">Recent follows, likes, messages, and creator inquiries.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Card className="bg-card/50 border-border/50"><CardContent className="px-4 py-3"><div className="text-xs text-muted-foreground">Unread messages</div><div className="text-2xl font-bold">{summary?.unreadMessages || 0}</div></CardContent></Card>
          <Card className="bg-card/50 border-border/50"><CardContent className="px-4 py-3"><div className="text-xs text-muted-foreground">Unread activity</div><div className="text-2xl font-bold">{summary?.unreadNotifications || 0}</div></CardContent></Card>
          <Button
            variant="outline"
            disabled={isMarkingAllRead || !summary?.unreadNotifications}
            onClick={() => {
              readAllNotifications(undefined, {
                onSuccess: () => {
                  refreshNotifications();
                },
              });
            }}
          >
            Mark all read
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications?.length ? notifications.map((item) => {
          const Icon = iconForType(item.type);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (!item.isUnread) return;
                readNotification(
                  { notificationId: item.id },
                  {
                    onSuccess: () => {
                      refreshNotifications();
                    },
                  },
                );
              }}
            >
              <Card className="cursor-pointer bg-card/60 border-border/50 hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={item.actor?.avatarUrl || ""} />
                    <AvatarFallback>{item.actor?.username?.slice(0, 2).toUpperCase() || "AH"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">{item.type}</Badge>
                      {item.isUnread && <Badge>New</Badge>}
                    </div>
                    <div className="font-medium">
                      {item.actor?.username || "Platform"} · {item.title}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{item.body}</div>
                    <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="rounded-full border border-border/50 p-2">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        }) : (
          <Card className="bg-card/40 border-dashed border-border/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-25" />
              No notifications yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
