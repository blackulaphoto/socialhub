import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarClock,
  CalendarRange,
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
  Video,
} from "lucide-react";
import {
  getUserPosts,
  useCreatePost,
  useFollowUser,
  useGetEvents,
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
import { CreatorHeroSlider } from "@/components/creator-page/creator-hero-slider";
import { CreatorInfoCard } from "@/components/creator-page/creator-info-card";
import { BuilderAudioPlayer } from "@/components/page-builder-blocks/builder-audio-player";
import { BuilderEventCarousel } from "@/components/page-builder-blocks/builder-event-carousel";
import { BuilderLinksShowcase } from "@/components/page-builder-blocks/builder-links-showcase";
import { BuilderMediaGallery } from "@/components/page-builder-blocks/builder-media-gallery";
import { BuilderVideoPlaylist } from "@/components/page-builder-blocks/builder-video-playlist";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MediaEmbed } from "@/components/media-embed";
import { QueryErrorState } from "@/components/query-error-state";
import { ReportDialog } from "@/components/report-dialog";
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

const DEFAULT_MODULE_ORDER = ["featured", "about", "media", "posts", "events", "contact"];
const BACKGROUND_STYLE_CLASSES: Record<string, string> = {
  "soft-glow": "",
  spotlight: "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_45%)] before:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_35%)] after:pointer-events-none",
  flat: "before:absolute before:inset-0 before:bg-black/5 before:pointer-events-none",
};

const LIGHT_THEME_VARIANT_CLASSES: Record<string, string> = {
  studio: "",
  paper: "light:[&_section]:border-slate-300/60 light:[&_section]:bg-white/85",
  gallery: "light:[&_section]:border-slate-200/70 light:[&_section]:bg-white/72",
};

