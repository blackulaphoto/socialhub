import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUser,
  useUpdateArtistProfile,
  useUpdateCreatorSettings,
  useUpdateProfile,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationInput } from "@/components/location-input";
import { WorkTypePicker } from "@/components/work-type-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCityRegion, parseCityRegion } from "@/lib/locations";
import { applyBrowseDetails, extractBrowseDetails } from "@/lib/browse-details";
import { Palette, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const CREATOR_TYPES = [
  "Model",
  "Photographer",
  "Videographer",
  "Makeup Artist",
  "Stylist",
  "Retoucher",
  "Set Designer",
  "Creative Director",
  "Wardrobe Stylist",
  "Hair Artist",
  "Production Team",
  "Creative Professional",
];

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<"profile" | "artist" | "finish">("profile");
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: "",
    city: "",
    location: "",
    age: "",
    work: "",
    school: "",
    about: "",
    interests: "",
  });
  const [artistForm, setArtistForm] = useState({
    category: "Creative Professional",
    location: "",
    tagline: "",
    tags: "",
    bio: "",
    bookingEmail: "",
    availabilityStatus: "",
    bestFor: "",
    travel: "",
    compensation: "",
    availabilityNote: "",
    acceptsCollaborations: true,
  });

  const { data: profile, isLoading } = useGetUser(user?.id || 0, {
    query: {
      queryKey: ["profile", user?.id, "onboarding"],
      enabled: !!user?.id,
    },
  });

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      bio: profile.user.bio || "",
      city: profile.user.city || "",
      location: profile.user.location || "",
      age: profile.user.age ? String(profile.user.age) : "",
      work: profile.user.work || "",
      school: profile.user.school || "",
      about: profile.user.about || "",
      interests: (profile.user.interests || []).join(", "),
    });
    setArtistForm({
      category: profile.artistProfile?.category || "Creative Professional",
      location: profile.artistProfile?.location || profile.user.location || "",
      tagline: profile.artistProfile?.tagline || "",
      tags: profile.artistProfile?.tags?.join(", ") || "",
      bio: profile.artistProfile?.bio || profile.user.about || profile.user.bio || "",
      bookingEmail: profile.artistProfile?.bookingEmail || "",
      availabilityStatus: profile.artistProfile?.availabilityStatus || "",
      bestFor: extractBrowseDetails(profile.artistProfile?.customFields).bestFor,
      travel: extractBrowseDetails(profile.artistProfile?.customFields).travel,
      compensation: extractBrowseDetails(profile.artistProfile?.customFields).compensation,
      availabilityNote: extractBrowseDetails(profile.artistProfile?.customFields).availabilityNote,
      acceptsCollaborations: profile.artistProfile?.acceptsCollaborations !== false,
    });
    if (profile.user.onboardingCompleted) {
      setLocation("/");
      return;
    }
    setStep((profile.user.onboardingStep as "profile" | "artist" | "finish") || "profile");
  }, [profile, setLocation]);

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      },
    },
  });

  const updateArtist = useUpdateArtistProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      },
    },
  });

  const updateCreatorSettings = useUpdateCreatorSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      },
    },
  });

  if (!user || isLoading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;
  }

  const saveProfileStep = () => {
    updateProfile.mutate({
      userId: user.id,
      data: {
        bio: profileForm.bio || undefined,
        city: profileForm.city || undefined,
        location: profileForm.location || undefined,
        age: profileForm.age ? Number(profileForm.age) : undefined,
        work: profileForm.work || undefined,
        school: profileForm.school || undefined,
        about: profileForm.about || undefined,
        interests: profileForm.interests.split(",").map((item) => item.trim()).filter(Boolean),
        onboardingCompleted: false,
        onboardingStep: "artist",
      },
    }, {
      onSuccess: () => setStep("artist"),
      onError: () => toast({ title: "Could not save profile step", variant: "destructive" }),
    });
  };

  const saveArtistStep = () => {
    const customFields = applyBrowseDetails([], {
      bestFor: artistForm.bestFor,
      travel: artistForm.travel,
      compensation: artistForm.compensation,
      availabilityNote: artistForm.availabilityNote,
    });
    updateArtist.mutate({
      userId: user.id,
      data: {
        category: artistForm.category,
        location: artistForm.location || undefined,
        tagline: artistForm.tagline || undefined,
        tags: artistForm.tags.split(",").map((item) => item.trim()).filter(Boolean),
        bio: artistForm.bio || undefined,
        bookingEmail: artistForm.bookingEmail || undefined,
        availabilityStatus: artistForm.availabilityStatus || undefined,
        acceptsCollaborations: artistForm.acceptsCollaborations,
        customFields,
      },
    }, {
      onSuccess: () => {
        updateCreatorSettings.mutate({
          userId: user.id,
          data: {
            primaryActionLabel: "Reach Out",
            primaryActionType: "contact",
          },
        });
        setStep("finish");
      },
      onError: () => toast({ title: "Could not save creator profile", variant: "destructive" }),
    });
  };

  const finishOnboarding = () => {
    updateProfile.mutate({
      userId: user.id,
      data: {
        bio: profileForm.bio || undefined,
        city: profileForm.city || undefined,
        location: profileForm.location || undefined,
        age: profileForm.age ? Number(profileForm.age) : undefined,
        work: profileForm.work || undefined,
        school: profileForm.school || undefined,
        about: profileForm.about || undefined,
        interests: profileForm.interests.split(",").map((item) => item.trim()).filter(Boolean),
        onboardingCompleted: true,
        onboardingStep: "finish",
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Setup complete", description: "Your artist page is ready." });
        setLocation("/");
      },
      onError: () => toast({ title: "Could not finish onboarding", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={step === "profile" ? "default" : "secondary"}>1. Your profile</Badge>
          <Badge variant={step === "artist" ? "default" : "secondary"}>2. Artist page</Badge>
          <Badge variant={step === "finish" ? "default" : "secondary"}>3. Finish</Badge>
        </div>

        {step === "profile" ? (
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle>Set up your profile</CardTitle>
              <CardDescription>Start with a few quick details. Everything here is optional and easy to change later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">City / state <span className="text-xs text-muted-foreground">Optional</span></Label>
                    <LocationInput
                      value={formatCityRegion(profileForm.city, profileForm.location)}
                      placeholder="Los Angeles, California"
                      onValueChange={(value) => {
                        const parsed = parseCityRegion(value);
                        setProfileForm((current) => ({ ...current, city: parsed.city, location: parsed.region }));
                      }}
                      onOptionSelect={(option) => setProfileForm((current) => ({ ...current, city: option.city, location: option.region }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">Short bio <span className="text-xs text-muted-foreground">Optional</span></Label>
                    <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((current) => ({ ...current, bio: e.target.value }))} placeholder="A quick line that feels like you." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">Interests <span className="text-xs text-muted-foreground">Optional</span></Label>
                    <Input value={profileForm.interests} onChange={(e) => setProfileForm((current) => ({ ...current, interests: e.target.value }))} placeholder="techno, galleries, film, fashion, nightlife" />
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/30 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">More details</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowProfileDetails((current) => !current)}
                      >
                        {showProfileDetails ? "Hide optional fields" : "Add more details"}
                      </Button>
                    </div>
                    {showProfileDetails ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="onboarding-age" className="flex items-center gap-2">Age <span className="text-xs text-muted-foreground">Optional</span></Label>
                          <Input
                            id="onboarding-age"
                            type="number"
                            min="13"
                            max="120"
                            value={profileForm.age}
                            onChange={(e) => setProfileForm((current) => ({ ...current, age: e.target.value }))}
                            placeholder="32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="onboarding-work" className="flex items-center gap-2">Work <span className="text-xs text-muted-foreground">Optional</span></Label>
                          <Input
                            id="onboarding-work"
                            value={profileForm.work}
                            onChange={(e) => setProfileForm((current) => ({ ...current, work: e.target.value }))}
                            placeholder="Photographer, makeup artist, stylist, retoucher"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="onboarding-school" className="flex items-center gap-2">School <span className="text-xs text-muted-foreground">Optional</span></Label>
                          <Input
                            id="onboarding-school"
                            value={profileForm.school}
                            onChange={(e) => setProfileForm((current) => ({ ...current, school: e.target.value }))}
                            placeholder="School, training, or creative program"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="flex items-center gap-2">About you <span className="text-xs text-muted-foreground">Optional</span></Label>
                          <Textarea value={profileForm.about} onChange={(e) => setProfileForm((current) => ({ ...current, about: e.target.value }))} placeholder="What do you do, what are you into, what kind of people should find you here?" />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Add age, work, school, and a longer story anytime.
                      </div>
                    )}
                  </div>
                </div>
                <Card className="border-border/60 bg-background/60">
                  <CardHeader>
                    <CardTitle className="text-base">Live preview</CardTitle>
                    <CardDescription>See how your intro will land on the page.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.user.avatarUrl || ""} />
                        <AvatarFallback>{profile.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold">{profile.user.username}</div>
                        <div className="text-xs text-muted-foreground">{formatCityRegion(profileForm.city, profileForm.location) || "Add your city"}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Bio</div>
                      <div className="mt-2 text-sm text-foreground">{profileForm.bio.trim() || "Share a short line about yourself."}</div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">About</div>
                      <div className="mt-2 text-sm text-muted-foreground">{profileForm.about.trim() || "Add a longer story, what you make, or the scenes you move through."}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(profileForm.interests || "")
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .slice(0, 6)
                        .map((interest) => (
                          <Badge key={interest} variant="secondary">{interest}</Badge>
                        ))}
                      {!profileForm.interests.trim() ? <Badge variant="outline">Add interests</Badge> : null}
                    </div>
                    {(profileForm.work || profileForm.school || profileForm.age) ? (
                      <div className="grid gap-2 text-xs text-muted-foreground">
                        {profileForm.work ? <div>Work: {profileForm.work}</div> : null}
                        {profileForm.school ? <div>School: {profileForm.school}</div> : null}
                        {profileForm.age ? <div>Age: {profileForm.age}</div> : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-3xl border border-primary/20 bg-primary/10 px-5 py-5 transition-colors">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Included In Setup
                    </div>
                      <div className="text-lg font-semibold">Your artist page comes with every account</div>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      Next you will shape the public page people see for your work, images, voice, and how they reach you.
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-primary/20 bg-background/50 px-4 py-2 text-sm font-medium">
                    <Palette className="mr-2 h-4 w-4" />
                    Artist page tools enabled
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button onClick={saveProfileStep} disabled={updateProfile.isPending}>Continue</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "artist" ? (
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle>Set up your artist page</CardTitle>
              <CardDescription>Start simple. You can fine-tune media, featured work, and page style later in settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={artistForm.category} onValueChange={(value) => setArtistForm((current) => ({ ...current, category: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CREATOR_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base location</Label>
                  <LocationInput
                    value={artistForm.location}
                    onValueChange={(value) => setArtistForm((current) => ({ ...current, location: value }))}
                    onOptionSelect={(option) => setArtistForm((current) => ({ ...current, location: option.label }))}
                    placeholder="Los Angeles, California"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hero tagline</Label>
                <Input value={artistForm.tagline} onChange={(e) => setArtistForm((current) => ({ ...current, tagline: e.target.value }))} placeholder="Editorial model available for fashion, beauty, and concept shoots." />
              </div>
              <div className="space-y-2">
                <WorkTypePicker
                  category={artistForm.category}
                  value={artistForm.tags}
                  onChange={(next) => setArtistForm((current) => ({ ...current, tags: next }))}
                  label="Work types"
                  helper="Choose the kinds of shoots and work you want to be found for."
                />
              </div>
              <div className="space-y-2">
                <Label>Artist page bio</Label>
                <Textarea value={artistForm.bio} onChange={(e) => setArtistForm((current) => ({ ...current, bio: e.target.value }))} placeholder="Give people a quick sense of your work and energy." />
              </div>
              <div className="space-y-2">
                <Label>Booking or contact email</Label>
                <Input value={artistForm.bookingEmail} onChange={(e) => setArtistForm((current) => ({ ...current, bookingEmail: e.target.value }))} placeholder="bookings@example.com" />
              </div>
              <details className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium">Optional browse details</summary>
                <div className="mt-3 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    These help people find you in browse and search. They are meant for discovery, not to overload your public page.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Availability</Label>
                      <Input
                        value={artistForm.availabilityStatus}
                        onChange={(e) => setArtistForm((current) => ({ ...current, availabilityStatus: e.target.value }))}
                        placeholder="Available now / booking June / weekends"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Best for / shoot types</Label>
                      <Input
                        value={artistForm.bestFor}
                        onChange={(e) => setArtistForm((current) => ({ ...current, bestFor: e.target.value }))}
                        placeholder="editorial, runway, beauty, campaigns, BTS"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Travel</Label>
                      <Input
                        value={artistForm.travel}
                        onChange={(e) => setArtistForm((current) => ({ ...current, travel: e.target.value }))}
                        placeholder="LA-based, open to travel / local only"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Compensation</Label>
                      <Input
                        value={artistForm.compensation}
                        onChange={(e) => setArtistForm((current) => ({ ...current, compensation: e.target.value }))}
                        placeholder="paid, TFP selectively, rates on request"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Availability note</Label>
                      <Input
                        value={artistForm.availabilityNote}
                        onChange={(e) => setArtistForm((current) => ({ ...current, availabilityNote: e.target.value }))}
                        placeholder="Late-night shoots okay / studio-ready / quick turnaround"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={artistForm.acceptsCollaborations}
                      onChange={(e) => setArtistForm((current) => ({ ...current, acceptsCollaborations: e.target.checked }))}
                    />
                    <span className="text-sm">Open to collaborations</span>
                  </label>
                </div>
              </details>
              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setStep("finish")}>Skip for now</Button>
                <Button onClick={saveArtistStep} disabled={updateArtist.isPending}>Save artist page</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "finish" ? (
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle>You are ready</CardTitle>
              <CardDescription>Your account and public artist page are set. You can keep shaping the page in settings anytime.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Next best steps: upload a profile photo, make a first post, and follow a few artists so the feed starts feeling alive fast.
              </div>
              <Button onClick={finishOnboarding} disabled={updateProfile.isPending}>Enter HollywoodHeartbeats.com</Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
