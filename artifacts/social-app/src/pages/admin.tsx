import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2 } from "lucide-react";
import {
  useAdminBanUser,
  useAdminDeleteEvent,
  useAdminDeleteGroup,
  useAdminDeletePost,
  useAdminGetAnalytics,
  useAdminGetEvents,
  useAdminGetGroups,
  useAdminGetPosts,
  useAdminGetReports,
  useAdminGetUsers,
  useAdminUnbanUser,
  useAdminUpdateReportStatus,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryErrorState } from "@/components/query-error-state";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportNotes, setReportNotes] = useState<Record<number, string>>({});

  const usersQuery = useAdminGetUsers({ page: 1, limit: 100 }, { query: { enabled: !!user?.isAdmin, queryKey: ["/api/admin/users"] } });
  const postsQuery = useAdminGetPosts({ page: 1, limit: 100 }, { query: { enabled: !!user?.isAdmin, queryKey: ["/api/admin/posts"] } });
  const groupsQuery = useAdminGetGroups({ query: { enabled: !!user?.isAdmin, queryKey: ["/api/admin/groups"] } });
  const eventsQuery = useAdminGetEvents({ query: { enabled: !!user?.isAdmin, queryKey: ["/api/admin/events"] } });
  const reportsQuery = useAdminGetReports({ query: { enabled: !!user?.isAdmin, queryKey: ["/api/admin/reports"] } });
  const analyticsQuery = useAdminGetAnalytics({ query: { enabled: !!user?.isAdmin, queryKey: ["/api/admin/analytics"] } });

  const banUser = useAdminBanUser();
  const unbanUser = useAdminUnbanUser();
  const deletePost = useAdminDeletePost();
  const deleteGroup = useAdminDeleteGroup();
  const deleteEvent = useAdminDeleteEvent();
  const updateReport = useAdminUpdateReportStatus();

  if (!user?.isAdmin) {
    return <div className="flex h-full items-center justify-center p-8 text-muted-foreground">Admin access required.</div>;
  }

  const confirmAction = (label: string) => window.confirm(`Confirm ${label}?`);
  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><ShieldAlert className="h-8 w-8 text-primary" /> Admin Dashboard</h1>
        <p className="text-muted-foreground">Moderation queue, platform analytics, and content controls.</p>
      </div>

      {analyticsQuery.isError ? (
        <QueryErrorState title="Could not load analytics" description="Admin analytics failed to load." onRetry={() => analyticsQuery.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Card className="border-border/50 bg-card/50"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Users</div><div className="mt-2 text-2xl font-bold">{analyticsQuery.data?.totals.users || 0}</div></CardContent></Card>
            <Card className="border-border/50 bg-card/50"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Posts</div><div className="mt-2 text-2xl font-bold">{analyticsQuery.data?.totals.posts || 0}</div></CardContent></Card>
            <Card className="border-border/50 bg-card/50"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Open Reports</div><div className="mt-2 text-2xl font-bold">{analyticsQuery.data?.totals.openReports || 0}</div></CardContent></Card>
            <Card className="border-border/50 bg-card/50"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Views 24h</div><div className="mt-2 text-2xl font-bold">{analyticsQuery.data?.traffic.pageViews24h || 0}</div></CardContent></Card>
            <Card className="border-border/50 bg-card/50"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Active Users 7d</div><div className="mt-2 text-2xl font-bold">{analyticsQuery.data?.traffic.activeUsers7d || 0}</div></CardContent></Card>
          </div>

          {analyticsQuery.data?.traffic.topPaths?.length ? (
            <Card className="border-border/50 bg-card/50">
              <CardHeader><CardTitle>Top Paths (7 days)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {analyticsQuery.data.traffic.topPaths.map((item) => (
                  <div key={item.path} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm">
                    <span className="truncate">{item.path}</span>
                    <Badge variant="secondary">{item.views}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Tabs defaultValue="reports">
        <TabsList className="mb-8 border border-border/50 bg-card/50">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          {reportsQuery.isError ? (
            <QueryErrorState title="Could not load reports" description="The moderation queue failed to load." onRetry={() => reportsQuery.refetch()} />
          ) : reportsQuery.isLoading ? (
            <div className="flex justify-center p-10"><Spinner size="lg" /></div>
          ) : reportsQuery.data?.length ? (
            <div className="space-y-4">
              {reportsQuery.data.map((report) => (
                <Card key={report.id} className="border-border/50 bg-card/50">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={report.status === "open" ? "destructive" : "secondary"}>{report.status}</Badge>
                          <Badge variant="outline">{report.targetType}</Badge>
                          <span className="text-sm text-muted-foreground">Target #{report.targetId}</span>
                        </div>
                        <div className="mt-2 text-lg font-medium">{report.reason}</div>
                        {report.details && <div className="mt-2 text-sm text-muted-foreground">{report.details}</div>}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Reported by {report.reporter?.username || `User ${report.reporterUserId}`} · {new Date(report.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReport.mutate(
                            { reportId: report.id, data: { status: "reviewed", adminNote: reportNotes[report.id] || undefined } },
                            {
                              onSuccess: () => {
                                invalidate("/api/admin/reports");
                                invalidate("/api/admin/analytics");
                              },
                              onError: () => toast({ title: "Could not update report", variant: "destructive" }),
                            },
                          )}
                        >
                          Mark Reviewed
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateReport.mutate(
                            { reportId: report.id, data: { status: "resolved", adminNote: reportNotes[report.id] || undefined } },
                            {
                              onSuccess: () => {
                                invalidate("/api/admin/reports");
                                invalidate("/api/admin/analytics");
                              },
                              onError: () => toast({ title: "Could not resolve report", variant: "destructive" }),
                            },
                          )}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                    <Input
                      placeholder="Admin note"
                      value={reportNotes[report.id] ?? report.adminNote ?? ""}
                      onChange={(e) => setReportNotes((current) => ({ ...current, [report.id]: e.target.value }))}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/40">
              <CardContent className="p-8 text-muted-foreground">No reports in the moderation queue.</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users">
          {usersQuery.isError ? (
            <QueryErrorState title="Could not load users" description="The admin user list failed to load." onRetry={() => usersQuery.refetch()} />
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-0">
                {usersQuery.isLoading ? <div className="flex justify-center p-10"><Spinner size="lg" /></div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {usersQuery.data?.users.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell><div className="font-medium">{item.username}</div><div className="text-xs text-muted-foreground">{item.email}</div></TableCell>
                          <TableCell><Badge variant="outline">{item.profileType}</Badge></TableCell>
                          <TableCell>{item.isBanned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={item.isBanned ? "outline" : "destructive"}
                              onClick={() => {
                                if (!confirmAction(`${item.isBanned ? "unban" : "ban"} ${item.username}`)) return;
                                (item.isBanned ? unbanUser : banUser).mutate(
                                  { userId: item.id },
                                  {
                                    onSuccess: () => invalidate("/api/admin/users"),
                                    onError: () => toast({ title: `Could not ${item.isBanned ? "unban" : "ban"} user`, variant: "destructive" }),
                                  },
                                );
                              }}
                            >
                              {item.isBanned ? "Unban" : "Ban"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="posts">
          {postsQuery.isError ? (
            <QueryErrorState title="Could not load posts" description="The admin post list failed to load." onRetry={() => postsQuery.refetch()} />
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-0">
                {postsQuery.isLoading ? <div className="flex justify-center p-10"><Spinner size="lg" /></div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Author</TableHead><TableHead>Content</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {postsQuery.data?.posts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>{post.author?.username}</TableCell>
                          <TableCell className="max-w-[360px] truncate">{post.content}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => {
                                if (!confirmAction(`delete post ${post.id}`)) return;
                                deletePost.mutate(
                                  { postId: post.id },
                                  {
                                    onSuccess: () => invalidate("/api/admin/posts"),
                                    onError: () => toast({ title: "Could not delete post", variant: "destructive" }),
                                  },
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups">
          {groupsQuery.isError ? (
            <QueryErrorState title="Could not load groups" description="The admin group list failed to load." onRetry={() => groupsQuery.refetch()} />
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-0">
                {groupsQuery.isLoading ? <div className="flex justify-center p-10"><Spinner size="lg" /></div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Group</TableHead><TableHead>Visibility</TableHead><TableHead>Members</TableHead><TableHead>Posts</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {groupsQuery.data?.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell><div className="font-medium">{group.name}</div><div className="text-xs text-muted-foreground">{group.category || "Uncategorized"}</div></TableCell>
                          <TableCell><Badge variant="outline">{group.visibility}</Badge></TableCell>
                          <TableCell>{group.memberCount}</TableCell>
                          <TableCell>{group.postCount}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => {
                                if (!confirmAction(`delete group ${group.name}`)) return;
                                deleteGroup.mutate(
                                  { groupId: group.id },
                                  {
                                    onSuccess: () => invalidate("/api/admin/groups"),
                                    onError: () => toast({ title: "Could not delete group", variant: "destructive" }),
                                  },
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events">
          {eventsQuery.isError ? (
            <QueryErrorState title="Could not load events" description="The admin event list failed to load." onRetry={() => eventsQuery.refetch()} />
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-0">
                {eventsQuery.isLoading ? <div className="flex justify-center p-10"><Spinner size="lg" /></div> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Host</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {eventsQuery.data?.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell><div className="font-medium">{event.title}</div><div className="text-xs text-muted-foreground">{event.location}</div></TableCell>
                          <TableCell>{new Date(event.startsAt).toLocaleString()}</TableCell>
                          <TableCell>{event.host?.username}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => {
                                if (!confirmAction(`delete event ${event.title}`)) return;
                                deleteEvent.mutate(
                                  { eventId: event.id },
                                  {
                                    onSuccess: () => invalidate("/api/admin/events"),
                                    onError: () => toast({ title: "Could not delete event", variant: "destructive" }),
                                  },
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
