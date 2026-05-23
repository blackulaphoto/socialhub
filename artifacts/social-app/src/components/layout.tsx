import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  CalendarRange,
  ChevronDown,
  Compass,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Palette,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  User as UserIcon,
  Users,
} from "lucide-react";
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
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";

function getPageMeta(location: string) {
  if (location === "/") return { title: "Following Feed", subtitle: "Share work. Discover creatives. Book collaborations. Build your portfolio." };
  if (location.startsWith("/messages")) return { title: "Messages", subtitle: "Direct conversation, inquiries, and collaboration threads." };
  if (location.startsWith("/notifications")) return { title: "Activity", subtitle: "Fresh follows, replies, scene movement, and collaboration notes." };
  if (location.startsWith("/artists/")) return null;
  if (location.startsWith("/artists")) return { title: "Discover", subtitle: "Where photographers, models, and visual artists build their scene." };
  if (location.startsWith("/groups")) return { title: "Scenes", subtitle: "Scene-based forums, collective chatter, and open creative threads." };
  if (location.startsWith("/events")) return { title: "Happenings", subtitle: "Appearances, local events, and public creative gatherings." };
  if (location.startsWith("/search")) return { title: "Search", subtitle: "Find artists, scenes, tags, projects, and cities." };
  if (location.startsWith("/settings")) return { title: "Artist Page Settings", subtitle: "Shape your page, story, and public creative presence." };
  if (location.startsWith("/insights")) return { title: "Insights", subtitle: "Track visits, follows, and responses to your work." };
  if (location.startsWith("/admin")) return { title: "Admin", subtitle: "Platform moderation and operational controls." };
  return { title: "HollywoodHeartbeats.com", subtitle: "Where photographers, models, and visual artists build their scene." };
}

function topNavItems(userId?: number) {
  return [
    { title: "Home", href: "/", match: (location: string) => location === "/", icon: Home },
    { title: "Discover", href: "/artists", match: (location: string) => location.startsWith("/artists") && !location.startsWith(`/artists/${userId}`), icon: Compass },
    { title: "Scenes", href: "/groups", match: (location: string) => location.startsWith("/groups"), icon: Users },
    { title: "Messages", href: "/messages", match: (location: string) => location.startsWith("/messages"), icon: MessageSquare },
    { title: "Events", href: "/events", match: (location: string) => location.startsWith("/events"), icon: CalendarRange },
  ];
}

function BrandWordmark({ siteName }: { siteName?: string | null }) {
  const brand = (siteName || "HollywoodHeartbeats.com").replace(".com", "");
  return (
    <div className="hh-brand-lockup">
      <span className="hh-brand-wordmark">
        <span>Hollywood</span>
        <span className="hh-brand-wordmark-accent">Heartbeats</span>
      </span>
      <span className="hh-brand-caption">{brand}.com</span>
    </div>
  );
}

