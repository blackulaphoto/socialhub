import { useState } from "react";
import { Link } from "wouter";
import { 
  useGetUser, 
  useSendBookingInquiry,
  useFollowUser,
  useUnfollowUser
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { 
  MapPin, 
  Mail, 
  CalendarClock, 
  Tag, 
  Play, 
  Image as ImageIcon, 
  Music,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ArtistProfile({ id }: { id: string }) {
  const userId = parseInt(id);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Booking form state
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventType, setEventType] = useState("");
  const [message, setMessage] = useState("");

  const { data: profile, isLoading } = useGetUser(userId, {
    query: { enabled: !!userId }
  });

  const { mutate: bookArtist, isPending: isBooking } = useSendBookingInquiry();
  const { mutate: follow } = useFollowUser();
  const { mutate: unfollow } = useUnfollowUser();

  const handleFollowToggle = () => {
    if (!profile) return;
    
    if (profile.isFollowing) {
      unfollow({ userId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
      });
    } else {
      follow({ userId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", userId] })
      });
    }
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !profile?.artistProfile) return;

    bookArtist(
      { 
        artistId: profile.artistProfile.userId,
        data: {
          eventDate,
          eventLocation,
          eventType,
          message
        }
      },
      {
        onSuccess: () => {
          setIsBookModalOpen(false);
          toast({ title: "Inquiry Sent", description: "Your booking request has been sent to the artist." });
          // Reset form
          setEventDate("");
          setEventLocation("");
          setEventType("");
          setMessage("");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to send booking inquiry.", variant: "destructive" });
        }
      }
    );
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
  };

  const getVimeoEmbedUrl = (url: string) => {
    const regExp = /vimeo.*\/(\d+)/i;
    const match = url.match(regExp);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!profile || !profile.artistProfile) {
    return <div className="text-center py-20">Artist profile not found</div>;
  }

  const { user, isFollowing, artistProfile } = profile;

  return (
    <div className="w-full pb-20">
      {/* Header/Hero Section */}
      <div className="relative border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-background z-0" />
        {artistProfile.gallery?.find(g => g.type === 'image') && (
          <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center" 
               style={{ backgroundImage: `url(${artistProfile.gallery.find(g => g.type === 'image')?.url})` }} />
        )}
        
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <Avatar className="w-32 h-32 md:w-48 md:h-48 border-4 border-background shadow-2xl">
            <AvatarImage src={user.avatarUrl || ""} />
            <AvatarFallback className="text-4xl bg-primary/20 text-primary">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 justify-center md:justify-start">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{user.username}</h1>
              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-sm px-3 py-1 self-center w-max uppercase tracking-wider">
                {artistProfile.category}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground mb-6 text-sm">
              {artistProfile.location && (
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {artistProfile.location}</span>
              )}
              <span className="flex items-center"><Tag className="w-4 h-4 mr-1.5" /> {user.followerCount} Followers</span>
              <Link href={`/profile/${user.id}`} className="hover:text-primary flex items-center transition-colors">
                <ExternalLink className="w-4 h-4 mr-1.5" /> Standard Profile
              </Link>
            </div>

            {artistProfile.tags && artistProfile.tags.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-8">
                {artistProfile.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-secondary/50 border border-border/50 text-xs px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start w-full sm:w-auto">
              <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full sm:w-auto font-bold px-8 shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                    <CalendarClock className="w-5 h-5 mr-2" /> Book / Contact
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] border-border/50 bg-card/95 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Book {user.username}</DialogTitle>
                    <DialogDescription>
                      Send an inquiry for a performance, collaboration, or commission.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBookingSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="eventType">Event/Project Type</Label>
                        <Select value={eventType} onValueChange={setEventType}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Live Performance">Live Performance</SelectItem>
                            <SelectItem value="DJ Set">DJ Set</SelectItem>
                            <SelectItem value="Exhibition">Exhibition</SelectItem>
                            <SelectItem value="Commission">Commission</SelectItem>
                            <SelectItem value="Collaboration">Collaboration</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date (Optional)</Label>
                        <Input 
                          id="date" 
                          type="date" 
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="bg-background/50" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location / Venue (Optional)</Label>
                      <Input 
                        id="location" 
                        placeholder="e.g. Berghain, Berlin" 
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="bg-background/50" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Describe your event, budget, and requirements..." 
                        required 
                        className="min-h-[120px] bg-background/50"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="submit" disabled={isBooking || !message.trim()} className="w-full">
                        {isBooking ? <Spinner className="mr-2" size="sm" /> : <Mail className="w-4 h-4 mr-2" />}
                        Send Inquiry
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              
              {currentUser?.id !== user.id && (
                <Button 
                  size="lg" 
                  variant={isFollowing ? "outline" : "secondary"} 
                  onClick={handleFollowToggle}
                  className="w-full sm:w-auto"
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Bio & Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">About</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {artistProfile.bio || user.bio || "No bio available."}
              </p>
              
              {artistProfile.bookingEmail && (
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-3 text-sm">
                  <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Direct Contact</p>
                    <a href={`mailto:${artistProfile.bookingEmail}`} className="font-medium hover:underline">
                      {artistProfile.bookingEmail}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Gallery */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Showcase</h2>
          
          {artistProfile.gallery && artistProfile.gallery.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {artistProfile.gallery.map(item => (
                <Card key={item.id} className="overflow-hidden border-border/50 bg-card/30 group">
                  {item.type === 'image' && (
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      <img 
                        src={item.url} 
                        alt={item.caption || "Gallery item"} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-md p-1.5 rounded-md shadow-sm">
                        <ImageIcon className="w-4 h-4 text-foreground" />
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'video' && (
                    <div className="aspect-video relative bg-black">
                      <iframe 
                        src={item.url.includes('youtube') || item.url.includes('youtu.be') ? getYoutubeEmbedUrl(item.url) : 
                             item.url.includes('vimeo') ? getVimeoEmbedUrl(item.url) : item.url} 
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                      <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-md p-1.5 rounded-md shadow-sm z-10 pointer-events-none">
                        <Play className="w-4 h-4 text-foreground" />
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'audio' && (
                    <div className="p-4 bg-secondary/30 h-full min-h-[160px] flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-primary/20 p-2 rounded-full text-primary">
                          <Music className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm">Audio Track</span>
                      </div>
                      {item.url.includes('soundcloud') || item.url.includes('spotify') ? (
                        <iframe 
                          src={item.url} 
                          className="w-full h-[152px] border-0 rounded-md mt-auto" 
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        />
                      ) : (
                        <a href={item.url} target="_blank" rel="noreferrer" className="mt-auto text-primary hover:underline text-sm break-all">
                          {item.url}
                        </a>
                      )}
                    </div>
                  )}
                  
                  {item.caption && (
                    <div className="p-3 border-t border-border/30 bg-card/50">
                      <p className="text-sm text-muted-foreground truncate">{item.caption}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-card/10">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>This artist hasn't uploaded any work yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
