import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Heart,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageSquare,
  Mic2,
  MoreHorizontal,
  Palette,
  Pin,
  Radio,
  Share2,
  Sparkles,
  Tag,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  getUserPosts,
  useCreatePost,
  useFollowUser,
  useGetEvents,
  useGetGroups,
  useGetUser,
  useSendInquiry,
  useUnfollowUser,
} from "@workspace/api-client-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FeedPostCard } from "@/components/feed-post-card";
import { WallPostComposer } from "@/components/wall-post-composer";
import { CreatorHeroSlider } from "@/components/creator-page/creator-hero-slider";
import { CreatorInfoCard } from "@/components/creator-page/creator-info-card";
import { BuilderAudioPlayer } from "@/components/page-builder-blocks/builder-audio-player";
import { BuilderEventCarousel } from "@/components/page-builder-blocks/builder-event-carousel";
import { BuilderLinksShowcase } from "@/components/page-builder-blocks/builder-links-showcase";
import { BuilderMediaGallery } from "@/components/page-builder-blocks/builder-media-gallery";
import { BuilderVideoPlaylist } from "@/components/page-builder-blocks/builder-video-playlist";
import { PortfolioMosaic } from "@/components/portfolio-mosaic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MediaEmbed } from "@/components/media-embed";
import { QueryErrorState } from "@/components/query-error-state";
import { ReportDialog } from "@/components/report-dialog";
import { extractCollaborationCard } from "@/lib/collaboration-card";
import { filterPublicCustomFields } from "@/lib/browse-details";
import { cn } from "@/lib/utils";
import { FriendActionButton } from "@/components/friend-action-button";
import { ProfileReactionBar } from "@/components/profile-reaction-bar";
import { BlockActionButton } from "@/components/block-action-button";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { readCreatorBuilderMeta } from "@/lib/creator-page-builder";
import { uploadImage } from "@/lib/upload-image";
import { getEmbedDescriptor } from "@/lib/embeds";
import { groupItemsByFolder, readMediaFolderState } from "@/lib/media-folders";
import { LoadMoreSentinel } from "@/components/load-more-sentinel";
import { useTheme } from "next-themes";

const ACTION_HELPERS: Record<string, { title: string; fields: string[]; hint: string }> = {
  book: { title: "Send booking inquiry", fields: ["eventType", "eventDate", "budget", "location"], hint: "Share date, budget, and event context." },
  hire: { title: "Send hire request", fields: ["eventType", "eventDate", "budget", "location"], hint: "Tell them what the project is and what support you need." },
  contact: { title: "Send message", fields: ["projectDetails"], hint: "This goes straight into the artist inbox." },
  collaborate: { title: "Start collaboration", fields: ["projectDetails", "timeframe"], hint: "Outline the concept, timing, and what you want to build together." },
  shop: { title: "Ask about this work", fields: ["projectDetails"], hint: "Use this for product or commission inquiries." },
  store: { title: "Visit store", fields: [], hint: "If they have a store link it will open directly." },
  commission: { title: "Request a commission", fields: ["projectDetails", "budget", "timeframe"], hint: "Share the brief, budget, and delivery window." },
};

const MODULE_LABELS: Record<string, string> = {
  featured: "Featured",
  about: "About",
  media: "Media Modules",
  posts: "Posts and Updates",
  events: "Events",
  contact: "Contact",
};

const MOOD_STYLES: Record<string, { shell: string; glow: string }> = {
  sleek: { shell: "from-slate-900/95 via-slate-950/88 to-cyan-950/65", glow: "from-cyan-400/15 via-transparent to-transparent" },
  underground: { shell: "from-zinc-950/95 via-stone-950/88 to-red-950/65", glow: "from-red-500/18 via-transparent to-transparent" },
  dreamy: { shell: "from-slate-950/95 via-indigo-950/86 to-sky-900/65", glow: "from-sky-400/16 via-transparent to-transparent" },
  luxe: { shell: "from-neutral-950/95 via-zinc-950/88 to-amber-950/65", glow: "from-amber-400/18 via-transparent to-transparent" },
  gritty: { shell: "from-zinc-950/95 via-neutral-900/90 to-stone-900/70", glow: "from-orange-500/16 via-transparent to-transparent" },
  minimal: { shell: "from-slate-950/95 via-slate-900/90 to-slate-800/65", glow: "from-white/10 via-transparent to-transparent" },
  neon: { shell: "from-slate-950/95 via-fuchsia-950/86 to-cyan-950/65", glow: "from-fuchsia-500/20 via-transparent to-transparent" },
  vintage: { shell: "from-stone-950/95 via-amber-950/82 to-rose-950/65", glow: "from-amber-300/15 via-transparent to-transparent" },
};

const FONT_PRESET_CLASSES: Record<string, string> = {
  modern: "",
  editorial: "font-serif",
  mono: "font-mono",
};

const DEFAULT_MODULE_ORDER = ["featured", "posts", "media", "about", "events", "contact"];
const FRIEND_PLACEHOLDER_COUNT = 10;
const BACKGROUND_STYLE_CLASSES: Record<string, string> = {
  "soft-glow": "",
  spotlight: "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_45%)] before:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_35%)] after:pointer-events-none",
  flat: "before:absolute before:inset-0 before:bg-black/5 before:pointer-events-none",
};

function upsertMetaTag(selector: string, attrs: Record<string, string>) {
  if (typeof document === "undefined") return;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => tag!.setAttribute(key, value));
}

function upsertLinkTag(selector: string, attrs: Record<string, string>) {
  if (typeof document === "undefined") return;
  let tag = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement("link");
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => tag!.setAttribute(key, value));
}

const LIGHT_THEME_VARIANT_CLASSES: Record<string, string> = {
  studio: "",
  paper: "light:[&_section]:border-slate-300/60 light:[&_section]:bg-white/85",
  gallery: "light:[&_section]:border-slate-200/70 light:[&_section]:bg-white/72",
};

type FeedPostContext = {
  postType?: string;
  role?: string;
  collaborators?: string;
  location?: string;
  shootType?: string;
};

const POST_CONTEXT_PATTERN = /\n?\[\[context:(.+?)\]\]\s*$/s;

function buildPostContentWithContext(content: string, context: FeedPostContext) {
  const cleanedContent = content.replace(POST_CONTEXT_PATTERN, "").trimEnd();
  const normalizedContext = Object.fromEntries(
    Object.entries(context).filter(([, value]) => Boolean(value?.trim())),
  );
  if (!Object.keys(normalizedContext).length) {
    return cleanedContent;
  }
  return `${cleanedContent}\n[[context:${JSON.stringify(normalizedContext)}]]`;
}

type SectionConfig = {
  visible?: boolean;
  style?: string | null;
  density?: string | null;
};

type ArtistGalleryContributor = {
  id: number;
  username: string;
  artistDisplayName?: string | null;
  avatarUrl?: string | null;
  artistAvatarUrl?: string | null;
};

type ArtistGalleryItem = {
  id: number;
  type?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  createdAt?: string;
  contributorUserIds?: number[];
  contributors?: ArtistGalleryContributor[];
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
};

