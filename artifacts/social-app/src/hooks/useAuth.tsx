import { createContext, useContext, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { User } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { consumeReturnTo, rememberReturnTo } from "@/lib/auth-redirect";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"],
      retry: false,
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      refetchInterval: 60_000,
    }
  });

  const isAuthRoute = location === "/login" || location === "/register";
  const isOnboardingRoute = location === "/onboarding";

  useEffect(() => {
    if (!isLoading) {
      if (isError && !isAuthRoute) {
        rememberReturnTo(location);
        setLocation("/login");
      } else if (user && !user.onboardingCompleted && !isOnboardingRoute && !isAuthRoute) {
        setLocation("/onboarding");
      } else if (user && isAuthRoute) {
        setLocation(consumeReturnTo());
      }
    }
  }, [isLoading, isError, user, location, isAuthRoute, isOnboardingRoute, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
