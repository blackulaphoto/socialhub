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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Palette, Sparkles } from "lucide-react";

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

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<"profile" | "artist" | "finish">("profile");
  const [wantsArtistPage, setWantsArtistPage] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: "",
    city: "",
    location: "",
    about: "",
    interests: "",
  });
  const [artistForm, setArtistForm] = useState({
    category: "General Creator",
    location: "",
    tagline: "",
    tags: "",
    bio: "",
    bookingEmail: "",
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
      about: profile.user.about || "",
      interests: (profile.user.interests || []).join(", "),
    });
    setArtistForm({
      category: profile.artistProfile?.category || "General Creator",
      location: profile.artistProfile?.location || profile.user.location || "",
      tagline: profile.artistProfile?.tagline || "",
      tags: profile.artistProfile?.tags?.join(", ") || "",
      bio: profile.artistProfile?.bio || profile.user.about || profile.user.bio || "",
      bookingEmail: profile.artistProfile?.bookingEmail || "",
    });
    setWantsArtistPage(!!profile.artistProfile);
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
        about: profileForm.about || undefined,
        interests: profileForm.interests.split(",").map((item) => item.trim()).filter(Boolean),
        onboardingCompleted: false,
        onboardingStep: wantsArtistPage ? "artist" : "finish",
      },
    }, {
      onSuccess: () => setStep(wantsArtistPage ? "artist" : "finish"),
      onError: () => toast({ title: "Could not save profile step", variant: "destructive" }),
    });
  };

  const saveArtistStep = () => {
    updateArtist.mutate({
      userId: user.id,
      data: {
        category: artistForm.category,
        location: artistForm.location || undefined,
        tagline: artistForm.tagline || undefined,
        tags: artistForm.tags.split(",").map((item) => item.trim()).filter(Boolean),
        bio: artistForm.bio || undefined,
        bookingEmail: artistForm.bookingEmail || undefined,
      },
    }, {
      onSuccess: () => {
        updateCreatorSettings.mutate({
          userId: user.id,
          data: {
            primaryActionLabel: "Contact Me",
            primaryActionType: "contact",
          },
        });
        setStep("finish");
      },
      onError: () => toast({ title: "Could not create artist page", variant: "destructive" }),
    });
  };

  const finishOnboarding = () => {
    updateProfile.mutate({
      userId: user.id,
      data: {
        bio: profileForm.bio || undefined,
        city: profileForm.city || undefined,
        location: profileForm.location || undefined,
        about: profileForm.about || undefined,
        interests: profileForm.interests.split(",").map((item) => item.trim()).filter(Boolean),
        onboardingCompleted: true,
        onboardingStep: "finish",
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Setup complete", description: "Your profile is ready." });
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
              <CardDescription>Start with the basics people need to understand who you are and what you are into.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={profileForm.city} onChange={(e) => setProfileForm((current) => ({ ...current, city: e.target.value }))} placeholder="Los Angeles" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={profileForm.location} onChange={(e) => setProfileForm((current) => ({ ...current, location: e.target.value }))} placeholder="Los Angeles, CA" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Short bio</Label>
                <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((current) => ({ ...current, bio: e.target.value }))} placeholder="A quick one-line intro." />
              </div>
              <div className="space-y-2">
                <Label>About you</Label>
                <Textarea value={profileForm.about} onChange={(e) => setProfileForm((current) => ({ ...current, about: e.target.value }))} placeholder="What do you do, what are you into, what kind of people should find you here?" />
              </div>
              <div className="space-y-2">
                <Label>Interests</Label>
                <Input value={profileForm.interests} onChange={(e) => setProfileForm((current) => ({ ...current, interests: e.target.value }))} placeholder="techno, galleries, film, fashion, nightlife" />
              </div>
              <div className={`rounded-3xl border px-5 py-5 transition-colors ${wantsArtistPage ? "border-primary bg-primary/10" : "border-border/50 bg-background/30"}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Recommended Next Step
                    </div>
                    <div className="text-lg font-semibold">Create a linked artist page too</div>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      Keep one account, but unlock a separate creator homepage for your work, media, booking button, events, and discovery profile.
                    </p>
                  </div>
                  <Button type="button" variant={wantsArtistPage ? "default" : "outline"} onClick={() => setWantsArtistPage((current) => !current)}>
                    <Palette className="mr-2 h-4 w-4" />
                    {wantsArtistPage ? "Artist Page Included" : "Yes, Add Artist Page"}
                  </Button>
                </div>
                <label className="mt-4 flex items-center gap-3 rounded-2xl border border-border/50 bg-background/40 px-4 py-3">
                  <Checkbox checked={wantsArtistPage} onCheckedChange={(checked) => setWantsArtistPage(Boolean(checked))} />
                  <span className="text-sm">I want a linked artist / creator page during setup</span>
                </label>
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
              <CardTitle>Create your artist page</CardTitle>
              <CardDescription>Start simple. You can fine-tune media modules, featured content, and page style later in settings.</CardDescription>
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
                  <Input value={artistForm.location} onChange={(e) => setArtistForm((current) => ({ ...current, location: e.target.value }))} placeholder="Los Angeles, CA" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hero tagline</Label>
                <Input value={artistForm.tagline} onChange={(e) => setArtistForm((current) => ({ ...current, tagline: e.target.value }))} placeholder="Industrial techno DJ for warehouse nights." />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input value={artistForm.tags} onChange={(e) => setArtistForm((current) => ({ ...current, tags: e.target.value }))} placeholder="techno, darkwave, latex, portraiture" />
              </div>
              <div className="space-y-2">
                <Label>Creator bio</Label>
                <Textarea value={artistForm.bio} onChange={(e) => setArtistForm((current) => ({ ...current, bio: e.target.value }))} placeholder="Give people a quick sense of your work." />
              </div>
              <div className="space-y-2">
                <Label>Booking or contact email</Label>
                <Input value={artistForm.bookingEmail} onChange={(e) => setArtistForm((current) => ({ ...current, bookingEmail: e.target.value }))} placeholder="bookings@example.com" />
              </div>
              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setStep("finish")}>Skip for now</Button>
                <Button onClick={saveArtistStep} disabled={updateArtist.isPending}>Create artist page</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === "finish" ? (
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle>You are ready</CardTitle>
              <CardDescription>Your personal profile is set. {wantsArtistPage ? "Your linked artist page can keep growing in settings." : "You can always add a linked artist page later."}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Next best steps: upload a profile photo, make a first post, and follow a few creators so the feed gets useful fast.
              </div>
              <Button onClick={finishOnboarding} disabled={updateProfile.isPending}>Enter ArtistHub</Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
