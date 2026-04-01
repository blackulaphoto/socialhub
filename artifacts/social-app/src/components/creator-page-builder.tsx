import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, EyeOff, ExternalLink, Loader2, Save, Video } from "lucide-react";
import { CreatorHeroSlider } from "@/components/creator-page/creator-hero-slider";
import { CreatorInfoCard } from "@/components/creator-page/creator-info-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BuilderAudioPlayer } from "@/components/page-builder-blocks/builder-audio-player";
import { BuilderEventCarousel } from "@/components/page-builder-blocks/builder-event-carousel";
import { BuilderLinksShowcase } from "@/components/page-builder-blocks/builder-links-showcase";
import { BuilderMediaGallery } from "@/components/page-builder-blocks/builder-media-gallery";
import { BuilderVideoPlaylist } from "@/components/page-builder-blocks/builder-video-playlist";
import { cn } from "@/lib/utils";
import {
  CreatorBuilderMeta,
  CreatorBuilderLinkItem,
  CreatorSectionKey,
  deriveLegacyModuleState,
  readCreatorBuilderMeta,
  writeCreatorBuilderMeta,
} from "@/lib/creator-page-builder";

const SECTION_LIBRARY: Array<{ key: CreatorSectionKey; label: string; description: string }> = [
  { key: "featured", label: "Featured content", description: "Lead with one thing people should notice first." },
  { key: "gallery", label: "Media gallery", description: "Image-driven showcase items." },
  { key: "video", label: "Video playlist", description: "Video embeds and reels." },
  { key: "audio", label: "Audio player", description: "Tracks, playlists, and audio releases." },
  { key: "links", label: "Links and shop", description: "External links, merch, store, and destinations." },
  { key: "events", label: "Events", description: "Upcoming appearances and linked dates." },
  { key: "about", label: "About", description: "Story, facts, tags, and supporting context." },
  { key: "posts", label: "Posts", description: "Artist-page updates as a normal block." },
  { key: "contact", label: "Contact and CTA", description: "Primary action and conversion path." },
];

type BuilderProps = {
  userId: number;
  username: string;
  hasArtistPage: boolean;
  creatorBuilderView: "edit" | "preview";
  setCreatorBuilderView: (view: "edit" | "preview") => void;
  artist: Record<string, string>;
  setArtist: Dispatch<SetStateAction<Record<string, string>>>;
  creator: Record<string, string>;
  setCreator: Dispatch<SetStateAction<Record<string, string>>>;
  galleryItems: Array<{ id?: number; type: string; url: string; thumbnailUrl?: string | null; caption?: string | null }>;
  linkedEvents: Array<{ id: number; title: string; startsAt: string; location?: string | null; city?: string | null; description?: string | null; imageUrl?: string | null; lineupTags?: string[] | null; linkedArtistsCount?: number | null }>;
  artistPostsCount: number;
  saveStatus: "idle" | "saving" | "saved";
  onSave: () => void;
  onOpenPublicPage: () => void;
  onOpenShowcase: (target: "hero-slider" | "hero" | "gallery" | "video") => void;
  onOpenEventsManager: () => void;
  onUploadImage: (file: File | null, scope: "avatar" | "banner", onComplete: (url: string) => void) => void;
  uploading: { avatar: boolean; banner: boolean };
};

function parseSectionConfigs(raw: string | undefined) {
  try {
    if (raw?.trim()) {
      return JSON.parse(raw) as Record<string, unknown>;
    }
  } catch {
  }
  return {};
}

function parseLinkItems(raw: string | undefined) {
  return String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, url, kind] = line.split("|");
      return {
        id: `${label || url || "link"}-${index}`,
        label: label?.trim() || url?.trim() || "Link",
        url: url?.trim() || "",
        kind: kind?.trim() || null,
      };
    })
    .filter((item) => item.url);
}

function serializeLinkItems(items: Array<{ label: string; url: string; kind?: string | null }>) {
  return items
    .map((item) => {
      const label = item.label.trim();
      const url = item.url.trim();
      const kind = item.kind?.trim() || "";
      if (!url) return "";
      return kind ? `${label}|${url}|${kind}` : `${label}|${url}`;
    })
    .filter(Boolean)
    .join("\n");
}

