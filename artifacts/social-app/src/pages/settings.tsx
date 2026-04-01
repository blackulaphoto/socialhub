import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAddUserPhoto,
  GalleryItemRequestType,
  useAddGalleryItem,
  useDeleteUserPhoto,
  useDeleteGalleryItem,
  useGetEvents,
  useGetUser,
  useGetUserPosts,
  useGetUserPhotos,
  useUpdateArtistProfile,
  useUpdateCreatorSettings,
  useUpdateProfile,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MediaEmbed } from "@/components/media-embed";
import { BuilderEventCarousel } from "@/components/page-builder-blocks/builder-event-carousel";
import { BuilderLinksShowcase } from "@/components/page-builder-blocks/builder-links-showcase";
import { BuilderAudioPlayer } from "@/components/page-builder-blocks/builder-audio-player";
import { BuilderMediaGallery } from "@/components/page-builder-blocks/builder-media-gallery";
import { BuilderVideoPlaylist } from "@/components/page-builder-blocks/builder-video-playlist";
import { CreatorPageBuilder } from "@/components/creator-page-builder";
import { LocationInput } from "@/components/location-input";
import { useToast } from "@/hooks/use-toast";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { deriveLegacyModuleState, readCreatorBuilderMeta, writeCreatorBuilderMeta } from "@/lib/creator-page-builder";
import { getEmbedDescriptor } from "@/lib/embeds";
import { formatCityRegion, parseCityRegion } from "@/lib/locations";
import { groupItemsByFolder, readMediaFolderState, writeMediaFolderState } from "@/lib/media-folders";
import { uploadImage } from "@/lib/upload-image";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Image as ImageIcon, Loader2, Mic2, Plus, Trash2, UploadCloud, Video } from "lucide-react";

const ACTION_OPTIONS = [
  "Book Me",
  "Hire Me",
  "Contact Me",
  "Collaborate",
  "Shop My Work",
  "Visit Store",
  "Commission Me",
  "Custom",
];

const CREATOR_TYPES = [
  "Musician / Band / DJ",
  "Model",
  "Photographer",
  "Designer",
  "Painter",
  "Jewelry Maker",
  "Visual Artist",
  "General Creator",
];

const PAGE_ARCHETYPES = [
  {
    key: "musician",
    label: "Musician / DJ",
    category: "Musician / Band / DJ",
    cta: "Book Me",
    tagline: "Live sets, releases, upcoming nights, and collaborations.",
    descriptor: "Best for DJs, bands, producers, and performers.",
  },
  {
    key: "visual",
    label: "Visual Artist",
    category: "Visual Artist",
    cta: "Commission Me",
    tagline: "Original work, featured pieces, process, and commissions.",
    descriptor: "Best for painters, illustrators, and mixed-media artists.",
  },
  {
    key: "photography",
    label: "Photographer",
    category: "Photographer",
    cta: "Hire Me",
    tagline: "Portfolio highlights, bookings, and visual style at a glance.",
    descriptor: "Best for photographers, retouchers, and creative studios.",
  },
  {
    key: "model",
    label: "Model",
    category: "Model",
    cta: "Work With Me",
    tagline: "Portfolio, availability, and booking-ready presence.",
    descriptor: "Best for models, performers, and talent pages.",
  },
  {
    key: "shop",
    label: "Maker / Shop",
    category: "Designer",
    cta: "Shop My Work",
    tagline: "Featured products, commissions, and links that convert visitors.",
    descriptor: "Best for makers, Etsy sellers, and boutique businesses.",
  },
  {
    key: "business",
    label: "Business / Brand",
    category: "General Creator",
    cta: "Visit Store",
    tagline: "What you offer, what makes you distinct, and where to take action.",
    descriptor: "Best for brands, startups, studios, and local businesses.",
  },
];

const THEME_OPTIONS = [
  { value: "nocturne", label: "Nocturne" },
  { value: "ember", label: "Ember" },
  { value: "afterhours", label: "After Hours" },
];

const PROFILE_THEME_STYLES: Record<string, { shell: string; card: string; label: string }> = {
  nocturne: {
    shell: "from-slate-950 via-slate-900 to-indigo-950",
    card: "bg-slate-950/80 border-white/10",
    label: "Cool, dark, polished",
  },
  ember: {
    shell: "from-stone-950 via-red-950 to-orange-900",
    card: "bg-stone-950/80 border-orange-200/10",
    label: "Warm, dramatic, nightlife",
  },
  afterhours: {
    shell: "from-zinc-950 via-fuchsia-950 to-cyan-950",
    card: "bg-zinc-950/80 border-cyan-200/10",
    label: "Neon, late-night, electric",
  },
};

const MOOD_OPTIONS = ["sleek", "underground", "dreamy", "luxe", "gritty", "minimal", "neon", "vintage"];
const LAYOUT_OPTIONS = ["portfolio", "music", "performer", "shop", "editorial"];
const FONT_OPTIONS = ["modern", "editorial", "mono"];
const FEATURED_TYPES = ["highlight", "track", "video", "gallery", "event", "product", "post"];
const FEATURED_TYPE_CONFIG: Record<string, {
  label: string;
  short: string;
  description: string;
  titleLabel: string;
  titlePlaceholder: string;
  urlLabel: string;
  urlPlaceholder: string;
  urlHint: string;
}> = {
  highlight: {
    label: "Highlight",
    short: "General highlight",
    description: "Use this for a lead announcement, featured project, or major callout.",
    titleLabel: "Highlight title",
    titlePlaceholder: "Friday Residency",
    urlLabel: "Optional destination link",
    urlPlaceholder: "https://your-feature-link.com",
    urlHint: "Use this when the featured card should open an article, landing page, or outside destination.",
  },
  track: {
    label: "Track",
    short: "Audio or release",
    description: "Use a Spotify, SoundCloud, Bandcamp, or other audio/release link.",
    titleLabel: "Track title",
    titlePlaceholder: "New single out now",
    urlLabel: "Track or audio URL",
    urlPlaceholder: "https://open.spotify.com/track/...",
    urlHint: "Paste a track, playlist, or release link. This is for audio-first content.",
  },
  video: {
    label: "Video",
    short: "Hero video",
    description: "Use a YouTube, Vimeo, or other video link to lead the page.",
    titleLabel: "Video title",
    titlePlaceholder: "Official teaser",
    urlLabel: "Video URL",
    urlPlaceholder: "https://youtu.be/...",
    urlHint: "Paste a normal video link. This is the right choice if you want a video to be featured.",
  },
  gallery: {
    label: "Gallery",
    short: "Lead image set",
    description: "Use this when the page should lead with your showcase media instead of one external link.",
    titleLabel: "Gallery headline",
    titlePlaceholder: "Selected work",
    urlLabel: "Optional gallery link",
    urlPlaceholder: "https://your-portfolio.com/gallery",
    urlHint: "Your actual gallery images come from Showcase Manager below. This link is optional.",
  },
  event: {
    label: "Event",
    short: "Upcoming date",
    description: "Use this to spotlight a show, appearance, or launch event.",
    titleLabel: "Event title",
    titlePlaceholder: "Release party",
    urlLabel: "Optional event link",
    urlPlaceholder: "https://event-link.com",
    urlHint: "Your linked events are managed in Events Manager. Use this link only if you want a destination button.",
  },
  product: {
    label: "Product",
    short: "Offer or item",
    description: "Use this for a product, service package, merch item, or offer.",
    titleLabel: "Product or offer title",
    titlePlaceholder: "Portrait sessions now booking",
    urlLabel: "Product or store URL",
    urlPlaceholder: "https://your-store.com/product",
    urlHint: "Paste the exact store, booking, or product page you want this card to open.",
  },
  post: {
    label: "Post",
    short: "Pinned update",
    description: "Use one of your artist-page posts as the lead feature instead of a separate external link.",
    titleLabel: "Optional post headline",
    titlePlaceholder: "Pinned artist update",
    urlLabel: "Optional fallback link",
    urlPlaceholder: "https://your-feature-link.com",
    urlHint: "Usually you only need the pinned post selector below. The link field is optional for this type.",
  },
};
const MODULE_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "about", label: "About" },
  { value: "media", label: "Media" },
  { value: "posts", label: "Posts" },
  { value: "events", label: "Events" },
  { value: "contact", label: "Contact" },
];

const CREATOR_MOOD_PREVIEW_STYLES: Record<string, string> = {
  sleek: "from-slate-950 via-slate-900 to-cyan-950",
  underground: "from-zinc-950 via-stone-900 to-red-950",
  dreamy: "from-slate-950 via-indigo-950 to-sky-900",
  luxe: "from-neutral-950 via-zinc-900 to-amber-900",
  gritty: "from-stone-950 via-neutral-900 to-orange-950",
  minimal: "from-slate-900 via-slate-800 to-slate-700",
  neon: "from-slate-950 via-fuchsia-950 to-cyan-950",
  vintage: "from-stone-950 via-amber-950 to-rose-950",
};

const MOOD_DESCRIPTIONS: Record<string, string> = {
  sleek: "Clean, polished, modern, and venue-ready.",
  underground: "Darker, rougher, and more subcultural.",
  dreamy: "Soft, atmospheric, and cinematic.",
  luxe: "Premium, rich, and elevated.",
  gritty: "Raw, physical, and industrial.",
  minimal: "Quiet, stripped-down, and editorial.",
  neon: "Electric, nightlife-driven, and colorful.",
  vintage: "Warm, nostalgic, and analog-feeling.",
};

const LAYOUT_DESCRIPTIONS: Record<string, string> = {
  portfolio: "Balanced hero with featured work first.",
  music: "Lead with release, media, and show energy.",
  performer: "Push bookings, reel, and live presence.",
  shop: "Surface offers, products, and commerce.",
  editorial: "Story-first layout with stronger reading flow.",
};

const FONT_DESCRIPTIONS: Record<string, string> = {
  modern: "Clean sans-serif, flexible for most pages.",
  editorial: "Sharper, more expressive, more magazine-like.",
  mono: "Utility-forward, coded, and understated.",
};

const BACKGROUND_STYLE_OPTIONS = [
  { value: "soft-glow", label: "Soft Glow", description: "Gentle gradients and a smoother branded shell." },
  { value: "spotlight", label: "Spotlight", description: "Brighter focal area around the hero content." },
  { value: "flat", label: "Flat", description: "Minimal background treatment with cleaner contrast." },
];

const LIGHT_THEME_VARIANT_OPTIONS = [
  { value: "studio", label: "Studio", description: "Balanced light mode with soft contrast." },
  { value: "paper", label: "Paper", description: "Cleaner editorial light treatment." },
  { value: "gallery", label: "Gallery", description: "Brighter, image-forward presentation." },
];

const BUILDER_SECTION_OPTIONS = [
  { key: "identity", label: "Identity", description: "Name, hero media, category, location, and first impression." },
  { key: "featured", label: "Featured Content", description: "Choose the one thing people should notice first." },
  { key: "content", label: "Content", description: "Media, posts, events, and links that fill out the page." },
  { key: "work", label: "Work & Contact", description: "Primary action, contact path, and visitor conversion." },
  { key: "style", label: "Style", description: "Mood, layout, and controlled page personality." },
  { key: "advanced", label: "Advanced", description: "Optional details, section rules, and fine tuning." },
] as const;

const PAGE_BUILDER_BLOCKS = [
  { key: "hero", label: "Hero", mapsTo: "identity", description: "Name, tagline, category, location, profile image, and banner." },
  { key: "featured", label: "Featured content", mapsTo: "featured", description: "Choose the one lead item visitors should notice first." },
  { key: "gallery", label: "Media gallery", mapsTo: "content", description: "Images and showcase media that shape the page visually." },
  { key: "video", label: "Video playlist", mapsTo: "content", description: "Video-first content and embedded releases or reels." },
  { key: "audio", label: "Audio player", mapsTo: "content", description: "Tracks, mixes, playlists, or audio-led releases." },
  { key: "links", label: "Links / shop", mapsTo: "advanced", description: "Portfolio links, store destinations, and external actions." },
  { key: "events", label: "Events", mapsTo: "content", description: "Upcoming appearances, bookings, and linked events." },
  { key: "about", label: "About", mapsTo: "advanced", description: "Story, influences, extra details, and contextual information." },
  { key: "contact", label: "Contact / CTA", mapsTo: "work", description: "Primary action, contact path, and conversion details." },
] as const;

const PAGE_BUILDER_DEFAULT_ORDER = Object.fromEntries(
  PAGE_BUILDER_BLOCKS.map((block, index) => [block.key, index]),
) as Record<(typeof PAGE_BUILDER_BLOCKS)[number]["key"], number>;

const SECTION_DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
  { value: "expanded", label: "Expanded" },
];

const SECTION_STYLE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "minimal", label: "Minimal" },
  { value: "highlighted", label: "Highlighted" },
];

const CREATOR_FONT_PREVIEW_CLASSES: Record<string, string> = {
  modern: "",
  editorial: "font-serif",
  mono: "font-mono",
};

const CREATOR_MOOD_LIVE_STYLES: Record<string, { shell: string; glow: string }> = {
  sleek: { shell: "from-slate-900/95 via-slate-950/88 to-cyan-950/65", glow: "from-cyan-400/15 via-transparent to-transparent" },
  underground: { shell: "from-zinc-950/95 via-stone-950/88 to-red-950/65", glow: "from-red-500/18 via-transparent to-transparent" },
  dreamy: { shell: "from-slate-950/95 via-indigo-950/86 to-sky-900/65", glow: "from-sky-400/16 via-transparent to-transparent" },
  luxe: { shell: "from-neutral-950/95 via-zinc-950/88 to-amber-950/65", glow: "from-amber-400/18 via-transparent to-transparent" },
  gritty: { shell: "from-zinc-950/95 via-neutral-900/90 to-stone-900/70", glow: "from-orange-500/16 via-transparent to-transparent" },
  minimal: { shell: "from-slate-950/95 via-slate-900/90 to-slate-800/65", glow: "from-white/10 via-transparent to-transparent" },
  neon: { shell: "from-slate-950/95 via-fuchsia-950/86 to-cyan-950/65", glow: "from-fuchsia-500/20 via-transparent to-transparent" },
  vintage: { shell: "from-stone-950/95 via-amber-950/82 to-rose-950/65", glow: "from-amber-300/15 via-transparent to-transparent" },
};

type PreviewSectionConfig = {
  visible?: boolean;
  style?: string | null;
  density?: string | null;
  order?: number | null;
};

function formatPlace(parts: Array<string | null | undefined>) {
  const normalized = parts
    .map((part) => part?.trim())
    .filter(Boolean) as string[];

  return normalized.filter((part, index) => normalized.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index).join(", ");
}

function actionTypeFromLabel(label: string) {
  const lowered = label.toLowerCase();
  if (lowered.includes("book")) return "book";
  if (lowered.includes("hire")) return "hire";
  if (lowered.includes("collaborate")) return "collaborate";
  if (lowered.includes("commission")) return "commission";
  if (lowered.includes("shop")) return "shop";
  if (lowered.includes("store")) return "store";
  return "contact";
}

function getArchetypeKeyFromCategory(category: string | null | undefined) {
  return PAGE_ARCHETYPES.find((item) => item.category === (category || "General Creator"))?.key || "business";
}

