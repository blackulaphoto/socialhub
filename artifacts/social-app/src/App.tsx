import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl, useTrackPageView } from "@workspace/api-client-react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import ArtistProfile from "@/pages/artist-profile";
import Discover from "@/pages/discover";
import Search from "@/pages/search";
import Messages from "@/pages/messages";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import Notifications from "@/pages/notifications";
import Onboarding from "@/pages/onboarding";
import { ActiveIdentityProvider } from "@/hooks/useActiveIdentity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ApiClientConfig() {
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || null;
    setBaseUrl(baseUrl);
  }, []);

  return null;
}

function AnalyticsTracker() {
  const [location] = useLocation();
  const { mutate: trackPageView } = useTrackPageView();

  useEffect(() => {
    trackPageView({
      data: {
        path: location,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      },
    });
  }, [location, trackPageView]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/onboarding" component={Onboarding} />
      
      {/* Protected Routes inside AppLayout */}
      <Route path="/">
        <AppLayout><Home /></AppLayout>
      </Route>
      <Route path="/profile/:id">
        {params => <AppLayout><Profile id={params.id} /></AppLayout>}
      </Route>
      <Route path="/artists/:id">
        {params => <AppLayout><ArtistProfile id={params.id} /></AppLayout>}
      </Route>
      <Route path="/discover">
        <AppLayout><Discover /></AppLayout>
      </Route>
      <Route path="/artists">
        <AppLayout><Discover /></AppLayout>
      </Route>
      <Route path="/search">
        <AppLayout><Search /></AppLayout>
      </Route>
      <Route path="/groups">
        <AppLayout><Groups /></AppLayout>
      </Route>
      <Route path="/groups/:id">
        {params => <AppLayout><GroupDetail id={params.id} /></AppLayout>}
      </Route>
      <Route path="/events">
        <AppLayout><Events /></AppLayout>
      </Route>
      <Route path="/events/:id">
        {params => <AppLayout><EventDetail id={params.id} /></AppLayout>}
      </Route>
      <Route path="/messages">
        <AppLayout><Messages /></AppLayout>
      </Route>
      <Route path="/messages/:id">
        {params => <AppLayout><Messages conversationId={params.id} /></AppLayout>}
      </Route>
      <Route path="/notifications">
        <AppLayout><Notifications /></AppLayout>
      </Route>
      <Route path="/settings">
        <AppLayout><Settings /></AppLayout>
      </Route>
      <Route path="/admin">
        <AppLayout><Admin /></AppLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <ApiClientConfig />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <ActiveIdentityProvider>
                <AnalyticsTracker />
                <Router />
              </ActiveIdentityProvider>
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