function parseCustomFields(raw: string | undefined) {
  return String(raw || "")
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
    .filter((item) => item.label || item.value);
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

export function CreatorPageBuilder({
  userId,
  username,
  hasArtistPage,
  creatorBuilderView,
  setCreatorBuilderView,
  artist,
  setArtist,
  creator,
  setCreator,
  galleryItems,
  linkedEvents,
  artistPostsCount,
  saveStatus,
  onSave,
  onOpenPublicPage,
  onOpenShowcase,
  onOpenEventsManager,
  onUploadImage,
  uploading,
}: BuilderProps) {
  const [selectedBlock, setSelectedBlock] = useState<"hero" | "hero-details" | CreatorSectionKey>("hero");
  const [showMobileBlockMenu, setShowMobileBlockMenu] = useState(false);
  const sectionConfigs = useMemo(() => parseSectionConfigs(creator.sectionConfigs), [creator.sectionConfigs]);
  const builderMeta = useMemo(
    () => readCreatorBuilderMeta(sectionConfigs, {
      enabledModules: creator.enabledModules?.split(",").filter(Boolean) || [],
      moduleOrder: creator.moduleOrder?.split(",").filter(Boolean) || [],
      featuredType: creator.featuredType,
      featuredUrl: creator.featuredUrl,
      linkCount: parseLinkItems(creator.linkItems).length,
      hasImages: galleryItems.some((item) => item.type === "image"),
      hasVideos: galleryItems.some((item) => item.type === "video"),
      hasAudio: galleryItems.some((item) => item.type === "audio"),
    }),
    [creator.enabledModules, creator.featuredType, creator.featuredUrl, creator.linkItems, creator.moduleOrder, galleryItems, sectionConfigs],
  );
  const imageGallery = galleryItems.filter((item) => item.type === "image");
  const videoGallery = galleryItems.filter((item) => item.type === "video");
  const audioGallery = galleryItems.filter((item) => item.type === "audio");
  const assignedHeroSliderImages = imageGallery.filter((item) => builderMeta.heroSliderItemIds?.includes(Number(item.id)));
  const assignedHeroImages = imageGallery.filter((item) => builderMeta.heroItemIds?.includes(Number(item.id)));
  const assignedHeroVideos = videoGallery.filter((item) => builderMeta.heroItemIds?.includes(Number(item.id)));
  const assignedGalleryImages = imageGallery.filter((item) => builderMeta.galleryItemIds?.includes(Number(item.id)));
  const assignedPlaylistVideos = videoGallery.filter((item) => builderMeta.videoItemIds?.includes(Number(item.id)));
  const linkItems = parseLinkItems(creator.linkItems);
  const customFields = parseCustomFields(artist.customFields);
  const visibleSections = builderMeta.sections.filter((section) => section.visible);
  const orderedSections = builderMeta.sections.map((section) => ({
    section,
    meta: SECTION_LIBRARY.find((item) => item.key === section.key)!,
  }));
  const selectedSection = SECTION_LIBRARY.find((section) => section.key === selectedBlock);
  const heroTags = String(artist.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  const featuredMode = creator.featuredType || "highlight";
  const heroName = artist.displayName || username;
  const heroInfoTitle = builderMeta.heroInfoTitle?.trim() || "Creation description";
  const heroInfoDescription = builderMeta.heroInfoDescription?.trim() || artist.category || artist.tagline || "Describe what this creator makes, offers, or focuses on.";
  const heroInfoPhone = builderMeta.heroInfoPhone?.trim() || "";
  const heroInfoLinks = (builderMeta.heroInfoLinks || []).slice(0, 3);
  const heroInfoServices = heroTags;
  const heroSlides = assignedHeroSliderImages.length
    ? assignedHeroSliderImages.map((item, index) => ({
        id: String(item.id || `hero-slide-${index}`),
        image: item.url,
        title: item.caption || heroName,
        subtitle: artist.tagline || "Add a one-line first impression in the inspector.",
      }))
    : [
        {
          id: "hero-banner",
          image: artist.bannerUrl || imageGallery[0]?.url || artist.avatarUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80",
          title: heroName,
          subtitle: artist.tagline || "Add a one-line first impression in the inspector.",
        },
      ];

  const updateBuilderMeta = (nextMeta: CreatorBuilderMeta) => {
    const nextConfigs = writeCreatorBuilderMeta(sectionConfigs, nextMeta);
    const legacyState = deriveLegacyModuleState(nextMeta.sections);
    setCreator((current) => ({
      ...current,
      enabledModules: legacyState.enabledModules.join(","),
      moduleOrder: legacyState.moduleOrder.join(","),
      sectionConfigs: JSON.stringify(nextConfigs, null, 2),
    }));
  };

  const updateHeroInfoLink = (index: number, field: keyof CreatorBuilderLinkItem, value: string) => {
    const nextLinks = Array.from({ length: 3 }, (_, itemIndex) => builderMeta.heroInfoLinks?.[itemIndex] || { label: "", url: "" });
    nextLinks[index] = {
      ...nextLinks[index],
      [field]: value,
    };
    updateBuilderMeta({
      ...builderMeta,
      heroInfoLinks: nextLinks.filter((item) => item.label.trim() || item.url.trim()),
    });
  };

  const updateCreatorLinkItem = (index: number, field: "label" | "url", value: string) => {
    const nextLinks = Array.from(
      { length: Math.max(linkItems.length, 4) },
      (_, itemIndex) => linkItems[itemIndex] || { id: `link-${itemIndex}`, label: "", url: "", kind: null },
    );
    nextLinks[index] = {
      ...nextLinks[index],
      [field]: value,
    };
    setCreator((current) => ({
      ...current,
      linkItems: serializeLinkItems(nextLinks.map((item) => ({ label: item.label, url: item.url, kind: item.kind }))),
    }));
  };

  const setSectionVisibility = (key: CreatorSectionKey, visible: boolean) => {
    updateBuilderMeta({
      ...builderMeta,
      sections: builderMeta.sections.map((section) => section.key === key ? { ...section, visible } : section),
    });
    if (!visible && selectedBlock === key) {
      setSelectedBlock("hero");
    }
  };

  const moveSection = (key: CreatorSectionKey, direction: "up" | "down") => {
    const index = builderMeta.sections.findIndex((section) => section.key === key);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= builderMeta.sections.length) return;
    updateBuilderMeta({
      ...builderMeta,
      sections: moveItem(builderMeta.sections, index, targetIndex),
    });
  };

  const previewCards = {
    featured: creator.featuredTitle || creator.featuredDescription || creator.featuredUrl,
    gallery: assignedGalleryImages.length,
    video: assignedPlaylistVideos.length || (featuredMode === "video" && creator.featuredUrl?.trim()),
    audio: audioGallery.length || (featuredMode === "track" && creator.featuredUrl?.trim()),
    links: linkItems.length,
    events: linkedEvents.length,
    about: artist.bio || customFields.length || heroTags.length,
    posts: artistPostsCount,
    contact: creator.primaryActionLabel || artist.bookingEmail,
  };

  const renderSaveButton = () => (
    <Button type="button" onClick={onSave}>
      {saveStatus === "saving" ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
        </>
      ) : saveStatus === "saved" ? (
        <>
          <Check className="mr-2 h-4 w-4" /> Saved
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" /> Save Page
        </>
      )}
    </Button>
  );

  const renderIdentityTools = () => (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl border border-border/50 bg-background/20 p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Profile image</div>
          <div className="text-sm text-muted-foreground">Upload or paste the portrait that anchors the creator identity.</div>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={artist.avatarUrl || ""} />
            <AvatarFallback>{heroName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Input value={artist.avatarUrl || ""} placeholder="https://..." onChange={(event) => setArtist((current) => ({ ...current, avatarUrl: event.target.value }))} />
            <Input type="file" accept="image/*" disabled={uploading.avatar} onChange={(event) => onUploadImage(event.target.files?.[0] || null, "avatar", (url) => setArtist((current) => ({ ...current, avatarUrl: url })))} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/50 bg-background/20 p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Top banner</div>
          <div className="text-sm text-muted-foreground">This is the full-width banner above the hero block.</div>
        </div>
        <Input value={artist.bannerUrl || ""} placeholder="https://..." onChange={(event) => setArtist((current) => ({ ...current, bannerUrl: event.target.value }))} />
        <Input type="file" accept="image/*" disabled={uploading.banner} onChange={(event) => onUploadImage(event.target.files?.[0] || null, "banner", (url) => setArtist((current) => ({ ...current, bannerUrl: url })))} />
      </div>

      <div className="space-y-4 rounded-2xl border border-border/50 bg-background/20 p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Hero slider</div>
          <div className="text-sm text-muted-foreground">Choose Showcase images for the rotating top slider. If none are selected, the top banner is used as the fallback.</div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenShowcase("hero-slider")}>
            Choose Slider Images
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {assignedHeroSliderImages.length} selected slide{assignedHeroSliderImages.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/50 bg-background/20 p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Page details</div>
          <div className="text-sm text-muted-foreground">These fields define the page name and core identity shown across the creator page.</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Page name</Label>
            <Input value={artist.displayName || ""} placeholder="Your creator name" onChange={(event) => setArtist((current) => ({ ...current, displayName: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={artist.category || ""} placeholder="Photographer, musician, designer..." onChange={(event) => setArtist((current) => ({ ...current, category: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={artist.tagline || ""} placeholder="One-line first impression" onChange={(event) => setArtist((current) => ({ ...current, tagline: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={artist.location || ""} placeholder="Los Angeles, CA" onChange={(event) => setArtist((current) => ({ ...current, location: event.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <Input value={artist.tags || ""} placeholder="portrait, club, editorial" onChange={(event) => setArtist((current) => ({ ...current, tags: event.target.value }))} />
        </div>
      </div>
    </div>
  );

  const renderInspector = () => {
    if (selectedBlock === "hero") {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/50 bg-background/10 p-4">
            <div className="text-sm font-semibold">Hero media block</div>
            <div className="mt-1 text-sm text-muted-foreground">This sits below the top banner. Pick showcase images or videos for the hero media area.</div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Select value={builderMeta.heroMediaType || "image"} onValueChange={(value) => updateBuilderMeta({ ...builderMeta, heroMediaType: value as "image" | "video" })}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Hero image</SelectItem>
                  <SelectItem value="video">Hero video</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => onOpenShowcase("hero")}>
                Choose Hero Media
              </Button>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {builderMeta.heroMediaType === "video"
                ? `${assignedHeroVideos.length} selected video${assignedHeroVideos.length === 1 ? "" : "s"}`
                : `${assignedHeroImages.length} selected image${assignedHeroImages.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      );
    }

    if (selectedBlock === "hero-details") {
      const editableLinks = Array.from({ length: 3 }, (_, index) => builderMeta.heroInfoLinks?.[index] || { label: "", url: "" });
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-sm font-semibold">Creation description block</div>
            <div className="mt-1 text-sm text-muted-foreground">
              This block sits beside the hero media. Use it for what the creator makes, short business context, and direct contact paths.
            </div>
          </div>
          <div className="space-y-2">
            <Label>Block title</Label>
            <Input
              value={builderMeta.heroInfoTitle || ""}
              placeholder="Creation description"
              onChange={(event) => updateBuilderMeta({ ...builderMeta, heroInfoTitle: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={builderMeta.heroInfoDescription || ""}
              placeholder="Describe what they make, do, or offer."
              onChange={(event) => updateBuilderMeta({ ...builderMeta, heroInfoDescription: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact number</Label>
            <Input
              value={builderMeta.heroInfoPhone || ""}
              placeholder="+1 (555) 555-5555"
              onChange={(event) => updateBuilderMeta({ ...builderMeta, heroInfoPhone: event.target.value })}
            />
          </div>
          <div className="space-y-3">
            <Label>Links</Label>
            {editableLinks.map((item, index) => (
              <div key={`hero-info-link-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <Input
                  value={item.label}
                  placeholder={`Link ${index + 1} label`}
                  onChange={(event) => updateHeroInfoLink(index, "label", event.target.value)}
                />
                <Input
                  value={item.url}
                  placeholder="https://..."
                  onChange={(event) => updateHeroInfoLink(index, "url", event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (selectedBlock === "featured") {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Featured type</Label>
              <Select value={creator.featuredType || "highlight"} onValueChange={(value) => setCreator((current) => ({ ...current, featuredType: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="highlight">Highlight</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="track">Track</SelectItem>
                  <SelectItem value="gallery">Gallery</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="post">Pinned post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={creator.featuredTitle || ""} placeholder="What should stand out first?" onChange={(event) => setCreator((current) => ({ ...current, featuredTitle: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={creator.featuredDescription || ""} placeholder="Explain why this belongs at the top of the page." onChange={(event) => setCreator((current) => ({ ...current, featuredDescription: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={creator.featuredUrl || ""} placeholder="Optional link or media URL" onChange={(event) => setCreator((current) => ({ ...current, featuredUrl: event.target.value }))} />
          </div>
        </div>
      );
    }

    if (selectedBlock === "about") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>About copy</Label>
            <Textarea value={artist.bio || ""} className="min-h-40" placeholder="Tell the story behind the work." onChange={(event) => setArtist((current) => ({ ...current, bio: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Influences</Label>
            <Textarea value={artist.influences || ""} placeholder="References, inspirations, scene, or process." onChange={(event) => setArtist((current) => ({ ...current, influences: event.target.value }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Availability</Label>
              <Input value={artist.availabilityStatus || ""} onChange={(event) => setArtist((current) => ({ ...current, availabilityStatus: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Booking email</Label>
              <Input value={artist.bookingEmail || ""} onChange={(event) => setArtist((current) => ({ ...current, bookingEmail: event.target.value }))} />
            </div>
          </div>
        </div>
      );
    }

    if (selectedBlock === "links") {
      const editableLinks = Array.from(
        { length: Math.max(linkItems.length + 1, 4) },
        (_, index) => linkItems[index] || { id: `editable-link-${index}`, label: "", url: "", kind: null },
      );
      return (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Add a title people will see and the URL each link should open.</div>
          <div className="space-y-3">
            {editableLinks.map((item, index) => (
              <div key={item.id || `creator-link-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <Input
                  value={item.label}
                  placeholder={`Link ${index + 1} title`}
                  onChange={(event) => updateCreatorLinkItem(index, "label", event.target.value)}
                />
                <Input
                  value={item.url}
                  placeholder="https://..."
                  onChange={(event) => updateCreatorLinkItem(index, "url", event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (selectedBlock === "contact") {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary action label</Label>
              <Input value={creator.primaryActionLabel || ""} placeholder="Contact me" onChange={(event) => setCreator((current) => ({ ...current, primaryActionLabel: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Action type</Label>
              <Select value={creator.primaryActionType || "contact"} onValueChange={(value) => setCreator((current) => ({ ...current, primaryActionType: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="hire">Hire</SelectItem>
                  <SelectItem value="collaborate">Collaborate</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="shop">Shop</SelectItem>
                  <SelectItem value="store">Store</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Action URL</Label>
            <Input value={creator.primaryActionUrl || ""} placeholder="Optional booking, store, or contact link" onChange={(event) => setCreator((current) => ({ ...current, primaryActionUrl: event.target.value }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Pricing summary</Label>
              <Input value={creator.pricingSummary || ""} onChange={(event) => setCreator((current) => ({ ...current, pricingSummary: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Turnaround</Label>
              <Input value={creator.turnaroundInfo || ""} onChange={(event) => setCreator((current) => ({ ...current, turnaroundInfo: event.target.value }))} />
            </div>
          </div>
        </div>
      );
    }

    if (selectedBlock === "gallery" || selectedBlock === "video" || selectedBlock === "audio" || selectedBlock === "events" || selectedBlock === "posts") {
      const summary = selectedBlock === "gallery"
        ? `${assignedGalleryImages.length} selected image${assignedGalleryImages.length === 1 ? "" : "s"}`
        : selectedBlock === "video"
          ? `${assignedPlaylistVideos.length} selected video${assignedPlaylistVideos.length === 1 ? "" : "s"}`
          : selectedBlock === "audio"
            ? `${audioGallery.length} audio item${audioGallery.length === 1 ? "" : "s"} from Showcase`
            : selectedBlock === "events"
              ? `${linkedEvents.length} linked event${linkedEvents.length === 1 ? "" : "s"}`
              : `${artistPostsCount} published artist post${artistPostsCount === 1 ? "" : "s"}`;
      const summaryCopy = selectedBlock === "events"
        ? `${summary}. Create events from the Events page, then return here to preview them on the creator page.`
        : `${summary}. This block now pulls from explicit showcase selections rather than every showcase item of that type.`;

      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
            {summaryCopy}
          </div>
          {(selectedBlock === "gallery" || selectedBlock === "video" || selectedBlock === "audio") ? (
            <div className="flex flex-wrap gap-3">
              {selectedBlock === "gallery" ? <Button type="button" variant="outline" onClick={() => onOpenShowcase("gallery")}>Select Gallery Images</Button> : null}
              {selectedBlock === "video" ? <Button type="button" variant="outline" onClick={() => onOpenShowcase("video")}>Select Playlist Videos</Button> : null}
              {selectedBlock === "audio" ? <Button type="button" variant="outline" onClick={() => onOpenShowcase("gallery")}>Open Showcase</Button> : null}
            </div>
          ) : null}
          {selectedBlock === "events" ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={onOpenEventsManager}>Open Events</Button>
            </div>
          ) : null}
          {selectedBlock === "posts" ? (
            <div className="rounded-2xl border border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
              Post creation still happens on the public artist page, but posts are now a normal section block that can be shown, hidden, and reordered.
            </div>
          ) : null}
        </div>
      );
    }

    return null;
  };

  const renderBlockList = () => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setSelectedBlock("hero");
          setShowMobileBlockMenu(false);
        }}
        className={cn("w-full rounded-2xl border p-4 text-left transition-all", selectedBlock === "hero" ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-primary/30 bg-background/35")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-primary">Hero</div>
            <div className="mt-1 text-sm text-muted-foreground">Global banner and identity plane.</div>
          </div>
          <Badge variant="secondary">Top</Badge>
        </div>
      </button>

      <button
        type="button"
        onClick={() => {
          setSelectedBlock("hero-details");
          setShowMobileBlockMenu(false);
        }}
        className={cn("w-full rounded-2xl border p-4 text-left transition-all", selectedBlock === "hero-details" ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-primary/30 bg-background/35")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-primary">Creation description</div>
            <div className="mt-1 text-sm text-muted-foreground">The business summary block beside the hero media.</div>
          </div>
          <Badge variant="secondary">Top</Badge>
        </div>
      </button>

      <div className="space-y-3">
        {orderedSections.map(({ section, meta }, index, items) => {
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => {
                setSelectedBlock(section.key);
                setShowMobileBlockMenu(false);
              }}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-all",
                selectedBlock === section.key ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-primary/30 bg-background/35",
                !section.visible && "border-dashed opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">{meta.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{meta.description}</div>
                  <div className="mt-3 text-xs font-medium text-foreground/80">
                    {section.visible ? (previewCards[section.key] ? "Configured" : "Needs content") : "Hidden"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0} onClick={(event) => { event.stopPropagation(); moveSection(section.key, "up"); }}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === items.length - 1} onClick={(event) => { event.stopPropagation(); moveSection(section.key, "down"); }}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); setSectionVisibility(section.key, !section.visible); }}>
                    {section.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderHorizontalBlockMenu = () => (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-3">
          <button
            type="button"
            onClick={() => setSelectedBlock("hero")}
            className={cn(
              "min-w-56 rounded-2xl border p-4 text-left transition-all",
              selectedBlock === "hero" ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-primary/30 bg-background/35",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-primary">Hero</div>
                <div className="mt-1 text-sm text-muted-foreground">Global banner and identity plane.</div>
              </div>
              <Badge variant="secondary">Top</Badge>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedBlock("hero-details")}
            className={cn(
              "min-w-64 rounded-2xl border p-4 text-left transition-all",
              selectedBlock === "hero-details" ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-primary/30 bg-background/35",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-primary">Creation description</div>
                <div className="mt-1 text-sm text-muted-foreground">The business summary block beside the hero media.</div>
              </div>
              <Badge variant="secondary">Top</Badge>
            </div>
          </button>

          {orderedSections.map(({ section, meta }, index, items) => {
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setSelectedBlock(section.key)}
                className={cn(
                  "min-w-64 rounded-2xl border p-4 text-left transition-all",
                  selectedBlock === section.key ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-primary/30 bg-background/35",
                  !section.visible && "border-dashed opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-primary">{meta.label}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{meta.description}</div>
                    <div className="mt-3 text-xs font-medium text-foreground/80">
                      {section.visible ? (previewCards[section.key] ? "Configured" : "Needs content") : "Hidden"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0} onClick={(event) => { event.stopPropagation(); moveSection(section.key, "up"); }}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === items.length - 1} onClick={(event) => { event.stopPropagation(); moveSection(section.key, "down"); }}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); setSectionVisibility(section.key, !section.visible); }}>
                      {section.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSectionPreview = (key: CreatorSectionKey) => {
    if (key === "featured") {
      return (
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Featured</div>
          <div className="text-2xl font-semibold">{creator.featuredTitle || "Lead with what matters most"}</div>
          {creator.featuredDescription ? <div className="text-sm text-muted-foreground">{creator.featuredDescription}</div> : null}
          {featuredMode === "video" && creator.featuredUrl ? (
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <BuilderVideoPlaylist items={[{ id: "featured-video", title: creator.featuredTitle || "Featured video", url: creator.featuredUrl, thumbnail: undefined }]} />
            </div>
          ) : featuredMode === "track" && creator.featuredUrl ? (
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <BuilderAudioPlayer tracks={[{ id: "featured-track", title: creator.featuredTitle || "Featured track", url: creator.featuredUrl }]} />
            </div>
          ) : creator.featuredUrl ? (
            <a href={creator.featuredUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline">
              Open featured link <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          ) : null}
        </div>
      );
    }

    if (key === "gallery") {
      return assignedGalleryImages.length ? (
        <BuilderMediaGallery items={assignedGalleryImages.map((item, index) => ({ id: String(item.id || index), title: item.caption || `Image ${index + 1}`, imageUrl: item.url, mediaUrl: item.url }))} />
      ) : <div className="text-sm text-muted-foreground">No image showcase items yet.</div>;
    }

    if (key === "video") {
      return assignedPlaylistVideos.length ? (
        <BuilderVideoPlaylist items={assignedPlaylistVideos.map((item, index) => ({ id: String(item.id || index), title: item.caption || `Video ${index + 1}`, url: item.url, thumbnail: item.thumbnailUrl || undefined }))} />
      ) : <div className="text-sm text-muted-foreground">No video items yet.</div>;
    }

    if (key === "audio") {
      return audioGallery.length ? (
        <BuilderAudioPlayer tracks={audioGallery.map((item, index) => ({ id: String(item.id || index), title: item.caption || `Track ${index + 1}`, url: item.url }))} />
      ) : <div className="text-sm text-muted-foreground">No audio items yet.</div>;
    }

    if (key === "links") {
      return linkItems.length ? (
        <BuilderLinksShowcase items={linkItems} />
      ) : <div className="text-sm text-muted-foreground">No links added yet.</div>;
    }

    if (key === "events") {
      return linkedEvents.length ? (
        <BuilderEventCarousel items={linkedEvents.map((event) => ({ id: String(event.id), title: event.title, startsAt: event.startsAt, location: event.location || undefined, city: event.city || undefined, description: event.description || undefined, imageUrl: event.imageUrl || undefined, tags: event.lineupTags || undefined, linkedArtistsCount: event.linkedArtistsCount ?? undefined }))} />
      ) : <div className="text-sm text-muted-foreground">No linked events yet.</div>;
    }

    if (key === "about") {
      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(220px,1fr)]">
          <div className="space-y-4 rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-sm leading-7 text-muted-foreground">{artist.bio || "No story added yet."}</div>
            {customFields.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {customFields.slice(0, 4).map((field) => (
                  <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{field.label}</div>
                    <div className="mt-1 text-sm">{field.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What they do</div>
            <div className="mt-2 text-sm leading-6">{artist.category || artist.tagline || "Define the business offering."}</div>
            {heroTags.length ? (
              <>
                <div className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Tags</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {heroTags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      );
    }

    if (key === "posts") {
      return (
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <div className="text-sm font-medium">{artistPostsCount} artist-page post{artistPostsCount === 1 ? "" : "s"}</div>
          <div className="mt-2 text-sm text-muted-foreground">This block surfaces artist updates and stays reorderable like every other block.</div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Primary action</div>
        <div className="mt-2 text-2xl font-semibold">{creator.primaryActionLabel || "Contact me"}</div>
        <div className="mt-2 text-sm text-muted-foreground">{artist.bookingEmail || creator.primaryActionUrl || "Configure your contact path in the inspector."}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                Visual Builder
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Build the creator page directly.</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Select a block from the left or click it in preview. The inspector only shows controls for the active block, and the preview updates immediately.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {renderSaveButton()}
              <Button type="button" variant="outline" onClick={onOpenPublicPage} disabled={!hasArtistPage}>
                View Public Page
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between md:hidden">
            <div className="text-sm font-medium">Mobile mode</div>
            <div className="inline-flex rounded-full border border-border/60 bg-background/60 p-1">
              <Button type="button" size="sm" variant={creatorBuilderView === "edit" ? "default" : "ghost"} className="rounded-full" onClick={() => setCreatorBuilderView("edit")}>
                <EyeOff className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button type="button" size="sm" variant={creatorBuilderView === "preview" ? "default" : "ghost"} className="rounded-full" onClick={() => setCreatorBuilderView("preview")}>
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="hidden md:block rounded-[1.75rem] border border-primary/35 p-3">
        <div className="mb-3 px-2">
          <div className="text-sm font-semibold">Page identity tools</div>
          <div className="mt-1 text-sm text-muted-foreground">Manage the fixed page identity here. This top module should stay focused on the basic page information.</div>
        </div>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="space-y-4">
            {renderIdentityTools()}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.08fr]">
        <Card className={cn("border-border/50 bg-card/50 md:hidden", creatorBuilderView === "preview" && "hidden")}>
          <CardHeader className="pb-3">
            <button type="button" onClick={() => setShowMobileBlockMenu((current) => !current)} className="flex w-full items-center justify-between text-left">
              <div>
                <CardTitle className="text-base">Page blocks</CardTitle>
                <CardDescription className="mt-1">Select, hide, or reorder sections.</CardDescription>
              </div>
              <ChevronDown className={cn("h-5 w-5 transition-transform", showMobileBlockMenu && "rotate-180")} />
            </button>
          </CardHeader>
          {showMobileBlockMenu ? (
            <CardContent>
              {renderBlockList()}
            </CardContent>
          ) : null}
        </Card>

        <div className={cn("space-y-4 md:hidden xl:sticky xl:top-24 xl:h-fit", creatorBuilderView === "preview" && "hidden md:block")}>
          <div className="rounded-[1.75rem] border border-sky-400/35 p-3">
            <div className="mb-3 px-2">
              <div className="text-sm font-semibold">Page creation tools</div>
              <div className="mt-1 text-sm text-muted-foreground">Use the block picker and section settings here to build the page structure.</div>
            </div>
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>{selectedBlock === "hero" ? "Hero block settings" : selectedBlock === "hero-details" ? "Creation description settings" : `${selectedSection?.label} settings`}</CardTitle>
                <CardDescription>{selectedBlock === "hero" ? "Edit the hero media block only. Basic page identity stays in the fixed module above." : selectedBlock === "hero-details" ? "Edit the block that sits beside the hero media." : selectedSection?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInspector()}
                <div className="flex flex-wrap gap-3 border-t border-border/50 pt-4">
                  {renderSaveButton()}
                  {!hasArtistPage ? (
                    <div className="text-sm text-muted-foreground">Save once to publish the page and unlock the public route.</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="hidden md:block xl:sticky xl:top-24 xl:h-fit">
          <div className="mb-6 rounded-[1.75rem] border border-sky-400/35 p-3">
            <div className="mb-3 px-2">
              <div className="text-sm font-semibold">Page creation tools</div>
              <div className="mt-1 text-sm text-muted-foreground">Use the block picker and section settings here to build the page structure.</div>
            </div>
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Block picker</CardTitle>
                <CardDescription>Choose which module you are editing, then reorder or hide sections from here.</CardDescription>
              </CardHeader>
              <CardContent>
                {renderHorizontalBlockMenu()}
              </CardContent>
            </Card>

            <Card className="mt-4 border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>{selectedBlock === "hero" ? "Hero block settings" : selectedBlock === "hero-details" ? "Creation description settings" : `${selectedSection?.label} settings`}</CardTitle>
                <CardDescription>{selectedBlock === "hero" ? "Edit the hero media block only. Basic page identity stays in the fixed module above." : selectedBlock === "hero-details" ? "Edit the block that sits beside the hero media." : selectedSection?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInspector()}
                <div className="flex flex-wrap gap-3 border-t border-border/50 pt-4">
                  {renderSaveButton()}
                  {!hasArtistPage ? (
                    <div className="text-sm text-muted-foreground">Save once to publish the page and unlock the public route.</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className={cn("border-border/50 bg-card/50 xl:sticky xl:top-24", creatorBuilderView === "edit" && "hidden md:block")}>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <CardDescription>Click any part of the page to focus that block in the inspector.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[2rem] border border-border/50 bg-background/40">
              <button
                type="button"
                onClick={() => setSelectedBlock("hero")}
                className={cn("block w-full overflow-hidden text-left", selectedBlock === "hero" && "ring-2 ring-primary/30")}
              >
                <CreatorHeroSlider
                  slides={heroSlides}
                  autoplay={false}
                  className="min-h-[24rem]"
                  contentClassName="min-h-[24rem]"
                  overlayClassName="bg-gradient-to-t from-background via-background/75 to-background/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-black/10 to-transparent" />
                  {builderMeta.heroVideoUrl ? (
                    <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white">
                      <Video className="mr-1 inline h-3.5 w-3.5" /> External hero video linked
                    </div>
                  ) : null}
                  <div className="relative z-10 flex h-full flex-col justify-end gap-6 px-6 py-6 text-white md:px-8 md:py-8">
                    <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end">
                      <Avatar className="h-24 w-24 border-4 border-white/20 shadow-2xl md:h-28 md:w-28">
                        <AvatarImage src={artist.avatarUrl || ""} />
                        <AvatarFallback>{heroName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-3">
                        <div className="text-4xl font-bold tracking-tight md:text-5xl">{heroName}</div>
                        <div className="max-w-3xl text-base text-white/88 md:text-lg">{artist.tagline || "Add a one-line first impression in the inspector."}</div>
                      </div>
                    </div>
                  </div>
                </CreatorHeroSlider>
              </button>

              <div className="space-y-4 p-4 md:p-5">
                <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(0,1.5fr)]">
                  <button
                    type="button"
                    onClick={() => setSelectedBlock("hero-details")}
                    className={cn("rounded-2xl border border-border/50 bg-background/40 text-left transition-all hover:border-primary/30", selectedBlock === "hero-details" && "border-primary/50 ring-1 ring-primary/20")}
                  >
                    <CreatorInfoCard
                      creator={{
                        name: heroInfoTitle,
                        title: artist.category || artist.tagline || "Creator",
                        bio: heroInfoDescription,
                        availabilityText: artist.availabilityStatus || undefined,
                        turnaround: creator.turnaroundInfo || undefined,
                        location: artist.location || undefined,
                        price: creator.pricingSummary || undefined,
                        phone: heroInfoPhone || undefined,
                        email: artist.bookingEmail || undefined,
                        links: heroInfoLinks,
                        services: heroInfoServices,
                      }}
                      className="min-h-[22rem] rounded-2xl border-0 bg-transparent shadow-none"
                      showImage={false}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBlock("hero")}
                    className={cn("overflow-hidden rounded-2xl border border-border/50 bg-background/40 text-left transition-all hover:border-primary/30", selectedBlock === "hero" && "border-primary/50 ring-1 ring-primary/20")}
                  >
                    {builderMeta.heroMediaType === "video" ? (
                      assignedHeroVideos.length ? (
                        <div className="p-0">
                          <BuilderVideoPlaylist items={assignedHeroVideos.map((item, index) => ({ id: String(item.id || index), title: item.caption || `Video ${index + 1}`, url: item.url, thumbnail: item.thumbnailUrl || undefined }))} />
                        </div>
                      ) : <div className="p-6 text-sm text-muted-foreground">No hero videos selected.</div>
                    ) : assignedHeroImages.length ? (
                      <div className="relative min-h-[22rem] w-full overflow-hidden bg-muted">
                        <img
                          src={assignedHeroImages[0]?.url || ""}
                          alt={assignedHeroImages[0]?.caption || "Hero image"}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute left-4 top-4 text-xs uppercase tracking-[0.18em] text-white/80">Hero media</div>
                        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                          <div className="text-3xl font-semibold">{assignedHeroImages[0]?.caption || "Hero image"}</div>
                        </div>
                      </div>
                    ) : <div className="p-6 text-sm text-muted-foreground">No hero images selected.</div>}
                  </button>
                </div>
                {visibleSections.map((section) => {
                  const meta = SECTION_LIBRARY.find((item) => item.key === section.key)!;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setSelectedBlock(section.key)}
                      className={cn("block w-full rounded-[1.5rem] border border-border/50 bg-background/35 p-4 text-left transition-all hover:border-primary/30", selectedBlock === section.key && "border-primary/50 ring-1 ring-primary/20")}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{meta.label}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{meta.description}</div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {renderSectionPreview(section.key)}
                    </button>
                  );
                })}
              </div>
            </div>
            {hasArtistPage ? (
              <div className="mt-4">
                <Link href={`/artists/${userId}`}>
                  <Button variant="outline">Open Full Public Page</Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