export default function Settings() {
  const { user } = useAuth();
  const { setActiveIdentity } = useActiveIdentity();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [basic, setBasic] = useState<Record<string, string>>({});
  const [artist, setArtist] = useState<Record<string, string>>({});
  const [creator, setCreator] = useState<Record<string, string>>({});
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "", kind: "" });
  const [serviceDraft, setServiceDraft] = useState({ title: "", description: "", price: "", turnaround: "" });
  const [detailDraft, setDetailDraft] = useState({ label: "", value: "" });
  const [isCreatingArtistPage, setIsCreatingArtistPage] = useState(false);
  const [creatorSetupStage, setCreatorSetupStage] = useState<"starter" | "advanced">("starter");
  const [activeTab, setActiveTab] = useState("profile");
  const [pageModules, setPageModules] = useState<{ enabledModules: string[]; moduleOrder: string[] }>({
    enabledModules: ["featured", "about", "media", "posts", "events", "contact"],
    moduleOrder: ["featured", "about", "media", "posts", "events", "contact"],
  });
  const [showcaseCategory, setShowcaseCategory] = useState<"photos" | "videos" | "audio">("photos");
  const [gallery, setGallery] = useState<{ type: GalleryItemRequestType; url: string; caption: string }>({
    type: GalleryItemRequestType.image,
    url: "",
    caption: "",
  });
  const [creatorBuilderView, setCreatorBuilderView] = useState<"edit" | "preview">("edit");
  const [photoForm, setPhotoForm] = useState({ imageUrl: "", caption: "" });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isUploadingPhotoBatch, setIsUploadingPhotoBatch] = useState(false);
  const [showcaseFiles, setShowcaseFiles] = useState<File[]>([]);
  const [isUploadingShowcaseBatch, setIsUploadingShowcaseBatch] = useState(false);
  const [profileFolderDraft, setProfileFolderDraft] = useState("");
  const [showcaseFolderDraft, setShowcaseFolderDraft] = useState("");
  const [photoGalleryView, setPhotoGalleryView] = useState<"grid" | "album">("album");
  const [profileFolderState, setProfileFolderState] = useState({ folders: [] as string[], assignments: {} as Record<string, string> });
  const [showcaseFolderState, setShowcaseFolderState] = useState({ folders: [] as string[], assignments: {} as Record<string, string> });
  const [activeBuilderSection, setActiveBuilderSection] = useState<"identity" | "featured" | "content" | "work" | "style" | "advanced">("identity");
  const [selectedBuilderBlock, setSelectedBuilderBlock] = useState<"hero" | "featured" | "gallery" | "video" | "audio" | "links" | "events" | "about" | "contact">("hero");
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [saveState, setSaveState] = useState<{
    profile: "idle" | "saving" | "saved";
    artistPage: "idle" | "saving" | "saved";
    creatorConfig: "idle" | "saving" | "saved";
  }>({
    profile: "idle",
    artistPage: "idle",
    creatorConfig: "idle",
  });
  const saveTimers = useRef<Partial<Record<"profile" | "artistPage" | "creatorConfig", number>>>({});
  const hydratedProfileUserId = useRef<number | null>(null);
  const [uploading, setUploading] = useState({
    avatar: false,
    banner: false,
    gallery: false,
    photos: false,
  });

  const { data: profile, isLoading } = useGetUser(user?.id || 0, {
    query: {
      queryKey: ["profile", user?.id],
      enabled: !!user?.id,
    },
  });
  const { data: userPhotos } = useGetUserPhotos(user?.id || 0, {
    query: {
      queryKey: ["/api/users", user?.id, "photos"],
      enabled: !!user?.id,
    },
  });
  const { data: artistPostsPage } = useGetUserPosts(user?.id || 0, {
    limit: 50,
    surface: "artist",
  }, {
    query: {
      queryKey: ["/api/users", user?.id, "posts", "artist", "settings"],
      enabled: !!user?.id,
    },
  });
  const { data: events } = useGetEvents(undefined, {
    query: {
      queryKey: ["/api/events", "settings", user?.id],
      enabled: !!user?.id,
    },
  });

  useEffect(() => {
    if (!profile) return;
    if (hydratedProfileUserId.current === profile.user.id) return;
    hydratedProfileUserId.current = profile.user.id;
    setIsCreatingArtistPage(false);
    setCreatorSetupStage("starter");
    setBasic({
      avatarUrl: profile.user.avatarUrl || "",
      bio: profile.user.bio || "",
      bannerUrl: profile.user.bannerUrl || "",
      location: profile.user.location || "",
      city: profile.user.city || "",
      age: profile.user.age ? String(profile.user.age) : "",
      work: profile.user.work || "",
      school: profile.user.school || "",
      about: profile.user.about || "",
      interests: (profile.user.interests || []).join(", "),
      accentColor: profile.user.accentColor || "#8b5cf6",
      themeName: profile.user.themeName || "nocturne",
      featuredContent: profile.user.featuredContent || "",
      links: (profile.user.links || []).map((link) => `${link.label}|${link.url}`).join("\n"),
    });
    setArtist({
      displayName: profile.artistProfile?.displayName || "",
      avatarUrl: profile.artistProfile?.avatarUrl || "",
      bannerUrl: profile.artistProfile?.bannerUrl || "",
      category: profile.artistProfile?.category || "General Creator",
      location: profile.artistProfile?.location || "",
      tagline: profile.artistProfile?.tagline || "",
      tags: profile.artistProfile?.tags?.join(", ") || "",
      bio: profile.artistProfile?.bio || "",
      influences: profile.artistProfile?.influences || "",
      availabilityStatus: profile.artistProfile?.availabilityStatus || "",
      pronouns: profile.artistProfile?.pronouns || "",
      yearsActive: profile.artistProfile?.yearsActive || "",
      representedBy: profile.artistProfile?.representedBy || "",
      customFields: (profile.artistProfile?.customFields || []).map((field) => `${field.label}|${field.value}`).join("\n"),
      bookingEmail: profile.artistProfile?.bookingEmail || "",
    });
    setCreator({
      pageType: profile.creatorSettings?.pageType || "creator",
      pageArchetype: profile.creatorSettings?.pageArchetype || getArchetypeKeyFromCategory(profile.artistProfile?.category),
      pageStatus: profile.creatorSettings?.pageStatus || "published",
      primaryActionType: profile.creatorSettings?.primaryActionType || "contact",
      primaryActionLabel: profile.creatorSettings?.primaryActionLabel || "Contact Me",
      primaryActionUrl: profile.creatorSettings?.primaryActionUrl || "",
      featuredTitle: profile.creatorSettings?.featuredTitle || "",
      featuredDescription: profile.creatorSettings?.featuredDescription || "",
      featuredUrl: profile.creatorSettings?.featuredUrl || "",
      featuredType: profile.creatorSettings?.featuredType || "highlight",
      featuredContent: JSON.stringify(profile.creatorSettings?.featuredContent || {}, null, 2),
      moodPreset: profile.creatorSettings?.moodPreset || "sleek",
      layoutTemplate: profile.creatorSettings?.layoutTemplate || "portfolio",
      fontPreset: profile.creatorSettings?.fontPreset || "modern",
      accentColor: profile.creatorSettings?.accentColor || profile.user.accentColor || "#8b5cf6",
      backgroundStyle: profile.creatorSettings?.backgroundStyle || "soft-glow",
      lightThemeVariant: profile.creatorSettings?.lightThemeVariant || "studio",
      pricingSummary: profile.creatorSettings?.pricingSummary || "",
      turnaroundInfo: profile.creatorSettings?.turnaroundInfo || "",
      linkItems: (profile.creatorSettings?.linkItems || []).map((item) => `${item.label}|${item.url}${item.kind ? `|${item.kind}` : ""}`).join("\n"),
      serviceItems: (profile.creatorSettings?.serviceItems || []).map((item) => [item.title, item.description, item.price, item.turnaround].filter(Boolean).join("|")).join("\n"),
      sectionConfigs: JSON.stringify(profile.creatorSettings?.sectionConfigs || {}, null, 2),
      openForCommissions: profile.artistProfile?.openForCommissions ? "true" : "false",
      touring: profile.artistProfile?.touring ? "true" : "false",
      acceptsCollaborations: profile.artistProfile?.acceptsCollaborations === false ? "false" : "true",
      pinnedPostId: profile.creatorSettings?.pinnedPost?.id ? String(profile.creatorSettings.pinnedPost.id) : "",
      enabledModules: (profile.creatorSettings?.enabledModules || ["featured", "about", "media", "posts", "events", "contact"]).join(","),
      moduleOrder: (profile.creatorSettings?.moduleOrder || ["featured", "about", "media", "posts", "events", "contact"]).join(","),
    });
    setPageModules({
      enabledModules: profile.creatorSettings?.enabledModules?.length ? profile.creatorSettings.enabledModules : ["featured", "about", "media", "posts", "events", "contact"],
      moduleOrder: profile.creatorSettings?.moduleOrder?.length ? profile.creatorSettings.moduleOrder : ["featured", "about", "media", "posts", "events", "contact"],
    });
  }, [profile]);

  const currentSearch = typeof window !== "undefined" ? window.location.search : "";

  useEffect(() => {
    const tab = new URLSearchParams(currentSearch).get("tab");
    if (tab === "creator") {
      setActiveTab("creator");
      if (!profile?.artistProfile) {
        setIsCreatingArtistPage(true);
        setCreatorSetupStage("starter");
      }
    } else if (tab === "photos") {
      setActiveTab("photos");
    } else if (tab === "gallery" && profile?.artistProfile) {
      setActiveTab("gallery");
    } else {
      setActiveTab("profile");
    }
  }, [currentSearch, profile?.artistProfile]);

  const creatorReturnTarget = useMemo(() => {
    return new URLSearchParams(currentSearch).get("returnTo");
  }, [currentSearch]);

  const creatorPickerTarget = useMemo(() => {
    const value = new URLSearchParams(currentSearch).get("picker");
    return value === "hero" || value === "gallery" || value === "video" ? value : null;
  }, [currentSearch]);

  const openCreatorShowcase = (target: "hero" | "gallery" | "video") => {
    setActiveTab("gallery");
    setLocation(`/settings?tab=gallery&returnTo=creator&picker=${target}`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const returnToCreatorBuilder = () => {
    setActiveTab("creator");
    setLocation("/settings?tab=creator");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (activeTab !== "creator") {
      setCreatorBuilderView("edit");
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "creator") {
      setActiveBuilderSection("identity");
      setSelectedBuilderBlock("hero");
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedBuilderBlock !== "hero" && !getBuilderBlockVisible(selectedBuilderBlock)) {
      setSelectedBuilderBlock("hero");
      setActiveBuilderSection("identity");
    }
  }, [selectedBuilderBlock, creator.sectionConfigs, pageModules.enabledModules, creator.featuredType, creator.featuredUrl, creator.linkItems]);

  const actionPreset = useMemo(() => {
    return ACTION_OPTIONS.includes(creator.primaryActionLabel || "") ? creator.primaryActionLabel : "Custom";
  }, [creator.primaryActionLabel]);
  const selectedArchetype = useMemo(() => {
    return PAGE_ARCHETYPES.find((item) => item.key === creator.pageArchetype)
      || PAGE_ARCHETYPES.find((item) => item.category === (artist.category || "General Creator"))
      || PAGE_ARCHETYPES[5];
  }, [artist.category, creator.pageArchetype]);

  const hasArtistPage = !!profile?.artistProfile;
  const showCreatorTools = hasArtistPage || isCreatingArtistPage;
  const isStarterCreatorSetup = !hasArtistPage && creatorSetupStage === "starter";
  const artistPosts = artistPostsPage?.posts || [];
  const linkedEvents = user
    ? (events || []).filter((event) => event.host?.id === user.id || event.artists?.some((artistMember) => artistMember.id === user.id))
    : [];

  useEffect(() => {
    if (!user) return;
    setProfileFolderState(readMediaFolderState("profile", user.id));
    setShowcaseFolderState(readMediaFolderState("showcase", user.id));
  }, [user]);

  const saveBasic = useUpdateProfile({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
    },
  });

  const saveArtist = useUpdateArtistProfile({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
    },
  });

  const saveCreator = useUpdateCreatorSettings({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
    },
  });

  const addGalleryItem = useAddGalleryItem({
    mutation: {
      onSuccess: () => {
        setGallery({ type: GalleryItemRequestType.image, url: "", caption: "" });
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      },
    },
  });

  const addUserPhoto = useAddUserPhoto({
    mutation: {
      onSuccess: () => {
        setPhotoForm({ imageUrl: "", caption: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "photos"] });
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      },
    },
  });

  const deleteGalleryItem = useDeleteGalleryItem({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
    },
  });

  const deleteUserPhoto = useDeleteUserPhoto({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "photos"] }),
    },
  });

  const markSaved = (key: "profile" | "artistPage" | "creatorConfig") => {
    if (typeof window !== "undefined" && saveTimers.current[key]) {
      window.clearTimeout(saveTimers.current[key]);
    }
    setSaveState((current) => ({ ...current, [key]: "saved" }));
    if (typeof window !== "undefined") {
      saveTimers.current[key] = window.setTimeout(() => {
        setSaveState((current) => ({ ...current, [key]: "idle" }));
      }, 1600);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      Object.values(saveTimers.current).forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
    };
  }, []);

  const handleImageUpload = async (
    file: File | null,
    scope: "avatar" | "banner" | "gallery" | "photos",
    onComplete: (url: string) => void,
  ) => {
    if (!file) return;
    setUploading((current) => ({ ...current, [scope]: true }));
    try {
      const uploaded = await uploadImage(file, scope);
      onComplete(uploaded.url);
      toast({ title: "Image uploaded" });
    } catch (error) {
      toast({
        title: "Could not upload image",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploading((current) => ({ ...current, [scope]: false }));
    }
  };

  const uploadPhotosToGallery = async () => {
    if (!photoFiles.length || !user) return;

    setIsUploadingPhotoBatch(true);
    try {
      for (const file of photoFiles) {
        const uploaded = await uploadImage(file, "photos");
        await addUserPhoto.mutateAsync({
          userId: user.id,
          data: {
            imageUrl: uploaded.url,
            caption: photoForm.caption || undefined,
          },
        });
      }

      setPhotoFiles([]);
      setPhotoForm({ imageUrl: "", caption: "" });
      toast({
        title: "Photos added",
        description: `${photoFiles.length} photo${photoFiles.length === 1 ? "" : "s"} added to your gallery.`,
      });
    } catch (error) {
      toast({
        title: "Could not upload photos",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhotoBatch(false);
    }
  };

  const uploadShowcaseImages = async () => {
    if (!showcaseFiles.length || !user) return;

    setIsUploadingShowcaseBatch(true);
    try {
      const addedIds: number[] = [];
      for (const file of showcaseFiles) {
        const uploaded = await uploadImage(file, "gallery");
        const created = await addGalleryItem.mutateAsync({
          userId: user.id,
          data: {
            type: GalleryItemRequestType.image,
            url: uploaded.url,
            caption: gallery.caption || undefined,
          },
        });
        if (typeof created?.id === "number") {
          addedIds.push(created.id);
        }
      }

      if (creatorPickerTarget && showcasePickerType === "image" && addedIds.length) {
        if (creatorPickerTarget === "gallery") {
          updateBuilderMeta({ galleryItemIds: Array.from(new Set([...(currentBuilderMeta.galleryItemIds || []), ...addedIds])) });
        } else if (creatorPickerTarget === "hero") {
          updateBuilderMeta({
            heroMediaType: "image",
            heroItemIds: Array.from(new Set([...(currentBuilderMeta.heroItemIds || []), ...addedIds])),
          });
        }
      }

      setShowcaseFiles([]);
      setGallery({ type: GalleryItemRequestType.image, url: "", caption: "" });
      toast({
        title: "Showcase updated",
        description: `${showcaseFiles.length} image${showcaseFiles.length === 1 ? "" : "s"} added to your creator showcase.`,
      });
    } catch (error) {
      toast({
        title: "Could not upload showcase images",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsUploadingShowcaseBatch(false);
    }
  };

  const addSingleShowcaseItem = async () => {
    if (!user || !gallery.url.trim()) return;
    const created = await addGalleryItem.mutateAsync({ userId: user.id, data: gallery });
    if (creatorPickerTarget && typeof created?.id === "number") {
      if (creatorPickerTarget === "video" && gallery.type === GalleryItemRequestType.video) {
        updateBuilderMeta({ videoItemIds: Array.from(new Set([...(currentBuilderMeta.videoItemIds || []), created.id])) });
      }
      if (creatorPickerTarget === "hero" && gallery.type === GalleryItemRequestType.video) {
        updateBuilderMeta({ heroMediaType: "video", heroItemIds: [created.id] });
      }
    }
  };

  const toggleModule = (module: string) => {
    setPageModules((current) => {
      const enabledModules = current.enabledModules.includes(module)
        ? current.enabledModules.filter((item) => item !== module)
        : [...current.enabledModules, module];
      const moduleOrder = current.moduleOrder.includes(module)
        ? current.moduleOrder
        : [...current.moduleOrder, module];
      return { enabledModules, moduleOrder };
    });
  };

  const moveModule = (module: string, direction: "up" | "down") => {
    setPageModules((current) => {
      const index = current.moduleOrder.indexOf(module);
      if (index === -1) return current;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.moduleOrder.length) return current;
      const next = [...current.moduleOrder];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, moduleOrder: next };
    });
  };

  const parseLinkItems = () => (
    String(creator.linkItems || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, url, kind] = line.split("|");
        return {
          label: label?.trim() || url?.trim() || "Link",
          url: url?.trim() || "",
          kind: kind?.trim() || null,
        };
      })
      .filter((item) => item.url)
  );

  const parseServiceItems = () => (
    String(creator.serviceItems || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, description, price, turnaround] = line.split("|");
        return {
          title: title?.trim() || "Service",
          description: description?.trim() || null,
          price: price?.trim() || null,
          turnaround: turnaround?.trim() || null,
        };
      })
      .filter((item) => item.title)
  );

  const writeLinkItems = (items: Array<{ label: string; url: string; kind?: string | null }>) => {
    setCreator((current) => ({
      ...current,
      linkItems: items
        .filter((item) => item.url?.trim())
        .map((item) => [item.label?.trim() || item.url.trim(), item.url.trim(), item.kind?.trim()].filter(Boolean).join("|"))
        .join("\n"),
    }));
  };

  const writeServiceItems = (items: Array<{ title: string; description?: string | null; price?: string | null; turnaround?: string | null }>) => {
    setCreator((current) => ({
      ...current,
      serviceItems: items
        .filter((item) => item.title?.trim())
        .map((item) => [item.title?.trim(), item.description?.trim(), item.price?.trim(), item.turnaround?.trim()].filter(Boolean).join("|"))
        .join("\n"),
    }));
  };

  const updateLinkItemAt = (index: number, patch: Partial<{ label: string; url: string; kind?: string | null }>) => {
    const next = [...parseLinkItems()];
    next[index] = { ...next[index], ...patch };
    writeLinkItems(next);
  };

  const removeLinkItemAt = (index: number) => {
    writeLinkItems(parseLinkItems().filter((_, itemIndex) => itemIndex !== index));
  };

  const addLinkItemFromDraft = () => {
    if (!linkDraft.url.trim()) return;
    writeLinkItems([...parseLinkItems(), { label: linkDraft.label.trim() || linkDraft.url.trim(), url: linkDraft.url.trim(), kind: linkDraft.kind.trim() || null }]);
    setLinkDraft({ label: "", url: "", kind: "" });
  };

  const updateServiceItemAt = (index: number, patch: Partial<{ title: string; description?: string | null; price?: string | null; turnaround?: string | null }>) => {
    const next = [...parseServiceItems()];
    next[index] = { ...next[index], ...patch };
    writeServiceItems(next);
  };

  const removeServiceItemAt = (index: number) => {
    writeServiceItems(parseServiceItems().filter((_, itemIndex) => itemIndex !== index));
  };

  const addServiceItemFromDraft = () => {
    if (!serviceDraft.title.trim()) return;
    writeServiceItems([...parseServiceItems(), {
      title: serviceDraft.title.trim(),
      description: serviceDraft.description.trim() || null,
      price: serviceDraft.price.trim() || null,
      turnaround: serviceDraft.turnaround.trim() || null,
    }]);
    setServiceDraft({ title: "", description: "", price: "", turnaround: "" });
  };

  const parseCustomFields = () => (
    String(artist.customFields || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...rest] = line.split("|");
        return {
          label: label?.trim() || "Detail",
          value: rest.join("|").trim(),
        };
      })
      .filter((item) => item.label || item.value)
  );

  const writeCustomFields = (items: Array<{ label: string; value: string }>) => {
    setArtist((current) => ({
      ...current,
      customFields: items
        .filter((item) => item.label?.trim() || item.value?.trim())
        .map((item) => [item.label?.trim() || "Detail", item.value?.trim()].filter(Boolean).join("|"))
        .join("\n"),
    }));
  };

  const updateCustomFieldAt = (index: number, patch: Partial<{ label: string; value: string }>) => {
    const next = [...parseCustomFields()];
    next[index] = { ...next[index], ...patch };
    writeCustomFields(next);
  };

  const removeCustomFieldAt = (index: number) => {
    writeCustomFields(parseCustomFields().filter((_, itemIndex) => itemIndex !== index));
  };

  const addCustomFieldFromDraft = () => {
    if (!detailDraft.label.trim() && !detailDraft.value.trim()) return;
    writeCustomFields([
      ...parseCustomFields(),
      {
        label: detailDraft.label.trim() || "Detail",
        value: detailDraft.value.trim(),
      },
    ]);
    setDetailDraft({ label: "", value: "" });
  };

  const parseSectionConfigs = () => {
    try {
      if (creator.sectionConfigs?.trim()) {
        return JSON.parse(creator.sectionConfigs);
      }
    } catch {
    }
    return Object.fromEntries(
      MODULE_OPTIONS.map((module) => [
        module.value,
        {
          visible: pageModules.enabledModules.includes(module.value),
        },
      ]),
    );
  };

  const sectionConfigs = useMemo(
    () => parseSectionConfigs() as Record<string, { visible?: boolean; style?: string | null; density?: string | null }>,
    [creator.sectionConfigs, pageModules.enabledModules, pageModules.moduleOrder],
  );

  const currentBuilderMeta = useMemo(
    () => readCreatorBuilderMeta(parseSectionConfigs() as Record<string, unknown>, {
      enabledModules: creator.enabledModules?.split(",").map((item) => item.trim()).filter(Boolean),
      moduleOrder: creator.moduleOrder?.split(",").map((item) => item.trim()).filter(Boolean),
      featuredType: creator.featuredType,
      featuredUrl: creator.featuredUrl,
      linkCount: parseLinkItems().length,
      hasImages: (profile?.artistProfile?.gallery || []).some((item) => item.type === "image"),
      hasVideos: (profile?.artistProfile?.gallery || []).some((item) => item.type === "video"),
      hasAudio: (profile?.artistProfile?.gallery || []).some((item) => item.type === "audio"),
    }),
    [creator.enabledModules, creator.featuredType, creator.featuredUrl, creator.linkItems, creator.moduleOrder, creator.sectionConfigs, profile?.artistProfile?.gallery],
  );

  const readBuilderMetaFromCreatorState = (creatorState: typeof creator) => {
    let rawSectionConfigs: Record<string, unknown> = {};
    try {
      if (creatorState.sectionConfigs?.trim()) {
        rawSectionConfigs = JSON.parse(creatorState.sectionConfigs) as Record<string, unknown>;
      }
    } catch {
      rawSectionConfigs = {};
    }

    const enabledModules = creatorState.enabledModules?.split(",").map((item) => item.trim()).filter(Boolean);
    const moduleOrder = creatorState.moduleOrder?.split(",").map((item) => item.trim()).filter(Boolean);
    const linkCount = String(creatorState.linkItems || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .length;

    return {
      rawSectionConfigs,
      meta: readCreatorBuilderMeta(rawSectionConfigs, {
        enabledModules,
        moduleOrder,
        featuredType: creatorState.featuredType,
        featuredUrl: creatorState.featuredUrl,
        linkCount,
        hasImages: (profile?.artistProfile?.gallery || []).some((item) => item.type === "image"),
        hasVideos: (profile?.artistProfile?.gallery || []).some((item) => item.type === "video"),
        hasAudio: (profile?.artistProfile?.gallery || []).some((item) => item.type === "audio"),
      }),
    };
  };

  const updateBuilderMeta = (
    patch: Partial<typeof currentBuilderMeta> | ((meta: typeof currentBuilderMeta) => typeof currentBuilderMeta),
  ) => {
    setCreator((current) => {
      const { rawSectionConfigs, meta } = readBuilderMetaFromCreatorState(current);
      const nextMeta = typeof patch === "function" ? patch(meta) : { ...meta, ...patch };
      const nextConfigs = writeCreatorBuilderMeta(rawSectionConfigs, nextMeta);
      const legacyModuleState = deriveLegacyModuleState(nextMeta.sections);
      return {
        ...current,
        enabledModules: legacyModuleState.enabledModules.join(","),
        moduleOrder: legacyModuleState.moduleOrder.join(","),
        sectionConfigs: JSON.stringify(nextConfigs, null, 2),
      };
    });
  };

  const updateSectionConfig = (
    moduleKey: string,
    patch: { visible?: boolean; style?: string | null; density?: string | null; order?: number | null },
  ) => {
    const next = {
      ...sectionConfigs,
      [moduleKey]: {
        ...(sectionConfigs[moduleKey] || {}),
        ...patch,
      },
    };
    setCreator((current) => ({
      ...current,
      sectionConfigs: JSON.stringify(next, null, 2),
    }));
  };

  const focusBuilderSection = (section: "identity" | "featured" | "content" | "work" | "style" | "advanced") => {
    setActiveBuilderSection(section);
    if (typeof document !== "undefined") {
      document.getElementById(`builder-section-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const selectBuilderBlock = (blockKey: "hero" | "featured" | "gallery" | "video" | "audio" | "links" | "events" | "about" | "contact") => {
    setSelectedBuilderBlock(blockKey);
    const nextSection = PAGE_BUILDER_BLOCKS.find((block) => block.key === blockKey)?.mapsTo;
    if (nextSection) {
      setActiveBuilderSection(nextSection);
    }
  };

  const getBuilderBlockOrder = (blockKey: (typeof PAGE_BUILDER_BLOCKS)[number]["key"]) => {
    const explicitOrder = (sectionConfigs[blockKey] as PreviewSectionConfig | undefined)?.order;
    return typeof explicitOrder === "number" ? explicitOrder : PAGE_BUILDER_DEFAULT_ORDER[blockKey];
  };

  const getBuilderBlockVisible = (blockKey: "hero" | "featured" | "gallery" | "video" | "audio" | "links" | "events" | "about" | "contact") => {
    if (blockKey === "hero") return true;
    const explicit = (sectionConfigs[blockKey] as PreviewSectionConfig | undefined)?.visible;
    if (typeof explicit === "boolean") return explicit;

    if (blockKey === "featured") return pageModules.enabledModules.includes("featured");
    if (blockKey === "gallery") return pageModules.enabledModules.includes("media");
    if (blockKey === "events") return pageModules.enabledModules.includes("events");
    if (blockKey === "about") return pageModules.enabledModules.includes("about");
    if (blockKey === "contact") return pageModules.enabledModules.includes("contact");
    if (blockKey === "video") return videoPreviewItems.length > 0;
    if (blockKey === "audio") return audioPreviewTracks.length > 0;
    if (blockKey === "links") return previewLinkItems.length > 0;

    return false;
  };

  const setBuilderBlockVisibility = (
    blockKey: "hero" | "featured" | "gallery" | "video" | "audio" | "links" | "events" | "about" | "contact",
    visible: boolean,
  ) => {
    if (blockKey === "hero") return;

    if (blockKey === "featured" || blockKey === "events" || blockKey === "about" || blockKey === "contact") {
      const moduleKey = blockKey;
      setPageModules((current) => {
        const enabledModules = visible
          ? current.enabledModules.includes(moduleKey) ? current.enabledModules : [...current.enabledModules, moduleKey]
          : current.enabledModules.filter((item) => item !== moduleKey);
        const moduleOrder = current.moduleOrder.includes(moduleKey)
          ? current.moduleOrder
          : [...current.moduleOrder, moduleKey];
        return { enabledModules, moduleOrder };
      });
    }

    if (blockKey === "gallery") {
      setPageModules((current) => {
        const enabledModules = visible
          ? current.enabledModules.includes("media") ? current.enabledModules : [...current.enabledModules, "media"]
          : current.enabledModules.filter((item) => item !== "media");
        const moduleOrder = current.moduleOrder.includes("media")
          ? current.moduleOrder
          : [...current.moduleOrder, "media"];
        return { enabledModules, moduleOrder };
      });
    }

    const nextVisibleOrder = Math.max(
      ...PAGE_BUILDER_BLOCKS.filter((block) => getBuilderBlockVisible(block.key))
        .map((block) => getBuilderBlockOrder(block.key)),
      -1,
    ) + 1;

    updateSectionConfig(blockKey, { visible, ...(visible ? { order: nextVisibleOrder } : {}) });

    if (visible) {
      selectBuilderBlock(blockKey);
      setIsAddSectionOpen(false);
    } else if (selectedBuilderBlock === blockKey) {
      setSelectedBuilderBlock("hero");
      setActiveBuilderSection("identity");
    }
  };

  const moveBuilderBlock = (
    blockKey: "hero" | "featured" | "gallery" | "video" | "audio" | "links" | "events" | "about" | "contact",
    direction: "up" | "down",
  ) => {
    const orderedVisibleKeys = PAGE_BUILDER_BLOCKS
      .filter((block) => getBuilderBlockVisible(block.key))
      .sort((a, b) => getBuilderBlockOrder(a.key) - getBuilderBlockOrder(b.key))
      .map((block) => block.key);

    const currentIndex = orderedVisibleKeys.indexOf(blockKey);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedVisibleKeys.length) return;

    const nextOrderedKeys = [...orderedVisibleKeys];
    [nextOrderedKeys[currentIndex], nextOrderedKeys[targetIndex]] = [nextOrderedKeys[targetIndex], nextOrderedKeys[currentIndex]];

    const nextConfigs = { ...sectionConfigs } as Record<string, PreviewSectionConfig>;
    nextOrderedKeys.forEach((key, index) => {
      nextConfigs[key] = {
        ...(nextConfigs[key] || {}),
        order: index,
      };
    });

    setCreator((current) => ({
      ...current,
      sectionConfigs: JSON.stringify(nextConfigs, null, 2),
    }));

    const moduleWeightMap = {
      featured: nextConfigs.featured?.order ?? PAGE_BUILDER_DEFAULT_ORDER.featured,
      about: nextConfigs.about?.order ?? PAGE_BUILDER_DEFAULT_ORDER.about,
      media: Math.min(
        nextConfigs.gallery?.order ?? PAGE_BUILDER_DEFAULT_ORDER.gallery,
        nextConfigs.video?.order ?? PAGE_BUILDER_DEFAULT_ORDER.video,
        nextConfigs.audio?.order ?? PAGE_BUILDER_DEFAULT_ORDER.audio,
      ),
      events: nextConfigs.events?.order ?? PAGE_BUILDER_DEFAULT_ORDER.events,
      contact: nextConfigs.contact?.order ?? PAGE_BUILDER_DEFAULT_ORDER.contact,
    } as const;

    setPageModules((current) => ({
      ...current,
      moduleOrder: [...current.moduleOrder].sort((left, right) => {
        const leftWeight = moduleWeightMap[left as keyof typeof moduleWeightMap] ?? current.moduleOrder.indexOf(left) + 100;
        const rightWeight = moduleWeightMap[right as keyof typeof moduleWeightMap] ?? current.moduleOrder.indexOf(right) + 100;
        return leftWeight - rightWeight;
      }),
    }));
  };

  const buildFeaturedContent = () => ({
    type: creator.featuredType || "highlight",
    title: creator.featuredTitle || null,
    description: creator.featuredDescription || null,
    url: creator.featuredUrl || null,
    postId: creator.pinnedPostId ? Number(creator.pinnedPostId) : null,
  });

  const buildBasicPayload = () => ({
    avatarUrl: basic.avatarUrl || undefined,
    bannerUrl: basic.bannerUrl || undefined,
    bio: basic.bio || undefined,
    location: basic.location || undefined,
    city: basic.city || undefined,
    age: basic.age ? Number(basic.age) : undefined,
    work: basic.work || undefined,
    school: basic.school || undefined,
    about: basic.about || undefined,
    interests: String(basic.interests || "").split(",").map((item) => item.trim()).filter(Boolean),
    accentColor: basic.accentColor || undefined,
    themeName: basic.themeName || undefined,
    featuredContent: basic.featuredContent || undefined,
    links: String(basic.links || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, url] = line.split("|");
        return { label: label?.trim() || url?.trim() || "Link", url: url?.trim() || label?.trim() || "" };
      })
      .filter((link) => link.url),
  });

  const buildArtistPayload = () => ({
    ...(() => {
      const rawSectionConfigs = parseSectionConfigs() as Record<string, unknown>;
      const builderMeta = readCreatorBuilderMeta(rawSectionConfigs, {
        enabledModules: creator.enabledModules?.split(",").map((item) => item.trim()).filter(Boolean),
        moduleOrder: creator.moduleOrder?.split(",").map((item) => item.trim()).filter(Boolean),
        featuredType: creator.featuredType,
        featuredUrl: creator.featuredUrl,
        linkCount: parseLinkItems().length,
        hasImages: (profile?.artistProfile?.gallery || []).some((item) => item.type === "image"),
        hasVideos: (profile?.artistProfile?.gallery || []).some((item) => item.type === "video"),
        hasAudio: (profile?.artistProfile?.gallery || []).some((item) => item.type === "audio"),
      });
      const legacyModuleState = deriveLegacyModuleState(builderMeta.sections);
      return {
        enabledModules: legacyModuleState.enabledModules,
        moduleOrder: legacyModuleState.moduleOrder,
        sectionConfigs: rawSectionConfigs as Record<string, { visible?: boolean; style?: string | null; density?: string | null }>,
      };
    })(),
    category: artist.category,
    displayName: artist.displayName || undefined,
    avatarUrl: artist.avatarUrl || undefined,
    bannerUrl: artist.bannerUrl || undefined,
    location: artist.location || undefined,
    tagline: artist.tagline || undefined,
    tags: String(artist.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    bio: artist.bio || undefined,
    influences: artist.influences || undefined,
    availabilityStatus: artist.availabilityStatus || undefined,
    pronouns: artist.pronouns || undefined,
    yearsActive: artist.yearsActive || undefined,
    representedBy: artist.representedBy || undefined,
    openForCommissions: creator.openForCommissions === "true",
    touring: creator.touring === "true",
    acceptsCollaborations: creator.acceptsCollaborations !== "false",
    customFields: String(artist.customFields || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, value] = line.split("|");
        return { label: label?.trim() || "Field", value: value?.trim() || "" };
      })
      .filter((field) => field.value),
    bookingEmail: artist.bookingEmail || undefined,
    pageType: creator.pageType || "creator",
    pageArchetype: creator.pageArchetype || getArchetypeKeyFromCategory(artist.category),
    pageStatus: creator.pageStatus || "published",
    primaryActionType: creator.primaryActionType,
    primaryActionLabel: creator.primaryActionLabel,
    primaryActionUrl: creator.primaryActionUrl || undefined,
    featuredTitle: creator.featuredTitle || undefined,
    featuredDescription: creator.featuredDescription || undefined,
    featuredUrl: creator.featuredUrl || undefined,
    featuredType: creator.featuredType || "highlight",
    featuredContent: buildFeaturedContent(),
    linkItems: parseLinkItems(),
    serviceItems: parseServiceItems(),
    pricingSummary: creator.pricingSummary || undefined,
    turnaroundInfo: creator.turnaroundInfo || undefined,
    moodPreset: creator.moodPreset || "sleek",
    layoutTemplate: creator.layoutTemplate || "portfolio",
    fontPreset: creator.fontPreset || "modern",
    accentColor: creator.accentColor || undefined,
    backgroundStyle: creator.backgroundStyle || "soft-glow",
    lightThemeVariant: creator.lightThemeVariant || "studio",
    pinnedPostId: creator.pinnedPostId ? Number(creator.pinnedPostId) : null,
  });

  const showcaseItems = profile?.artistProfile?.gallery || [];
  const showcaseImages = showcaseItems.filter((item) => item.type === "image");
  const showcaseVideos = showcaseItems.filter((item) => item.type === "video");
  const showcaseAudio = showcaseItems.filter((item) => item.type === "audio");
  const groupedProfilePhotos = groupItemsByFolder(userPhotos || [], (item) => String(item.id || item.imageUrl), profileFolderState.assignments);
  const groupedShowcaseImages = groupItemsByFolder(showcaseImages, (item) => String(item.id), showcaseFolderState.assignments);
  const groupedShowcaseVideos = groupItemsByFolder(showcaseVideos, (item) => String(item.id), showcaseFolderState.assignments);
  const groupedShowcaseAudio = groupItemsByFolder(showcaseAudio, (item) => String(item.id), showcaseFolderState.assignments);

  const addFolder = (kind: "profile" | "showcase") => {
    if (!user) return;
    const draft = kind === "profile" ? profileFolderDraft.trim() : showcaseFolderDraft.trim();
    if (!draft) return;
    if (kind === "profile") {
      const next = { ...profileFolderState, folders: Array.from(new Set([...profileFolderState.folders, draft])) };
      setProfileFolderState(next);
      writeMediaFolderState("profile", user.id, next);
      setProfileFolderDraft("");
      return;
    }
    const next = { ...showcaseFolderState, folders: Array.from(new Set([...showcaseFolderState.folders, draft])) };
    setShowcaseFolderState(next);
    writeMediaFolderState("showcase", user.id, next);
    setShowcaseFolderDraft("");
  };

  const assignFolder = (kind: "profile" | "showcase", itemKey: string, folder: string) => {
    if (!user) return;
    const normalizedFolder = folder === "__unsorted__" ? "" : folder;
    if (kind === "profile") {
      const next = {
        ...profileFolderState,
        assignments: {
          ...profileFolderState.assignments,
          [itemKey]: normalizedFolder,
        },
      };
      setProfileFolderState(next);
      writeMediaFolderState("profile", user.id, next);
      return;
    }
    const next = {
      ...showcaseFolderState,
      assignments: {
        ...showcaseFolderState.assignments,
        [itemKey]: normalizedFolder,
      },
    };
    setShowcaseFolderState(next);
    writeMediaFolderState("showcase", user.id, next);
  };

  const showcasePickerType = creatorPickerTarget === "video"
    ? "video"
    : creatorPickerTarget === "hero" && currentBuilderMeta.heroMediaType === "video"
      ? "video"
      : "image";

  const pickerSelectedIds = creatorPickerTarget === "gallery"
    ? currentBuilderMeta.galleryItemIds || []
    : creatorPickerTarget === "video"
      ? currentBuilderMeta.videoItemIds || []
      : currentBuilderMeta.heroItemIds || [];

  const togglePickerSelection = (itemId: number) => {
    if (!creatorPickerTarget) return;
    const exists = pickerSelectedIds.includes(itemId);
    const nextIds = exists
      ? pickerSelectedIds.filter((id) => id !== itemId)
      : showcasePickerType === "video" && creatorPickerTarget === "hero"
        ? [itemId]
        : [...pickerSelectedIds, itemId];

    if (creatorPickerTarget === "gallery") {
      updateBuilderMeta({ galleryItemIds: nextIds });
    } else if (creatorPickerTarget === "video") {
      updateBuilderMeta({ videoItemIds: nextIds });
    } else {
      updateBuilderMeta({ heroItemIds: nextIds });
    }
  };

  const applyShowcaseSelection = () => {
    toast({
      title: "Section media selected",
      description: "Those showcase items are now assigned to the page section.",
    });
    returnToCreatorBuilder();
  };

  const saveBuilderProgress = async (sectionLabel?: string) => {
    if (!user) return;
    setSaveState((current) => ({ ...current, artistPage: "saving" }));
    try {
      await saveBasic.mutateAsync({
        userId: user.id,
        data: buildBasicPayload(),
      });
      await saveArtist.mutateAsync({
        userId: user.id,
        data: buildArtistPayload(),
      });
      await queryClient.refetchQueries({ queryKey: ["profile", user.id] });
      setActiveTab("creator");
      markSaved("artistPage");
      toast({
        title: sectionLabel ? `${sectionLabel} saved` : "Page builder saved",
        description: "Your changes were saved. Keep building whenever you’re ready.",
      });
    } catch {
      setSaveState((current) => ({ ...current, artistPage: "idle" }));
    }
  };

  const renderBuilderSaveAction = (label = "Save section") => (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        onClick={() => {
          void saveBuilderProgress(label.replace(/^Save\s+/i, "").replace(/\s+section$/i, ""));
        }}
        disabled={saveArtist.isPending || (isStarterCreatorSetup ? false : !artist.displayName?.trim())}
      >
        {saveState.artistPage === "saving" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
          </>
        ) : saveState.artistPage === "saved" ? (
          <>
            <Check className="mr-2 h-4 w-4" /> Saved
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );

  if (isLoading || !profile || !user) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const accent = creator.accentColor || basic.accentColor || "#8b5cf6";
  const previewBio = artist.bio || "Your profile preview updates live as you edit.";
  const previewInterests = String(basic.interests || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
  const useCreatorIdentityPreview = activeTab === "creator" && showCreatorTools;
  const headerBannerUrl = useCreatorIdentityPreview ? artist.bannerUrl : basic.bannerUrl;
  const headerAvatarUrl = useCreatorIdentityPreview ? artist.avatarUrl : basic.avatarUrl;
  const headerName = useCreatorIdentityPreview ? (artist.displayName || "Artist page name") : user.username;
  const headerLocation = useCreatorIdentityPreview
    ? formatPlace([artist.location])
    : formatPlace([basic.city, basic.location]);
  const selectedProfileTheme = PROFILE_THEME_STYLES[basic.themeName || "nocturne"] || PROFILE_THEME_STYLES.nocturne;
  const creatorPreviewMoodClass = CREATOR_MOOD_PREVIEW_STYLES[creator.moodPreset || "sleek"] || CREATOR_MOOD_PREVIEW_STYLES.sleek;
  const creatorPreviewFontClass = CREATOR_FONT_PREVIEW_CLASSES[creator.fontPreset || "modern"] || "";
  const creatorPreviewLayoutClass = creator.layoutTemplate === "editorial"
    ? "lg:grid-cols-[0.75fr_1.25fr]"
    : creator.layoutTemplate === "music"
      ? "lg:grid-cols-[1.3fr_0.7fr]"
      : creator.layoutTemplate === "performer"
        ? "lg:grid-cols-[0.9fr_1.1fr]"
        : creator.layoutTemplate === "shop"
          ? "lg:grid-cols-[1fr_1fr]"
          : "lg:grid-cols-[1.15fr_0.85fr]";
  const creatorPreviewLiveMood = CREATOR_MOOD_LIVE_STYLES[creator.moodPreset || "sleek"] || CREATOR_MOOD_LIVE_STYLES.sleek;
  const creatorPreviewHeadingClass = creator.fontPreset === "editorial"
    ? "font-serif tracking-tight"
    : creator.fontPreset === "mono"
      ? "font-mono uppercase tracking-[0.08em]"
      : "";
  const identityChecklist = [
    Boolean(artist.displayName?.trim()),
    Boolean(artist.avatarUrl?.trim()),
    Boolean(artist.bannerUrl?.trim()),
    Boolean(artist.category?.trim()),
    Boolean(artist.location?.trim()),
    Boolean(artist.tagline?.trim()),
    Boolean(artist.bookingEmail?.trim()),
  ];
  const identityCompletedCount = identityChecklist.filter(Boolean).length;
  const featuredSelectionLabel = creator.pinnedPostId
    ? "Pinned artist post"
    : creator.featuredType === "video"
      ? "Featured video"
      : creator.featuredType === "track"
        ? "Featured track"
        : creator.featuredType === "gallery"
          ? "Featured gallery"
          : creator.featuredType === "event"
            ? "Featured event"
            : creator.featuredType === "product"
              ? "Featured product"
              : creator.featuredType === "post"
                ? "Featured post"
                : "Featured highlight";
  const hasFeaturedSelection = Boolean(
    creator.pinnedPostId ||
    creator.featuredTitle?.trim() ||
    creator.featuredDescription?.trim() ||
    creator.featuredUrl?.trim(),
  );
  const showcaseItemCount = profile.artistProfile?.gallery?.length || 0;
  const primaryShowcaseTag = showcaseItemCount > 0 ? `${showcaseItemCount} media item${showcaseItemCount === 1 ? "" : "s"}` : "No media yet";
  const previewLinkItems = parseLinkItems();
  const previewServiceItems = parseServiceItems();
  const previewCustomDetails = parseCustomFields();
  const upcomingEventsCount = (events || []).filter((event) => {
    const eventTime = new Date(event.startsAt).getTime();
    return eventTime >= Date.now() && (event.host?.id === user.id || event.artists?.some((artistItem) => artistItem.id === user.id));
  }).length;
  const featuredPreviewCopy = creator.featuredDescription?.trim()
    || (creator.pinnedPostId
      ? "A pinned artist-page post will lead the page."
      : "Choose one visual or media highlight to lead the page.");
  const actionDescriptorMap: Record<string, string> = {
    "Book Me": "Best for DJs, performers, bands, and speakers taking bookings.",
    "Hire Me": "Best for photographers, designers, editors, and service-based creators.",
    "Contact Me": "Best for general inquiries and warm leads.",
    "Collaborate": "Best for artists, brands, and partnerships.",
    "Shop My Work": "Best for makers, product sellers, and boutique shops.",
    "Visit Store": "Best for brands and businesses sending traffic to a store or site.",
    "Commission Me": "Best for custom creative work and paid requests.",
    "Custom": "Use your own wording when the preset actions do not fit.",
  };
  const currentActionDescriptor = actionDescriptorMap[actionPreset] || actionDescriptorMap["Custom"];
  const currentMoodDescription = MOOD_DESCRIPTIONS[creator.moodPreset || "sleek"] || MOOD_DESCRIPTIONS.sleek;
  const currentLayoutDescription = LAYOUT_DESCRIPTIONS[creator.layoutTemplate || "portfolio"] || LAYOUT_DESCRIPTIONS.portfolio;
  const currentFontDescription = FONT_DESCRIPTIONS[creator.fontPreset || "modern"] || FONT_DESCRIPTIONS.modern;
  const builderSectionSummaries = {
    identity: `${identityCompletedCount}/${identityChecklist.length} core fields ready`,
    featured: hasFeaturedSelection ? `${featuredSelectionLabel} selected` : "No lead feature yet",
    content: `${primaryShowcaseTag} / ${linkedEvents.length} event${linkedEvents.length === 1 ? "" : "s"}`,
    work: creator.primaryActionLabel?.trim() ? creator.primaryActionLabel : "CTA not chosen yet",
    style: `${creator.moodPreset || "sleek"} / ${creator.layoutTemplate || "portfolio"}`,
    advanced: `${parseServiceItems().length} optional service item${parseServiceItems().length === 1 ? "" : "s"}`,
  } as const;
  const selectedBuilderBlockConfig = PAGE_BUILDER_BLOCKS.find((block) => block.key === selectedBuilderBlock) || PAGE_BUILDER_BLOCKS[0];
  const isHeroBlockSelected = selectedBuilderBlock === "hero";
  const isFeaturedBlockSelected = selectedBuilderBlock === "featured";
  const isGalleryBlockSelected = selectedBuilderBlock === "gallery";
  const isVideoBlockSelected = selectedBuilderBlock === "video";
  const isAudioBlockSelected = selectedBuilderBlock === "audio";
  const isLinksBlockSelected = selectedBuilderBlock === "links";
  const isEventsBlockSelected = selectedBuilderBlock === "events";
  const isAboutBlockSelected = selectedBuilderBlock === "about";
  const isContactBlockSelected = selectedBuilderBlock === "contact";
  const showcasePreviewItems = (profile.artistProfile?.gallery || []).slice(0, 5).map((item, index) => ({
    id: String(item.id || index),
    title: item.caption || `Media ${index + 1}`,
    imageUrl: item.url || undefined,
    mediaUrl: item.url || undefined,
    description: item.caption || undefined,
  }));
  const showcaseVideoItems = (profile.artistProfile?.gallery || [])
    .filter((item) => item.type === "video")
    .slice(0, 5)
    .map((item, index) => ({
      id: String(item.id || `video-${index}`),
      title: item.caption || `Video ${index + 1}`,
      url: item.url,
      thumbnail: item.url,
    }));
  const showcaseAudioTracks = (profile.artistProfile?.gallery || [])
    .filter((item) => item.type === "audio")
    .slice(0, 5)
    .map((item, index) => ({
      id: String(item.id || `audio-${index}`),
      title: item.caption || `Track ${index + 1}`,
      url: item.url,
    }));
  const linkPreviewCards = previewLinkItems.slice(0, 4).map((item, index) => ({
    id: `${item.label}-${index}`,
    label: item.label,
    url: item.url,
    kind: item.kind || undefined,
  }));
  const eventPreviewItems = linkedEvents.slice(0, 6).map((event) => ({
    id: String(event.id),
    title: event.title,
    startsAt: event.startsAt,
    location: event.location || undefined,
    description: event.description || undefined,
  }));
  const videoPreviewItems = creator.featuredType === "video" && creator.featuredUrl?.trim()
    ? [
        {
          id: "featured-video",
          title: creator.featuredTitle?.trim() || "Featured video",
          url: creator.featuredUrl.trim(),
          thumbnail: creator.featuredUrl.trim(),
        },
        ...showcaseVideoItems,
      ]
    : showcaseVideoItems;
  const audioPreviewTracks = creator.featuredType === "track" && creator.featuredUrl?.trim()
    ? [
        {
          id: "featured-track",
          title: creator.featuredTitle?.trim() || "Featured track",
          url: creator.featuredUrl.trim(),
        },
        ...showcaseAudioTracks,
      ]
    : showcaseAudioTracks;
  const visibleBuilderBlocks = PAGE_BUILDER_BLOCKS
    .filter((block) => getBuilderBlockVisible(block.key))
    .sort((left, right) => getBuilderBlockOrder(left.key) - getBuilderBlockOrder(right.key));
  const hiddenBuilderBlocks = PAGE_BUILDER_BLOCKS
    .filter((block) => !getBuilderBlockVisible(block.key))
    .sort((left, right) => PAGE_BUILDER_DEFAULT_ORDER[left.key] - PAGE_BUILDER_DEFAULT_ORDER[right.key]);
  const blockSummaryMap = {
    hero: builderSectionSummaries.identity,
    featured: builderSectionSummaries.featured,
    gallery: primaryShowcaseTag,
    video: videoPreviewItems.length > 0 ? `${videoPreviewItems.length} video item${videoPreviewItems.length === 1 ? "" : "s"}` : "No video block yet",
    audio: audioPreviewTracks.length > 0 ? `${audioPreviewTracks.length} audio item${audioPreviewTracks.length === 1 ? "" : "s"}` : "No audio block yet",
    links: `${previewLinkItems.length} link${previewLinkItems.length === 1 ? "" : "s"}`,
    events: `${linkedEvents.length} event${linkedEvents.length === 1 ? "" : "s"}`,
    about: artist.bio?.trim() ? "Story added" : `${parseCustomFields().length} extra detail${parseCustomFields().length === 1 ? "" : "s"}`,
    contact: builderSectionSummaries.work,
  } as const;
  const activeFeaturedType = creator.featuredType || "highlight";
  const featuredTypeConfig = FEATURED_TYPE_CONFIG[activeFeaturedType] || FEATURED_TYPE_CONFIG.highlight;
  const featuredEmbed = creator.featuredUrl?.trim() ? getEmbedDescriptor(creator.featuredUrl.trim()) : null;

  const getPreviewSectionPresentation = (sectionKey: string) => {
    const config = (sectionConfigs[sectionKey] || {}) as PreviewSectionConfig;
    const style = config.style || "default";
    const density = config.density || "comfortable";

    return {
      wrapperClassName: cn(
        "rounded-2xl border backdrop-blur transition-all",
        style === "default" && "border-white/15 bg-white/8 p-4",
        style === "minimal" && "border-white/10 bg-black/12 p-3",
        style === "highlighted" && "border-primary/35 bg-primary/15 p-4 shadow-[0_18px_40px_-30px_rgba(139,92,246,0.85)]",
      ),
      contentClassName: cn(
        density === "compact" && "space-y-2",
        density === "comfortable" && "space-y-3",
        density === "expanded" && "space-y-4",
      ),
      label: `${style} / ${density}`,
    };
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Tune your profile identity, creator page, and showcase presentation.</p>
      </div>

      <div className="mb-8 overflow-hidden rounded-3xl border border-border/50">
        <div
          className="relative min-h-64"
          style={{ background: `linear-gradient(135deg, ${accent}30, rgba(20,20,30,0.92) 40%, rgba(20,28,44,0.96))` }}
        >
          {headerBannerUrl && (
            <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${headerBannerUrl})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/10" />
          <div className="relative z-10 flex flex-col gap-6 px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end">
              <Avatar className="h-24 w-24 border-4 border-background shadow-2xl md:h-32 md:w-32">
                <AvatarImage src={headerAvatarUrl || ""} />
                <AvatarFallback>{headerName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">{user.profileType}</Badge>
                  {showCreatorTools && artist.category && <Badge variant="secondary">{artist.category}</Badge>}
                  {showCreatorTools && creator.primaryActionLabel && <Badge>{creator.primaryActionLabel}</Badge>}
                </div>
                <div className="text-3xl font-bold md:text-4xl">{headerName}</div>
                {showCreatorTools && artist.displayName && !useCreatorIdentityPreview ? (
                  <div className="mt-1 text-sm font-medium text-foreground/80">Artist page name: {artist.displayName}</div>
                ) : null}
                <div className="mt-2 text-sm text-muted-foreground">
                  {headerLocation || "Location preview"}
                </div>
                <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground">{previewBio}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {String(artist.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 6).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 border border-border/50 bg-card/50">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {showCreatorTools && <TabsTrigger value="creator">Creator Page</TabsTrigger>}
          <TabsTrigger value="photos">Photos</TabsTrigger>
          {showCreatorTools && <TabsTrigger value="gallery">Showcase</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Profile Identity</CardTitle>
              <CardDescription>Edit the public profile basics people expect to find first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div>
                  <Label>Profile photo</Label>
                  <p className="text-sm text-muted-foreground">Use a face photo, logo, or recognizable profile image.</p>
                </div>
                <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={basic.avatarUrl} />
                  <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="avatar-url">Image URL</Label>
                    <Input id="avatar-url" placeholder="https://..." value={basic.avatarUrl || ""} onChange={(e) => setBasic({ ...basic, avatarUrl: e.target.value })} />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files?.[0] || null, "avatar", (url) => setBasic((current) => ({ ...current, avatarUrl: url })))}
                      disabled={uploading.avatar}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner-url">Banner image</Label>
                    <Input id="banner-url" placeholder="https://..." value={basic.bannerUrl || ""} onChange={(e) => setBasic({ ...basic, bannerUrl: e.target.value })} />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files?.[0] || null, "banner", (url) => setBasic((current) => ({ ...current, bannerUrl: url })))}
                      disabled={uploading.banner}
                    />
                  </div>
                </div>
              </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline / short bio</Label>
                  <Input id="headline" placeholder="What should people understand about you immediately?" value={basic.bio || ""} onChange={(e) => setBasic({ ...basic, bio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-location">City / state</Label>
                  <LocationInput
                    value={formatCityRegion(basic.city, basic.location)}
                    placeholder="Los Angeles, California"
                    onValueChange={(value) => {
                      const parsed = parseCityRegion(value);
                      setBasic({ ...basic, city: parsed.city, location: parsed.region });
                    }}
                    onOptionSelect={(option) => setBasic({ ...basic, city: option.city, location: option.region })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" min="13" max="120" placeholder="27" value={basic.age || ""} onChange={(e) => setBasic({ ...basic, age: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Profile theme</Label>
                  <Select value={basic.themeName || "nocturne"} onValueChange={(value) => setBasic({ ...basic, themeName: value })}>
                    <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {THEME_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">This changes the look of your personal profile header and cards.</p>
                  <div className="grid gap-3 pt-2 md:grid-cols-3">
                    {THEME_OPTIONS.map((theme) => {
                      const preview = PROFILE_THEME_STYLES[theme.value];
                      const active = (basic.themeName || "nocturne") === theme.value;
                      return (
                        <button
                          key={theme.value}
                          type="button"
                          onClick={() => setBasic({ ...basic, themeName: theme.value })}
                          className={cn("overflow-hidden rounded-2xl border text-left transition-all", active ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/30")}
                        >
                          <div className={cn("bg-gradient-to-br p-4 text-white", preview.shell)}>
                            <div className="text-sm font-semibold">{theme.label}</div>
                            <div className="mt-1 text-xs text-white/75">{preview.label}</div>
                            <div className={cn("mt-4 rounded-xl border p-3", preview.card)}>
                              <div className="text-sm font-medium">{user.username}</div>
                              <div className="mt-1 text-xs text-white/70">{formatPlace([basic.city, basic.location]) || "Los Angeles, California"}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="work">Work</Label>
                  <Input id="work" placeholder="Event promoter, photographer, designer, etc." value={basic.work || ""} onChange={(e) => setBasic({ ...basic, work: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  <Input id="school" placeholder="School, training, or leave blank" value={basic.school || ""} onChange={(e) => setBasic({ ...basic, school: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About you</Label>
                <Textarea id="about" placeholder="Tell people who you are, what you care about, and what kind of work or scene you are part of." value={basic.about || ""} onChange={(e) => setBasic({ ...basic, about: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests</Label>
                <Input id="interests" placeholder="music, nightlife, gallery openings, fashion, tattoos" value={basic.interests || ""} onChange={(e) => setBasic({ ...basic, interests: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="featured-content">Featured note</Label>
                <Textarea id="featured-content" placeholder="A short callout, announcement, or profile highlight." value={basic.featuredContent || ""} onChange={(e) => setBasic({ ...basic, featuredContent: e.target.value })} />
              </div>

              <div className="space-y-3 rounded-2xl border border-border/50 bg-background/30 p-4">
                <div>
                  <Label htmlFor="accent-color">Accent color</Label>
                  <p className="text-sm text-muted-foreground">This controls the glow and highlight color on your profile. The old hex code field is now just a color picker.</p>
                </div>
                <div className="flex items-center gap-4">
                  <Input id="accent-color" type="color" className="h-12 w-20 p-1" value={basic.accentColor || "#8b5cf6"} onChange={(e) => setBasic({ ...basic, accentColor: e.target.value })} />
                  <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm text-muted-foreground">{basic.accentColor || "#8b5cf6"}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="links">Links</Label>
                <p className="text-sm text-muted-foreground">One link per line in the format `Label|https://url`.</p>
                <Textarea id="links" placeholder={"Portfolio|https://your-site.com\nInstagram|https://instagram.com/you"} value={basic.links || ""} onChange={(e) => setBasic({ ...basic, links: e.target.value })} />
              </div>

              {previewInterests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previewInterests.map((interest) => <Badge key={interest} variant="secondary">{interest}</Badge>)}
                </div>
              )}

              <Button
                onClick={async () => {
                  setSaveState((current) => ({ ...current, profile: "saving" }));
                  try {
                    await saveBasic.mutateAsync({
                      userId: user.id,
                      data: {
                        ...basic,
                        age: basic.age ? Number(basic.age) : null,
                        interests: String(basic.interests || "")
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                        links: String(basic.links || "")
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [label, url] = line.split("|");
                            return { label: label?.trim() || "Link", url: url?.trim() || label?.trim() || "" };
                          }),
                      },
                    });
                    markSaved("profile");
                  } catch {
                    setSaveState((current) => ({ ...current, profile: "idle" }));
                  }
                }}
                disabled={saveBasic.isPending || uploading.avatar || uploading.banner}
              >
                {saveState.profile === "saving" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : saveState.profile === "saved" ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Saved
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>

              {!hasArtistPage && (
                <div className="rounded-2xl border border-border/50 bg-background/30 p-5">
                  <div className="text-lg font-semibold">Create a linked artist page</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Keep this personal profile for you, and add a separate artist page for your work, media, and booking info.
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => {
                      setIsCreatingArtistPage(true);
                      setCreatorSetupStage("starter");
                      setActiveTab("creator");
                      setArtist((current) => ({
                        ...current,
                        category: current.category || "General Creator",
                        location: current.location || basic.location || "",
                        bio: current.bio || basic.about || basic.bio || "",
                        avatarUrl: current.avatarUrl || "",
                        bannerUrl: current.bannerUrl || "",
                      }));
                    }}
                  >
                    Create Artist Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showCreatorTools && (
          <TabsContent value="creator">
            <CreatorPageBuilder
              userId={user.id}
              username={user.username}
              hasArtistPage={hasArtistPage}
              creatorBuilderView={creatorBuilderView}
              setCreatorBuilderView={setCreatorBuilderView}
              artist={artist}
              setArtist={setArtist}
              creator={creator}
              setCreator={setCreator}
              galleryItems={profile?.artistProfile?.gallery || []}
              linkedEvents={linkedEvents.map((event) => ({
                id: event.id,
                title: event.title,
                startsAt: event.startsAt,
                location: event.location,
                description: event.description || null,
              }))}
              artistPostsCount={artistPosts.length}
              saveStatus={saveState.artistPage}
              onSave={() => { void saveBuilderProgress("Page"); }}
              onOpenPublicPage={() => setLocation(`/artists/${user.id}`)}
              onOpenShowcase={openCreatorShowcase}
              onUploadImage={handleImageUpload}
              uploading={uploading}
            />
            <div className="hidden">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.05fr_0.9fr]">
              <Card className="border-border/50 bg-card/70 shadow-sm xl:col-span-3">
                <CardContent className="flex flex-col gap-4 p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                      <div className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                        Build Your Page
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">Build a public creator page section by section.</h2>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                          This is now a page builder, not a settings form. Choose a block on the canvas, edit only what belongs to it, and keep the live preview visible while you shape the page.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setLocation(`/artists/${user.id}`)} disabled={!hasArtistPage}>
                        Preview Artist Page
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setLocation(`/artists/${user.id}`)} disabled={!hasArtistPage}>
                        View Public Page
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:hidden">
                    <div className="text-sm font-medium">Builder mode</div>
                    <div className="inline-flex rounded-full border border-border/60 bg-background/60 p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={creatorBuilderView === "edit" ? "default" : "ghost"}
                        className="rounded-full"
                        onClick={() => setCreatorBuilderView("edit")}
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={creatorBuilderView === "preview" ? "default" : "ghost"}
                        className="rounded-full"
                        onClick={() => setCreatorBuilderView("preview")}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={cn("border-border/50 bg-card/50", creatorBuilderView === "preview" && "hidden md:block")}>
                <CardHeader>
                  <CardTitle>Page canvas</CardTitle>
                  <CardDescription>These blocks represent the public page. Pick one to configure it in the inspector.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-3xl border border-border/50 bg-background/35 p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
                        <AvatarImage src={artist.avatarUrl || ""} />
                        <AvatarFallback>{(artist.displayName || user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold">{artist.displayName || "Artist page name"}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{artist.tagline || "Short tagline or first impression"}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">{artist.category || "General Creator"}</Badge>
                          <Badge variant="outline">{formatPlace([artist.location, basic.city, basic.location]) || "Location"}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Global identity stays minimal here: name, tagline, category, location, profile image, and banner.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Sections on your page</div>
                        <div className="text-sm text-muted-foreground">Select a block to edit just that part of the page. Hide what you do not need and add it back later.</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{visibleBuilderBlocks.length} active</Badge>
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSectionOpen((current) => !current)}>
                          <Plus className="mr-2 h-4 w-4" /> Add Section
                        </Button>
                      </div>
                    </div>
                    {isAddSectionOpen ? (
                      <div className="rounded-3xl border border-border/50 bg-background/25 p-4">
                        <div className="mb-3">
                          <div className="text-sm font-semibold">Add a section</div>
                          <div className="mt-1 text-sm text-muted-foreground">Bring hidden sections back onto the page as visual blocks.</div>
                        </div>
                        {hiddenBuilderBlocks.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {hiddenBuilderBlocks.map((block) => (
                              <button
                                key={block.key}
                                type="button"
                                onClick={() => setBuilderBlockVisibility(block.key, true)}
                                className="rounded-2xl border border-dashed border-border/60 bg-background/20 p-4 text-left transition-all hover:border-primary/30 hover:bg-background/40"
                              >
                                <div className="text-sm font-semibold">{block.label}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{block.description}</div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">All available sections are already active.</div>
                        )}
                      </div>
                    ) : null}
                    <div className="grid gap-3">
                      {visibleBuilderBlocks.map((block, index) => {
                        const active = selectedBuilderBlock === block.key;
                        const removable = block.key !== "hero";
                        const isConfigured = block.key === "hero"
                          ? identityCompletedCount > 0
                          : block.key === "featured"
                            ? hasFeaturedSelection
                            : block.key === "gallery"
                              ? showcaseItemCount > 0
                              : block.key === "video"
                                ? creator.featuredType === "video" && Boolean(creator.featuredUrl?.trim())
                                : block.key === "audio"
                                  ? creator.featuredType === "track" && Boolean(creator.featuredUrl?.trim())
                                  : block.key === "links"
                                    ? previewLinkItems.length > 0
                                    : block.key === "events"
                                      ? linkedEvents.length > 0
                                      : block.key === "about"
                                        ? Boolean(artist.bio?.trim() || parseCustomFields().length)
                                        : Boolean(creator.primaryActionLabel?.trim());
                        return (
                          <button
                            key={block.key}
                            type="button"
                            onClick={() => selectBuilderBlock(block.key)}
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-all",
                              active
                                ? "border-primary bg-primary/8 shadow-sm ring-1 ring-primary/20"
                                : "border-border/50 bg-background/35 hover:border-primary/30 hover:bg-background/50",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">{block.label}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{block.description}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{index + 1}</Badge>
                                <Badge variant={isConfigured ? "secondary" : "outline"}>{isConfigured ? "Ready" : "Empty"}</Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  disabled={index === 0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    moveBuilderBlock(block.key, "up");
                                  }}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  disabled={index === visibleBuilderBlocks.length - 1}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    moveBuilderBlock(block.key, "down");
                                  }}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                {removable ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setBuilderBlockVisibility(block.key, false);
                                    }}
                                  >
                                    Hide
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-3 text-xs font-medium text-foreground/80">{blockSummaryMap[block.key]}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn("border-border/50 bg-card/50", creatorBuilderView === "preview" && "hidden md:block")}>
                <CardHeader>
                  <CardTitle>{selectedBuilderBlockConfig.label}</CardTitle>
                  <CardDescription>
                    {selectedBuilderBlockConfig.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation(`/artists/${user.id}`)}
                      disabled={!hasArtistPage}
                    >
                      Preview Artist Page
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setLocation(`/artists/${user.id}`)}
                      disabled={!hasArtistPage}
                    >
                      View Public Page
                    </Button>
                  </div>
                  {!hasArtistPage && (
                    <div className="text-sm text-muted-foreground">
                      Save the artist page once, then use Preview Artist Page to see what visitors will see.
                    </div>
                  )}
                  {isStarterCreatorSetup && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="text-sm font-medium">Starter builder flow</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Launch the page with the basics first: page name, category, location, tagline, tags, and contact email. After that, use Edit Artist Page for media, featured content, events, and styling.
                      </div>
                    </div>
                  )}
                  {activeBuilderSection === "identity" && isHeroBlockSelected && (
                    <>
                      <div id="builder-section-identity" className="space-y-4 rounded-3xl border border-primary/30 bg-background/30 p-5 ring-1 ring-primary/15">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Global identity</div>
                          <div className="mt-2 text-sm font-semibold">These are the only fields that apply to the whole page.</div>
                          <div className="mt-1 text-sm text-muted-foreground">Name, tagline, category, location, profile image, and banner live here. Everything else belongs to a page block.</div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                          <div>
                            <div className="text-sm font-medium">Quick-start progress</div>
                            <div className="text-sm text-muted-foreground">Complete the first-impression fields to launch a credible page fast.</div>
                          </div>
                          <Badge variant="secondary">{identityCompletedCount} / {identityChecklist.length} complete</Badge>
                        </div>
                        <div className="rounded-3xl border border-border/50 bg-background/40 p-5">
                          <div className="flex flex-col gap-5 md:flex-row md:items-center">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                              <AvatarImage src={artist.avatarUrl || ""} />
                              <AvatarFallback>{(artist.displayName || user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Profile image</Label>
                                <Input placeholder="https://..." value={artist.avatarUrl || ""} onChange={(e) => setArtist({ ...artist, avatarUrl: e.target.value })} />
                                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0] || null, "avatar", (url) => setArtist((current) => ({ ...current, avatarUrl: url })))} disabled={uploading.avatar} />
                              </div>
                              <div className="space-y-2">
                                <Label>Banner image</Label>
                                <Input placeholder="https://..." value={artist.bannerUrl || ""} onChange={(e) => setArtist({ ...artist, bannerUrl: e.target.value })} />
                                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0] || null, "banner", (url) => setArtist((current) => ({ ...current, bannerUrl: url })))} disabled={uploading.banner} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 rounded-2xl border border-border/50 bg-background/30 p-4">
                          <div className="flex flex-col gap-1">
                            <Label>What kind of page are you building?</Label>
                            <p className="text-sm text-muted-foreground">Choose the closest archetype to get stronger defaults for category, CTA, and how this page should read.</p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {PAGE_ARCHETYPES.map((item) => {
                              const active = selectedArchetype.key === item.key;
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => {
                                    setArtist((current) => ({
                                      ...current,
                                      category: item.category,
                                      tagline: current.tagline?.trim() ? current.tagline : item.tagline,
                                    }));
                                    setCreator((current) => ({
                                      ...current,
                                      pageType: "creator",
                                      pageArchetype: item.key,
                                      primaryActionLabel: current.primaryActionLabel?.trim() ? current.primaryActionLabel : item.cta,
                                      primaryActionType: actionTypeFromLabel(item.cta),
                                    }));
                                  }}
                                  className={cn(
                                    "rounded-2xl border px-4 py-4 text-left transition-all",
                                    active ? "border-primary bg-primary/8 shadow-sm ring-1 ring-primary/20" : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                                  )}
                                >
                                  <div className="text-sm font-semibold">{item.label}</div>
                                  <div className="mt-1 text-xs text-primary/80">{item.cta}</div>
                                  <div className="mt-3 text-sm text-muted-foreground">{item.descriptor}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Artist page name</Label>
                            <Input placeholder="Rancid" value={artist.displayName || ""} onChange={(e) => setArtist({ ...artist, displayName: e.target.value })} />
                            <p className="text-xs text-muted-foreground">This public page name can be different from your personal account name.</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={artist.category || "General Creator"} onValueChange={(value) => setArtist({ ...artist, category: value })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{CREATOR_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Base location</Label>
                            <LocationInput value={artist.location || ""} placeholder="Los Angeles, California" onValueChange={(value) => setArtist({ ...artist, location: value })} onOptionSelect={(option) => setArtist({ ...artist, location: option.label })} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Hero tagline</Label>
                          <Input placeholder={selectedArchetype.tagline} value={artist.tagline || ""} onChange={(e) => setArtist({ ...artist, tagline: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Discovery tags</Label>
                          <Input placeholder="techno, darkwave, latex, portraits" value={artist.tags || ""} onChange={(e) => setArtist({ ...artist, tags: e.target.value })} />
                        </div>
                        {isStarterCreatorSetup && (
                          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                            <div className="text-sm font-medium">More options appear after the page exists</div>
                            <div className="mt-1 text-sm text-muted-foreground">Create the page with the essentials first, then come back for featured content, media, events, actions, and styling.</div>
                            <div className="mt-4 flex justify-end">
                              <Button type="button" variant="outline" onClick={() => setCreatorSetupStage("advanced")}>
                                Show Advanced Fields
                              </Button>
                            </div>
                          </div>
                        )}
                        {renderBuilderSaveAction(isStarterCreatorSetup ? "Create page" : "Save hero")}
                      </div>
                    </>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "work" && isContactBlockSelected && (
                    <>
                    <div id="builder-section-work" className={cn("rounded-2xl border bg-background/30 p-4 transition-all", activeBuilderSection === "work" ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50")}>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Work & Contact</div>
                      <div className="mt-1 text-sm text-muted-foreground">Shape the conversion layer: what visitors should do, where that action goes, and what services this page offers.</div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-3xl border border-border/50 bg-background/30 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">Primary CTA</div>
                        <div className="mt-3 text-lg font-semibold">{creator.primaryActionLabel || "Contact Me"}</div>
                        <div className="mt-2 text-sm text-muted-foreground">{currentActionDescriptor}</div>
                      </div>
                      <div className="rounded-3xl border border-border/50 bg-background/30 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">Contact path</div>
                        <div className="mt-3 text-lg font-semibold">{artist.bookingEmail?.trim() || "Add a contact route"}</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {artist.bookingEmail?.trim()
                            ? "Visitors will have a clear contact destination from the page."
                            : "Add an email or external destination so the CTA goes somewhere real."}
                        </div>
                      </div>
                    </div>
                    </>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "work" && isContactBlockSelected && (
                    <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                      <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                        <div className="text-sm font-semibold">Build the action block</div>
                        <div className="mt-1 text-sm text-muted-foreground">Set the one primary action visitors should take first. Message stays the built-in secondary action.</div>
                      </div>
                      <div className="space-y-3 rounded-2xl border border-border/50 bg-background/30 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 1: Choose the primary action</div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {ACTION_OPTIONS.map((item) => {
                          const active = actionPreset === item;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setCreator({
                                  ...creator,
                                  primaryActionLabel: item,
                                  primaryActionType: actionTypeFromLabel(item),
                                });
                              }}
                              className={cn(
                                "rounded-2xl border px-4 py-4 text-left text-sm transition-all",
                                active
                                  ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                                  : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                              )}
                            >
                              <div className="font-medium">{item}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{actionDescriptorMap[item]}</div>
                              </button>
                          );
                        })}
                        </div>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 2: Where it goes</div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Primary action preset</Label>
                              <Select
                                value={actionPreset}
                                onValueChange={(value) => {
                                  if (value === "Custom") {
                                    setCreator({
                                      ...creator,
                                      primaryActionLabel: creator.primaryActionLabel && !ACTION_OPTIONS.includes(creator.primaryActionLabel) ? creator.primaryActionLabel : "",
                                      primaryActionType: actionTypeFromLabel(creator.primaryActionLabel || "contact"),
                                    });
                                    return;
                                  }
                                  setCreator({
                                    ...creator,
                                    primaryActionLabel: value,
                                    primaryActionType: actionTypeFromLabel(value),
                                  });
                                }}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{ACTION_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Primary action destination</Label>
                              <Input placeholder={actionPreset === "Shop My Work" || actionPreset === "Visit Store" ? "https://your-store.com" : "Store, booking form, or external URL"} value={creator.primaryActionUrl || ""} onChange={(e) => setCreator({ ...creator, primaryActionUrl: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Contact email</Label>
                              <Input placeholder={selectedArchetype.cta === "Shop My Work" || selectedArchetype.cta === "Visit Store" ? "hello@yourbrand.com" : "bookings@example.com"} value={artist.bookingEmail || ""} onChange={(e) => setArtist({ ...artist, bookingEmail: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Availability</Label>
                              <Input placeholder="Available now / booking summer / waitlist only" value={artist.availabilityStatus || ""} onChange={(e) => setArtist({ ...artist, availabilityStatus: e.target.value })} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 3: What you offer</div>
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label>Pricing summary</Label>
                              <Input placeholder="$300 portraits / custom quotes for campaigns" value={creator.pricingSummary || ""} onChange={(e) => setCreator({ ...creator, pricingSummary: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Turnaround / delivery info</Label>
                              <Input placeholder="3-5 business days / rush available" value={creator.turnaroundInfo || ""} onChange={(e) => setCreator({ ...creator, turnaroundInfo: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 rounded-2xl border border-border/50 bg-background/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <Label>Services / offerings</Label>
                          <Badge variant="outline">{previewServiceItems.length} item{previewServiceItems.length === 1 ? "" : "s"}</Badge>
                        </div>
                        <div className="space-y-3 rounded-2xl border border-border/50 bg-background/20 p-3">
                          {previewServiceItems.length > 0 ? previewServiceItems.map((item, index) => (
                            <div key={`${item.title}-${index}`} className="grid gap-3 rounded-2xl border border-border/50 bg-background/30 p-3">
                              <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
                                <Input value={item.title} onChange={(e) => updateServiceItemAt(index, { title: e.target.value })} placeholder="Service title" />
                                <Input value={item.description || ""} onChange={(e) => updateServiceItemAt(index, { description: e.target.value })} placeholder="Short description" />
                              </div>
                              <div className="grid gap-3 md:grid-cols-[0.8fr_0.8fr_auto]">
                                <Input value={item.price || ""} onChange={(e) => updateServiceItemAt(index, { price: e.target.value })} placeholder="$300" />
                                <Input value={item.turnaround || ""} onChange={(e) => updateServiceItemAt(index, { turnaround: e.target.value })} placeholder="5 days" />
                                <Button type="button" variant="outline" size="icon" onClick={() => removeServiceItemAt(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )) : (
                            <div className="text-sm text-muted-foreground">No services added yet.</div>
                          )}
                          <div className="grid gap-3 rounded-2xl border border-dashed border-border/60 bg-background/10 p-3">
                            <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
                              <Input value={serviceDraft.title} onChange={(e) => setServiceDraft((current) => ({ ...current, title: e.target.value }))} placeholder="Portrait session" />
                              <Input value={serviceDraft.description} onChange={(e) => setServiceDraft((current) => ({ ...current, description: e.target.value }))} placeholder="Up to 2 looks" />
                            </div>
                            <div className="grid gap-3 md:grid-cols-[0.8fr_0.8fr_auto]">
                              <Input value={serviceDraft.price} onChange={(e) => setServiceDraft((current) => ({ ...current, price: e.target.value }))} placeholder="$300" />
                              <Input value={serviceDraft.turnaround} onChange={(e) => setServiceDraft((current) => ({ ...current, turnaround: e.target.value }))} placeholder="5 days" />
                              <Button type="button" onClick={addServiceItemFromDraft} disabled={!serviceDraft.title.trim()}>
                                <Plus className="mr-2 h-4 w-4" /> Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {renderBuilderSaveAction("Save contact")}
                    </div>
                  )}

                  {!isStarterCreatorSetup && isContactBlockSelected && actionPreset === "Custom" && (
                    <div className="space-y-2 rounded-2xl border border-border/50 bg-background/25 p-4">
                      <Label>Custom button label</Label>
                      <Input placeholder="Commission Me" value={creator.primaryActionLabel || ""} onChange={(e) => setCreator({ ...creator, primaryActionLabel: e.target.value })} />
                    </div>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "advanced" && isLinksBlockSelected && (
                    <div id="builder-section-advanced" className="space-y-4 rounded-3xl border border-primary/40 bg-background/25 p-5 ring-1 ring-primary/20">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Links / Shop</div>
                        <div className="mt-2 text-sm font-semibold">Add the destinations visitors should click next</div>
                        <div className="mt-1 text-sm text-muted-foreground">Use this block for portfolio links, store links, socials, booking pages, and other external destinations.</div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {["portfolio", "shop", "social"].map((kind) => (
                          <div key={kind} className="rounded-2xl border border-border/50 bg-background/30 p-4">
                            <div className="text-sm font-semibold capitalize">{kind}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {kind === "portfolio" ? "Send visitors to your work." : kind === "shop" ? "Drive people to merch or booking." : "Link social channels that support the page."}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3 rounded-2xl border border-border/50 bg-background/20 p-3">
                        {previewLinkItems.length > 0 ? previewLinkItems.map((item, index) => (
                          <div key={`${item.label}-${index}`} className="grid gap-3 rounded-2xl border border-border/50 bg-background/30 p-3">
                            <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_0.8fr_auto]">
                              <Input value={item.label} onChange={(e) => updateLinkItemAt(index, { label: e.target.value })} placeholder="Label" />
                              <Input value={item.url} onChange={(e) => updateLinkItemAt(index, { url: e.target.value })} placeholder="https://example.com" />
                              <Input value={item.kind || ""} onChange={(e) => updateLinkItemAt(index, { kind: e.target.value })} placeholder="portfolio / shop / social" />
                              <Button type="button" variant="outline" size="icon" onClick={() => removeLinkItemAt(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )) : (
                          <div className="text-sm text-muted-foreground">No links added yet.</div>
                        )}
                        <div className="grid gap-3 rounded-2xl border border-dashed border-border/60 bg-background/10 p-3 md:grid-cols-[0.9fr_1.2fr_0.8fr_auto]">
                          <Input value={linkDraft.label} onChange={(e) => setLinkDraft((current) => ({ ...current, label: e.target.value }))} placeholder="Portfolio" />
                          <Input value={linkDraft.url} onChange={(e) => setLinkDraft((current) => ({ ...current, url: e.target.value }))} placeholder="https://example.com" />
                          <Input value={linkDraft.kind} onChange={(e) => setLinkDraft((current) => ({ ...current, kind: e.target.value }))} placeholder="kind" />
                          <Button type="button" onClick={addLinkItemFromDraft} disabled={!linkDraft.url.trim()}>
                            <Plus className="mr-2 h-4 w-4" /> Add
                          </Button>
                        </div>
                      </div>
                      {renderBuilderSaveAction("Save links")}
                    </div>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "advanced" && isAboutBlockSelected && (
                    <div id="builder-section-advanced" className="space-y-4 rounded-3xl border border-primary/40 bg-background/25 p-5 ring-1 ring-primary/20">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">About</div>
                        <div className="mt-2 text-sm font-semibold">Tell people who this page is and what it is really about</div>
                        <div className="mt-1 text-sm text-muted-foreground">Use this block for story, influences, context, and simple labeled details. Keep it human and specific.</div>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Story</div>
                          <div className="space-y-2">
                            <Label>Creator bio</Label>
                            <Textarea placeholder="Tell visitors what you make, what you care about, and what kind of work they can expect here." value={artist.bio || ""} onChange={(e) => setArtist({ ...artist, bio: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Influences / inspirations</Label>
                            <Textarea placeholder="Scenes, artists, references, moods, or eras that shape your work." value={artist.influences || ""} onChange={(e) => setArtist({ ...artist, influences: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Signals</div>
                          <div className="space-y-2">
                            <Label>Agency / manager / representation</Label>
                            <Input placeholder="Represented by Night Office" value={artist.representedBy || ""} onChange={(e) => setArtist({ ...artist, representedBy: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Years active</Label>
                            <Input placeholder="8 years" value={artist.yearsActive || ""} onChange={(e) => setArtist({ ...artist, yearsActive: e.target.value })} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 rounded-2xl border border-border/50 bg-background/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <Label>Extra details</Label>
                          <Badge variant="outline">{previewCustomDetails.length} item{previewCustomDetails.length === 1 ? "" : "s"}</Badge>
                        </div>
                        <div className="space-y-3 rounded-2xl border border-border/50 bg-background/20 p-3">
                          <div className="text-sm text-muted-foreground">
                            Add simple labeled text only, like <span className="font-medium text-foreground">Genres</span>, <span className="font-medium text-foreground">Best for</span>, <span className="font-medium text-foreground">Base</span>, or <span className="font-medium text-foreground">Materials</span>. This is not for links, embeds, or code.
                          </div>
                          {previewCustomDetails.length > 0 ? previewCustomDetails.map((item, index) => (
                            <div key={`${item.label}-${index}`} className="grid gap-3 rounded-2xl border border-border/50 bg-background/30 p-3">
                              <div className="grid gap-3 md:grid-cols-[0.9fr_1.3fr_auto]">
                                <Input value={item.label} onChange={(e) => updateCustomFieldAt(index, { label: e.target.value })} placeholder="Genres" />
                                <Input value={item.value} onChange={(e) => updateCustomFieldAt(index, { value: e.target.value })} placeholder="Industrial, EBM, Warehouse" />
                                <Button type="button" variant="outline" size="icon" onClick={() => removeCustomFieldAt(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )) : (
                            <div className="text-sm text-muted-foreground">No extra details added yet.</div>
                          )}
                          <div className="grid gap-3 rounded-2xl border border-dashed border-border/60 bg-background/10 p-3 md:grid-cols-[0.9fr_1.3fr_auto]">
                            <Input value={detailDraft.label} onChange={(e) => setDetailDraft((current) => ({ ...current, label: e.target.value }))} placeholder="Best for" />
                            <Input value={detailDraft.value} onChange={(e) => setDetailDraft((current) => ({ ...current, value: e.target.value }))} placeholder="Warehouse bookings and one-off nights" />
                            <Button type="button" onClick={addCustomFieldFromDraft} disabled={!detailDraft.label.trim() && !detailDraft.value.trim()}>
                              <Plus className="mr-2 h-4 w-4" /> Add
                            </Button>
                          </div>
                        </div>
                      </div>
                      <details className="rounded-2xl border border-border/50 bg-background/30 p-4">
                        <summary className="cursor-pointer list-none text-sm font-medium">Optional page details</summary>
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Pronouns</Label>
                              <Input placeholder="she/her" value={artist.pronouns || ""} onChange={(e) => setArtist({ ...artist, pronouns: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Availability notes</Label>
                              <Input placeholder="Weekends only / accepting commissions" value={artist.availabilityStatus || ""} onChange={(e) => setArtist({ ...artist, availabilityStatus: e.target.value })} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <label className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                              <Checkbox checked={creator.openForCommissions === "true"} onCheckedChange={(checked) => setCreator({ ...creator, openForCommissions: checked ? "true" : "false" })} />
                              <span className="text-sm">Open for commissions</span>
                            </label>
                            <label className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                              <Checkbox checked={creator.touring === "true"} onCheckedChange={(checked) => setCreator({ ...creator, touring: checked ? "true" : "false" })} />
                              <span className="text-sm">Touring</span>
                            </label>
                            <label className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                              <Checkbox checked={creator.acceptsCollaborations !== "false"} onCheckedChange={(checked) => setCreator({ ...creator, acceptsCollaborations: checked ? "true" : "false" })} />
                              <span className="text-sm">Accepts collaborations</span>
                            </label>
                          </div>
                        </div>
                      </details>
                      {renderBuilderSaveAction("Save about")}
                    </div>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "content" && (
                    <>
                    <div id="builder-section-content" className={cn("rounded-2xl border bg-background/30 p-4 transition-all", activeBuilderSection === "content" ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50")}>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Content</div>
                      <div className="mt-1 text-sm text-muted-foreground">Edit one content block at a time. Each block controls a specific public page section.</div>
                    </div>
                    {isGalleryBlockSelected ? (
                      <div className="rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Media gallery block</div>
                            <div className="mt-1 text-sm text-muted-foreground">This block turns showcase images into a gallery-first section on the page.</div>
                          </div>
                          <Button type="button" variant="outline" onClick={() => setActiveTab("gallery")}>Open Showcase Manager</Button>
                        </div>
                        <BuilderMediaGallery items={showcasePreviewItems} />
                        <div className="mt-4">
                          {renderBuilderSaveAction("Save gallery")}
                        </div>
                      </div>
                    ) : null}
                    {isVideoBlockSelected ? (
                      <div className="rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Video playlist block</div>
                            <div className="mt-1 text-sm text-muted-foreground">Feature a lead video and let supporting video items stack underneath.</div>
                          </div>
                          <Button type="button" variant="outline" onClick={() => focusBuilderSection("featured")}>Edit featured video</Button>
                        </div>
                        <BuilderVideoPlaylist items={videoPreviewItems} />
                        <div className="mt-4">
                          {renderBuilderSaveAction("Save video")}
                        </div>
                      </div>
                    ) : null}
                    {isAudioBlockSelected ? (
                      <div className="rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Audio player block</div>
                            <div className="mt-1 text-sm text-muted-foreground">Lead with a featured track or use audio items from your showcase media.</div>
                          </div>
                          <Button type="button" variant="outline" onClick={() => focusBuilderSection("featured")}>Edit featured track</Button>
                        </div>
                        <BuilderAudioPlayer tracks={audioPreviewTracks} />
                        <div className="mt-4">
                          {renderBuilderSaveAction("Save audio")}
                        </div>
                      </div>
                    ) : null}
                    {isEventsBlockSelected ? (
                      <div className="rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Events block</div>
                            <div className="mt-1 text-sm text-muted-foreground">Upcoming appearances and linked events will render here as a dedicated page section.</div>
                          </div>
                          <Button type="button" variant="outline" onClick={() => setLocation("/events")}>Open Events Manager</Button>
                        </div>
                        <BuilderEventCarousel items={eventPreviewItems} />
                        <div className="mt-4">
                          {renderBuilderSaveAction("Save events")}
                        </div>
                      </div>
                    ) : null}
                    </>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "featured" && isFeaturedBlockSelected && (
                    <div id="builder-section-featured" className={cn("space-y-4 rounded-3xl border bg-background/25 p-5 transition-all", activeBuilderSection === "featured" ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50")}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Featured Content</div>
                          <div className="mt-2 text-sm font-semibold">Choose the one thing people should notice first</div>
                          <div className="mt-1 text-sm text-muted-foreground">This is the page lead. Pick the content type first, then add the matching title, description, or link.</div>
                        </div>
                        <Badge variant="secondary">{featuredSelectionLabel}</Badge>
                      </div>

                      <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 1: Choose the lead format</div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {FEATURED_TYPES.map((item) => {
                          const active = (creator.featuredType || "highlight") === item;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setCreator({ ...creator, featuredType: item })}
                              className={cn(
                                "rounded-2xl border px-4 py-4 text-left text-sm transition-all",
                                active
                                  ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                                  : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                              )}
                            >
                              <div className="font-medium">{FEATURED_TYPE_CONFIG[item]?.label || item}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{FEATURED_TYPE_CONFIG[item]?.short || "General highlight"}</div>
                              </button>
                          );
                        })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <div className="text-sm font-medium">{featuredTypeConfig.label}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{featuredTypeConfig.description}</div>
                        <div className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {activeFeaturedType === "gallery"
                            ? "Use Showcase Manager for images, video, and audio."
                            : activeFeaturedType === "event"
                              ? "Use Events Manager for linked event cards."
                              : activeFeaturedType === "post"
                                ? "Use the pinned artist-page post selector below."
                                : "Add the title, description, and link below."}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 2: Add the lead content</div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{featuredTypeConfig.titleLabel}</Label>
                              <Input placeholder={featuredTypeConfig.titlePlaceholder} value={creator.featuredTitle || ""} onChange={(e) => setCreator({ ...creator, featuredTitle: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>{featuredTypeConfig.urlLabel}</Label>
                              <Input placeholder={featuredTypeConfig.urlPlaceholder} value={creator.featuredUrl || ""} onChange={(e) => setCreator({ ...creator, featuredUrl: e.target.value })} />
                              <div className="text-xs text-muted-foreground">{featuredTypeConfig.urlHint}</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Featured description</Label>
                            <Textarea placeholder="Tell people why this is the first thing they should notice." value={creator.featuredDescription || ""} onChange={(e) => setCreator({ ...creator, featuredDescription: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/30 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Step 3: Decide the source</div>
                          <div className="space-y-2">
                            <Label>Pinned artist-page post</Label>
                            <Select value={creator.pinnedPostId || "none"} onValueChange={(value) => setCreator({ ...creator, pinnedPostId: value === "none" ? "" : value })}>
                              <SelectTrigger><SelectValue placeholder="Choose one of your artist-page posts" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No pinned post</SelectItem>
                                {artistPosts.map((post) => (
                                  <SelectItem key={post.id} value={String(post.id)}>
                                    {post.content.trim().slice(0, 56) || `Post #${post.id}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">If you pin a post, it becomes the cleanest way to lead the page without needing manual IDs.</p>
                          </div>
                          {(activeFeaturedType === "video" || activeFeaturedType === "track") && creator.featuredUrl?.trim() ? (
                            <div className="space-y-2">
                              <Label>Lead preview</Label>
                              <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/30">
                                <MediaEmbed
                                  type={featuredEmbed?.kind || activeFeaturedType}
                                  url={creator.featuredUrl.trim()}
                                  title={creator.featuredTitle || undefined}
                                  className={activeFeaturedType === "video" ? "aspect-video w-full" : "h-40 w-full"}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                              Pick a type and add the matching content. Video and track links will preview here automatically.
                            </div>
                          )}
                        </div>
                      </div>

                      {!hasFeaturedSelection && (
                        <div className="rounded-2xl border border-dashed border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                          No featured content selected yet. The page will still look intentional, but adding one lead highlight makes it feel much more curated.
                        </div>
                      )}
                      {renderBuilderSaveAction("Save featured")}
                    </div>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "style" && (
                    <>
                    <div id="builder-section-style" className={cn("rounded-2xl border bg-background/30 p-4 transition-all", activeBuilderSection === "style" ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50")}>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Style</div>
                      <div className="mt-1 text-sm text-muted-foreground">Shape the page personality without turning it into a messy custom CMS.</div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-3xl border border-border/50 bg-background/30 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">Current mood</div>
                        <div className="mt-3 text-lg font-semibold capitalize">{creator.moodPreset || "sleek"}</div>
                        <div className="mt-2 text-sm text-muted-foreground">{currentMoodDescription}</div>
                      </div>
                      <div className="rounded-3xl border border-border/50 bg-background/30 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">Current layout</div>
                        <div className="mt-3 text-lg font-semibold capitalize">{creator.layoutTemplate || "portfolio"}</div>
                        <div className="mt-2 text-sm text-muted-foreground">{currentLayoutDescription}</div>
                      </div>
                      <div className="rounded-3xl border border-border/50 bg-background/30 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">Current font</div>
                        <div className="mt-3 text-lg font-semibold capitalize">{creator.fontPreset || "modern"}</div>
                        <div className="mt-2 text-sm text-muted-foreground">{currentFontDescription}</div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                      <div>
                        <div className="text-sm font-semibold">Mood</div>
                        <div className="mt-1 text-sm text-muted-foreground">This changes the overall atmosphere of the page background and hero treatment.</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {MOOD_OPTIONS.map((item) => {
                          const active = (creator.moodPreset || "sleek") === item;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setCreator({ ...creator, moodPreset: item })}
                              className={cn(
                                "rounded-2xl border px-4 py-4 text-left transition-all",
                                active
                                  ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                                  : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                              )}
                            >
                              <div className={cn("h-14 rounded-xl bg-gradient-to-br", CREATOR_MOOD_PREVIEW_STYLES[item] || CREATOR_MOOD_PREVIEW_STYLES.sleek)} />
                              <div className="mt-3 font-medium capitalize">{item}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{MOOD_DESCRIPTIONS[item]}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div>
                          <div className="text-sm font-semibold">Layout</div>
                          <div className="mt-1 text-sm text-muted-foreground">Choose how featured content and supporting sections feel arranged.</div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {LAYOUT_OPTIONS.map((item) => {
                            const active = (creator.layoutTemplate || "portfolio") === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setCreator({ ...creator, layoutTemplate: item })}
                                className={cn(
                                  "rounded-2xl border px-4 py-4 text-left transition-all",
                                  active
                                    ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                                    : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                                )}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <div className="font-medium capitalize">{item}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">{LAYOUT_DESCRIPTIONS[item]}</div>
                                  </div>
                                  <div className="grid w-14 grid-cols-2 gap-1">
                                    <div className="h-4 rounded bg-foreground/15" />
                                    <div className="h-4 rounded bg-foreground/10" />
                                    <div className={cn("col-span-2 h-5 rounded", active ? "bg-primary/30" : "bg-foreground/10")} />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div>
                          <div className="text-sm font-semibold">Font pairing</div>
                          <div className="mt-1 text-sm text-muted-foreground">Keep the structure stable while changing the voice of the page typography.</div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {FONT_OPTIONS.map((item) => {
                            const active = (creator.fontPreset || "modern") === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setCreator({ ...creator, fontPreset: item })}
                                className={cn(
                                  "rounded-2xl border px-4 py-4 text-left transition-all",
                                  active
                                    ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                                    : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                                )}
                              >
                                <div className={cn("text-lg font-semibold capitalize", item === "editorial" ? "font-serif" : item === "mono" ? "font-mono" : "")}>
                                  {item}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{FONT_DESCRIPTIONS[item]}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                      <div>
                        <div className="text-sm font-semibold">Accent color</div>
                        <div className="mt-1 text-sm text-muted-foreground">Give the page a controlled visual identity without breaking the layout system.</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Input id="builder-accent-color" type="color" className="h-14 w-24 p-1" value={creator.accentColor || "#8b5cf6"} onChange={(e) => setCreator({ ...creator, accentColor: e.target.value })} />
                        <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm text-muted-foreground">{creator.accentColor || "#8b5cf6"}</div>
                        <div className="h-12 flex-1 rounded-2xl border border-border/50" style={{ background: `linear-gradient(135deg, ${(creator.accentColor || "#8b5cf6")}55, rgba(20,20,30,0.85))` }} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div>
                          <div className="text-sm font-semibold">Background style</div>
                          <div className="mt-1 text-sm text-muted-foreground">Adjust the shell treatment without letting pages become visually chaotic.</div>
                        </div>
                        <div className="grid gap-3">
                          {BACKGROUND_STYLE_OPTIONS.map((item) => {
                            const active = (creator.backgroundStyle || "soft-glow") === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => setCreator({ ...creator, backgroundStyle: item.value })}
                                className={cn(
                                  "rounded-2xl border px-4 py-4 text-left transition-all",
                                  active ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                                )}
                              >
                                <div className="text-sm font-semibold">{item.label}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                        <div>
                          <div className="text-sm font-semibold">Light theme variation</div>
                          <div className="mt-1 text-sm text-muted-foreground">Keep the light version intentional instead of letting it wash out.</div>
                        </div>
                        <div className="grid gap-3">
                          {LIGHT_THEME_VARIANT_OPTIONS.map((item) => {
                            const active = (creator.lightThemeVariant || "studio") === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => setCreator({ ...creator, lightThemeVariant: item.value })}
                                className={cn(
                                  "rounded-2xl border px-4 py-4 text-left transition-all",
                                  active ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-background/60",
                                )}
                              >
                                <div className="text-sm font-semibold">{item.label}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    </>
                  )}

                  {!isStarterCreatorSetup && activeBuilderSection === "style" && <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                    <div>
                      <div className="text-sm font-semibold">Section rules</div>
                      <div className="mt-1 text-sm text-muted-foreground">Only use these when you want to hide a section or change how strongly it presents itself.</div>
                    </div>
                    <div className="grid gap-4">
                      {MODULE_OPTIONS.map((module) => {
                        const config = sectionConfigs[module.value] || {};
                        return (
                          <div key={module.value} className="rounded-2xl border border-border/50 bg-background/30 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold">{module.label}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {config.visible === false || !pageModules.enabledModules.includes(module.value)
                                    ? "Hidden on the public page"
                                    : `${config.style || "default"} style / ${config.density || "comfortable"} density`}
                                </div>
                              </div>
                              <label className="flex items-center gap-3">
                                <Checkbox
                                  checked={pageModules.enabledModules.includes(module.value)}
                                  onCheckedChange={() => {
                                    toggleModule(module.value);
                                    updateSectionConfig(module.value, { visible: !pageModules.enabledModules.includes(module.value) });
                                  }}
                                />
                                <span className="text-sm">Visible</span>
                              </label>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Style</Label>
                                <Select value={config.style || "default"} onValueChange={(value) => updateSectionConfig(module.value, { style: value })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {SECTION_STYLE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Density</Label>
                                <Select value={config.density || "comfortable"} onValueChange={(value) => updateSectionConfig(module.value, { density: value })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {SECTION_DENSITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>}

                  {!isStarterCreatorSetup && activeBuilderSection === "style" && <div className="space-y-4 rounded-3xl border border-border/50 bg-background/25 p-5">
                    <div>
                      <div className="text-sm font-semibold">Section order</div>
                      <div className="mt-1 text-sm text-muted-foreground">Fine-tune the page flow here only if the default order doesn’t fit your page.</div>
                    </div>
                    <div className="text-sm text-muted-foreground">Arrange sections directly from the page canvas on the left. The canvas is now the main place to add, hide, and reorder sections.</div>
                    {renderBuilderSaveAction("Save style")}
                  </div>}

                  <div className="flex flex-wrap gap-3">
                    {renderBuilderSaveAction(isStarterCreatorSetup ? "Create page" : "Save page")}
                    {!isStarterCreatorSetup && <Button
                      variant="outline"
                      onClick={async () => {
                        setSaveState((current) => ({ ...current, creatorConfig: "saving" }));
                        try {
                          await saveCreator.mutateAsync({
                            userId: user.id,
                            data: {
                              pageType: creator.pageType || "creator",
                              pageArchetype: creator.pageArchetype || getArchetypeKeyFromCategory(artist.category),
                              pageStatus: creator.pageStatus || "published",
                              primaryActionType: creator.primaryActionType,
                              primaryActionLabel: creator.primaryActionLabel,
                              primaryActionUrl: creator.primaryActionUrl || undefined,
                              featuredTitle: creator.featuredTitle || undefined,
                              featuredDescription: creator.featuredDescription || undefined,
                              featuredUrl: creator.featuredUrl || undefined,
                              featuredType: creator.featuredType || "highlight",
                              featuredContent: buildFeaturedContent(),
                              linkItems: parseLinkItems(),
                              serviceItems: parseServiceItems(),
                              pricingSummary: creator.pricingSummary || undefined,
                              turnaroundInfo: creator.turnaroundInfo || undefined,
                              moodPreset: creator.moodPreset || "sleek",
                              layoutTemplate: creator.layoutTemplate || "portfolio",
                              fontPreset: creator.fontPreset || "modern",
                              accentColor: creator.accentColor || undefined,
                              backgroundStyle: creator.backgroundStyle || "soft-glow",
                              lightThemeVariant: creator.lightThemeVariant || "studio",
                              enabledModules: pageModules.enabledModules,
                              moduleOrder: pageModules.moduleOrder,
                              sectionConfigs: parseSectionConfigs(),
                              pinnedPostId: creator.pinnedPostId ? Number(creator.pinnedPostId) : null,
                            },
                          });
                          markSaved("creatorConfig");
                        } catch {
                          setSaveState((current) => ({ ...current, creatorConfig: "idle" }));
                        }
                      }}
                      disabled={saveCreator.isPending || !creator.primaryActionLabel?.trim()}
                    >
                      {saveState.creatorConfig === "saving" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : saveState.creatorConfig === "saved" ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Saved
                        </>
                      ) : (
                        "Save Action + Featured"
                      )}
                    </Button>}
                  </div>
                </CardContent>
              </Card>

              <Card className={cn("border-border/50 bg-card/50 md:sticky md:top-24", creatorBuilderView === "edit" && "hidden md:block")}>
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>This stays visible while you build so the page feels like a creative tool instead of a technical form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">Fast-start preview</div>
                      <div className="text-sm text-muted-foreground">This is the public first impression someone gets with your current identity choices.</div>
                    </div>
                    <Badge variant="secondary">{selectedArchetype.label}</Badge>
                  </div>
                  <div
                    className={cn("overflow-hidden rounded-2xl border border-border/50 bg-background/40", creatorPreviewFontClass)}
                    style={{
                      backgroundImage: artist.bannerUrl ? `url(${artist.bannerUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="relative overflow-hidden">
                      <div className={cn("absolute inset-0", artist.bannerUrl ? "bg-gradient-to-br opacity-70" : "bg-gradient-to-br", creatorPreviewLiveMood.shell)} />
                      <div className={cn("absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))]", artist.bannerUrl ? "opacity-60" : "", creatorPreviewLiveMood.glow)} />
                      <div className={cn("absolute inset-0", artist.bannerUrl ? "bg-gradient-to-t from-background/72 via-background/38 to-background/8 dark:from-background/78 dark:via-background/28 dark:to-background/6" : "bg-gradient-to-t from-background via-background/78 to-background/18")} />
                      <div className={cn("absolute inset-0", artist.bannerUrl ? "bg-black/6 dark:bg-black/14" : "bg-black/12 dark:bg-black/22")} />
                      <div className="relative z-10 p-5 text-white">
                        <div className="mb-4 flex items-center gap-4">
                          <Avatar className="h-16 w-16 border-2 border-background/90 shadow-xl">
                            <AvatarImage src={artist.avatarUrl || ""} />
                            <AvatarFallback>{(artist.displayName || user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold">{artist.displayName || "Artist page name"}</div>
                            <div className="mt-1 text-sm text-white/75">{formatPlace([artist.location, basic.city, basic.location]) || "Location preview"}</div>
                            <div className="mt-2 text-xs uppercase tracking-[0.22em] text-white/55">{selectedArchetype.descriptor}</div>
                          </div>
                        </div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge variant="secondary">{artist.category || "General Creator"}</Badge>
                          <Badge>{creator.primaryActionLabel || "Contact Me"}</Badge>
                          <Badge variant="outline">{creator.layoutTemplate || "portfolio"}</Badge>
                          <Badge variant="outline">{creator.fontPreset || "modern"}</Badge>
                        </div>
                        <div className={cn("text-2xl font-bold", creatorPreviewHeadingClass)}>{artist.displayName || "Artist page name"}</div>
                        <div className="mt-4 text-base font-medium">{artist.tagline || selectedArchetype.tagline}</div>
                        <div className="mt-4 whitespace-pre-wrap text-sm text-white/75">{artist.bio || "Add a short bio later. Phase 2 is about making the first screen immediately credible."}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {String(artist.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                        <div className={cn("mt-5 grid gap-3", creatorPreviewLayoutClass)}>
                          {(() => {
                            const featuredPresentation = getPreviewSectionPresentation("featured");
                            return (
                              <div className={featuredPresentation.wrapperClassName}>
                                <div className={featuredPresentation.contentClassName}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">Featured</div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{featuredPresentation.label}</div>
                                  </div>
                                  <div className="text-sm font-medium">{hasFeaturedSelection ? featuredSelectionLabel : "Lead highlight goes here"}</div>
                                  <div className="text-sm text-white/80">
                                    {hasFeaturedSelection
                                      ? featuredPreviewCopy
                                      : creator.layoutTemplate === "music"
                                        ? "Featured release, player, and upcoming shows"
                                        : creator.layoutTemplate === "performer"
                                          ? "Showcase reel, bookings, and event lineup"
                                          : creator.layoutTemplate === "shop"
                                            ? "Featured product, gallery, and shop CTA"
                                            : creator.layoutTemplate === "editorial"
                                              ? "Story-first hero with stronger reading flow"
                                              : "Balanced featured content and creator story"}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          {(() => {
                            const contactPresentation = getPreviewSectionPresentation("contact");
                            return (
                              <div className={contactPresentation.wrapperClassName}>
                                <div className={contactPresentation.contentClassName}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">Contact and action</div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{contactPresentation.label}</div>
                                  </div>
                                  <div className="text-sm font-medium text-white">{creator.primaryActionLabel || "Contact Me"}</div>
                                  <div className="text-sm text-white/85">
                                    {creator.primaryActionUrl?.trim()
                                      ? `This CTA points to ${creator.primaryActionUrl}.`
                                      : artist.bookingEmail?.trim()
                                        ? `Visitors can reach you at ${artist.bookingEmail}.`
                                        : showcaseItemCount > 0
                                          ? `${showcaseItemCount} showcase item${showcaseItemCount === 1 ? "" : "s"} ready to support the page.`
                                          : "No showcase media yet. Add gallery items or a pinned post to make the page feel alive."}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          {(() => {
                            const aboutPresentation = getPreviewSectionPresentation("about");
                            return (
                              <div className={aboutPresentation.wrapperClassName}>
                                <div className={aboutPresentation.contentClassName}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">About</div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{aboutPresentation.label}</div>
                                  </div>
                                  <div className="text-sm font-medium text-white">
                                    {previewServiceItems.length > 0
                                      ? `${previewServiceItems.length} service item${previewServiceItems.length === 1 ? "" : "s"}`
                                      : "Creator story and work details"}
                                  </div>
                                  <div className="text-sm text-white/80">
                                    {artist.bio?.trim()
                                      ? artist.bio
                                      : previewServiceItems.length > 0
                                        ? "Services, pricing, and work details are ready to support the page."
                                        : "Background, influences, and work details will appear here."}
                                  </div>
                                  {previewCustomDetails.length > 0 ? (
                                    <div className="grid gap-2 pt-1">
                                      {previewCustomDetails.slice(0, 3).map((item, index) => (
                                        <div key={`${item.label}-${index}`} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
                                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{item.label}</div>
                                          <div className="mt-1 text-sm text-white/90">{item.value}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()}
                          {(() => {
                            const mediaPresentation = getPreviewSectionPresentation("media");
                            return (
                              <div className={mediaPresentation.wrapperClassName}>
                                <div className={mediaPresentation.contentClassName}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">Media</div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{mediaPresentation.label}</div>
                                  </div>
                                  <div className="text-sm font-medium text-white">
                                    {showcaseItemCount > 0
                                      ? `${showcaseItemCount} showcase item${showcaseItemCount === 1 ? "" : "s"}`
                                      : previewLinkItems.length > 0
                                        ? `${previewLinkItems.length} link${previewLinkItems.length === 1 ? "" : "s"} ready`
                                        : "Media showcase"}
                                  </div>
                                  <div className="text-sm text-white/80">
                                    {showcaseItemCount > 0
                                      ? "Gallery, video, and audio blocks will make the page feel active."
                                      : previewLinkItems.length > 0
                                        ? "Portfolio, socials, or shop links are ready to surface."
                                        : "Add gallery items, links, or media to give visitors something to explore."}
                                  </div>
                                  {showcasePreviewItems.length > 0 ? (
                                    <BuilderMediaGallery items={showcasePreviewItems} className="pt-1" />
                                  ) : linkPreviewCards.length > 0 ? (
                                    <BuilderLinksShowcase items={linkPreviewCards} className="pt-1" />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()}
                          {videoPreviewItems.length > 0 ? (() => {
                            const mediaPresentation = getPreviewSectionPresentation("media");
                            return (
                              <div className={mediaPresentation.wrapperClassName}>
                                <div className={mediaPresentation.contentClassName}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">Video playlist</div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{mediaPresentation.label}</div>
                                  </div>
                                  <div className="text-sm font-medium text-white">{videoPreviewItems.length} video item{videoPreviewItems.length === 1 ? "" : "s"}</div>
                                  <div className="text-sm text-white/80">Video-led content and reels show here when this block is active on the page.</div>
                                  <BuilderVideoPlaylist items={videoPreviewItems} className="pt-1" />
                                </div>
                              </div>
                            );
                          })() : null}
                          {audioPreviewTracks.length > 0 ? (() => {
                            const mediaPresentation = getPreviewSectionPresentation("media");
                            return (
                              <div className={mediaPresentation.wrapperClassName}>
                                <div className={mediaPresentation.contentClassName}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">Audio player</div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{mediaPresentation.label}</div>
                                  </div>
                                  <div className="text-sm font-medium text-white">{audioPreviewTracks.length} audio item{audioPreviewTracks.length === 1 ? "" : "s"}</div>
                                  <div className="text-sm text-white/80">Tracks, mixes, or release audio can lead this page without relying on a generic link card.</div>
                                  <BuilderAudioPlayer tracks={audioPreviewTracks} className="pt-1" />
                                </div>
                              </div>
                            );
                          })() : null}
                          {(() => {
                            const eventsPresentation = getPreviewSectionPresentation("events");
                            return (
                              <div className={eventsPresentation.wrapperClassName}>
                                <div className={eventsPresentation.contentClassName}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">Events</div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{eventsPresentation.label}</div>
                                  </div>
                                  <div className="text-sm font-medium text-white">
                                    {upcomingEventsCount > 0
                                      ? `${upcomingEventsCount} upcoming event${upcomingEventsCount === 1 ? "" : "s"}`
                                      : "Events and appearances"}
                                  </div>
                                  <div className="text-sm text-white/80">
                                    {upcomingEventsCount > 0
                                      ? "Upcoming shows and appearances will be visible on the page."
                                      : "No events yet. Add appearances later to make this section useful."}
                                  </div>
                                  {eventPreviewItems.length > 0 ? (
                                    <BuilderEventCarousel items={eventPreviewItems} className="pt-1" />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="photos">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Personal Photo Gallery</CardTitle>
                <CardDescription>Upload daily photos, selfies, behind-the-scenes shots, or anything people should see in your profile's Photos tab.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="photo-upload">Upload photos</Label>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                    disabled={isUploadingPhotoBatch}
                  />
                  <p className="text-xs text-muted-foreground">Pick one or many images. They can go straight to your gallery without creating a post.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo-caption">Optional caption</Label>
                  <Input id="photo-caption" placeholder="Leave blank if you just want the photos uploaded." value={photoForm.caption} onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Folders</Label>
                  <div className="flex gap-2">
                    <Input placeholder="New folder name" value={profileFolderDraft} onChange={(e) => setProfileFolderDraft(e.target.value)} />
                    <Button type="button" variant="outline" onClick={() => addFolder("profile")}>Add</Button>
                  </div>
                </div>
                {photoFiles.length > 0 ? (
                  <div className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                    {photoFiles.length} file{photoFiles.length === 1 ? "" : "s"} ready for upload
                  </div>
                ) : null}
                <Button className="w-full" onClick={uploadPhotosToGallery} disabled={addUserPhoto.isPending || isUploadingPhotoBatch || photoFiles.length === 0}>
                  Upload to Photo Gallery
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6 lg:col-span-2">
              {/* View Toggle and Stats */}
              {userPhotos?.length ? (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/50 bg-background/40 p-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Personal Photo Gallery</div>
                      <div className="text-xs text-muted-foreground">
                        {userPhotos.length} photo{userPhotos.length === 1 ? "" : "s"} across {profileFolderState.folders.length || 1} {profileFolderState.folders.length === 1 ? "album" : "albums"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={photoGalleryView === "album" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPhotoGalleryView("album")}
                      >
                        <Eye className="mr-2 h-4 w-4" /> Albums
                      </Button>
                      <Button
                        variant={photoGalleryView === "grid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPhotoGalleryView("grid")}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" /> All Photos
                      </Button>
                    </div>
                  </div>

                  {/* Album View */}
                  {photoGalleryView === "album" ? (
                    groupedProfilePhotos.map((group) => (
                      <div key={group.folder} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.folder}</div>
                          <div className="text-xs text-muted-foreground">{group.items.length} photo{group.items.length === 1 ? "" : "s"}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                          {group.items.map((item) => (
                            <Card key={item.id} className="group overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/40">
                              <div className="relative">
                                <img src={item.imageUrl} alt={item.caption || "Profile gallery photo"} className="aspect-square w-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                  <div className="flex h-full flex-col justify-end p-3">
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <Select value={profileFolderState.assignments[String(item.id || item.imageUrl)] || "__unsorted__"} onValueChange={(value) => assignFolder("profile", String(item.id || item.imageUrl), value)}>
                                        <SelectTrigger className="mb-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__unsorted__">Unsorted</SelectItem>
                                          {profileFolderState.folders.map((folder) => <SelectItem key={folder} value={folder}>{folder}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteUserPhoto.mutate({ userId: user.id, photoId: item.id });
                                      }}
                                    >
                                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {item.caption && (
                                <CardContent className="p-2">
                                  <div className="line-clamp-2 text-xs">{item.caption}</div>
                                </CardContent>
                              )}
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Grid View - All Photos */
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {userPhotos.map((item) => (
                        <Card key={item.id} className="group overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/40">
                          <div className="relative">
                            <img src={item.imageUrl} alt={item.caption || "Profile gallery photo"} className="aspect-square w-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                              <div className="flex h-full flex-col justify-end p-2">
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Select value={profileFolderState.assignments[String(item.id || item.imageUrl)] || "__unsorted__"} onValueChange={(value) => assignFolder("profile", String(item.id || item.imageUrl), value)}>
                                    <SelectTrigger className="mb-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__unsorted__">Unsorted</SelectItem>
                                      {profileFolderState.folders.map((folder) => <SelectItem key={folder} value={folder}>{folder}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteUserPhoto.mutate({ userId: user.id, photoId: item.id });
                                  }}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Card className="border-dashed border-border/50 bg-card/30 lg:col-span-2">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    No photos yet. Upload a few images here and they will appear on the profile Photos tab.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {showCreatorTools && (
          <TabsContent value="gallery">
            {/* Sticky Picker Header */}
            {creatorPickerTarget && (() => {
              const pickerType = creatorPickerTarget === "video" ? "video" : "image";
              const pickerLabel = pickerType === "video" ? "Videos" : "Images";
              const destinationLabel = creatorPickerTarget === "hero" ? "Hero Section" : creatorPickerTarget === "gallery" ? "Media Gallery" : "Video Playlist";

              return (
                <div className="sticky top-0 z-10 mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-lg backdrop-blur-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <div className="text-lg font-semibold">
                          Selecting {pickerLabel} for {destinationLabel}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pickerSelectedIds.length} item{pickerSelectedIds.length === 1 ? "" : "s"} selected
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={applyShowcaseSelection} disabled={pickerSelectedIds.length === 0}>
                        <Check className="mr-2 h-4 w-4" /> Apply & Return to Editor
                      </Button>
                      <Button type="button" variant="outline" onClick={returnToCreatorBuilder}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Creator Showcase</CardTitle>
                  <CardDescription>This is separate from your personal photo gallery. Use it for portfolio media, videos, tracks, and polished showcase items on your creator page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={gallery.type} onValueChange={(value) => setGallery({ ...gallery, type: value as GalleryItemRequestType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GalleryItemRequestType.image}>Image</SelectItem>
                      <SelectItem value={GalleryItemRequestType.video}>Video</SelectItem>
                      <SelectItem value={GalleryItemRequestType.audio}>Audio</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <Input placeholder="Media URL" value={gallery.url} onChange={(e) => setGallery({ ...gallery, url: e.target.value })} />
                    {gallery.type === GalleryItemRequestType.image && (
                      <>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => setShowcaseFiles(Array.from(e.target.files || []))}
                          disabled={isUploadingShowcaseBatch}
                        />
                        <div className="text-xs text-muted-foreground">Choose one or many images. They will upload directly into your creator showcase.</div>
                      </>
                    )}
                  </div>
                  <Input placeholder="Caption" value={gallery.caption} onChange={(e) => setGallery({ ...gallery, caption: e.target.value })} />
                  <div className="space-y-2">
                    <Label>Folders</Label>
                    <div className="flex gap-2">
                      <Input placeholder="New showcase folder" value={showcaseFolderDraft} onChange={(e) => setShowcaseFolderDraft(e.target.value)} />
                      <Button type="button" variant="outline" onClick={() => addFolder("showcase")}>Add</Button>
                    </div>
                  </div>
                  {gallery.type === GalleryItemRequestType.image && showcaseFiles.length > 0 ? (
                    <div className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                      {showcaseFiles.length} image file{showcaseFiles.length === 1 ? "" : "s"} ready for upload
                    </div>
                  ) : null}
                  {gallery.type === GalleryItemRequestType.image ? (
                    <Button className="w-full" onClick={uploadShowcaseImages} disabled={addGalleryItem.isPending || isUploadingShowcaseBatch || showcaseFiles.length === 0}>
                      Upload Images
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => { void addSingleShowcaseItem(); }} disabled={addGalleryItem.isPending || uploading.gallery || !gallery.url.trim()}>
                      Add Item
                    </Button>
                  )}
                  {creatorReturnTarget === "creator" && profile.artistProfile?.gallery?.length ? (
                    <Button type="button" variant="outline" className="w-full" onClick={returnToCreatorBuilder}>
                      Back to Editing
                    </Button>
                  ) : null}
                </CardContent>
              </Card>

              <div className="space-y-6 lg:col-span-2">
                {/* Category Tabs */}
                {!creatorPickerTarget && (
                  <div className="flex gap-2 border-b border-border/50 pb-2">
                    <Button
                      variant={showcaseCategory === "photos" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setShowcaseCategory("photos")}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Photos ({groupedShowcaseImages.flatMap(g => g.items).length})
                    </Button>
                    <Button
                      variant={showcaseCategory === "videos" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setShowcaseCategory("videos")}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Videos ({groupedShowcaseVideos.flatMap(g => g.items).length})
                    </Button>
                    <Button
                      variant={showcaseCategory === "audio" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setShowcaseCategory("audio")}
                    >
                      <Mic2 className="mr-2 h-4 w-4" />
                      Audio ({groupedShowcaseAudio.flatMap(g => g.items).length})
                    </Button>
                  </div>
                )}

                {/* Quick Selection Actions in Picker Mode */}
                {creatorPickerTarget && (() => {
                  const allMatchingIds = (showcasePickerType === "image" ? groupedShowcaseImages : showcasePickerType === "video" ? groupedShowcaseVideos : groupedShowcaseAudio)
                    .flatMap(g => g.items)
                    .map(item => item.id);
                  const allSelected = allMatchingIds.length > 0 && allMatchingIds.every(id => pickerSelectedIds.includes(id));

                  return (
                    <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 p-3">
                      <div className="text-sm text-muted-foreground">
                        {allMatchingIds.length} {showcasePickerType === "image" ? "photo" : showcasePickerType === "video" ? "video" : "audio"}{allMatchingIds.length === 1 ? "" : "s"} available
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (creatorPickerTarget === "gallery") {
                              updateBuilderMeta({ galleryItemIds: allMatchingIds });
                            } else if (creatorPickerTarget === "video") {
                              updateBuilderMeta({ videoItemIds: allMatchingIds });
                            } else if (creatorPickerTarget === "hero") {
                              updateBuilderMeta({ heroItemIds: showcasePickerType === "video" ? allMatchingIds.slice(0, 1) : allMatchingIds });
                            }
                          }}
                          disabled={allSelected}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (creatorPickerTarget === "gallery") {
                              updateBuilderMeta({ galleryItemIds: [] });
                            } else if (creatorPickerTarget === "video") {
                              updateBuilderMeta({ videoItemIds: [] });
                            } else if (creatorPickerTarget === "hero") {
                              updateBuilderMeta({ heroItemIds: [] });
                            }
                          }}
                          disabled={pickerSelectedIds.length === 0}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const groupedItems = creatorPickerTarget
                    ? [
                        {
                          label: showcasePickerType === "image" ? "Photos" : showcasePickerType === "video" ? "Videos" : "Audio",
                          items: showcasePickerType === "image" ? groupedShowcaseImages.flatMap((group) => group.items) : showcasePickerType === "video" ? groupedShowcaseVideos.flatMap((group) => group.items) : groupedShowcaseAudio.flatMap((group) => group.items),
                        },
                      ]
                    : showcaseCategory === "photos"
                      ? [{ label: "Photos", groups: groupedShowcaseImages }]
                      : showcaseCategory === "videos"
                        ? [{ label: "Videos", groups: groupedShowcaseVideos }]
                        : [{ label: "Audio", groups: groupedShowcaseAudio }];

                  return groupedItems.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</div>
                        <div className="text-xs text-muted-foreground">{("items" in group ? group.items.length : group.groups.flatMap((folderGroup) => folderGroup.items).length)} item{("items" in group ? group.items.length : group.groups.flatMap((folderGroup) => folderGroup.items).length) === 1 ? "" : "s"}</div>
                      </div>
                      {("items" in group ? group.items.length : group.groups.flatMap((folderGroup) => folderGroup.items).length) ? (
                        <div className="space-y-4">
                          {("items" in group ? [{ folder: "Unsorted", items: group.items }] : group.groups).map((folderGroup) => (
                            <div key={`${group.label}-${folderGroup.folder}`} className="space-y-3">
                              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{folderGroup.folder}</div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {folderGroup.items.map((item) => {
                  const matchesPickerType = !creatorPickerTarget || item.type === showcasePickerType;
                  const isSelected = pickerSelectedIds.includes(item.id);
                  return (
                  <Card
                    key={item.id}
                    className={cn(
                      "overflow-hidden border-border/50 bg-card/50",
                      creatorPickerTarget && matchesPickerType && "cursor-pointer transition-colors hover:border-primary/40",
                      creatorPickerTarget && matchesPickerType && isSelected && "border-primary/60 ring-1 ring-primary/30",
                      creatorPickerTarget && !matchesPickerType && "opacity-50",
                    )}
                    onClick={() => {
                      if (creatorPickerTarget && matchesPickerType) {
                        togglePickerSelection(item.id);
                      }
                    }}
                  >
                    <MediaEmbed
                      type={item.type}
                      url={item.url}
                      title={item.caption}
                      className={item.type === "image" ? "h-48 w-full object-cover" : item.type === "video" ? "aspect-video w-full border-0" : "h-40 w-full border-0"}
                    />
                    <CardContent className="space-y-3 p-4">
                      {creatorPickerTarget && matchesPickerType && isSelected && (
                        <Badge className="bg-primary/20 text-primary">
                          <Check className="mr-1 h-3 w-3" /> Selected
                        </Badge>
                      )}
                      {!creatorPickerTarget ? (
                        <Select value={showcaseFolderState.assignments[String(item.id)] || "__unsorted__"} onValueChange={(value) => assignFolder("showcase", String(item.id), value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unsorted__">Unsorted</SelectItem>
                            {showcaseFolderState.folders.map((folder) => <SelectItem key={folder} value={folder}>{folder}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : null}
                      {creatorPickerTarget ? (
                        matchesPickerType ? (
                          <div className="flex flex-col gap-2">
                            <Button
                              variant={isSelected ? "outline" : "default"}
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePickerSelection(item.id);
                              }}
                              className="w-full"
                            >
                              {isSelected ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" /> Remove
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" /> Select This
                                </>
                              )}
                            </Button>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePickerSelection(item.id)}
                                onClick={(event) => event.stopPropagation()}
                              />
                              <span>Use in {creatorPickerTarget === "hero" ? "hero" : creatorPickerTarget === "gallery" ? "gallery" : "playlist"}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">This item is not the right media type for the current picker.</div>
                        )
                      ) : null}
                      <div className="break-all text-xs text-muted-foreground">{item.url}</div>
                      {item.caption && <div className="text-sm">{item.caption}</div>}
                      {!creatorPickerTarget && (
                        <Button variant="destructive" size="sm" onClick={(event) => { event.stopPropagation(); deleteGalleryItem.mutate({ userId: user.id, itemId: item.id }); }}>Delete</Button>
                      )}
                    </CardContent>
                  </Card>
                                )})}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Card className="border-dashed border-border/50 bg-card/30">
                          <CardContent className="p-8 text-center text-sm text-muted-foreground">
                            No {group.label.toLowerCase()} in showcase yet.
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