function useSavedCreatorPages() {
  const storageKey = "artist-page-favorites";
  const [savedIds, setSavedIds] = useState<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedIds(Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : []);
    } catch {
      setSavedIds([]);
    }
  }, []);

  const toggle = (userId: number) => {
    setSavedIds((current) => {
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  return { savedIds, toggle };
}

export default function ArtistProfile({ id }: { id: string }) {
  const { user: currentUser } = useAuth();
  const { setActiveIdentity } = useActiveIdentity();
  const { theme } = useTheme();
  const userId = Number(id);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isUploadingArtistImage, setIsUploadingArtistImage] = useState(false);
  const [requestedGalleryView, setRequestedGalleryView] = useState(() => (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "gallery"
  ));
  const [requestedInquiryOpen, setRequestedInquiryOpen] = useState(() => (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("inquiry") === "1"
  ));
  const [primarySurfaceOverride, setPrimarySurfaceOverride] = useState<"portfolio" | "updates" | "dossier" | "community" | null>(null);
  const [mobileTabOverride, setMobileTabOverride] = useState<"posts" | "gallery" | "about" | "trust" | "events" | "contact" | null>(null);
  const [trustView, setTrustView] = useState<"references" | "vouches" | "history" | "verified" | "safety">("references");
  const [collaborationCardView, setCollaborationCardView] = useState<"public" | "confirmed">("public");
  const [artistPostForm, setArtistPostForm] = useState({
    content: "",
    imageUrls: [] as string[],
    linkUrl: "",
    visibility: "public" as "public" | "friends" | "private",
  });
  const [form, setForm] = useState({
    message: "",
    eventType: "",
    eventDate: "",
    budget: "",
    projectDetails: "",
    timeframe: "",
    location: "",
  });
  const { savedIds, toggle } = useSavedCreatorPages();

  const { data: profile, isLoading, isError, refetch } = useGetUser(userId, {
    query: { queryKey: ["profile", userId], enabled: Number.isFinite(userId) },
  });

  const { data: events } = useGetEvents(undefined, {
    query: { queryKey: ["/api/events", "artist-page"], enabled: Number.isFinite(userId) },
  });
  const { data: sceneDirectory } = useGetGroups(
    { location: profile?.artistProfile?.location || profile?.user.city || profile?.user.location || undefined },
    {
      query: {
        queryKey: ["artist-scenes", userId, profile?.artistProfile?.location, profile?.user.city, profile?.user.location],
        enabled: Number.isFinite(userId),
      },
    },
  );
  const {
    data: artistPostsData,
    isLoading: isLoadingArtistPosts,
    isError: isArtistPostsError,
    refetch: refetchArtistPosts,
    fetchNextPage: fetchNextArtistPosts,
    hasNextPage: hasMoreArtistPosts,
    isFetchingNextPage: isFetchingNextArtistPosts,
  } = useInfiniteQuery({
    queryKey: ["/api/users", userId, "artist-posts"],
    enabled: Number.isFinite(userId),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetch(`/api/users/${userId}/artist-posts?cursor=${pageParam || ''}&limit=8`, {
        credentials: "include",
        signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch artist posts");
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  const isOwnArtistPage = currentUser?.id === userId;

  useEffect(() => {
    if (typeof document === "undefined" || !profile?.artistProfile) return;
    const artist = profile.artistProfile;
    const pageTitle = `${artist.displayName || artist.user.username} | HollywoodHeartbeats.com`;
    const pageDescription =
      artist.tagline
      || artist.bio
      || [artist.category, artist.location].filter(Boolean).join(" · ")
      || "Explore this artist page on HollywoodHeartbeats.com.";
    const pageUrl = window.location.href;
    const pageImage = artist.bannerUrl || artist.avatarUrl || `${window.location.origin}/opengraph.svg`;

    document.title = pageTitle;
    upsertMetaTag('meta[name="description"]', { name: "description", content: pageDescription });
    upsertMetaTag('meta[property="og:type"]', { property: "og:type", content: "profile" });
    upsertMetaTag('meta[property="og:title"]', { property: "og:title", content: pageTitle });
    upsertMetaTag('meta[property="og:description"]', { property: "og:description", content: pageDescription });
    upsertMetaTag('meta[property="og:url"]', { property: "og:url", content: pageUrl });
    upsertMetaTag('meta[property="og:image"]', { property: "og:image", content: pageImage });
    upsertMetaTag('meta[name="twitter:title"]', { name: "twitter:title", content: pageTitle });
    upsertMetaTag('meta[name="twitter:description"]', { name: "twitter:description", content: pageDescription });
    upsertMetaTag('meta[name="twitter:image"]', { name: "twitter:image", content: pageImage });
    upsertLinkTag('link[rel="canonical"]', { rel: "canonical", href: pageUrl });
  }, [profile, userId]);

  useEffect(() => {
    if (isOwnArtistPage) {
      setActiveIdentity("artist");
    }
  }, [isOwnArtistPage, setActiveIdentity]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncRequestedState = () => {
      const params = new URLSearchParams(window.location.search);
      setRequestedGalleryView(params.get("view") === "gallery");
      setRequestedInquiryOpen(params.get("inquiry") === "1");
    };
    syncRequestedState();
    window.addEventListener("popstate", syncRequestedState);
    return () => window.removeEventListener("popstate", syncRequestedState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setRequestedGalleryView(params.get("view") === "gallery");
    setRequestedInquiryOpen(params.get("inquiry") === "1");
  }, [location]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!requestedGalleryView) return;
    if (window.innerWidth < 768) return;

    const target = document.getElementById("artist-creator-gallery") || document.getElementById("artist-section-gallery");
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [requestedGalleryView, profile?.artistProfile?.id]);

  useEffect(() => {
    if (!requestedInquiryOpen) return;
    if (isOwnArtistPage) return;
    if (!profile?.canInteract) return;
    setOpen(true);
  }, [isOwnArtistPage, profile?.canInteract, requestedInquiryOpen]);

  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        setArtistPostForm({ content: "", imageUrls: [], linkUrl: "", visibility: "public" });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "posts", "artist"] });
        queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        toast({ title: "Creative update published" });
      },
      onError: () => {
        toast({ title: "Could not publish artist post", variant: "destructive" });
      },
    },
  });
  const inquiry = useSendInquiry({
    mutation: {
      onSuccess: (message) => {
        setOpen(false);
        setForm({ message: "", eventType: "", eventDate: "", budget: "", projectDetails: "", timeframe: "", location: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        toast({ title: "Inquiry sent", description: "The message was routed into direct messages." });
        refetch();
        if (message?.conversationId) setLocation(`/messages/${message.conversationId}`);
      },
    },
  });

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((event) => {
        const eventTime = new Date(event.startsAt).getTime();
        const linkedArtist = event.artists?.some((artist) => artist.id === userId);
        const isHost = event.host?.id === userId;
        return eventTime >= now && (linkedArtist || isHost);
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [events, userId]);

  const pastEvents = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((event) => {
        const eventTime = new Date(event.startsAt).getTime();
        const linkedArtist = event.artists?.some((artist) => artist.id === userId);
        const isHost = event.host?.id === userId;
        return eventTime < now && (linkedArtist || isHost);
      })
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .slice(0, 4);
  }, [events, userId]);
  const artistPosts = useMemo(
    () => artistPostsData?.pages.flatMap((page) => page.posts) || [],
    [artistPostsData],
  );
  const communityPosts = useMemo(
    () => artistPosts.filter((post) => post.userId !== userId || post.actorSurface !== "artist"),
    [artistPosts, userId],
  );
  const showcaseFolderState = useMemo(() => readMediaFolderState("showcase", userId), [userId]);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (isError) return <div className="mx-auto max-w-6xl px-4 py-8"><QueryErrorState title="Could not load profile" description="The creator profile request failed. Check the API and retry." onRetry={() => refetch()} /></div>;
  if (!profile?.artistProfile) return <div className="p-8">Artist profile not found.</div>;

  const creator = profile.creatorSettings;
  const artist = profile.artistProfile;
  const publicCustomFields = filterPublicCustomFields(artist.customFields);
  const collaborationCardDetails = extractCollaborationCard(artist.customFields);
  const actionType = creator?.primaryActionType || "contact";
  const actionLabel = creator?.primaryActionLabel || "Reach Out";
  const actionMeta = ACTION_HELPERS[actionType] || ACTION_HELPERS.contact;
  const closeInquiryIntent = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("inquiry")) return;
    params.delete("inquiry");
    const nextQuery = params.toString();
    setLocation(`/artists/${userId}${nextQuery ? `?${nextQuery}` : ""}`);
  };
  const accent = creator?.accentColor || profile.user.accentColor || "#8b5cf6";
  const moodPreset = creator?.moodPreset || "sleek";
  const layoutTemplate = creator?.layoutTemplate || "portfolio";
  const fontPreset = creator?.fontPreset || "modern";
  const backgroundStyle = creator?.backgroundStyle || "soft-glow";
  const lightThemeVariant = creator?.lightThemeVariant || "studio";
  const enabledModules = creator?.enabledModules?.length ? creator.enabledModules : DEFAULT_MODULE_ORDER;
  const moduleOrder = (creator?.moduleOrder?.length ? creator.moduleOrder : DEFAULT_MODULE_ORDER).filter((item) => enabledModules.includes(item));
  const sectionConfigs = (creator?.sectionConfigs || {}) as Record<string, SectionConfig>;
  const builderMeta = readCreatorBuilderMeta(sectionConfigs as Record<string, unknown>, {
    enabledModules,
    moduleOrder,
    featuredType: creator?.featuredType,
    featuredUrl: creator?.featuredUrl,
    linkCount: (creator?.linkItems || []).length,
    hasImages: (artist.gallery || []).some((item) => item.type === "image"),
    hasVideos: (artist.gallery || []).some((item) => item.type === "video"),
    hasAudio: (artist.gallery || []).some((item) => item.type === "audio"),
  });
  const saved = savedIds.includes(userId);
  const getGalleryEffectiveType = (item: { type?: string | null; url?: string | null }) => {
    const inferred = getEmbedDescriptor(item.url);
    if (inferred?.kind === "audio") return "audio";
    if (inferred?.kind === "video") return "video";
    return item.type || "image";
  };
  const gallery = ((artist.gallery || []) as ArtistGalleryItem[]).map((item) => ({
    ...item,
    effectiveType: getGalleryEffectiveType(item),
  }));
  const imageGallery = gallery.filter((item) => item.effectiveType === "image");
  const videoGallery = gallery.filter((item) => item.effectiveType === "video");
  const audioGallery = gallery.filter((item) => item.effectiveType === "audio");
  const capabilityFlags = [
    artist.openForCommissions ? "Open for commissions" : null,
    artist.touring ? "Touring" : null,
    artist.acceptsCollaborations ? "Accepts collaborations" : null,
  ].filter(Boolean) as string[];
  const linkItems = creator?.linkItems || [];
  const serviceItems = creator?.serviceItems || [];
  const pricingSummary = creator?.pricingSummary || null;
  const turnaroundInfo = creator?.turnaroundInfo || null;
  const storeLinks = linkItems.filter((link) => /shop|store/i.test(link.label) || /shop|store/i.test(link.url) || link.kind === "shop" || link.kind === "store");
  const generalLinks = linkItems.filter((link) => !( /shop|store/i.test(link.label) || /shop|store/i.test(link.url) || link.kind === "shop" || link.kind === "store"));
  const allShowcaseLinks = [
    ...(creator?.primaryActionUrl && (actionType === "shop" || actionType === "store")
      ? [{ id: "primary-action", label: actionLabel, url: creator.primaryActionUrl, kind: actionType }]
      : []),
    ...storeLinks,
    ...generalLinks,
  ];
  const mood = MOOD_STYLES[moodPreset] || MOOD_STYLES.sleek;
  const fontClass = FONT_PRESET_CLASSES[fontPreset] || "";
  const headingClass = fontPreset === "editorial"
    ? "font-serif tracking-tight"
    : fontPreset === "mono"
      ? "font-mono uppercase tracking-[0.08em]"
      : "";
  const heroTagline = artist.tagline || artist.bio || "Creator page";
  const artistPageName = artist.displayName || profile.user.username;
  const artistPageAvatar = artist.avatarUrl || null;
  const artistPageBanner = artist.bannerUrl || null;
  const heroActionsClass = layoutTemplate === "music"
    ? "xl:max-w-sm xl:flex-col xl:items-stretch"
    : layoutTemplate === "editorial"
      ? "xl:max-w-sm"
      : "xl:max-w-md xl:justify-end";
  const assignedHeroSliderImages = imageGallery.filter((item) => builderMeta.heroSliderItemIds?.includes(Number(item.id)));
  const heroSlides = assignedHeroSliderImages.map((item, index) => ({
    id: String(item.id || `hero-slide-${index}`),
    image: item.url,
    title: item.caption || artistPageName,
    subtitle: heroTagline,
  }));
  const assignedHeroImages = imageGallery.filter((item) => builderMeta.heroItemIds?.includes(Number(item.id)));
  const assignedHeroVideos = videoGallery.filter((item) => builderMeta.heroItemIds?.includes(Number(item.id)));
  const assignedGalleryImages = imageGallery.filter((item) => builderMeta.galleryItemIds?.includes(Number(item.id)));
  const assignedVideoPlaylistItems = videoGallery.filter((item) => builderMeta.videoItemIds?.includes(Number(item.id)));
  const assignedAudioItems = builderMeta.audioItemIds?.length
    ? audioGallery.filter((item) => builderMeta.audioItemIds?.includes(Number(item.id)))
    : audioGallery;
  const assignedFeaturedGalleryImages = imageGallery.filter((item) => builderMeta.featuredGalleryItemIds?.includes(Number(item.id)));
  const assignedFeaturedVideos = videoGallery.filter((item) => builderMeta.featuredVideoItemIds?.includes(Number(item.id)));
  const assignedFeaturedAudio = audioGallery.filter((item) => builderMeta.featuredAudioItemIds?.includes(Number(item.id)));
  const featuredEvent = upcomingEvents.find((event) => event.id === builderMeta.featuredEventId);
  const creatorInfoServices = serviceItems.map((service) => service.title).filter(Boolean);
  const creatorInfoBase = {
    name: artistPageName,
    title: artist.category || "Creator",
    turnaround: turnaroundInfo || undefined,
    services: creatorInfoServices.length ? creatorInfoServices : artist.tags,
    image: artistPageAvatar,
    bio: artist.bio || undefined,
  } as const;
  const aboutSidebarItems = [
    { label: "What they do", value: artist.category || artist.tagline || "Define the business offering." },
    creatorInfoServices.length ? { label: "Focus", value: creatorInfoServices.slice(0, 4).join(", ") } : null,
    artist.tags?.length ? { label: "Tags", value: artist.tags.slice(0, 5).join(", ") } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const mediaShowcaseItems = assignedGalleryImages.map((item) => ({
    id: String(item.id),
    title: item.caption || artistPageName,
    imageUrl: item.url,
    mediaUrl: item.url,
    description: item.caption || null,
  }));
  const videoPlaylistItems = assignedVideoPlaylistItems.map((item) => ({
    id: String(item.id),
    title: item.caption || "Video release",
    url: item.url,
    thumbnail: (item as { thumbnailUrl?: string | null }).thumbnailUrl || undefined,
  }));
  const heroVideoItems = assignedHeroVideos.map((item) => ({
    id: String(item.id),
    title: item.caption || "Hero video",
    url: item.url,
    thumbnail: (item as { thumbnailUrl?: string | null }).thumbnailUrl || undefined,
  }));
  const heroInfoTitle = builderMeta.heroInfoTitle?.trim() || "Creation description";
  const heroInfoDescription = builderMeta.heroInfoDescription?.trim() || artist.category || artist.tagline || "Describe the work, energy, and world this artist moves through.";
  const heroInfoPhone = builderMeta.heroInfoPhone?.trim() || "";
  const heroInfoLinks = (builderMeta.heroInfoLinks || []).filter((item) => item.label.trim() || item.url.trim()).slice(0, 3);
  const heroTags = String(artist.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  const heroInfoServices = capabilityFlags.length ? capabilityFlags : heroTags;
  const yearsActive = (() => {
    const createdAt = profile.user.createdAt ? new Date(profile.user.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return 1;
    const elapsedMs = Date.now() - createdAt.getTime();
    return Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 365.25)));
  })();
  const completedShoots = Math.max(
    pastEvents.length + Math.floor(artistPosts.length * 0.7),
    Math.floor(profile.user.postCount * 0.6),
  );
  const verifiedCollaborators = Math.max(
    profile.user.friendCount,
    Math.min(profile.user.followerCount, profile.user.friendCount + pastEvents.length + Math.ceil(artistPosts.length / 4)),
  );
  const referenceCount = Math.max(2, Math.floor(verifiedCollaborators * 0.55));
  const vouchCount = Math.max(1, Math.floor(profile.user.followerCount * 0.18) + Math.floor(profile.user.friendCount * 0.4));
  const endorsementCount = Math.max(1, Math.floor((heroTags.length + verifiedCollaborators) / 3));
  const collaborationHistoryCount = Math.max(
    pastEvents.length + Math.floor(artistPosts.length / 2),
    verifiedCollaborators,
  );
  const recommendationStatus = verifiedCollaborators >= 12 || vouchCount >= 10 ? "Frequently recommended" : "Building recommendations";
  const trustMetrics = [
    { label: "Completed shoots", value: completedShoots, helper: "Derived from posts, event history, and visible work." },
    { label: "Verified collaborators", value: verifiedCollaborators, helper: "First-pass collaborator count until formal verification launches." },
    { label: "Years active", value: yearsActive, helper: "Based on account activity age." },
  ];
  const trustLedger = [
    { label: "References", value: referenceCount, helper: "Past collaborators who can speak to professionalism and delivery." },
    { label: "Vouches", value: vouchCount, helper: "Community recommendations attached to your profile reputation." },
    { label: "Collaboration history", value: collaborationHistoryCount, helper: "Creative work history across shoots, projects, and scene work." },
    { label: "Verified shoots", value: completedShoots, helper: "Reserved for approved or confirmed productions in the next backend phase." },
    { label: "Endorsements", value: endorsementCount, helper: "Skill-based signals from trusted collaborators and repeat creatives." },
  ];
  const referenceEntries = [
    {
      name: "Repeat collaborator",
      role: "Photographer / lead creative",
      note: "Reliable on set, communicative before call time, and easy to build with under deadline.",
    },
    {
      name: "Production partner",
      role: "Styling / production support",
      note: "Shows up prepared, contributes ideas quickly, and keeps the energy professional through the full shoot.",
    },
    {
      name: "Creative referral",
      role: artist.category || "Creative professional",
      note: "Would confidently recommend for editorials, tests, and concept-driven collaborations.",
    },
  ];
  const vouchEntries = [
    {
      label: "Frequently recommended",
      detail: `${vouchCount} active vouches surfaced from repeat collaborators and audience trust.`,
    },
    {
      label: "Endorsed specialties",
      detail: heroTags.length ? heroTags.slice(0, 4).join(" · ") : "Editorial · Beauty · Studio · Collaboration-ready",
    },
    {
      label: "Return-work signal",
      detail: `${Math.max(1, Math.floor(referenceCount / 2))} collaborators appear to have worked together more than once.`,
    },
  ];
  const collaborationEntries = [
    {
      title: "Completed shoot history",
      detail: `${completedShoots} completed shoots represented through visible posts and past appearances.`,
    },
    {
      title: "Verified collaborator network",
      detail: `${verifiedCollaborators} collaborators connected through friend graph, shared activity, and scene overlap.`,
    },
    {
      title: "Project continuity",
      detail: `${collaborationHistoryCount} collaboration signals across posts, event appearances, and community links.`,
    },
  ];
  const verifiedShootEntries = pastEvents.length
    ? pastEvents.slice(0, 3).map((event) => ({
        title: event.title,
        detail: `${new Date(event.startsAt).toLocaleDateString()} · ${event.location || "Location pending"}`,
      }))
    : [
        { title: "Verification pipeline placeholder", detail: "Verified shoots will list approved productions, linked teams, and confirmation state here." },
      ];
  const safetyEntries = [
    { label: "Safety verification", detail: "Pending backend verification flow. Surface reserved for trust-reviewed safety state." },
    { label: "Professional conduct", detail: "References and vouches will roll into future moderation-aware reputation signals." },
    { label: "Collaboration readiness", detail: profile.canInteract ? "Profile is open to contact and visible collaboration requests." : "Direct interaction is currently restricted on this profile." },
  ];
  const collaborationRoles = [
    { role: "Lead creative", name: collaborationCardDetails.leadRole || artist.displayName || artistPageName, helper: artist.category || "Creative professional" },
    { role: "Support roles", name: collaborationCardDetails.supportRoles || (heroTags.length ? heroTags.slice(0, 3).join(", ") : "Styling, makeup, retouching, production as needed"), helper: "Core collaborators usually involved in the work" },
    { role: "Booking contact", name: collaborationCardDetails.bookingContact || artist.bookingEmail || "Shared on request", helper: "Moves to direct production coordination after fit is confirmed" },
  ];
  const collaborationCompensationType = pricingSummary ? "Paid" : artist.openForCommissions ? "Paid / commission" : "Trade / to be agreed";
  const collaborationCompensationChips = [
    collaborationCardDetails.compensationType || collaborationCompensationType,
    artist.openForCommissions ? "Open to paid bookings" : "Selective collaborations",
    turnaroundInfo ? `Turnaround: ${turnaroundInfo}` : "Timing to confirm",
  ];
  const collaborationCardItems = [
    { label: "Who", value: collaborationCardDetails.who || artist.displayName || artistPageName, helper: artist.category || "Creative professional" },
    { label: "Where", value: collaborationCardDetails.where || artist.location || profile.user.city || profile.user.location || "Location to confirm", helper: "Shoot base or travel context" },
    { label: "References", value: collaborationCardDetails.references || `${referenceCount} visible references`, helper: "Trust layer and collaborator history" },
    { label: "Concept", value: collaborationCardDetails.concept || heroTagline || "Concept to define", helper: "Creative direction or project brief" },
    { label: "Compensation", value: collaborationCardDetails.compensation || pricingSummary || collaborationCompensationType, helper: "Rates, trade, or paid production" },
    { label: "Call time", value: collaborationCardDetails.callTime || (upcomingEvents[0] ? new Date(upcomingEvents[0].startsAt).toLocaleString() : "To be confirmed"), helper: "Shared publicly only when the timing can be stated clearly" },
    { label: "Duration", value: collaborationCardDetails.duration || turnaroundInfo || "Half-day / full-day to confirm", helper: "Shoot length or expected production window" },
  ];
  const privateCoordinationItems = [
    { label: "Emergency contact option", value: collaborationCardDetails.emergencyContactOption || "Shared after confirmation", helper: "Private coordination field for confirmed productions only" },
    { label: "Call time", value: collaborationCardDetails.callTime || (upcomingEvents[0] ? new Date(upcomingEvents[0].startsAt).toLocaleString() : "To be confirmed"), helper: "Final call time appears once the collaboration is confirmed" },
    { label: "Compensation type", value: collaborationCardDetails.compensationType || collaborationCompensationType, helper: "Displayed as a private planning confirmation when needed" },
  ];
  const friendPlaceholderImages = [
    artistPageAvatar,
    ...imageGallery.slice(0, 9).map((item) => item.url),
  ].filter(Boolean) as string[];
  const friendPlacementCards = Array.from({ length: FRIEND_PLACEHOLDER_COUNT }, (_, index) => ({
    id: `friend-slot-${index}`,
    name: index < profile.user.friendCount ? `Friend ${index + 1}` : `Open spot ${index + 1}`,
    subtitle: index < profile.user.friendCount ? "In network" : "Future collaborator",
    imageUrl: friendPlaceholderImages[index % friendPlaceholderImages.length] || null,
  }));
  const profileSceneCards = (() => {
    const categoryNeedle = (artist.category || "").toLowerCase();
    const locationNeedles = [artist.location, profile.user.city, profile.user.location]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const tagNeedles = (artist.tags || []).map((tag: string) => tag.toLowerCase());

    return (sceneDirectory || [])
      .map((scene) => {
        const sceneTags = (scene.tags || []).map((tag) => tag.toLowerCase());
        const isExplicitMember = scene.ownerId === userId || scene.membersPreview?.some((member) => member.id === userId);
        const categoryMatch = categoryNeedle && (
          (scene.category || "").toLowerCase().includes(categoryNeedle) ||
          categoryNeedle.includes((scene.category || "").toLowerCase())
        );
        const locationMatch = locationNeedles.some((needle) => needle && (scene.location || "").toLowerCase().includes(needle));
        const overlappingTags = sceneTags.filter((tag) => tagNeedles.includes(tag));
        const score = (isExplicitMember ? 6 : 0) + (categoryMatch ? 3 : 0) + (locationMatch ? 2 : 0) + Math.min(overlappingTags.length, 3);
        if (!score) return null;
        return {
          id: scene.id,
          name: scene.name,
          reason: isExplicitMember ? "Visible scene membership" : categoryMatch ? "Role-aligned scene" : locationMatch ? "Local scene match" : "Shared specialty tags",
          subtitle: [scene.category, scene.location].filter(Boolean).join(" · ") || "Scene forum",
          memberCount: scene.memberCount,
          postCount: scene.postCount,
          isExplicitMember,
          score,
        };
      })
      .filter(Boolean)
      .sort((left, right) => (right?.score || 0) - (left?.score || 0))
      .slice(0, 4) as Array<{
        id: number;
        name: string;
        reason: string;
        subtitle: string;
        memberCount: number;
        postCount: number;
        isExplicitMember: boolean;
        score: number;
      }>;
  })();
  const heroMediaGalleryItems = assignedHeroImages.map((item) => ({
    id: String(item.id),
    title: item.caption || artistPageName,
    imageUrl: item.url,
    mediaUrl: item.url,
    description: item.caption || null,
  }));
  const fallbackHeroGalleryItems = [
    ...heroMediaGalleryItems,
    ...assignedFeaturedGalleryImages.map((item) => ({
      id: `featured-${item.id}`,
      title: item.caption || artistPageName,
      imageUrl: item.url,
      mediaUrl: item.url,
      description: item.caption || null,
    })),
    ...assignedGalleryImages.map((item) => ({
      id: `gallery-${item.id}`,
      title: item.caption || artistPageName,
      imageUrl: item.url,
      mediaUrl: item.url,
      description: item.caption || null,
    })),
  ].filter((item, index, items) => item.imageUrl && items.findIndex((candidate) => candidate.imageUrl === item.imageUrl) === index).slice(0, 3);
  const audioShowcaseTracks = assignedAudioItems.map((item) => ({
    id: String(item.id),
    title: item.caption || "Audio release",
    url: item.url,
  }));
  const eventShowcaseItems = upcomingEvents.map((event) => ({
    id: String(event.id),
    title: event.title,
    startsAt: event.startsAt,
    location: event.location,
    city: event.city || undefined,
    description: event.description || null,
    imageUrl: event.imageUrl || undefined,
    tags: event.lineupTags || undefined,
    linkedArtistsCount: event.artists?.length || 0,
  }));
  const featuredGalleryItems = assignedFeaturedGalleryImages.map((item) => ({
    id: String(item.id),
    title: item.caption || artistPageName,
    imageUrl: item.url,
    mediaUrl: item.url,
    description: item.caption || null,
  }));
  const featuredVideoItems = assignedFeaturedVideos.map((item) => ({
    id: String(item.id),
    title: item.caption || "Featured video",
    url: item.url,
    thumbnail: (item as { thumbnailUrl?: string | null }).thumbnailUrl || undefined,
  }));
  const featuredAudioTracks = assignedFeaturedAudio.map((item) => ({
    id: String(item.id),
    title: item.caption || "Featured track",
    url: item.url,
  }));
  const featuredEventItems = featuredEvent ? [{
    id: String(featuredEvent.id),
    title: featuredEvent.title,
    startsAt: featuredEvent.startsAt,
    location: featuredEvent.location || undefined,
    city: featuredEvent.city || undefined,
    description: featuredEvent.description || null,
    imageUrl: featuredEvent.imageUrl || undefined,
    tags: featuredEvent.lineupTags || undefined,
    linkedArtistsCount: featuredEvent.artists?.length || 0,
  }] : [];
  const featuredType = creator?.featuredContent?.type || null;
  const featuredTitle = creator?.featuredContent?.title || creator?.featuredTitle || null;
  const featuredDescription = creator?.featuredContent?.description || creator?.featuredDescription || null;
  const featuredUrl = creator?.featuredContent?.url || creator?.featuredUrl || null;
  const featuredEmbed = featuredUrl ? getEmbedDescriptor(featuredUrl) : null;
  const effectiveFeaturedType =
    featuredType && featuredType !== "highlight"
      ? featuredType
      : featuredEmbed?.kind === "video"
        ? "video"
        : featuredEmbed?.kind === "audio"
          ? "track"
          : featuredType;
  const featuredLinkItems = featuredUrl
    ? [{ id: "featured-link", label: featuredTitle || actionLabel || "Featured link", url: featuredUrl, kind: featuredType || "link" }]
    : [];
  const groupedAssignedGalleryImages = groupItemsByFolder(
    assignedGalleryImages,
    (item) => String(item.id),
    showcaseFolderState.assignments,
  );
  const groupedCreatorGalleryImages = groupItemsByFolder(
    imageGallery,
    (item) => String(item.id),
    showcaseFolderState.assignments,
  );

  const handleArtistImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploadingArtistImage(true);
    try {
      const uploadedItems = await Promise.all(Array.from(files).map((file) => uploadImage(file, "post")));
      setArtistPostForm((current) => ({
        ...current,
        imageUrls: [...current.imageUrls, ...uploadedItems.map((item) => item.url)],
      }));
      toast({ title: uploadedItems.length > 1 ? `${uploadedItems.length} artist images uploaded` : "Artist post image uploaded" });
    } catch (error) {
      toast({
        title: "Could not upload image",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploadingArtistImage(false);
    }
  };

  const submitArtistPost = () => {
    const linkMedia = artistPostForm.linkUrl.trim() ? getEmbedDescriptor(artistPostForm.linkUrl.trim()) : null;
    createPost.mutate({
      data: {
        content: artistPostForm.content.trim(),
        imageUrl: artistPostForm.imageUrls[0] || undefined,
        visibility: artistPostForm.visibility,
        actorSurface: "artist",
        media: [
          ...artistPostForm.imageUrls.map((url) => ({ type: "image", url })),
          linkMedia ? { type: linkMedia.kind, url: linkMedia.href, title: linkMedia.label } : null,
        ].filter(Boolean) as Array<{ type: string; url: string; title?: string }>,
      },
    });
  };
  const communityWorkedWithItems = [
    ...profileSceneCards.slice(0, 3).map((scene) => scene.name),
    ...pastEvents.slice(0, 2).map((event) => event.title),
    ...generalLinks.slice(0, 2).map((link) => link.label),
  ].filter(Boolean).slice(0, 5);

  const handleFollowToggle = () => {
    const mutation = profile.isFollowing ? unfollow : follow;
    mutation.mutate(
      { userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
          queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "following"] });
          queryClient.invalidateQueries({ queryKey: ["feed"] });
          queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
      },
    );
  };

  const handleSaveToggle = () => {
    toggle(userId);
    toast({ title: saved ? "Removed from favorites" : "Saved creator page" });
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/artists/${userId}/share`
      : `/artists/${userId}/share`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: artistPageName, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      toast({ title: "Page shared", description: "Creator page link is ready to send." });
    } catch {
      toast({ title: "Could not share page", variant: "destructive" });
    }
  };

  const primaryActionKind = !isOwnArtistPage && profile.canInteract
    ? (creator?.primaryActionLabel ? "contact" : "follow")
    : null;
  const heroShellClass = cn(
    BACKGROUND_STYLE_CLASSES[backgroundStyle],
    theme === "light" && LIGHT_THEME_VARIANT_CLASSES[lightThemeVariant],
  );

  const getSectionPresentation = (sectionKey: string) => {
    const config = sectionConfigs[sectionKey] || {};
    const style = config.style || "default";
    const density = config.density || "comfortable";

    return {
      wrapperClassName: cn(
        "rounded-[2rem] transition-all",
        style === "default" && "border border-border/45 bg-background/28 p-4 md:p-5",
        style === "minimal" && "border border-border/30 bg-background/14 p-3 md:p-4",
        style === "highlighted" && "border border-primary/20 bg-primary/[0.045] p-4 shadow-[0_18px_60px_-42px_rgba(139,92,246,0.65)] md:p-6",
      ),
      contentClassName: cn(
        density === "compact" && "space-y-4 md:space-y-5",
        density === "comfortable" && "space-y-6 md:space-y-7",
        density === "expanded" && "space-y-8 md:space-y-10",
      ),
    };
  };

  const renderFeatured = () => {
    const featuredNode = creator?.pinnedPost ? (
      <FeedPostCard post={creator.pinnedPost} showAuthor={false} />
    ) : effectiveFeaturedType === "video" && (featuredVideoItems.length || featuredUrl || videoPlaylistItems.length) ? (
      <BuilderVideoPlaylist
        items={[
          ...featuredVideoItems,
          ...(featuredUrl && !featuredVideoItems.length
            ? [{
                id: "featured-video",
                title: featuredTitle || "Featured video",
                url: featuredUrl,
                thumbnail: mediaShowcaseItems[0]?.imageUrl || artistPageBanner || artistPageAvatar || undefined,
              }]
            : []),
          ...videoPlaylistItems,
        ]}
      />
    ) : (effectiveFeaturedType === "track" || effectiveFeaturedType === "audio") && (featuredAudioTracks.length || featuredUrl || audioShowcaseTracks.length) ? (
      <BuilderAudioPlayer
        tracks={[
          ...featuredAudioTracks,
          ...(featuredUrl && !featuredAudioTracks.length
            ? [{ id: "featured-track", title: featuredTitle || "Featured track", url: featuredUrl }]
            : []),
          ...audioShowcaseTracks,
        ]}
      />
    ) : effectiveFeaturedType === "gallery" && (featuredGalleryItems.length || mediaShowcaseItems.length) ? (
      <BuilderMediaGallery items={featuredGalleryItems.length ? featuredGalleryItems : mediaShowcaseItems} />
    ) : effectiveFeaturedType === "event" && (featuredEventItems.length || eventShowcaseItems.length) ? (
      <BuilderEventCarousel items={featuredEventItems.length ? featuredEventItems : eventShowcaseItems} />
    ) : (effectiveFeaturedType === "product" || effectiveFeaturedType === "link" || effectiveFeaturedType === "store" || effectiveFeaturedType === "shop") && featuredLinkItems.length ? (
      <BuilderLinksShowcase items={featuredLinkItems} />
    ) : null;

    if (!featuredNode) {
      return null;
    }

    return (
      <section className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-muted-foreground">
            <Pin className="h-4 w-4 text-primary" /> Featured
          </div>
          <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">
            {featuredTitle || "Lead with what matters most"}
          </h2>
          {featuredDescription ? <p className="max-w-3xl text-sm text-muted-foreground">{featuredDescription}</p> : null}
        </div>
        {featuredNode}
      </section>
    );
  };

  const workingCredits = [
    ...pastEvents.slice(0, 3).map((event) => ({
      label: event.title,
      value: `${new Date(event.startsAt).toLocaleDateString()} · ${event.location || "Location pending"}`,
    })),
    ...(publicCustomFields.slice(0, 3).map((field) => ({
      label: field.label,
      value: field.value,
    })) || []),
  ].slice(0, 6);
  const collaborationPreferenceItems = [
    artist.acceptsCollaborations ? "Open to collaborative shoots and editorials" : "Selective collaboration availability",
    artist.openForCommissions ? "Available for commissioned work" : "Commission status not listed",
    turnaroundInfo ? `Turnaround: ${turnaroundInfo}` : "Turnaround available on request",
    heroTags.length ? `Specialties: ${heroTags.slice(0, 4).join(", ")}` : "Specialties can be added through tags",
  ];
  const aboutContent = (
    <div className="space-y-6 rounded-[1.75rem] border border-border/50 bg-background/35 p-5 md:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Availability</div>
              <div className="mt-2 text-sm font-medium">{artist.availabilityStatus || "Availability on request"}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rates / booking</div>
              <div className="mt-2 text-sm font-medium">{pricingSummary || artist.bookingEmail || "Booking preferences on request"}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Collaboration preferences</div>
              <div className="mt-2 text-sm font-medium">{artist.acceptsCollaborations ? "Open to collaborative shoots and editorials" : "Selective collaboration availability"}</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Working base</div>
              <div className="mt-2 text-sm font-medium">{artist.location || profile.user.city || profile.user.location || "Location available on request"}</div>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-8 text-muted-foreground">
            {artist.bio || "No story added yet."}
          </p>

          {artist.influences && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Influences</div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
                {artist.influences}
              </div>
            </div>
          )}

          {publicCustomFields.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {publicCustomFields.map((field) => (
                <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{field.label}</div>
                  <div className="mt-1 text-sm">{field.value}</div>
                </div>
              ))}
            </div>
          )}

          {(serviceItems.length > 0 || pricingSummary || turnaroundInfo) && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Rates and booking preferences</div>
              <div className="grid gap-3 md:grid-cols-2">
                {serviceItems.slice(0, 4).map((service) => (
                  <div key={`${service.title}-${service.price ?? ""}`} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                    <div className="font-medium">{service.title}</div>
                    {service.description ? <div className="mt-1 text-sm text-muted-foreground">{service.description}</div> : null}
                    {(service.price || service.turnaround) ? <div className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{[service.price, service.turnaround].filter(Boolean).join(" / ")}</div> : null}
                  </div>
                ))}
                {pricingSummary ? (
                  <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pricing</div>
                    <div className="mt-1 text-sm font-medium">{pricingSummary}</div>
                  </div>
                ) : null}
                {turnaroundInfo ? (
                  <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Turnaround</div>
                    <div className="mt-1 text-sm font-medium">{turnaroundInfo}</div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {collaborationPreferenceItems.length ? (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Collaboration preferences</div>
              <div className="grid gap-3 md:grid-cols-2">
                {collaborationPreferenceItems.map((item) => (
                  <div key={item} className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground md:hidden">
                <div>{profile.user.username ? `@${profile.user.username}` : artist.category || "artist page"}</div>
                <div>{[artist.category, artist.location].filter(Boolean).join(" · ") || "artist page"}</div>
                <div>Member since {profile.user.createdAt ? new Date(profile.user.createdAt).getFullYear() : "2026"}</div>
              </div>
            </div>
          ) : null}

          {workingCredits.length ? (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Credits and history</div>
              <div className="grid gap-3 md:grid-cols-2">
                {workingCredits.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-sm font-medium">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(generalLinks.length || artist.bookingEmail) && (
            <div className="space-y-3">
              {artist.bookingEmail && (
                <div className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm">
                  Booking: <span className="text-muted-foreground">{artist.bookingEmail}</span>
                </div>
              )}
              {generalLinks.map((link) => (
                <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm transition-colors hover:border-primary/40">
                  <span className="inline-flex items-center"><Link2 className="mr-2 h-4 w-4 text-primary" /> {link.label}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
    </div>
  );

  const renderAbout = () => {
    // Check if About section has any meaningful content
    const hasAboutContent = artist.bio || artist.influences || publicCustomFields.length > 0 || serviceItems.length > 0 || pricingSummary || turnaroundInfo;

    if (!hasAboutContent) {
      return null;
    }

    return (
      <>
        <Card className="border-border/50 bg-card/60 md:hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Working Dossier</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setAboutOpen(true)}>Open</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What they do</div>
                <div className="mt-2 text-sm leading-6">{artist.category || artist.tagline || "Define the business offering."}</div>
              </div>
              {creatorInfoServices.length ? (
                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Focus</div>
                  <div className="mt-2 text-sm leading-6">{creatorInfoServices.slice(0, 4).join(", ")}</div>
                </div>
              ) : null}
            </div>
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
              {artist.bio || profile.user.bio || "No story added yet."}
            </p>
            {artist.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {artist.tags.slice(0, 4).map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto md:hidden">
            <DialogHeader>
              <DialogTitle>{artistPageName} dossier</DialogTitle>
            </DialogHeader>
            {aboutContent}
          </DialogContent>
        </Dialog>

        <section className="hidden space-y-4 md:block">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Working Dossier</h2>
            <p className="text-sm text-muted-foreground">Background, credits, availability, booking preferences, and collaboration context.</p>
          </div>
          {aboutContent}
        </section>
      </>
    );
  };

  const renderHeroRow = () => (
    <section className="grid gap-6 xl:gap-8 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.45fr)] lg:items-start">
      <div className="flex h-full flex-col gap-6">
        <div className="rounded-[2rem] border border-border/45 bg-background/28 p-5 md:p-6 xl:p-7">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <HeartHandshake className="h-4 w-4 text-primary" /> Trust Layer
                </div>
                <h3 className="text-xl font-semibold tracking-tight">Reputation beyond followers</h3>
                <p className="text-sm text-muted-foreground">
                  This first pass uses existing profile activity to preview references, vouches, collaboration history, and verification surfaces.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{recommendationStatus}</Badge>
                <Badge variant="outline">Safety verification pending</Badge>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {trustMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</div>
                  <div className="mt-2 text-3xl font-bold">{metric.value}</div>
                  <div className="mt-2 text-xs leading-5 text-muted-foreground">{metric.helper}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {trustLedger.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/50 bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.helper}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0">{item.value}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-border/45 bg-background/28">
          <CreatorInfoCard
            creator={{
              name: heroInfoTitle,
              title: artist.category || artist.tagline || "Creator",
              bio: heroInfoDescription,
              availabilityText: artist.availabilityStatus || undefined,
              turnaround: turnaroundInfo || undefined,
              location: artist.location || undefined,
              price: pricingSummary || undefined,
              phone: heroInfoPhone || undefined,
              email: artist.bookingEmail || undefined,
              links: heroInfoLinks,
              services: heroInfoServices,
            }}
            className="min-h-[22rem] rounded-[2rem] border-0 bg-transparent shadow-none md:min-h-[24rem] xl:min-h-[28rem]"
            showImage={false}
          />
        </div>
        <div className="rounded-[2rem] border border-border/45 bg-background/28 p-5 md:p-6 xl:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <Users className="h-4 w-4 text-primary" /> Scenes and Community
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Where this artist shows up</h3>
              <p className="text-sm text-muted-foreground">
                Scenes show where the work lives, who this artist moves around, and what communities keep turning up around the page.
              </p>
            </div>
            <Badge variant="secondary" className="w-fit shrink-0">
              {profileSceneCards.length} scene{profileSceneCards.length === 1 ? "" : "s"}
            </Badge>
          </div>
          {profileSceneCards.length ? (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {profileSceneCards.map((scene) => (
                <Link key={scene.id} href={`/groups/${scene.id}`}>
                  <div className="rounded-2xl border border-border/50 bg-background/40 p-4 transition-colors hover:border-primary/35">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{scene.name}</div>
                        <div className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-muted-foreground">{scene.subtitle}</div>
                      </div>
                      <Badge variant={scene.isExplicitMember ? "secondary" : "outline"} className="shrink-0">
                        {scene.isExplicitMember ? "Scene member" : "Scene match"}
                      </Badge>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">{scene.reason}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>{scene.memberCount} members</span>
                      <span>{scene.postCount} posts</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
              No strong scene links surfaced yet. As this artist joins scenes and drops into more threads, they will show up here.
            </div>
          )}
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {friendPlacementCards.slice(0, 4).map((friend, index) => (
              <div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/35 p-3">
                <Avatar className="h-11 w-11 border border-border/50">
                  <AvatarImage src={friend.imageUrl || ""} />
                  <AvatarFallback>{String(index + 1).padStart(2, "0")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{friend.name}</div>
                  <div className="truncate text-xs uppercase tracking-[0.14em] text-muted-foreground">{friend.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-border/45 bg-background/28">
        {builderMeta.heroMediaType === "video" ? (
          heroVideoItems.length ? (
            <BuilderVideoPlaylist items={heroVideoItems} />
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              No hero videos selected yet.
            </div>
          )
        ) : builderMeta.heroMediaType === "slider" ? (
          heroSlides.length ? (
            <CreatorHeroSlider
              slides={heroSlides}
              autoplay={false}
              className="min-h-[28rem]"
              contentClassName="min-h-[28rem]"
              overlayClassName="bg-gradient-to-t from-black/60 via-black/10 to-transparent"
            >
              <div className="absolute left-6 top-6 z-10 text-sm uppercase tracking-[0.22em] text-white/80">Hero slider</div>
            </CreatorHeroSlider>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              No hero slider images selected yet.
            </div>
          )
        ) : heroMediaGalleryItems.length ? (
          <div className="relative min-h-[28rem] w-full overflow-hidden bg-muted">
            <img
              src={heroMediaGalleryItems[0]?.imageUrl || heroMediaGalleryItems[0]?.mediaUrl || ""}
              alt={heroMediaGalleryItems[0]?.title || "Hero image"}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <div className="text-sm uppercase tracking-[0.22em] text-white/80">Hero media</div>
              <div className="mt-2 text-3xl font-semibold">{heroMediaGalleryItems[0]?.title || "Hero image"}</div>
            </div>
          </div>
        ) : fallbackHeroGalleryItems.length ? (
          <div className="grid min-h-[28rem] grid-cols-1 gap-2 bg-black/30 p-2 sm:grid-cols-[1.35fr_0.85fr]">
            <div className="relative min-h-[20rem] overflow-hidden rounded-[1.6rem]">
              <img
                src={fallbackHeroGalleryItems[0]?.imageUrl || fallbackHeroGalleryItems[0]?.mediaUrl || ""}
                alt={fallbackHeroGalleryItems[0]?.title || "Selected work"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/72">Selected work</div>
                <div className="mt-2 max-w-md text-3xl font-semibold">
                  {fallbackHeroGalleryItems[0]?.title || `${artistPageName} in frame`}
                </div>
                <div className="mt-2 text-sm text-white/72">
                  {artist.tagline || artist.category || "A living mix of recent frames, portfolio pulls, and public-facing visual identity."}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {fallbackHeroGalleryItems.slice(1).map((item, index) => (
                <div key={item.id} className="relative min-h-[9.5rem] overflow-hidden rounded-[1.35rem]">
                  <img
                    src={item.imageUrl || item.mediaUrl || ""}
                    alt={item.title || `Selected work ${index + 2}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/70">Portfolio pull</div>
                    <div className="mt-1 text-sm font-medium">{item.title || "Selected work"}</div>
                  </div>
                </div>
              ))}
              {fallbackHeroGalleryItems.length === 1 ? (
                <div className="flex min-h-[9.5rem] flex-col justify-end rounded-[1.35rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 text-white/82">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/62">Artist page</div>
                  <div className="mt-2 text-lg font-semibold">{artistPageName}</div>
                  <div className="mt-1 text-sm text-white/62">
                    Public work, trust signals, and recent updates all live in one place.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-[28rem] flex-col justify-end overflow-hidden bg-[linear-gradient(140deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6">
            {artist.bannerUrl ? (
              <>
                <img src={artist.bannerUrl} alt={artistPageName} className="absolute inset-0 h-full w-full object-cover opacity-45" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.09),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.14),transparent_32%)]" />
            )}
            <div className="relative z-10 max-w-lg text-white">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/66">Artist page</div>
              <div className="mt-3 text-3xl font-semibold">{artistPageName}</div>
              <div className="mt-3 text-sm text-white/70">
                Work can start from a single frame. This hero area will fill itself from banner art, featured images, and portfolio pulls as the page grows.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderMedia = () => {
    // Check if Media section has any content
    if (assignedGalleryImages.length === 0) {
      return null;
    }

    return (
      <div id="creator-gallery" className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Portfolio</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Selected work, gallery sets, and supporting media arranged as a living portfolio.
          </p>
          <div>
            <Link href={`/artists/${userId}?tab=photos`}>
              <Button variant="outline" size="sm">
                <ImageIcon className="mr-2 h-4 w-4" /> Open Profile Photos
              </Button>
            </Link>
          </div>
        </div>

      {assignedGalleryImages.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected Work</h3>
            <span className="text-xs text-muted-foreground">{assignedGalleryImages.length} items</span>
          </div>
          <PortfolioMosaic
            userId={userId}
            groups={groupedAssignedGalleryImages.map((group) => ({
              label: group.folder,
              items: group.items.map((item) => ({
                id: String(item.id),
                galleryItemId: Number(item.id),
                imageUrl: item.url,
                title: item.caption || artistPageName,
                caption: item.caption || null,
                meta: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null,
                likeCount: item.likeCount ?? 0,
                commentCount: item.commentCount ?? 0,
                isLiked: Boolean(item.isLiked),
                contributors: (item.contributors || []) as ArtistGalleryContributor[],
              })),
            }))}
            emptyMessage="No selected portfolio images yet."
          />
        </section>
      )}

      {assignedAudioItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Audio</h3>
            <span className="text-xs text-muted-foreground">{assignedAudioItems.length} items</span>
          </div>
          <BuilderAudioPlayer tracks={audioShowcaseTracks} />
        </section>
      )}
      </div>
    );
  };


  const renderLinks = () => {
    // Hide Links section if no links exist
    if (allShowcaseLinks.length === 0) {
      return null;
    }

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Links and Shop</h2>
          </div>
          <p className="text-sm text-muted-foreground">External destinations, merch, shop links, and portfolio paths.</p>
        </div>
        <BuilderLinksShowcase items={allShowcaseLinks.map((link, index) => ({
          id: `${link.label}-${index}`,
          label: link.label,
          url: link.url,
          kind: link.kind || null,
        }))} />
      </div>
    );
  };

  const renderPosts = () => (
    <div id="artist-section-posts" className="space-y-5">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Work log</div>
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Recent Work and Updates</h2>
        </div>
        <p className="text-sm text-muted-foreground">Working notes, shoot updates, moodboards, editorials, and casting-related activity.</p>
      </div>

      {isOwnArtistPage && (
        <section className="space-y-4 rounded-[1.75rem] border border-primary/35 bg-background/30 p-4 shadow-[0_18px_42px_-34px_rgba(124,58,237,0.58)] md:p-5">
          <div>
            <h3 className="text-lg font-semibold text-primary">Post from your profile</h3>
            <div className="mt-1 text-sm text-muted-foreground">
              Share a new update from your artist page. Casting calls and direct hire details live in inquiries and scene posts, not here.
            </div>
          </div>
          <div className="space-y-4">
            <Textarea
              placeholder="Share what you made, what happened on set, what inspired the work, or what you want people to see."
              value={artistPostForm.content}
              onChange={(e) => setArtistPostForm((current) => ({ ...current, content: e.target.value }))}
              className="min-h-32 rounded-[1.35rem] border-border/50 bg-background/22 text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-2 focus-visible:ring-primary/35"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Paste a link if the post points somewhere"
                value={artistPostForm.linkUrl}
                onChange={(e) => setArtistPostForm((current) => ({ ...current, linkUrl: e.target.value }))}
                className="rounded-[1.15rem] border-border/50 bg-background/22 text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-2 focus-visible:ring-primary/35"
              />
              <div className="flex items-center gap-3 rounded-[1.15rem] border border-border/50 bg-background/18 px-3 py-2.5 text-sm text-muted-foreground">
                <span className="shrink-0">Visibility</span>
                <select
                  value={artistPostForm.visibility}
                  onChange={(e) => setArtistPostForm((current) => ({ ...current, visibility: e.target.value as "public" | "friends" | "private" }))}
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends only</option>
                  <option value="private">Only me</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploadingArtistImage}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {artistPostForm.imageUrls.length ? "Add more images" : "Add images"}
                </Button>
                {artistPostForm.imageUrls.length ? (
                  <Badge variant="secondary">{artistPostForm.imageUrls.length} image{artistPostForm.imageUrls.length === 1 ? "" : "s"} attached</Badge>
                ) : null}
              </div>
              <Button
                onClick={submitArtistPost}
                disabled={createPost.isPending || isUploadingArtistImage || !(artistPostForm.content.trim() || artistPostForm.imageUrls.length || artistPostForm.linkUrl.trim())}
                className="w-full sm:w-auto"
              >
                Post to profile
              </Button>
            </div>
            {artistPostForm.imageUrls.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {artistPostForm.imageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative overflow-hidden rounded-[1rem] border border-border/50 bg-background/28">
                    <img src={url} alt={`Artist post upload ${index + 1}`} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                      onClick={() => setArtistPostForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((_, imageIndex) => imageIndex !== index) }))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleArtistImageUpload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </section>
      )}

      {!isOwnArtistPage && currentUser && (
        <WallPostComposer
          targetUserId={userId}
          targetUserName={artist.displayName || profile.user.username}
          onSuccess={() => refetchArtistPosts()}
        />
      )}

      {isLoadingArtistPosts ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : isArtistPostsError ? (
        <QueryErrorState title="Could not load profile posts" description="The profile loaded, but its post stream could not be fetched." onRetry={() => refetchArtistPosts()} />
      ) : artistPosts.length ? (
        <div className="space-y-4">
          {artistPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} showAuthor={false} />
          ))}
          <LoadMoreSentinel
            enabled={Boolean(hasMoreArtistPosts)}
            isLoading={isFetchingNextArtistPosts}
            onVisible={() => {
              if (hasMoreArtistPosts && !isFetchingNextArtistPosts) {
                fetchNextArtistPosts();
              }
            }}
          />
        </div>
      ) : (
        <Card className="border-dashed border-border/50 bg-card/40">
          <CardContent className="p-12 text-center text-muted-foreground">
            No artist-page posts yet.
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCommunity = () => (
    <section className="space-y-5 rounded-[2rem] border border-border/40 bg-background/18 p-5 md:p-7">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Community proof</div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Worked With and Page Notes</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The people, scenes, and public notes around this page. This is where collaboration history starts to feel real.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.5rem] border border-border/50 bg-background/30 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Worked with</div>
              <div className="mt-2 text-lg font-semibold">Creative circle</div>
            </div>
            <Badge variant="outline">{communityWorkedWithItems.length || referenceCount} names</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(communityWorkedWithItems.length ? communityWorkedWithItems : ["References available on request"]).map((item) => (
              <Badge key={item} variant="secondary" className="px-3 py-1 text-xs uppercase tracking-[0.12em]">
                {item}
              </Badge>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {friendPlacementCards.slice(0, 4).map((friend, index) => (
              <div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/35 p-3">
                <Avatar className="h-11 w-11 border border-border/50">
                  <AvatarImage src={friend.imageUrl || ""} />
                  <AvatarFallback>{String(index + 1).padStart(2, "0")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{friend.name}</div>
                  <div className="truncate text-xs uppercase tracking-[0.14em] text-muted-foreground">{friend.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-[1.5rem] border border-border/50 bg-background/30 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Page notes</div>
              <div className="mt-2 text-lg font-semibold">What others left here</div>
            </div>
            <Badge variant="outline">{communityPosts.length} visible</Badge>
          </div>
          {!isOwnArtistPage && currentUser ? (
            <WallPostComposer
              targetUserId={userId}
              targetUserName={artist.displayName || profile.user.username}
              onSuccess={() => refetchArtistPosts()}
            />
          ) : null}
          {communityPosts.length ? (
            <div className="space-y-4">
              {communityPosts.slice(0, 2).map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 bg-background/22 p-4 text-sm text-muted-foreground">
              No public notes on this page yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderEvents = () => {
    // Hide Events section if no events exist
    if (upcomingEvents.length === 0 && pastEvents.length === 0) {
      return null;
    }

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Events and Appearances</h2>
          </div>
          <p className="text-sm text-muted-foreground">Upcoming shows, past appearances, and linked lineups.</p>
        </div>

        {upcomingEvents.length ? (
          <BuilderEventCarousel items={eventShowcaseItems} />
        ) : null}

        {pastEvents.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Past Appearances</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {pastEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="rounded-2xl border border-border/50 bg-background/40 p-4 transition-colors hover:border-primary/40">
                    <div className="font-medium">{event.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {new Date(event.startsAt).toLocaleDateString()} / {event.location}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const renderVerifiedWork = () => {
    const hasVerifiedSurface = pastEvents.length > 0 || upcomingEvents.length > 0 || artistPosts.length > 0;
    if (!hasVerifiedSurface) {
      return null;
    }

    return (
      <section className="space-y-5 rounded-[2rem] border border-border/40 bg-background/18 p-5 md:p-7">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Proof of work</div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Verified Work</h2>
          </div>
          <p className="text-sm text-muted-foreground">Confirmed appearances, visible work history, and production-linked activity that supports credibility.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Completed shoots</div>
            <div className="mt-2 text-3xl font-bold">{completedShoots}</div>
            <div className="mt-2 text-sm text-muted-foreground">Derived from visible posts, linked appearances, and completed project activity.</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Verified collaborators</div>
            <div className="mt-2 text-3xl font-bold">{verifiedCollaborators}</div>
            <div className="mt-2 text-sm text-muted-foreground">Signals from repeat work, scene reputation, and the people who keep coming back.</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recent verified work</div>
            <div className="mt-2 text-3xl font-bold">{pastEvents.length}</div>
            <div className="mt-2 text-sm text-muted-foreground">Past appearances and verified work that give the page more weight than follower counts.</div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {verifiedShootEntries.map((entry) => (
            <div key={entry.title} className="rounded-2xl border border-border/50 bg-background/35 p-4">
              <div className="text-sm font-semibold">{entry.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">{entry.detail}</div>
            </div>
          ))}
          {pastEvents.slice(0, 2).map((event) => (
            <div key={`verified-${event.id}`} className="rounded-2xl border border-border/50 bg-background/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{event.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {new Date(event.startsAt).toLocaleDateString()} · {event.location || "Location pending"}
                  </div>
                </div>
                <Badge variant="secondary">Verified appearance</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {artist.category ? <Badge variant="outline">{artist.category}</Badge> : null}
                {artist.location ? <Badge variant="outline">{artist.location}</Badge> : null}
                {artist.acceptsCollaborations ? <Badge variant="outline">Collaboration-ready</Badge> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderContact = () => (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Contact and Action</h2>
        <p className="text-sm text-muted-foreground">The main way people can reach this page or take the next step.</p>
      </div>
      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-border/50 bg-background/28 p-5 md:p-6">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Pre-Shoot Collaboration Card</div>
            <h3 className="text-xl font-semibold tracking-tight">What should be clear before the shoot</h3>
            <p className="text-sm text-muted-foreground">A dossier-style prep card for collaborators to review before confirming a production.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCollaborationCardView("public")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                collaborationCardView === "public"
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/50 bg-background/35 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              Public preview
            </button>
            <button
              type="button"
              onClick={() => setCollaborationCardView("confirmed")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                collaborationCardView === "confirmed"
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/50 bg-background/35 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              Confirmed collaboration
            </button>
            {collaborationCompensationChips.map((chip) => (
              <Badge key={chip} variant="outline">{chip}</Badge>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {collaborationRoles.map((item) => (
              <div key={item.role} className="rounded-2xl border border-border/50 bg-background/35 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.role}</div>
                <div className="mt-2 text-sm font-medium">{item.name}</div>
                <div className="mt-2 text-xs text-muted-foreground">{item.helper}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {collaborationCardItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-sm font-medium">{item.value}</div>
                <div className="mt-2 text-xs text-muted-foreground">{item.helper}</div>
              </div>
            ))}
          </div>
          {collaborationCardView === "confirmed" ? (
            <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Private coordination</Badge>
                <Badge variant="outline">Only for confirmed collaborations</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {privateCoordinationItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-sm font-medium">{item.value}</div>
                    <div className="mt-2 text-xs text-muted-foreground">{item.helper}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border/50 bg-background/22 p-4 text-sm text-muted-foreground">
              Emergency contact details and private coordination only appear after a collaboration is confirmed.
            </div>
          )}
        </div>
        <CreatorInfoCard
          creator={{
            ...creatorInfoBase,
            bio: actionMeta.hint,
            ctaText: actionLabel,
            ctaHref: creator?.primaryActionUrl && (actionType === "shop" || actionType === "store")
              ? creator.primaryActionUrl
              : undefined,
          }}
          className="bg-background/35"
          compact
          showImage={false}
        />
        {artist.bookingEmail && (
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm">
            Contact email: <span className="text-muted-foreground">{artist.bookingEmail}</span>
          </div>
        )}
        {(pricingSummary || turnaroundInfo) && (
          <div className="grid gap-3 md:grid-cols-2">
            {pricingSummary ? (
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pricing</div>
                <div className="mt-1 text-sm font-medium">{pricingSummary}</div>
              </div>
            ) : null}
            {turnaroundInfo ? (
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Turnaround</div>
                <div className="mt-1 text-sm font-medium">{turnaroundInfo}</div>
              </div>
            ) : null}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setOpen(true)}>
            <Mail className="mr-2 h-4 w-4" /> {actionLabel}
          </Button>
          <Link href="/messages">
            <Button variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" /> Message
            </Button>
          </Link>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share Page
          </Button>
        </div>
      </div>
    </section>
  );

  const renderTrust = () => {
    const trustTabs = [
      { key: "references", label: "References" },
      { key: "vouches", label: "Vouches" },
      { key: "history", label: "Collaboration History" },
      { key: "verified", label: "Verified Shoots" },
      { key: "safety", label: "Safety" },
    ] as const;

    const trustPanels: Record<(typeof trustTabs)[number]["key"], ReactNode> = {
      references: (
        <div className="grid gap-3 md:grid-cols-3">
          {referenceEntries.map((entry) => (
            <div key={`${entry.name}-${entry.role}`} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-sm font-semibold">{entry.name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{entry.role}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.note}</p>
            </div>
          ))}
        </div>
      ),
      vouches: (
        <div className="grid gap-3 md:grid-cols-3">
          {vouchEntries.map((entry) => (
            <div key={entry.label} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-sm font-semibold">{entry.label}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.detail}</p>
            </div>
          ))}
        </div>
      ),
      history: (
        <div className="grid gap-3 md:grid-cols-3">
          {collaborationEntries.map((entry) => (
            <div key={entry.title} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-sm font-semibold">{entry.title}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.detail}</p>
            </div>
          ))}
        </div>
      ),
      verified: (
        <div className="grid gap-3 md:grid-cols-3">
          {verifiedShootEntries.map((entry) => (
            <div key={entry.title} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-sm font-semibold">{entry.title}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.detail}</p>
            </div>
          ))}
        </div>
      ),
      safety: (
        <div className="grid gap-3 md:grid-cols-3">
          {safetyEntries.map((entry) => (
            <div key={entry.label} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-sm font-semibold">{entry.label}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.detail}</p>
            </div>
          ))}
        </div>
      ),
    };

    return (
      <section className="space-y-5 rounded-[2rem] border border-border/40 bg-background/18 p-5 md:p-7">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Public trust layer</div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Trust and Reputation</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            References, vouches, collaboration history, verified shoots, and safety signals collected into one public trust layer.
          </p>
        </div>
        <div className="grid gap-2 overflow-x-auto md:grid-cols-5">
          {trustTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTrustView(tab.key)}
              className={cn(
                "min-w-[10rem] rounded-full border px-4 py-3 text-left text-sm font-medium transition-colors md:min-w-0",
                trustView === tab.key
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/50 bg-background/35 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="rounded-[1.75rem] border border-border/50 bg-background/28 p-5 md:p-6">
          {trustPanels[trustView]}
        </div>
      </section>
    );
  };

  const sections: Record<string, ReactNode> = {
    featured: renderFeatured(),
    about: renderAbout(),
    community: renderCommunity(),
    verified: renderVerifiedWork(),
    trust: renderTrust(),
    gallery: renderMedia(),
    video: assignedVideoPlaylistItems.length ? (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Video Playlist</h2>
          </div>
          <p className="text-sm text-muted-foreground">Embedded videos, reels, and moving-image work.</p>
        </div>
        <BuilderVideoPlaylist items={videoPlaylistItems} />
      </div>
    ) : null,
    audio: assignedAudioItems.length ? (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mic2 className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Audio Player</h2>
          </div>
          <p className="text-sm text-muted-foreground">Tracks, playlists, and audio releases.</p>
        </div>
        <BuilderAudioPlayer tracks={audioShowcaseTracks} />
      </div>
    ) : null,
    links: renderLinks(),
    posts: renderPosts(),
    events: renderEvents(),
    contact: renderContact(),
  };

  // Posts should always exist, but only once in the final section order.
  const baseVisibleSections = builderMeta.sections
    .filter((section) => section.visible && sections[section.key])
    .map((section) => section.key);
  const dedupedVisibleSections = Array.from(new Set([
    ...baseVisibleSections,
    ...(assignedAudioItems.length ? ["audio"] : []),
    "posts",
    "verified",
    "trust",
  ]));
  const sectionPriority = ["featured", "gallery", "video", "audio", "links", "verified", "posts", "community", "about", "trust", "events", "contact"];
  const visibleSections = [
    ...sectionPriority.filter((key) => dedupedVisibleSections.includes(key)),
    ...dedupedVisibleSections.filter((key) => !sectionPriority.includes(key)),
  ];
  const hhPracticeItems = creatorInfoServices.length
    ? creatorInfoServices.slice(0, 5)
    : heroTags.length
      ? heroTags.slice(0, 5)
      : [artist.category || "Creative practice", artist.location || "Based where the work happens"].filter(Boolean);
  const hhWorkedWithItems = communityWorkedWithItems;
  const hhStatsRow = [
    { label: "Portfolio", value: String(Math.max(assignedGalleryImages.length + assignedVideoPlaylistItems.length + assignedAudioItems.length, 1)) },
    { label: "Recent work", value: String(Math.max(artistPosts.length, 1)) },
    { label: "Scenes", value: String(Math.max(profileSceneCards.length, 1)) },
    { label: "Years active", value: String(Math.max(yearsActive, 1)) },
    { label: "References", value: String(referenceCount), accent: true },
    { label: "Contact", value: profile.canInteract ? "Open" : "Restricted" },
    { label: "Availability", value: artist.availabilityStatus || "Open", accent: Boolean(artist.availabilityStatus || artist.acceptsCollaborations) },
  ];
  const hhTrustStrip = [
    { label: "Identity", value: "Verified preview" },
    { label: "References", value: `${referenceCount} visible` },
    { label: "12-month activity", value: `${completedShoots} shoots · ${verifiedCollaborators} collaborators` },
    { label: "Code of conduct", value: profile.canInteract ? "Signed preview" : "Interaction restricted" },
    { label: "Vouched by", value: `${vouchCount} active vouches` },
  ];
  const hasPortfolioSurface = ["featured", "gallery", "video", "audio", "links", "verified"].some((key) => visibleSections.includes(key));
  const primarySurfaceSections = {
    portfolio: ["featured", "gallery", "video", "audio", "links", "verified"],
    updates: ["posts", "events"],
    dossier: ["about", "contact"],
    community: ["community", "trust"],
  } as const;
  type PrimarySurfaceKey = keyof typeof primarySurfaceSections;
  const primarySurfaceTabs = [
    { key: "updates" as const, label: "Updates", count: artistPosts.length },
    { key: "portfolio" as const, label: "Portfolio", count: assignedGalleryImages.length + assignedVideoPlaylistItems.length + assignedAudioItems.length },
    { key: "dossier" as const, label: "Dossier", count: null },
    { key: "community" as const, label: "Community", count: communityPosts.length + referenceCount },
  ].filter((tab) => primarySurfaceSections[tab.key].some((sectionKey) => visibleSections.includes(sectionKey)));
  const defaultPrimarySurface: PrimarySurfaceKey =
    requestedGalleryView && hasPortfolioSurface
      ? "portfolio"
      : artistPosts.length > 0 && primarySurfaceTabs.some((tab) => tab.key === "updates")
        ? "updates"
        : primarySurfaceTabs.some((tab) => tab.key === "portfolio")
        ? "portfolio"
        : (primarySurfaceTabs[0]?.key || "updates");
  const activePrimarySurface: PrimarySurfaceKey = primarySurfaceOverride && primarySurfaceTabs.some((tab) => tab.key === primarySurfaceOverride)
    ? primarySurfaceOverride
    : defaultPrimarySurface;
  const activeSurfaceSections = primarySurfaceSections[activePrimarySurface].filter((key) => visibleSections.includes(key));
  const scrollToArtistSection = (key: string) => {
    if (typeof document === "undefined") return;
    const target = document.getElementById(`artist-section-${key}`) || document.getElementById(`artist-mobile-panel-${key}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderCreatorGalleryTab = () => (
    <div id="artist-creator-gallery" className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Portfolio Archive</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          A full archive of portfolio images gathered in one place, separate from the featured page layout.
        </p>
      </div>
      <PortfolioMosaic
        userId={userId}
        groups={groupedCreatorGalleryImages.map((group) => ({
          label: group.folder,
          items: group.items.map((item) => ({
            id: String(item.id),
            galleryItemId: Number(item.id),
            imageUrl: item.url,
            title: item.caption || artistPageName,
            caption: item.caption || null,
            meta: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null,
            likeCount: item.likeCount ?? 0,
            commentCount: item.commentCount ?? 0,
            isLiked: Boolean(item.isLiked),
            contributors: (item.contributors || []) as ArtistGalleryContributor[],
          })),
        }))}
        emptyMessage="No artist page images yet."
      />
    </div>
  );

  const renderMobileHeroMediaPreview = () => {
    const previewItem = heroMediaGalleryItems[0] || fallbackHeroGalleryItems[0] || null;
    if (!previewItem) return null;

    return (
      <div className="overflow-hidden rounded-[1.55rem] border border-border/50 bg-background/24">
        <div className="relative h-[14rem] overflow-hidden">
          <img
            src={previewItem.imageUrl || previewItem.mediaUrl || ""}
            alt={previewItem.title || artistPageName}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/68">Selected work</div>
            <div className="mt-1 text-lg font-semibold">{previewItem.title || artistPageName}</div>
            <div className="mt-1 text-xs text-white/72">
              {artist.tagline || artist.category || "Portfolio pulls, recent frames, and the public visual world of this page."}
            </div>
          </div>
        </div>
      </div>
    );
  };
  const heroDisplayName = (artist.displayName || artistPageName).trim();
  const heroTitleParts = heroDisplayName.split(/\s+/).filter(Boolean);
  const heroPrimaryName = heroTitleParts[0] || heroDisplayName;
  const heroSecondaryName = heroTitleParts.length > 1 ? heroTitleParts.slice(1).join(" ") : "";

  const renderSectionBlock = (key: string) => {
    const { wrapperClassName, contentClassName } = getSectionPresentation(key);
    return (
      <div key={key} id={`artist-section-${key}`} className={wrapperClassName}>
        <div className={contentClassName}>{sections[key]}</div>
      </div>
    );
  };

  const mobileVisibleSections = activeSurfaceSections;
  const showHeroRowInActiveMobileTab = activePrimarySurface === "portfolio";

  return (
    <div className={cn("w-full pb-20", fontClass)}>
      <section className="border-b border-border/60">
        <div className="relative h-[9.25rem] overflow-hidden border-b border-border/40 md:h-[18rem]">
          {artistPageBanner ? (
            <img
              src={artistPageBanner}
              alt={`${artistPageName} top banner`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,17,0.12),rgba(6,8,17,0.56))]" />
        </div>

        <div className="mx-auto max-w-[92rem] px-4 pb-5 md:px-6 md:pb-8">
          <div className="grid gap-4 md:-mt-14 md:grid-cols-[7rem_1fr_auto] md:items-end md:gap-7">
            <Avatar className="relative -mt-9 h-20 w-20 border-4 border-background shadow-2xl md:h-28 md:w-28">
              <AvatarImage src={artistPageAvatar || ""} />
              <AvatarFallback>{artistPageName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="space-y-2.5 md:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-[2rem] leading-[0.95] tracking-[-0.03em] text-foreground sm:text-[2.35rem] md:text-[3.5rem]">
                  {heroPrimaryName}
                  {heroSecondaryName ? <span className="italic"> {heroSecondaryName}</span> : null}
                </h1>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">✓</span>
                {profile.user.profileType ? (
                  <Badge variant="outline" className="border-primary/30 bg-primary/8 uppercase tracking-[0.12em] text-primary">
                    {profile.user.profileType}
                  </Badge>
                ) : null}
              </div>
              <div className="hidden flex-wrap items-center gap-3 text-sm text-muted-foreground md:flex">
                <span><strong className="text-foreground">{artist.displayName || artistPageName}</strong>{profile.user.username ? ` · @${profile.user.username}` : ""}</span>
                {artist.category ? <span>· {artist.category}</span> : null}
                {artist.location ? <span>· {artist.location}</span> : null}
                <span>· Member since {profile.user.createdAt ? new Date(profile.user.createdAt).getFullYear() : "2026"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-end">
              {hasPortfolioSurface ? (
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-[1.1rem] border-primary/35 bg-background/20 px-4 md:w-auto"
                  onClick={() => {
                    setPrimarySurfaceOverride("portfolio");
                    setRequestedGalleryView(true);
                    setMobileTabOverride(null);
                  }}
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Open Portfolio
                </Button>
              ) : null}
              {isOwnArtistPage ? (
                <Link href="/settings?tab=creator">
                  <Button variant="outline" className="h-11 w-full rounded-[1.1rem] border-border/60 bg-background/20 px-4 md:w-auto">
                    <Palette className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                </Link>
              ) : (
                <>
                  {isOwnArtistPage ? (
                    <Button onClick={handleFollowToggle} disabled={!profile.canInteract} className="h-11 w-full rounded-[1.1rem] px-4 md:w-auto">
                      {profile.isFollowing ? "Following" : "Follow"}
                    </Button>
                  ) : null}
                  <Link href="/messages">
                    <Button variant="outline" className="h-11 w-full rounded-[1.1rem] border-border/60 bg-background/20 px-4 md:w-auto" disabled={!profile.canInteract}>
                      <MessageSquare className="mr-2 h-4 w-4" /> Message
                    </Button>
                  </Link>
                  {!isOwnArtistPage && primaryActionKind === "contact" ? (
                    creator?.primaryActionUrl && (actionType === "shop" || actionType === "store") ? (
                      <a href={creator.primaryActionUrl} target="_blank" rel="noreferrer">
                        <Button className="h-11 w-full rounded-[1.1rem] px-4 md:w-auto">
                          <ExternalLink className="mr-2 h-4 w-4" /> {actionLabel}
                        </Button>
                      </a>
                    ) : (
                      <Dialog
                        open={open}
                        onOpenChange={(nextOpen) => {
                          setOpen(nextOpen);
                          if (!nextOpen) closeInquiryIntent();
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full md:w-auto" disabled={!profile.canInteract}>{actionLabel} →</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{actionMeta.title}</DialogTitle>
                            <DialogDescription>{actionMeta.hint}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {actionMeta.fields.includes("eventType") && <div className="space-y-2"><Label>Event or project type</Label><Input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} /></div>}
                            {actionMeta.fields.includes("eventDate") && <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></div>}
                            {actionMeta.fields.includes("budget") && <div className="space-y-2"><Label>Budget</Label><Input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="$500 - $1500" /></div>}
                            {actionMeta.fields.includes("location") && <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City / venue / remote" /></div>}
                            {actionMeta.fields.includes("timeframe") && <div className="space-y-2"><Label>Timeframe</Label><Input value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })} placeholder="2 weeks / summer / open-ended" /></div>}
                            {actionMeta.fields.includes("projectDetails") && <div className="space-y-2"><Label>Project details</Label><Input value={form.projectDetails} onChange={(e) => setForm({ ...form, projectDetails: e.target.value })} /></div>}
                            <div className="space-y-2"><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="min-h-32" /></div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => inquiry.mutate({
                                recipientId: userId,
                                data: {
                                  inquiryType: actionType,
                                  eventType: form.eventType || undefined,
                                  eventDate: form.eventDate || undefined,
                                  budget: form.budget || undefined,
                                  projectDetails: [form.projectDetails, form.timeframe, form.location].filter(Boolean).join(" / ") || undefined,
                                  message: form.message,
                                },
                              })}
                              disabled={inquiry.isPending || !form.message.trim()}
                            >
                              <Mail className="mr-2 h-4 w-4" /> Send Inquiry
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-[1.1rem] border-border/60 bg-background/20">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {isOwnArtistPage ? (
                        <DropdownMenuItem asChild>
                          <Link href="/settings?tab=creator">
                            <Sparkles className="mr-2 h-4 w-4" /> Edit Profile
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={handleSaveToggle}>
                            <Heart className={cn("mr-2 h-4 w-4", saved && "fill-current")} /> {saved ? "Remove from saved" : "Save artist page"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleShare}>
                            <Share2 className="mr-2 h-4 w-4" /> Share page
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRequestedGalleryView(true);
                              setLocation(`/artists/${userId}?view=gallery`);
                            }}
                          >
                            <ImageIcon className="mr-2 h-4 w-4" /> Open gallery
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1">
                            {profile.canInteract ? <FriendActionButton userId={userId} friendship={profile.friendship} invalidateKeys={[["profile", userId], ["/api/users", userId]]} /> : null}
                          </div>
                          <div className="px-2 py-1">
                            <BlockActionButton userId={userId} blockState={profile.blockState} invalidateKeys={[["profile", userId], ["/api/users", userId]]} />
                          </div>
                          <div className="px-2 py-1">
                            <ReportDialog targetType="profile" targetId={profile.user.id} variant="outline" />
                          </div>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 border-y border-border/50 py-3.5 md:mt-6 md:grid-cols-7 md:gap-4 md:py-4">
            {hhStatsRow.map((item) => (
              <div key={item.label} className="rounded-[1rem] bg-background/18 p-3 md:rounded-none md:bg-transparent md:p-0 md:border-r md:border-border/30 md:pr-3 last:md:border-r-0">
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
                <div className={cn("mt-1 font-serif text-[1.2rem] leading-none tracking-[-0.02em] text-foreground md:text-[1.45rem]", item.accent && "italic text-primary")}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 py-4 md:grid-cols-[2fr_1fr_1fr] md:gap-10 md:py-6">
            <div>
              <p className="max-w-3xl font-serif text-[0.98rem] italic leading-7 text-foreground/90 md:text-[1.18rem]">
                {artist.bio || heroTagline}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {generalLinks.slice(0, 3).map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="hh-link">
                    {link.label} ↗
                  </a>
                ))}
                {pricingSummary ? <span>· Rate card on request</span> : null}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Practice</div>
              <ul className="mt-2 space-y-1.5 text-sm leading-7 text-foreground/90">
                {hhPracticeItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="hidden md:block">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Worked with</div>
              <ul className="mt-2 space-y-1.5 text-sm leading-7 text-foreground/90">
                {(hhWorkedWithItems.length ? hhWorkedWithItems : ["References available on request"]).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="grid gap-2 pb-4 md:grid-cols-5 md:pb-6">
            {hhTrustStrip.map((item) => (
              <div key={item.label} className="rounded-[1.2rem] border border-border/50 bg-background/16 px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-sm text-foreground/88">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="hidden items-center justify-between border-y border-border/50 py-3 md:flex">
            <div className="flex items-center gap-2">
              {primarySurfaceTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setPrimarySurfaceOverride(tab.key);
                    setRequestedGalleryView(tab.key === "portfolio");
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 border-b px-1 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                    activePrimarySurface === tab.key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-primary hover:text-foreground",
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null ? <span className="text-muted-foreground/70">{tab.count}</span> : null}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span>Sort: recent</span>
              <span className="h-4 w-px bg-border/50" />
              <span className="text-foreground">Mosaic</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 max-w-[88rem] px-4 sm:px-5 lg:px-8 md:mt-12">
        <div className="space-y-8 md:space-y-12 xl:space-y-14">
          <div className="space-y-4 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[1.35rem] border border-border/50 bg-background/35 p-3.5">
                <div className="text-xs text-muted-foreground">Completed shoots</div>
                <div className="mt-1 text-2xl font-bold">{completedShoots}</div>
              </div>
              <div className="rounded-[1.35rem] border border-border/50 bg-background/35 p-3.5">
                <div className="text-xs text-muted-foreground">Verified collaborators</div>
                <div className="mt-1 text-2xl font-bold">{verifiedCollaborators}</div>
              </div>
              <div className="rounded-[1.35rem] border border-border/50 bg-background/35 p-3.5">
                <div className="text-xs text-muted-foreground">Years active</div>
                <div className="mt-1 text-2xl font-bold">{yearsActive}</div>
              </div>
              <div className="rounded-[1.35rem] border border-border/50 bg-background/35 p-3.5">
                <div className="text-xs text-muted-foreground">Recommendation status</div>
                <div className="mt-1 text-sm font-semibold leading-6">{recommendationStatus}</div>
              </div>
            </div>
            {primarySurfaceTabs.length ? (
              <div className="overflow-x-auto rounded-[1.4rem] border border-border/50 bg-background/30 p-1.5" role="tablist" aria-label="Artist page sections">
                <div className="flex min-w-max items-center gap-1.5">
                  {primarySurfaceTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={activePrimarySurface === tab.key}
                      aria-controls={`artist-mobile-panel-${tab.key}`}
                      onClick={() => {
                        setPrimarySurfaceOverride(tab.key);
                        setRequestedGalleryView(tab.key === "portfolio");
                      }}
                      className={cn(
                        "rounded-[1.1rem] px-4 py-2.5 text-sm font-medium transition-colors",
                        activePrimarySurface === tab.key
                          ? "bg-primary/12 text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {showHeroRowInActiveMobileTab ? renderMobileHeroMediaPreview() : null}
            {currentUser?.id !== userId && !profile.canInteract ? (
              <div className="rounded-[1.25rem] border border-amber-500/25 bg-amber-500/8 px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-200/80">Interaction restricted</div>
                <div className="mt-1 text-sm leading-6 text-amber-100/90">
                  {profile.blockState?.hasBlockedUser
                    ? "You blocked this artist. Follow, messaging, and inquiry actions stay off until you unblock them."
                    : "This artist has blocked you. Follow, messaging, and inquiry actions are unavailable."}
                </div>
              </div>
            ) : null}
          </div>
          <div
            className="space-y-6 md:hidden"
            role="tabpanel"
            id={`artist-mobile-panel-${activePrimarySurface}`}
            aria-label={`${activePrimarySurface} section`}
          >
            {activePrimarySurface === "portfolio" ? (
              <>
                {requestedGalleryView ? renderCreatorGalleryTab() : null}
                {mobileVisibleSections.map((key) => renderSectionBlock(key))}
              </>
            ) : (
              mobileVisibleSections.map((key) => renderSectionBlock(key))
            )}
          </div>
          <div className="hidden space-y-8 md:space-y-10 md:block">
            {activePrimarySurface === "portfolio" && requestedGalleryView ? renderCreatorGalleryTab() : null}
            {activeSurfaceSections.map((key) => renderSectionBlock(key))}
          </div>
        </div>
      </div>
    </div>
  );
}