function HeaderActions() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { mutate: logout } = useLogout();
  const { mutate: readNotification } = useReadNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
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
    <>
    <div className="flex items-center gap-2">
      <Link href="/?compose=1">
        <Button className="hh-solid-btn hidden h-10 rounded-none px-5 md:inline-flex">
          <Plus className="mr-2 h-4 w-4" />
          Publish
        </Button>
      </Link>

      <Link href="/messages">
        <Button variant="ghost" size="icon" className="hh-icon-btn relative">
          <MessageSquare className="h-4 w-4" />
          {(activity?.unreadMessages || 0) > 0 && (
            <span className="hh-count-badge">
              {activity!.unreadMessages > 9 ? "9+" : activity!.unreadMessages}
            </span>
          )}
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hh-icon-btn relative">
            <Bell className="h-4 w-4" />
            {(activity?.unreadNotifications || 0) > 0 && (
              <span className="hh-count-badge">
                {activity!.unreadNotifications > 9 ? "9+" : activity!.unreadNotifications}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[22rem] p-0">
          <div className="border-b border-border/60 px-4 py-3">
            <div className="font-semibold">Activity</div>
            <div className="text-xs text-muted-foreground">Fresh follows, replies, scene movement, and messages.</div>
          </div>
          <div className="max-h-[24rem] overflow-y-auto p-2">
            {notifications?.length ? notifications.map((item) => (
              <DropdownMenuItem key={item.id} asChild className="items-start rounded-none px-3 py-3">
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
                  <Avatar className="mt-0.5 h-9 w-9">
                    <AvatarImage src={item.actor?.avatarUrl || ""} />
                    <AvatarFallback>{item.actor?.username?.slice(0, 2).toUpperCase() || "HH"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-[0.16em]">{item.type}</Badge>
                      {item.isUnread ? <Badge className="text-[10px]">New</Badge> : null}
                    </div>
                    <div className="text-sm font-medium">{item.actor?.username || "Platform"} · {item.title}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{item.body}</div>
                  </div>
                </Link>
              </DropdownMenuItem>
            )) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No activity yet.</div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="hh-profile-trigger">
            <Avatar className="h-9 w-9 border border-border/60">
              <AvatarImage src={user?.avatarUrl || ""} />
              <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium leading-none">{user?.username}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Public artist page</div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{user?.username}</div>
            <div className="mt-1 text-xs text-muted-foreground">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/artists/${user?.id}`}>Artist Page</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => {
            event.preventDefault();
            setIsInviteOpen(true);
          }}>
            <Users className="h-4 w-4" />
            Invite Friends
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings?tab=creator">Edit Artist Page</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <InviteFriendsDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
    </>
  );
}

function TopNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const navItems = topNavItems(user?.id);

  return (
    <header className="hh-topnav">
      <div className="hh-topnav-inner">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon" className="hh-icon-btn md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
          <Link href="/" className="shrink-0">
            <BrandWordmark siteName={siteSettings?.siteName} />
          </Link>
        </div>

        <nav className="hh-primary-nav">
          {navItems.map((item) => {
            const isActive = item.match(location);
            return (
              <Link key={item.title} href={item.href} className={isActive ? "hh-nav-link is-active" : "hh-nav-link"}>
                {item.title}
              </Link>
            );
          })}
          {user?.isAdmin ? (
            <Link href="/admin" className={location.startsWith("/admin") ? "hh-nav-link is-active" : "hh-nav-link"}>
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <Link href="/search" className="hh-search-shell">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm text-muted-foreground">Search artists, scenes, tags, cities…</span>
            <span className="hh-search-kbd">/</span>
          </Link>
        </div>

        <HeaderActions />
      </div>
    </header>
  );
}

function PageHeaderBand() {
  const [location] = useLocation();
  const meta = getPageMeta(location);

  if (!meta) return null;

  return (
    <div className="hh-page-band">
      <div className="hh-page-band-inner">
        <div className="min-w-0">
          <div className="hh-page-kicker">Hollywood Heartbeats</div>
          <div className="hh-page-title">{meta.title}</div>
        </div>
        <div className="hh-page-subtitle">{meta.subtitle}</div>
      </div>
    </div>
  );
}

function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { setActiveIdentity } = useActiveIdentity();
  const isComposeIntentActive = typeof window !== "undefined" && window.location.search.includes("compose=1");

  if (!user) return null;

  const items = [
    { title: "Home", href: "/", icon: Home, onClick: () => undefined },
    { title: "Discover", href: "/artists", icon: Compass, onClick: () => undefined },
    { title: "Create", href: "/?compose=1", icon: Plus, onClick: () => undefined },
    { title: "Scenes", href: "/groups", icon: Users, onClick: () => undefined },
    { title: "Profile", href: `/artists/${user.id}`, icon: UserIcon, onClick: () => setActiveIdentity("artist") },
  ];

  return (
    <nav className="hh-mobile-nav md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const isActive = item.title === "Create"
            ? isComposeIntentActive
            : item.href === "/"
              ? location === "/"
              : location.startsWith(item.href.replace("?compose=1", ""));

          return (
            <Link key={item.title} href={item.href} onClick={item.onClick}>
              <div className={isActive ? "hh-mobile-nav-item is-active" : "hh-mobile-nav-item"}>
                <item.icon className="mb-1 h-4 w-4" />
                <span>{item.title}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="hh-app hh-auth-shell min-h-screen bg-background text-foreground">
      <TopNav />
      <PageHeaderBand />
      <main className="hh-main-shell">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
