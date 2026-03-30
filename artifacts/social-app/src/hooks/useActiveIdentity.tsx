import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export type ActiveIdentity = "personal" | "artist";

type ActiveIdentityContextValue = {
  activeIdentity: ActiveIdentity;
  setActiveIdentity: (identity: ActiveIdentity) => void;
  canUseArtistIdentity: boolean;
};

const ActiveIdentityContext = createContext<ActiveIdentityContextValue | undefined>(undefined);

function getStorageKey(userId: number) {
  return `socialhub:active-identity:${userId}`;
}

export function ActiveIdentityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canUseArtistIdentity = Boolean(user?.hasArtistPage);
  const [activeIdentity, setActiveIdentityState] = useState<ActiveIdentity>("personal");

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) {
      setActiveIdentityState("personal");
      return;
    }

    if (!canUseArtistIdentity) {
      window.localStorage.removeItem(getStorageKey(user.id));
      setActiveIdentityState("personal");
      return;
    }

    const saved = window.localStorage.getItem(getStorageKey(user.id));
    setActiveIdentityState(saved === "artist" ? "artist" : "personal");
  }, [canUseArtistIdentity, user?.id]);

  const setActiveIdentity = (identity: ActiveIdentity) => {
    const nextIdentity = canUseArtistIdentity ? identity : "personal";
    setActiveIdentityState(nextIdentity);
    if (typeof window !== "undefined" && user?.id) {
      window.localStorage.setItem(getStorageKey(user.id), nextIdentity);
    }
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
