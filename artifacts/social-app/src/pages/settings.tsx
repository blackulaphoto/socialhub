import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAddUserPhoto,
  GalleryItemRequestType,
  useAddGalleryItem,
  useDeleteUserPhoto,
  useDeleteGalleryItem,
  useGetUser,
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
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload-image";

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

const THEME_OPTIONS = [
  { value: "nocturne", label: "Nocturne" },
  { value: "ember", label: "Ember" },
  { value: "afterhours", label: "After Hours" },
];

const MOOD_OPTIONS = ["sleek", "underground", "dreamy", "luxe", "gritty", "minimal", "neon", "vintage"];
const LAYOUT_OPTIONS = ["portfolio", "music", "performer", "shop", "editorial"];
const FONT_OPTIONS = ["modern", "editorial", "mono"];
const FEATURED_TYPES = ["highlight", "track", "video", "gallery", "event", "product", "post"];
const MODULE_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "about", label: "About" },
  { value: "media", label: "Media" },
  { value: "posts", label: "Posts" },
  { value: "events", label: "Events" },
  { value: "contact", label: "Contact" },
];

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

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [basic, setBasic] = useState<Record<string, string>>({});
  const [artist, setArtist] = useState<Record<string, string>>({});
  const [creator, setCreator] = useState<Record<string, string>>({});
  const [isCreatingArtistPage, setIsCreatingArtistPage] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [pageModules, setPageModules] = useState<{ enabledModules: string[]; moduleOrder: string[] }>({
    enabledModules: ["featured", "about", "media", "posts", "events", "contact"],
    moduleOrder: ["featured", "about", "media", "posts", "events", "contact"],
  });
  const [gallery, setGallery] = useState<{ type: GalleryItemRequestType; url: string; caption: string }>({
    type: GalleryItemRequestType.image,
    url: "",
    caption: "",
  });
  const [photoForm, setPhotoForm] = useState({ imageUrl: "", caption: "" });
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

  useEffect(() => {
    if (!profile) return;
    setIsCreatingArtistPage(false);
    setActiveTab("profile");
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
      primaryActionType: profile.creatorSettings?.primaryActionType || "contact",
      primaryActionLabel: profile.creatorSettings?.primaryActionLabel || "Contact Me",
      primaryActionUrl: profile.creatorSettings?.primaryActionUrl || "",
      featuredTitle: profile.creatorSettings?.featuredTitle || "",
      featuredDescription: profile.creatorSettings?.featuredDescription || "",
      featuredUrl: profile.creatorSettings?.featuredUrl || "",
      featuredType: profile.creatorSettings?.featuredType || "highlight",
      moodPreset: profile.creatorSettings?.moodPreset || "sleek",
      layoutTemplate: profile.creatorSettings?.layoutTemplate || "portfolio",
      fontPreset: profile.creatorSettings?.fontPreset || "modern",
      openForCommissions: profile.artistProfile?.openForCommissions ? "true" : "false",
      touring: profile.artistProfile?.touring ? "true" : "false",
      acceptsCollaborations: profile.artistProfile?.acceptsCollaborations === false ? "false" : "true",
      pinnedPostId: profile.creatorSettings?.pinnedPost?.id ? String(profile.creatorSettings.pinnedPost.id) : "",
    });
    setPageModules({
      enabledModules: profile.creatorSettings?.enabledModules?.length ? profile.creatorSettings.enabledModules : ["featured", "about", "media", "posts", "events", "contact"],
      moduleOrder: profile.creatorSettings?.moduleOrder?.length ? profile.creatorSettings.moduleOrder : ["featured", "about", "media", "posts", "events", "contact"],
    });
  }, [profile]);

  const actionPreset = useMemo(() => {
    return ACTION_OPTIONS.includes(creator.primaryActionLabel || "") ? creator.primaryActionLabel : "Custom";
  }, [creator.primaryActionLabel]);

  const hasArtistPage = !!profile?.artistProfile;
  const showCreatorTools = hasArtistPage || isCreatingArtistPage;

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

  if (isLoading || !profile || !user) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const accent = basic.accentColor || "#8b5cf6";
  const previewBio = artist.bio || basic.bio || basic.about || "Your profile preview updates live as you edit.";
  const previewInterests = String(basic.interests || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

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
          {basic.bannerUrl && (
            <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${basic.bannerUrl})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/10" />
          <div className="relative z-10 flex flex-col gap-6 px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end">
              <Avatar className="h-24 w-24 border-4 border-background shadow-2xl md:h-32 md:w-32">
                <AvatarImage src={basic.avatarUrl || ""} />
                <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">{user.profileType}</Badge>
                  {showCreatorTools && artist.category && <Badge variant="secondary">{artist.category}</Badge>}
                  {showCreatorTools && creator.primaryActionLabel && <Badge>{creator.primaryActionLabel}</Badge>}
                </div>
                <div className="text-3xl font-bold md:text-4xl">{user.username}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {[basic.city, basic.location].filter(Boolean).join(" / ") || "Location preview"}
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
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="Los Angeles, CA" value={basic.location || ""} onChange={(e) => setBasic({ ...basic, location: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City / region</Label>
                  <Input id="city" placeholder="San Diego" value={basic.city || ""} onChange={(e) => setBasic({ ...basic, city: e.target.value })} />
                </div>
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
                onClick={() =>
                  saveBasic.mutate({
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
                  })
                }
                disabled={saveBasic.isPending || uploading.avatar || uploading.banner}
              >
                Save Profile
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
                      setActiveTab("creator");
                      setArtist((current) => ({
                        ...current,
                        category: current.category || "General Creator",
                        location: current.location || basic.location || "",
                        bio: current.bio || basic.about || basic.bio || "",
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
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Creator Page</CardTitle>
                  <CardDescription>Identity, optional creator fields, featured sections, flexible action button, and page style controls.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={artist.category || "General Creator"} onValueChange={(value) => setArtist({ ...artist, category: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CREATOR_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Base location</Label>
                      <Input placeholder="Los Angeles, CA" value={artist.location || ""} onChange={(e) => setArtist({ ...artist, location: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hero tagline</Label>
                    <Input placeholder="Industrial techno DJ for warehouse rooms and art-forward nights." value={artist.tagline || ""} onChange={(e) => setArtist({ ...artist, tagline: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Discovery tags</Label>
                    <Input placeholder="techno, darkwave, latex, portraits" value={artist.tags || ""} onChange={(e) => setArtist({ ...artist, tags: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Booking / contact email</Label>
                    <Input placeholder="bookings@example.com" value={artist.bookingEmail || ""} onChange={(e) => setArtist({ ...artist, bookingEmail: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Creator bio</Label>
                    <Textarea placeholder="Write a bio for your creator page." value={artist.bio || ""} onChange={(e) => setArtist({ ...artist, bio: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Influences / inspirations</Label>
                    <Textarea placeholder="Scenes, artists, references, moods, or eras that shape your work." value={artist.influences || ""} onChange={(e) => setArtist({ ...artist, influences: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Availability status</Label>
                      <Input placeholder="Available for summer bookings" value={artist.availabilityStatus || ""} onChange={(e) => setArtist({ ...artist, availabilityStatus: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pronouns</Label>
                      <Input placeholder="she/her" value={artist.pronouns || ""} onChange={(e) => setArtist({ ...artist, pronouns: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Years active</Label>
                      <Input placeholder="8 years" value={artist.yearsActive || ""} onChange={(e) => setArtist({ ...artist, yearsActive: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Agency / manager / representation</Label>
                      <Input placeholder="Represented by Night Office" value={artist.representedBy || ""} onChange={(e) => setArtist({ ...artist, representedBy: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Optional custom fields</Label>
                    <Textarea placeholder={"Label|Value\nGenres|Industrial, EBM, Warehouse\nAvailable for|Club sets and one-off bookings"} value={artist.customFields || ""} onChange={(e) => setArtist({ ...artist, customFields: e.target.value })} />
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
                      <Label>External destination</Label>
                      <Input placeholder="Store or external URL" value={creator.primaryActionUrl || ""} onChange={(e) => setCreator({ ...creator, primaryActionUrl: e.target.value })} />
                    </div>
                  </div>

                  {actionPreset === "Custom" && (
                    <div className="space-y-2">
                      <Label>Custom button label</Label>
                      <Input placeholder="Commission Me" value={creator.primaryActionLabel || ""} onChange={(e) => setCreator({ ...creator, primaryActionLabel: e.target.value })} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Featured type</Label>
                      <Select value={creator.featuredType || "highlight"} onValueChange={(value) => setCreator({ ...creator, featuredType: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FEATURED_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Featured title</Label>
                      <Input placeholder="Friday Residency" value={creator.featuredTitle || ""} onChange={(e) => setCreator({ ...creator, featuredTitle: e.target.value })} />
                    </div>
                  </div>
                  <Textarea placeholder="Featured description" value={creator.featuredDescription || ""} onChange={(e) => setCreator({ ...creator, featuredDescription: e.target.value })} />
                  <Input placeholder="Featured URL" value={creator.featuredUrl || ""} onChange={(e) => setCreator({ ...creator, featuredUrl: e.target.value })} />
                  <Input placeholder="Pinned post ID" value={creator.pinnedPostId || ""} onChange={(e) => setCreator({ ...creator, pinnedPostId: e.target.value })} />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Mood preset</Label>
                      <Select value={creator.moodPreset || "sleek"} onValueChange={(value) => setCreator({ ...creator, moodPreset: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MOOD_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Layout template</Label>
                      <Select value={creator.layoutTemplate || "portfolio"} onValueChange={(value) => setCreator({ ...creator, layoutTemplate: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{LAYOUT_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Font pairing</Label>
                      <Select value={creator.fontPreset || "modern"} onValueChange={(value) => setCreator({ ...creator, fontPreset: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FONT_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Visible modules</Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      {MODULE_OPTIONS.map((module) => (
                        <label key={module.value} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                          <Checkbox checked={pageModules.enabledModules.includes(module.value)} onCheckedChange={() => toggleModule(module.value)} />
                          <span className="text-sm">{module.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Module order</Label>
                    <div className="space-y-2">
                      {pageModules.moduleOrder.map((module, index) => (
                        <div key={module} className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                          <span className="text-sm">{MODULE_OPTIONS.find((item) => item.value === module)?.label || module}</span>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => moveModule(module, "up")} disabled={index === 0}>Up</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => moveModule(module, "down")} disabled={index === pageModules.moduleOrder.length - 1}>Down</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() =>
                        saveArtist.mutate({
                          userId: user.id,
                          data: {
                            category: artist.category,
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
                            primaryActionType: creator.primaryActionType,
                            primaryActionLabel: creator.primaryActionLabel,
                            primaryActionUrl: creator.primaryActionUrl || undefined,
                            featuredTitle: creator.featuredTitle || undefined,
                            featuredDescription: creator.featuredDescription || undefined,
                            featuredUrl: creator.featuredUrl || undefined,
                            featuredType: creator.featuredType || "highlight",
                            moodPreset: creator.moodPreset || "sleek",
                            layoutTemplate: creator.layoutTemplate || "portfolio",
                            fontPreset: creator.fontPreset || "modern",
                            enabledModules: pageModules.enabledModules,
                            moduleOrder: pageModules.moduleOrder,
                            pinnedPostId: creator.pinnedPostId ? Number(creator.pinnedPostId) : null,
                          },
                        })
                      }
                      disabled={saveArtist.isPending || !creator.primaryActionLabel?.trim()}
                    >
                      Save Creator Page
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        saveCreator.mutate({
                          userId: user.id,
                          data: {
                            primaryActionType: creator.primaryActionType,
                            primaryActionLabel: creator.primaryActionLabel,
                            primaryActionUrl: creator.primaryActionUrl || undefined,
                            featuredTitle: creator.featuredTitle || undefined,
                            featuredDescription: creator.featuredDescription || undefined,
                            featuredUrl: creator.featuredUrl || undefined,
                            featuredType: creator.featuredType || "highlight",
                            moodPreset: creator.moodPreset || "sleek",
                            layoutTemplate: creator.layoutTemplate || "portfolio",
                            fontPreset: creator.fontPreset || "modern",
                            enabledModules: pageModules.enabledModules,
                            moduleOrder: pageModules.moduleOrder,
                            pinnedPostId: creator.pinnedPostId ? Number(creator.pinnedPostId) : null,
                          },
                        })
                      }
                      disabled={saveCreator.isPending || !creator.primaryActionLabel?.trim()}
                    >
                      Save Action + Featured
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Creator Preview</CardTitle>
                  <CardDescription>This mirrors the visible identity people see on your artist page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">{artist.category || "General Creator"}</Badge>
                      <Badge>{creator.primaryActionLabel || "Contact Me"}</Badge>
                      <Badge variant="outline">{creator.moodPreset || "sleek"}</Badge>
                    </div>
                    <div className="text-2xl font-bold">{user.username}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{artist.location || basic.city || "Location preview"}</div>
                    <div className="mt-4 text-base">{artist.tagline || "Creator homepage headline preview."}</div>
                    <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{artist.bio || "Creator bio preview."}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {String(artist.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                    <div className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Layout: {creator.layoutTemplate || "portfolio"} / Font: {creator.fontPreset || "modern"}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  <Label htmlFor="photo-upload">Upload photo</Label>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0] || null, "photos", (url) => setPhotoForm((current) => ({ ...current, imageUrl: url })))}
                    disabled={uploading.photos}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo-url">Or paste image URL</Label>
                  <Input id="photo-url" placeholder="https://..." value={photoForm.imageUrl} onChange={(e) => setPhotoForm({ ...photoForm, imageUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo-caption">Caption</Label>
                  <Input id="photo-caption" placeholder="Late-night shoot in downtown LA" value={photoForm.caption} onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })} />
                </div>
                <Button className="w-full" onClick={() => addUserPhoto.mutate({ userId: user.id, data: photoForm })} disabled={addUserPhoto.isPending || uploading.photos || !photoForm.imageUrl.trim()}>
                  Add to Photo Gallery
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-2">
              {userPhotos?.length ? userPhotos.map((item) => (
                <Card key={item.id} className="overflow-hidden border-border/50 bg-card/50">
                  <img src={item.imageUrl} alt={item.caption || "Profile gallery photo"} className="h-56 w-full object-cover" />
                  <CardContent className="space-y-3 p-4">
                    {item.caption && <div className="text-sm">{item.caption}</div>}
                    <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                    <Button variant="destructive" size="sm" onClick={() => deleteUserPhoto.mutate({ userId: user.id, photoId: item.id })}>Delete</Button>
                  </CardContent>
                </Card>
              )) : (
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
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files?.[0] || null, "gallery", (url) => setGallery((current) => ({ ...current, url })))}
                        disabled={uploading.gallery}
                      />
                    )}
                  </div>
                  <Input placeholder="Caption" value={gallery.caption} onChange={(e) => setGallery({ ...gallery, caption: e.target.value })} />
                  <Button className="w-full" onClick={() => addGalleryItem.mutate({ userId: user.id, data: gallery })} disabled={addGalleryItem.isPending || uploading.gallery || !gallery.url.trim()}>Add Item</Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-2">
                {profile.artistProfile?.gallery?.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-border/50 bg-card/50">
                    <MediaEmbed
                      type={item.type}
                      url={item.url}
                      title={item.caption}
                      className={item.type === "image" ? "h-48 w-full object-cover" : item.type === "video" ? "aspect-video w-full border-0" : "h-40 w-full border-0"}
                    />
                    <CardContent className="space-y-3 p-4">
                      <div className="break-all text-sm text-muted-foreground">{item.url}</div>
                      {item.caption && <div className="text-sm">{item.caption}</div>}
                      <Button variant="destructive" size="sm" onClick={() => deleteGalleryItem.mutate({ userId: user.id, itemId: item.id })}>Delete</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
