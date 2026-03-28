import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
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
      <Route path="/artists">
        <AppLayout><Discover /></AppLayout>
      </Route>
      <Route path="/search">
        <AppLayout><Search /></AppLayout>
      </Route>
      <Route path="/messages">
        <AppLayout><Messages /></AppLayout>
      </Route>
      <Route path="/messages/:id">
        {params => <AppLayout><Messages conversationId={params.id} /></AppLayout>}
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
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
