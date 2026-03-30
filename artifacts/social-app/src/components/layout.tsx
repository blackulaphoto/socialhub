import { Link, useLocation } from "wouter";
import {
  Bell,
  CalendarRange,
  Compass,
  Menu,
  ChevronDown,
  Palette,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  User as UserIcon,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import {
  useGetActivitySummary,
  useGetNotifications,
  useLogout,
  useReadNotification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { useSiteSettings } from "@/hooks/useSiteSettings";

function getPageMeta(location: string) {
  if (location === "/") return { title: "ArtistHub", subtitle: "Following, local, discovery, and custom collections." };
  if (location.startsWith("/messages")) return { title: "Messages", subtitle: "Direct conversations and creator inquiries." };
  if (location.startsWith("/notifications")) return { title: "Notifications", subtitle: "Recent follows, likes, messages, and inquiries." };
  if (location.startsWith("/artists")) return { title: "Discover", subtitle: "Browse artists, creator pages, and scenes." };
  if (location.startsWith("/groups")) return { title: "Groups", subtitle: "Creative circles, collectives, and communities." };
  if (location.startsWith("/events")) return { title: "Events", subtitle: "Local happenings, appearances, and lineups." };
  if (location.startsWith("/search")) return { title: "Search", subtitle: "Find people, creators, tags, and cities." };
  if (location.startsWith("/settings")) return { title: "Settings", subtitle: "Profile, creator page, and showcase controls." };
  if (location.startsWith("/admin")) return { title: "Admin", subtitle: "Moderation and platform operations." };
  if (location.startsWith("/profile")) return { title: "Profile", subtitle: "Identity, posts, and public presence." };
  return { title: "ArtistHub", subtitle: "Creative social networking." };
}

function ActivityTypeBadge({ type }: { type: string }) {
  const label = type === "inquiry"
    ? "Inquiry"
    : type === "message"
      ? "Message"
      : type === "follow"
        ? "Follow"
        : type === "mention"
          ? "Mention"
          : type === "event_tag"
            ? "Event Tag"
            : type === "event_reminder"
              ? "Reminder"
              : type === "comment"
                ? "Comment"
                : "Like";
  return <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">{label}</Badge>;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { setActiveIdentity } = useActiveIdentity();
  const { data: siteSettings } = useSiteSettings();

  const navItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "Discover", url: "/artists", icon: Compass },
    { title: "Groups", url: "/groups", icon: Users },
    { title: "Events", url: "/events", icon: CalendarRange },
    { title: "Search", url: "/search", icon: Search },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Profile", url: `/profile/${user?.id}`, icon: UserIcon },
    { title: user?.hasArtistPage ? "Artist Page" : "Create Artist Page", url: user?.hasArtistPage ? `/artists/${user?.id}` : "/settings?tab=creator", icon: Palette },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  if (user?.isAdmin) {
    navItems.push({ title: "Admin", url: "/admin", icon: ShieldAlert });
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {siteSettings?.logoUrl ? (
            <img
              src={siteSettings.logoUrl}
              alt={siteSettings.siteName || "Site logo"}
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-border/60"
            />
          ) : (
            <span className="rounded-md bg-primary p-1 text-primary-foreground">
              <Compass className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-primary">{siteSettings?.siteName || "ArtistHub"}</h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    tooltip={item.title}
                  >
                    <Link
                      href={item.url}
                      onClick={() => {
                        if (item.title === "Profile") setActiveIdentity("personal");
                        if (item.title === "Artist Page") setActiveIdentity("artist");
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-muted-foreground">
          Social shell active. Inbox, profile controls, and activity now live in the top header.
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function HeaderActions() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { activeIdentity, setActiveIdentity, canUseArtistIdentity } = useActiveIdentity();
  const { theme, setTheme } = useTheme();
  const { mutate: logout } = useLogout();
  const { mutate: readNotification } = useReadNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: activity } = useGetActivitySummary({
    query: {
      enabled: !!user,
      queryKey: ["/api/activity/summary"],
      staleTime: 10_000,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });
  const { data: notifications } = useGetNotifications(
    { limit: 6 },
    {
      query: {
        enabled: !!user,
        queryKey: ["/api/notifications", 6],
        staleTime: 10_000,
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
      },
    },
  );

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        queryClient.clear();
        toast({ title: "Signed out", description: "Your session has been closed." });
        setLocation("/login");
      },
      onError: () => {
        toast({ title: "Logout failed", description: "The session could not be closed cleanly.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link href="/">
        <Button variant="ghost" size="sm" className="hidden rounded-full px-4 lg:inline-flex">
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button>
      </Link>

      <Link href="/messages">
        <Button variant="ghost" size="icon" className="relative rounded-full transition-colors hover:bg-accent/70">
          <MessageSquare className="w-4 h-4" />
          {(activity?.unreadMessages || 0) > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold grid place-items-center">
              {activity!.unreadMessages > 9 ? "9+" : activity!.unreadMessages}
            </span>
          )}
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative rounded-full transition-colors hover:bg-accent/70">
            <Bell className="w-4 h-4" />
            {(activity?.unreadNotifications || 0) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold grid place-items-center">
                {activity!.unreadNotifications > 9 ? "9+" : activity!.unreadNotifications}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[22rem] p-0">
          <div className="px-4 py-3 border-b border-border">
            <div className="font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">Messages, follows, likes, and inquiries.</div>
          </div>
          <div className="max-h-[24rem] overflow-y-auto p-2">
            {notifications?.length ? notifications.map((item) => (
              <DropdownMenuItem key={item.id} asChild className="items-start rounded-xl p-3">
                <Link
                  href={item.href}
                  onClick={() => {
                    if (!item.isUnread) return;
                    readNotification(
                      { notificationId: item.id },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                        },
                      },
                    );
                  }}
                >
                  <Avatar className="w-9 h-9 mt-0.5">
                    <AvatarImage src={item.actor?.avatarUrl || ""} />
                    <AvatarFallback>{item.actor?.username?.slice(0, 2).toUpperCase() || "AH"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <ActivityTypeBadge type={item.type} />
                      {item.isUnread && <Badge className="text-[10px]">New</Badge>}
                    </div>
                    <div className="text-sm font-medium">{item.actor?.username || "Platform"} · {item.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{item.body}</div>
                  </div>
                </Link>
              </DropdownMenuItem>
            )) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
            )}
          </div>
          <DropdownMenuSeparator />
          <div className="p-2">
            <DropdownMenuItem asChild className="justify-center rounded-xl">
              <Link href="/notifications">Open Notification Center</Link>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 rounded-full px-2 transition-colors hover:bg-accent/70">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src={user?.avatarUrl || ""} />
              <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left ml-2">
              <div className="text-sm font-medium leading-none">{user?.username}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{user?.hasArtistPage ? "Personal + artist page" : "Personal profile"}</div>
            </div>
            <ChevronDown className="ml-2 hidden h-4 w-4 text-muted-foreground md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{user?.username}</div>
            <div className="text-xs text-muted-foreground mt-1">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/profile/${user?.id}`}>Profile</Link>
          </DropdownMenuItem>
          {canUseArtistIdentity ? (
            activeIdentity === "artist" ? (
              <DropdownMenuItem asChild>
                <Link href={`/artists/${user?.id}`}>Edit Artist Page</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href={`/profile/${user?.id}`}>Edit Profile</Link>
              </DropdownMenuItem>
            )
          ) : (
            <DropdownMenuItem asChild>
              <Link href={`/profile/${user?.id}`}>Edit Profile</Link>
            </DropdownMenuItem>
          )}
          {canUseArtistIdentity ? (
            activeIdentity === "artist" ? (
              <DropdownMenuItem
                onClick={() => {
                  setActiveIdentity("personal");
                  setLocation(`/profile/${user?.id}`);
                }}
              >
                Switch To Personal
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  setActiveIdentity("artist");
                  setLocation(`/artists/${user?.id}`);
                }}
              >
                Switch To Artist Page
              </DropdownMenuItem>
            )
          ) : null}
          {!user?.hasArtistPage ? (
            <DropdownMenuItem asChild>
              <Link href="/settings?tab=creator">Create Artist Page</Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AppHeader() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { activeIdentity, setActiveIdentity, canUseArtistIdentity } = useActiveIdentity();
  const { data: siteSettings } = useSiteSettings();
  const meta = getPageMeta(location);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="px-4 md:px-6 h-16 flex items-center gap-3 md:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger>
            <Menu className="w-5 h-5" />
          </SidebarTrigger>
          <Link href="/" className="min-w-0">
            <div className="text-lg font-semibold leading-none">{siteSettings?.siteName || "ArtistHub"}</div>
            <div className="hidden text-xs text-muted-foreground md:block">{location === "/" ? meta.subtitle : meta.title}</div>
          </Link>
        </div>

        <div className="flex flex-1 justify-center">
          {canUseArtistIdentity ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 rounded-full px-4 shadow-sm transition-colors hover:border-primary/35 hover:bg-accent/60">
                  {activeIdentity === "artist" ? "Artist Page" : "Personal"}
                  <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52">
                <DropdownMenuLabel>Viewing as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setActiveIdentity("personal");
                    setLocation(`/profile/${user?.id}`);
                  }}
                >
                  Personal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setActiveIdentity("artist");
                    setLocation(`/artists/${user?.id}`);
                  }}
                >
                  Artist Page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden text-sm text-muted-foreground md:block">{location === "/" ? "Home" : meta.title}</div>
          )}
        </div>

        <HeaderActions />
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
