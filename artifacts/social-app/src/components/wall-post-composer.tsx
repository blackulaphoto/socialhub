import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Link2, Video, X, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/upload-image";
import { getEmbedDescriptor } from "@/lib/embeds";

interface WallPostComposerProps {
  targetUserId: number;
  targetUserName: string;
  onSuccess?: () => void;
}

export function WallPostComposer({ targetUserId, targetUserName, onSuccess }: WallPostComposerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkField, setShowLinkField] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const createWallPost = useMutation({
    mutationFn: async (data: { content: string; imageUrl?: string; media?: Array<{ type: string; url: string; title?: string; thumbnailUrl?: string }> }) => {
      const response = await fetch(`/api/users/${targetUserId}/wall-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create wall post" }));
        throw new Error(error.error || "Failed to create wall post");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wall post submitted",
        description: "Your post is pending approval from the artist.",
      });
      setContent("");
      setImageUrl("");
      setLinkUrl("");
      setShowLinkField(false);
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["artist-posts", targetUserId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const result = await uploadImage(file, "post");
      setImageUrl(result.url);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const submitPost = () => {
    if (!content.trim() && !imageUrl && !linkUrl.trim()) {
      toast({
        title: "Post is empty",
        description: "Please add some content or media to your post",
        variant: "destructive",
      });
      return;
    }

    const linkMedia = linkUrl.trim() ? getEmbedDescriptor(linkUrl.trim()) : null;
    const media = linkMedia ? [{ type: linkMedia.kind, url: linkMedia.href, title: linkMedia.label }] : [];

    createWallPost.mutate({
      content,
      imageUrl: imageUrl || undefined,
      media: media.length > 0 ? media : undefined,
    });
  };

  if (!user) return null;

  return (
    <Card className="border border-primary/45 bg-card/90 shadow-[0_0_0_2px_rgba(139,92,246,0.2)] ring-1 ring-primary/25">
      <CardContent className="p-4 md:p-5">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setShowLinkField(false);
        }}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="w-full rounded-2xl border border-primary/40 bg-white px-4 py-4 text-left text-slate-900 shadow-[0_0_0_1px_rgba(139,92,246,0.14)] transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback>{user.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Post on {targetUserName}&apos;s page</div>
                  <div className="text-xs text-muted-foreground">Your post will be pending approval</div>
                </div>
              </div>
            </button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post on {targetUserName}&apos;s Page</DialogTitle>
              <DialogDescription>This post will be pending approval before it appears on their page.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Your message</div>
              <Textarea
                placeholder={`Write something for ${targetUserName}...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32 rounded-2xl border border-primary/40 bg-white px-4 py-4 text-base text-slate-900 placeholder:text-slate-500 shadow-[0_0_0_1px_rgba(139,92,246,0.14)] focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              </div>

              <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Add media</div>
                    <div className="mt-1 text-xs text-muted-foreground">Attach an image or paste a video or link.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      <ImageIcon className="h-5 w-5 text-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowLinkField(true)}
                    >
                      <Video className="h-5 w-5 text-foreground/70" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowLinkField(!showLinkField)}
                    >
                      <Link2 className="h-5 w-5 text-foreground/70" />
                    </Button>
                  </div>
                </div>

                {(imageUrl || linkUrl) && (
                  <div className="flex flex-wrap gap-2">
                    {imageUrl && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-2 text-xs">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        Image attached
                        <button type="button" onClick={() => setImageUrl("")}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {linkUrl && (
                      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-2 text-xs">
                        <Link2 className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{linkUrl}</span>
                        <button type="button" onClick={() => setLinkUrl("")}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {showLinkField && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Paste a video, article, audio, or link"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="border-primary/40 bg-white text-slate-900 placeholder:text-slate-500 shadow-[0_0_0_1px_rgba(139,92,246,0.12)] focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowLinkField(false)}>Done</Button>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Paste a normal link. YouTube, Vimeo, Spotify, SoundCloud, and generic links are detected automatically.
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                disabled={isUploadingImage}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setContent("");
                    setImageUrl("");
                    setLinkUrl("");
                    setShowLinkField(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  className="flex-1"
                  onClick={submitPost}
                  disabled={createWallPost.isPending || isUploadingImage || !(content.trim() || imageUrl || linkUrl.trim())}
                >
                  <Send className="mr-2 h-4 w-4" /> Submit for Approval
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
