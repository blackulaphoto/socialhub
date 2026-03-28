import { useState, useEffect } from "react";
import { 
  useUpdateProfile, 
  useUpdateArtistProfile,
  useAddGalleryItem,
  useGetUser,
  useDeleteGalleryItem,
  type GalleryItemRequestType
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Plus, Image as ImageIcon, Video, Music } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading } = useGetUser(user?.id || 0, {
    query: { enabled: !!user?.id }
  });

  // Profile Form State
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");

  // Artist Form State
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [artistBio, setArtistBio] = useState("");

  // Gallery Form State
  const [galleryType, setGalleryType] = useState<GalleryItemRequestType>("image");
  const [galleryUrl, setGalleryUrl] = useState("");
  const [galleryCaption, setGalleryCaption] = useState("");

  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutate: updateArtist, isPending: isUpdatingArtist } = useUpdateArtistProfile();
  const { mutate: addGalleryItem, isPending: isAddingGalleryItem } = useAddGalleryItem();
  const { mutate: deleteGalleryItem } = useDeleteGalleryItem();

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.user.avatarUrl || "");
      setBio(profile.user.bio || "");
      
      if (profile.artistProfile) {
        setCategory(profile.artistProfile.category || "");
        setLocation(profile.artistProfile.location || "");
        setTagsStr(profile.artistProfile.tags?.join(", ") || "");
        setBookingEmail(profile.artistProfile.bookingEmail || "");
        setArtistBio(profile.artistProfile.bio || "");
      }
    }
  }, [profile]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    updateProfile(
      { userId: user.id, data: { avatarUrl, bio } },
      {
        onSuccess: (updatedUser) => {
          queryClient.setQueryData(["/api/auth/me"], updatedUser);
          queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
          toast({ title: "Profile Updated", description: "Your basic profile has been updated." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        }
      }
    );
  };

  const handleArtistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const tags = tagsStr.split(",").map(t => t.trim()).filter(t => t);

    updateArtist(
      { 
        userId: user.id, 
        data: { 
          category, 
          location, 
          tags, 
          bookingEmail, 
          bio: artistBio 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
          toast({ title: "Artist Profile Updated", description: "Your public artist page has been updated." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update artist profile.", variant: "destructive" });
        }
      }
    );
  };

  const handleAddGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.artistProfile?.id) return;

    addGalleryItem(
      {
        artistId: profile.artistProfile.id,
        data: {
          type: galleryType,
          url: galleryUrl,
          caption: galleryCaption || undefined
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
          setGalleryUrl("");
          setGalleryCaption("");
          toast({ title: "Item Added", description: "Gallery item has been added successfully." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add gallery item.", variant: "destructive" });
        }
      }
    );
  };

  const handleDeleteGalleryItem = (itemId: number) => {
    if (!profile?.artistProfile?.id) return;

    deleteGalleryItem(
      { artistId: profile.artistProfile.id, itemId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
          toast({ title: "Item Deleted", description: "Gallery item removed." });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:py-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and profile preferences.</p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-8 bg-card/50 border border-border/50">
          <TabsTrigger value="basic">Basic Profile</TabsTrigger>
          {user?.profileType === 'artist' && (
            <>
              <TabsTrigger value="artist">Artist Page</TabsTrigger>
              <TabsTrigger value="gallery">Showcase Gallery</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="basic">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Basic Profile</CardTitle>
              <CardDescription>Update your public identity on ArtistHub.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20 border border-border">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input 
                      id="avatarUrl" 
                      value={avatarUrl} 
                      onChange={(e) => setAvatarUrl(e.target.value)} 
                      placeholder="https://example.com/image.jpg"
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username (Cannot be changed)</Label>
                  <Input id="username" value={user?.username} disabled className="bg-muted text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Short Bio</Label>
                  <Textarea 
                    id="bio" 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    placeholder="Tell everyone a bit about yourself..."
                    className="bg-background/50"
                  />
                </div>

                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile && <Spinner className="mr-2" size="sm" />}
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.profileType === 'artist' && (
          <>
            <TabsContent value="artist">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>Artist Details</CardTitle>
                  <CardDescription>Customize how you appear to promoters and fans.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleArtistSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Music">Music</SelectItem>
                            <SelectItem value="DJ">DJ</SelectItem>
                            <SelectItem value="Producer">Producer</SelectItem>
                            <SelectItem value="Visual Arts">Visual Arts</SelectItem>
                            <SelectItem value="Photography">Photography</SelectItem>
                            <SelectItem value="Performance">Performance</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Base Location</Label>
                        <Input 
                          id="location" 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)} 
                          placeholder="Berlin, London, NYC..."
                          className="bg-background/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input 
                        id="tags" 
                        value={tagsStr} 
                        onChange={(e) => setTagsStr(e.target.value)} 
                        placeholder="techno, ambient, live visual, etc"
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bookingEmail">Booking/Contact Email</Label>
                      <Input 
                        id="bookingEmail" 
                        type="email"
                        value={bookingEmail} 
                        onChange={(e) => setBookingEmail(e.target.value)} 
                        placeholder="booking@example.com"
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="artistBio">Full Artist Bio</Label>
                      <Textarea 
                        id="artistBio" 
                        value={artistBio} 
                        onChange={(e) => setArtistBio(e.target.value)} 
                        placeholder="Detailed background, residencies, previous gigs..."
                        className="min-h-[150px] bg-background/50"
                      />
                    </div>

                    <Button type="submit" disabled={isUpdatingArtist}>
                      {isUpdatingArtist && <Spinner className="mr-2" size="sm" />}
                      Save Artist Profile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <Card className="border-border/50 bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Add to Showcase</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddGalleryItem} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Media Type</Label>
                          <Select value={galleryType} onValueChange={(v) => setGalleryType(v as GalleryItemRequestType)}>
                            <SelectTrigger className="bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="video">Video Embed</SelectItem>
                              <SelectItem value="audio">Audio Embed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>URL</Label>
                          <Input 
                            value={galleryUrl} 
                            onChange={(e) => setGalleryUrl(e.target.value)} 
                            placeholder={
                              galleryType === 'image' ? "Image URL..." :
                              galleryType === 'video' ? "YouTube / Vimeo URL..." :
                              "SoundCloud / Spotify URL..."
                            }
                            className="bg-background/50"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Caption (Optional)</Label>
                          <Input 
                            value={galleryCaption} 
                            onChange={(e) => setGalleryCaption(e.target.value)} 
                            placeholder="Describe this piece..."
                            className="bg-background/50"
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={isAddingGalleryItem || !galleryUrl}>
                          <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-bold mb-4">Current Showcase</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile?.artistProfile?.gallery?.map((item) => (
                      <Card key={item.id} className="overflow-hidden border-border/50 bg-card/50">
                        <div className="h-32 bg-muted relative flex items-center justify-center border-b border-border/50">
                          {item.type === 'image' ? (
                            <img src={item.url} className="w-full h-full object-cover" alt={item.caption || "Gallery item"} />
                          ) : item.type === 'video' ? (
                            <Video className="w-8 h-8 text-muted-foreground" />
                          ) : (
                            <Music className="w-8 h-8 text-muted-foreground" />
                          )}
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => handleDeleteGalleryItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground truncate" title={item.url}>{item.url}</p>
                          {item.caption && <p className="text-sm mt-1 truncate">{item.caption}</p>}
                        </div>
                      </Card>
                    ))}
                    
                    {(!profile?.artistProfile?.gallery || profile.artistProfile.gallery.length === 0) && (
                      <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Your showcase is empty.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
