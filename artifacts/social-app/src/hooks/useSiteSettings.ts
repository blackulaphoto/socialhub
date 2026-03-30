import { useQuery } from "@tanstack/react-query";

export type SiteSettings = {
  id: number;
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  updatedByUserId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
}

async function fetchSiteSettings(): Promise<SiteSettings> {
  const response = await fetch(`${getApiBaseUrl()}/api/site/settings`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to load site settings: ${response.status}`);
  }

  return response.json();
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["/api/site/settings"],
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });
}
