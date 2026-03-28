import { Link, useLocation } from "wouter";
import { 
  Home, 
  Search, 
  Compass, 
  MessageSquare, 
  User as UserIcon, 
  Settings, 
  ShieldAlert,
  LogOut
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
  SidebarTrigger,
  SidebarProvider
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { mutate: logout } = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "Discover", url: "/artists", icon: Compass },
    { title: "Search", url: "/search", icon: Search },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Profile", url: `/profile/${user?.id}`, icon: UserIcon },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  if (user?.isAdmin) {
    navItems.push({ title: "Admin", url: "/admin", icon: ShieldAlert });
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <span className="bg-primary text-primary-foreground p-1 rounded-md">
            <Compass className="w-5 h-5" />
          </span>
          ArtistHub
        </h1>
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
                    <Link href={item.url}>
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
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="w-10 h-10 border border-sidebar-border">
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.profileType}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
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
          <header className="md:hidden flex items-center h-14 px-4 border-b border-border">
            <SidebarTrigger />
            <span className="ml-4 font-bold text-primary">ArtistHub</span>
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
