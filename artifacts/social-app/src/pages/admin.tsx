import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryErrorState } from "@/components/query-error-state";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload-image";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportNotes, setReportNotes] = useState<Record<number, string>>({});
  const [siteForm, setSiteForm] = useState({ siteName: "", logoUrl: "", faviconUrl: "" });
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "favicon" | null>(null);
  const siteSettingsQuery = useSiteSettings();

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

  useEffect(() => {
    if (!siteSettingsQuery.data) return;
    setSiteForm({
      siteName: siteSettingsQuery.data.siteName || "ArtistHub",
      logoUrl: siteSettingsQuery.data.logoUrl || "",
      faviconUrl: siteSettingsQuery.data.faviconUrl || "",
    });
  }, [siteSettingsQuery.data]);

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
          <TabsTrigger value="design">Site Design</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="design">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Site Design</CardTitle>
              <p className="text-sm text-muted-foreground">Manage the global site name, logo, and favicon used across the app shell.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {siteSettingsQuery.isError ? (
                <QueryErrorState title="Could not load site settings" description="The global branding settings could not be loaded." onRetry={() => siteSettingsQuery.refetch()} />
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="site-name">Site name</Label>
                        <Input id="site-name" value={siteForm.siteName} onChange={(e) => setSiteForm((current) => ({ ...current, siteName: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site-logo-url">Logo image</Label>
                        <Input id="site-logo-url" value={siteForm.logoUrl} onChange={(e) => setSiteForm((current) => ({ ...current, logoUrl: e.target.value }))} placeholder="https://..." />
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={uploadingAsset === "logo"}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingAsset("logo");
                            try {
                              const uploaded = await uploadImage(file, "avatar");
                              setSiteForm((current) => ({ ...current, logoUrl: uploaded.url }));
                              toast({ title: "Logo uploaded" });
                            } catch (error) {
                              toast({ title: "Could not upload logo", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
                            } finally {
                              setUploadingAsset(null);
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site-favicon-url">Favicon</Label>
                        <Input id="site-favicon-url" value={siteForm.faviconUrl} onChange={(e) => setSiteForm((current) => ({ ...current, faviconUrl: e.target.value }))} placeholder="https://..." />
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={uploadingAsset === "favicon"}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingAsset("favicon");
                            try {
                              const uploaded = await uploadImage(file, "avatar");
                              setSiteForm((current) => ({ ...current, faviconUrl: uploaded.url }));
                              toast({ title: "Favicon uploaded" });
                            } catch (error) {
                              toast({ title: "Could not upload favicon", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
                            } finally {
                              setUploadingAsset(null);
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          disabled={savingSiteSettings || siteSettingsQuery.isLoading}
                          onClick={async () => {
                            setSavingSiteSettings(true);
                            try {
                              const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/admin/site-settings`, {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(siteForm),
                              });

                              if (!response.ok) {
                                const error = await response.json().catch(() => null);
                                throw new Error(error?.message || error?.error || `Save failed with status ${response.status}`);
                              }

                              await response.json();
                              await queryClient.invalidateQueries({ queryKey: ["/api/site/settings"] });
                              toast({ title: "Site design updated" });
                            } catch (error) {
                              toast({ title: "Could not save site design", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
                            } finally {
                              setSavingSiteSettings(false);
                            }
                          }}
                        >
                          Save Site Design
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border/50 bg-background/50 p-5">
                      <div className="text-sm font-medium">Live preview</div>
                      <div className="mt-4 flex items-center gap-3">
                        {siteForm.logoUrl ? (
                          <img src={siteForm.logoUrl} alt={siteForm.siteName || "Site logo"} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-border/60" />
                        ) : (
                          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">A</div>
                        )}
                        <div>
                          <div className="text-xl font-semibold">{siteForm.siteName || "ArtistHub"}</div>
                          <div className="text-sm text-muted-foreground">Sidebar, header, browser tab, and favicon</div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Favicon</div>
                        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background px-3 py-3">
                          {siteForm.faviconUrl ? (
                            <img src={siteForm.faviconUrl} alt="Favicon preview" className="h-8 w-8 rounded-lg object-cover ring-1 ring-border/60" />
                          ) : (
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">A</div>
                          )}
                          <div className="text-sm text-muted-foreground">Shown in browser tabs and bookmarks.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
