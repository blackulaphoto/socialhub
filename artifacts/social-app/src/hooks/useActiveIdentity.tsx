import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export type ActiveIdentity = "personal" | "artist";

type ActiveIdentityContextValue = {
  activeIdentity: ActiveIdentity;
  setActiveIdentity: (identity: ActiveIdentity) => void;
  canUseArtistIdentity: boolean;
};

const ActiveIdentityContext = createContext<ActiveIdentityContextValue | undefined>(undefined);

export function ActiveIdentityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canUseArtistIdentity = Boolean(user?.hasArtistPage);
  const [activeIdentity, setActiveIdentityState] = useState<ActiveIdentity>("personal");

  useEffect(() => {
    if (!user?.id) {
      setActiveIdentityState("personal");
      return;
    }

    if (!canUseArtistIdentity) {
      setActiveIdentityState("personal");
      return;
    }
  }, [canUseArtistIdentity, user?.id]);

  const setActiveIdentity = (identity: ActiveIdentity) => {
    const nextIdentity = canUseArtistIdentity ? identity : "personal";
    setActiveIdentityState(nextIdentity);
  };

  return (
    <ActiveIdentityContext.Provider value={{ activeIdentity, setActiveIdentity, canUseArtistIdentity }}>
      {children}
    </ActiveIdentityContext.Provider>
  );
}

export function useActiveIdentity() {
  const context = useContext(ActiveIdentityContext);
  if (!context) {
    throw new Error("useActiveIdentity must be used within an ActiveIdentityProvider");
  }
  return context;
}