type SectionConfig = {
  visible?: boolean;
  style?: string | null;
  density?: string | null;
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
  const { activeIdentity, setActiveIdentity } = useActiveIdentity();
  const { theme } = useTheme();
  const userId = Number(id);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isUploadingArtistImage, setIsUploadingArtistImage] = useState(false);
  const [artistPostForm, setArtistPostForm] = useState({
    content: "",
    imageUrl: "",
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
  const {
    data: artistPostsData,
    isLoading: isLoadingArtistPosts,
    isError: isArtistPostsError,
    refetch: refetchArtistPosts,
    fetchNextPage: fetchNextArtistPosts,
    hasNextPage: hasMoreArtistPosts,
    isFetchingNextPage: isFetchingNextArtistPosts,
  } = useInfiniteQuery({
    queryKey: ["/api/users", userId, "posts", "artist"],
    enabled: Number.isFinite(userId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => getUserPosts(userId, {
      cursor: pageParam,
      limit: 8,
      surface: "artist",
    }, { signal }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  const isOwnArtistPage = currentUser?.id === userId;

  useEffect(() => {
    if (isOwnArtistPage) {
      setActiveIdentity("artist");
    }
  }, [isOwnArtistPage, setActiveIdentity]);

  useEffect(() => {
    const rawSearch = typeof window !== "undefined" ? window.location.search : "";
    const view = new URLSearchParams(rawSearch).get("view");
    if (view === "gallery" && typeof document !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("creator-gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, []);

  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        setArtistPostForm({ content: "", imageUrl: "", linkUrl: "", visibility: "public" });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "posts", "artist"] });
        queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        toast({ title: "Artist page post published" });
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
  const showcaseFolderState = useMemo(() => readMediaFolderState("showcase", userId), [userId]);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (isError) return <div className="mx-auto max-w-6xl px-4 py-8"><QueryErrorState title="Could not load artist page" description="The artist profile request failed. Check the API and retry." onRetry={() => refetch()} /></div>;
  if (!profile?.artistProfile) return <div className="p-8">Artist profile not found.</div>;

  const creator = profile.creatorSettings;
  const artist = profile.artistProfile;
  const actionType = creator?.primaryActionType || "contact";
  const actionLabel = creator?.primaryActionLabel || "Contact Me";
  const actionMeta = ACTION_HELPERS[actionType] || ACTION_HELPERS.contact;
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
  const gallery = artist.gallery || [];
  const imageGallery = gallery.filter((item) => item.type === "image");
  const videoGallery = gallery.filter((item) => item.type === "video");
  const audioGallery = gallery.filter((item) => item.type === "audio");
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
  const heroSlides = [
    {
      id: "hero-banner",
      image: artistPageBanner || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80",
      title: artistPageName,
      subtitle: heroTagline,
    },
  ];
  const assignedHeroImages = imageGallery.filter((item) => builderMeta.heroItemIds?.includes(Number(item.id)));
  const assignedHeroVideos = videoGallery.filter((item) => builderMeta.heroItemIds?.includes(Number(item.id)));
  const assignedGalleryImages = imageGallery.filter((item) => builderMeta.galleryItemIds?.includes(Number(item.id)));
  const assignedVideoPlaylistItems = videoGallery.filter((item) => builderMeta.videoItemIds?.includes(Number(item.id)));
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
    thumbnail: item.url,
  }));
  const heroVideoItems = assignedHeroVideos.map((item) => ({
    id: String(item.id),
    title: item.caption || "Hero video",
    url: item.url,
    thumbnail: item.url,
  }));
  const heroMediaGalleryItems = assignedHeroImages.map((item) => ({
    id: String(item.id),
    title: item.caption || artistPageName,
    imageUrl: item.url,
    mediaUrl: item.url,
    description: item.caption || null,
  }));
  const audioShowcaseTracks = audioGallery.map((item) => ({
    id: String(item.id),
    title: item.caption || "Audio release",
    url: item.url,
  }));
  const eventShowcaseItems = upcomingEvents.map((event) => ({
    id: String(event.id),
    title: event.title,
    startsAt: event.startsAt,
    location: event.location,
    description: event.description || null,
  }));
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

  const handleArtistImageUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingArtistImage(true);
    try {
      const uploaded = await uploadImage(file, "post");
      setArtistPostForm((current) => ({ ...current, imageUrl: uploaded.url }));
      toast({ title: "Artist post image uploaded" });
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
        content: artistPostForm.content,
        imageUrl: artistPostForm.imageUrl || undefined,
        visibility: artistPostForm.visibility,
        actorSurface: "artist",
        media: [
          artistPostForm.imageUrl ? { type: "image", url: artistPostForm.imageUrl } : null,
          linkMedia ? { type: linkMedia.kind, url: linkMedia.href, title: linkMedia.label } : null,
        ].filter(Boolean) as Array<{ type: string; url: string; title?: string }>,
      },
    });
  };

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
    const url = typeof window !== "undefined" ? window.location.href : `/artists/${userId}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: profile.user.username, url });
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
    ) : effectiveFeaturedType === "video" && (featuredUrl || videoPlaylistItems.length) ? (
      <BuilderVideoPlaylist
        items={[
          ...(featuredUrl
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
    ) : (effectiveFeaturedType === "track" || effectiveFeaturedType === "audio") && (featuredUrl || audioShowcaseTracks.length) ? (
      <BuilderAudioPlayer
        tracks={[
          ...(featuredUrl
            ? [{ id: "featured-track", title: featuredTitle || "Featured track", url: featuredUrl }]
            : []),
          ...audioShowcaseTracks,
        ]}
      />
    ) : effectiveFeaturedType === "gallery" && mediaShowcaseItems.length ? (
      <BuilderMediaGallery items={mediaShowcaseItems} />
    ) : effectiveFeaturedType === "event" && eventShowcaseItems.length ? (
      <BuilderEventCarousel items={eventShowcaseItems} />
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

  const aboutContent = (
    <div className="space-y-6 rounded-[1.75rem] border border-border/50 bg-background/35 p-5 md:p-6">
          <p className="whitespace-pre-wrap text-[15px] leading-8 text-muted-foreground">
            {artist.bio || "No bio added yet."}
          </p>

          {artist.influences && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Influences</div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
                {artist.influences}
              </div>
            </div>
          )}

          {artist.customFields?.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {artist.customFields.map((field) => (
                <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{field.label}</div>
                  <div className="mt-1 text-sm">{field.value}</div>
                </div>
              ))}
            </div>
          )}

          {(serviceItems.length > 0 || pricingSummary || turnaroundInfo) && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Work Details</div>
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

  const renderAbout = () => (
    <>
      <Card className="border-border/50 bg-card/60 md:hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>About</CardTitle>
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
            {artist.bio || profile.user.bio || "No bio added yet."}
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
            <DialogTitle>About {artistPageName}</DialogTitle>
          </DialogHeader>
          {aboutContent}
        </DialogContent>
      </Dialog>

      <section className="hidden space-y-4 md:block">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">About</h2>
          <p className="text-sm text-muted-foreground">Background, influences, links, and working details.</p>
        </div>
        {aboutContent}
      </section>
    </>
  );

  const renderHeroRow = () => (
    <section className="grid gap-5 lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.5fr)] lg:items-stretch">
      <div className="rounded-[2rem] border border-border/45 bg-background/28 p-5 md:p-6">
        <div className="space-y-5">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">About</div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">What this creator does</h2>
          </div>
          <div className="space-y-4">
            {aboutSidebarItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-sm leading-6">{item.value}</div>
              </div>
            ))}
            {capabilityFlags.length > 0 ? (
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Working Style</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {capabilityFlags.map((flag) => <Badge key={flag} variant="secondary">{flag}</Badge>)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border/45 bg-background/28 p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Hero</div>
            <div className="mt-1 text-sm text-muted-foreground">Primary media section below the banner.</div>
          </div>
        </div>
        {builderMeta.heroMediaType === "video" ? (
          heroVideoItems.length ? (
            <BuilderVideoPlaylist items={heroVideoItems} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-6 text-sm text-muted-foreground">
              No hero videos selected yet.
            </div>
          )
        ) : heroMediaGalleryItems.length ? (
          <BuilderMediaGallery items={heroMediaGalleryItems} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-6 text-sm text-muted-foreground">
            No hero images selected yet.
          </div>
        )}
      </div>
    </section>
  );

  const renderMedia = () => (
    <div id="creator-gallery" className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Media</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Gallery, video, audio, and links collected in one cleaner showcase.
        </p>
        <div>
          <Link href={`/profile/${userId}?tab=photos`}>
            <Button variant="outline" size="sm">
              <ImageIcon className="mr-2 h-4 w-4" /> Open Profile Photos
            </Button>
          </Link>
        </div>
      </div>

      {assignedGalleryImages.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Image Gallery</h3>
            <span className="text-xs text-muted-foreground">{assignedGalleryImages.length} items</span>
          </div>
          {groupedAssignedGalleryImages.map((group) => (
            <div key={group.folder} className="space-y-3">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{group.folder}</div>
              <BuilderMediaGallery items={group.items.map((item) => ({
                id: String(item.id),
                title: item.caption || artistPageName,
                imageUrl: item.url,
                mediaUrl: item.url,
                description: item.caption || null,
              }))} />
            </div>
          ))}
        </section>
      )}

      {audioGallery.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Audio</h3>
            <span className="text-xs text-muted-foreground">{audioGallery.length} items</span>
          </div>
          <BuilderAudioPlayer tracks={audioShowcaseTracks} />
        </section>
      )}

      {!assignedGalleryImages.length && !audioGallery.length && (
        <Card className="border-dashed border-border/50 bg-card/40">
          <CardContent className="p-12 text-center text-muted-foreground">
            <ImageIcon className="mx-auto mb-3 h-10 w-10 opacity-25" />
            No media modules are turned on yet.
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderLinks = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Links and Shop</h2>
        </div>
        <p className="text-sm text-muted-foreground">External destinations, merch, shop links, and portfolio paths.</p>
      </div>
      {allShowcaseLinks.length ? (
        <BuilderLinksShowcase items={allShowcaseLinks.map((link, index) => ({
          id: `${link.label}-${index}`,
          label: link.label,
          url: link.url,
          kind: link.kind || null,
        }))} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-6 text-sm text-muted-foreground">
          No links or store destinations have been added yet.
        </div>
      )}
    </div>
  );

  const renderPosts = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Posts and Updates</h2>
        </div>
        <p className="text-sm text-muted-foreground">Artist-page announcements, drops, and public updates.</p>
      </div>

      {isOwnArtistPage && (
        <section className="space-y-4 rounded-[1.75rem] border border-border/50 bg-background/35 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Post as your artist page</h3>
              <div className="mt-1 text-sm text-muted-foreground">
                These posts stay on the creator page and publish with your artist-page identity.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeIdentity === "artist" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveIdentity("artist")}
              >
                Use Artist Page
              </Button>
              <Link href={`/profile/${userId}`}>
                <Button variant="ghost" size="sm" onClick={() => setActiveIdentity("personal")}>
                  Personal Profile
                </Button>
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <Textarea
              placeholder="Share a release, set update, gallery drop, booking note, or artist-page announcement..."
              value={artistPostForm.content}
              onChange={(e) => setArtistPostForm((current) => ({ ...current, content: e.target.value }))}
              className="min-h-32"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Paste a video, article, or music link"
                value={artistPostForm.linkUrl}
                onChange={(e) => setArtistPostForm((current) => ({ ...current, linkUrl: e.target.value }))}
              />
              <Input
                placeholder="Visibility: public, friends, or private"
                value={artistPostForm.visibility}
                readOnly
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploadingArtistImage}>
                <ImageIcon className="mr-2 h-4 w-4" />
                {artistPostForm.imageUrl ? "Replace image" : "Add image"}
              </Button>
              {artistPostForm.imageUrl ? (
                <Badge variant="secondary">Image attached</Badge>
              ) : null}
              <select
                value={artistPostForm.visibility}
                onChange={(e) => setArtistPostForm((current) => ({ ...current, visibility: e.target.value as "public" | "friends" | "private" }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="public">Public</option>
                <option value="friends">Friends only</option>
                <option value="private">Only me</option>
              </select>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleArtistImageUpload(e.target.files?.[0] || null)}
            />
            <div className="flex justify-end">
              <Button
                onClick={submitArtistPost}
                disabled={createPost.isPending || isUploadingArtistImage || !artistPostForm.content.trim()}
              >
                Post As Artist Page
              </Button>
            </div>
          </div>
        </section>
      )}

      {isLoadingArtistPosts ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : isArtistPostsError ? (
        <QueryErrorState title="Could not load artist posts" description="The artist page loaded, but its post stream could not be fetched." onRetry={() => refetchArtistPosts()} />
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

  const renderEvents = () => (
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
      ) : (
        <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-6 text-sm text-muted-foreground">
          No upcoming appearances linked yet.
        </div>
      )}

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

  const renderContact = () => (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight md:text-[2rem]">Contact and Action</h2>
        <p className="text-sm text-muted-foreground">The main way people can reach this page or take the next step.</p>
      </div>
      <div className="space-y-4">
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
            Booking email: <span className="text-muted-foreground">{artist.bookingEmail}</span>
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

  const sections: Record<string, ReactNode> = {
    featured: renderFeatured(),
    about: renderAbout(),
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
    audio: audioGallery.length ? (
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

  const visibleSections = builderMeta.sections.filter((section) => section.visible && sections[section.key]).map((section) => section.key);

  const renderSectionBlock = (key: string) => {
    const { wrapperClassName, contentClassName } = getSectionPresentation(key);
    return (
      <div key={key} className={wrapperClassName}>
        <div className={contentClassName}>{sections[key]}</div>
      </div>
    );
  };

  return (
    <div className={cn("w-full pb-20", fontClass)}>
      <section className={cn("relative overflow-hidden border-b border-border", heroShellClass)}>
        <CreatorHeroSlider
          slides={heroSlides}
          autoplay={false}
          className="min-h-[34rem]"
          contentClassName="min-h-[34rem]"
          overlayClassName={artistPageBanner ? "bg-gradient-to-t from-background/82 via-background/34 to-background/5" : "bg-gradient-to-t from-background via-background/78 to-background/18"}
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", mood.shell)} />
          <div className={cn("absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))]", mood.glow)} />
          <div className={cn("absolute inset-0", artistPageBanner ? "bg-black/12 dark:bg-black/20" : "bg-black/18 dark:bg-black/28")} />

          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-end px-4 py-12 md:py-16">
            <div className="w-full rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.9)] backdrop-blur-sm md:p-8">
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-5xl">
                    <div className="mb-5 flex flex-wrap gap-2" />
                    <div>
                      <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end">
                        <Avatar className="h-24 w-24 border-4 border-background/80 shadow-2xl md:h-32 md:w-32">
                          <AvatarImage src={artistPageAvatar || ""} />
                          <AvatarFallback>{artistPageName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h1 className={cn("text-4xl font-bold leading-none tracking-tight md:text-6xl", headingClass)}>{artistPageName}</h1>
                          <p className={cn("mt-5 max-w-3xl text-lg font-medium leading-8 text-foreground/95 md:text-[1.35rem]", layoutTemplate === "editorial" && "max-w-2xl text-xl", layoutTemplate === "music" && "text-xl")}>{heroTagline}</p>
                          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-foreground/78">
                            <span>{profile.user.followerCount} followers</span>
                            <span>{profile.user.followingCount} following</span>
                            <span>{upcomingEvents.length} upcoming events</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cn("flex flex-wrap items-center gap-2.5 md:gap-3", heroActionsClass)}>
                  {!currentUser?.hasArtistPage && (
                    <Link href="/settings?tab=creator">
                      <Button variant="outline" className="border-border/60 bg-background/30">
                        <Palette className="mr-2 h-4 w-4" /> Create Your Artist Page
                      </Button>
                    </Link>
                  )}
                  {primaryActionKind === "follow" ? (
                    <Button onClick={handleFollowToggle} disabled={!profile.canInteract} className="min-w-[8rem]">
                      {profile.isFollowing ? "Following" : "Follow"}
                    </Button>
                  ) : null}
                  {primaryActionKind === "contact" ? (
                    creator?.primaryActionUrl && (actionType === "shop" || actionType === "store") ? (
                      <a href={creator.primaryActionUrl} target="_blank" rel="noreferrer">
                        <Button className="min-w-[8rem]">
                          <ExternalLink className="mr-2 h-4 w-4" /> {actionLabel}
                        </Button>
                      </a>
                    ) : (
                      <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                          <Button className="min-w-[8rem]" disabled={!profile.canInteract}>
                            <CalendarClock className="mr-2 h-4 w-4" /> {actionLabel}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{actionMeta.title}</DialogTitle>
                            <DialogDescription>{actionMeta.hint}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {actionMeta.fields.includes("eventType") && (
                              <div className="space-y-2">
                                <Label>Event or project type</Label>
                                <Input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} />
                              </div>
                            )}
                            {actionMeta.fields.includes("eventDate") && (
                              <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                              </div>
                            )}
                            {actionMeta.fields.includes("budget") && (
                              <div className="space-y-2">
                                <Label>Budget</Label>
                                <Input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="$500 - $1500" />
                              </div>
                            )}
                            {actionMeta.fields.includes("location") && (
                              <div className="space-y-2">
                                <Label>Location</Label>
                                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City / venue / remote" />
                              </div>
                            )}
                            {actionMeta.fields.includes("timeframe") && (
                              <div className="space-y-2">
                                <Label>Timeframe</Label>
                                <Input value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })} placeholder="2 weeks / summer / open-ended" />
                              </div>
                            )}
                            {actionMeta.fields.includes("projectDetails") && (
                              <div className="space-y-2">
                                <Label>Project details</Label>
                                <Input value={form.projectDetails} onChange={(e) => setForm({ ...form, projectDetails: e.target.value })} />
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>Message</Label>
                              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="min-h-32" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() =>
                                inquiry.mutate({
                                  recipientId: userId,
                                  data: {
                                    inquiryType: actionType,
                                    eventType: form.eventType || undefined,
                                    eventDate: form.eventDate || undefined,
                                    budget: form.budget || undefined,
                                    projectDetails: [form.projectDetails, form.timeframe, form.location].filter(Boolean).join(" / ") || undefined,
                                    message: form.message,
                                  },
                                })
                              }
                              disabled={inquiry.isPending || !form.message.trim()}
                            >
                              <Mail className="mr-2 h-4 w-4" /> Send Inquiry
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )
                  ) : null}
                  {!isOwnArtistPage ? (
                    <Link href="/messages">
                      <Button variant="outline" className="border-border/60 bg-background/30" disabled={!profile.canInteract}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Message
                      </Button>
                    </Link>
                  ) : null}
                  <Button variant="outline" className="border-border/60 bg-background/30" onClick={() => setLocation(`/artists/${userId}?view=gallery`)}>
                    <ImageIcon className="mr-2 h-4 w-4" /> Gallery
                  </Button>
                  {!isOwnArtistPage ? (
                    <Button variant="outline" className="border-border/60 bg-background/30" onClick={handleSaveToggle}>
                      <Heart className={cn("mr-2 h-4 w-4", saved && "fill-current")} /> {saved ? "Saved" : "Save"}
                    </Button>
                  ) : null}
                  <Button variant="outline" className="border-border/60 bg-background/30" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="border-border/60 bg-background/30">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {isOwnArtistPage ? (
                        <>
                          {activeIdentity === "artist" ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href="/settings?tab=creator">
                                  <Sparkles className="mr-2 h-4 w-4" /> Edit Artist Page
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/profile/${profile.user.id}`} onClick={() => setActiveIdentity("personal")}>
                                  <MessageSquare className="mr-2 h-4 w-4" /> Switch To Personal Profile
                                </Link>
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem asChild>
                              <Link href={`/profile/${profile.user.id}`} onClick={() => setActiveIdentity("personal")}>
                                <MessageSquare className="mr-2 h-4 w-4" /> View Personal Profile
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </>
                      ) : (
                        <>
                          {primaryActionKind !== "follow" ? (
                            <DropdownMenuItem onClick={handleFollowToggle} disabled={!profile.canInteract}>
                              <Heart className="mr-2 h-4 w-4" /> {profile.isFollowing ? "Unfollow" : "Follow"}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem asChild>
                            <Link href={`/profile/${profile.user.id}`}>
                              <MessageSquare className="mr-2 h-4 w-4" /> View Personal Profile
                            </Link>
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
                  </div>
                </div>
                {currentUser?.id !== userId ? (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="inline-flex items-center rounded-full border border-border/40 bg-background/20 px-4 py-2 text-sm text-foreground/75">
                      <HeartHandshake className="mr-2 h-4 w-4 text-primary" />
                      {profile.user.friendCount} friends
                    </div>
                    {profile.canInteract ? <ProfileReactionBar userId={userId} summary={profile.profileReactions} invalidateKeys={[["profile", userId], ["/api/users", userId]]} /> : null}
                  </div>
                ) : null}
                {currentUser?.id !== userId && !profile.canInteract ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {profile.blockState?.hasBlockedUser
                      ? "You blocked this creator. Follow, messaging, and inquiry actions are disabled until you unblock them."
                      : "This creator has blocked you. Social actions and inquiries are unavailable."}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CreatorHeroSlider>
      </section>

      <div className="mx-auto mt-10 max-w-7xl px-4 md:mt-12">
        <div className="space-y-8 md:space-y-10">
          {renderHeroRow()}
          {visibleSections.map((key) => renderSectionBlock(key))}
        </div>
      </div>
    </div>
  );
}
