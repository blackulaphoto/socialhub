import { ReactNode, useEffect, useMemo, useState } from "react";
import { Copy, Link2, Loader2, MailPlus, Trash2, UserRoundPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl, parseApiError } from "@/lib/api";

type InviteUser = {
  id: number;
  username: string;
  avatarUrl?: string | null;
};

type InviteRecord = {
  id: number;
  label: string | null;
  code: string;
  status: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  acceptedUser?: InviteUser | null;
};

type InviteFriendsDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function formatInviteDate(value: string | null) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiry";
  return date.toLocaleDateString();
}

function InviteStatusBadge({ status }: { status: string }) {
  const className =
    status === "accepted"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
      : status === "revoked"
        ? "bg-slate-500/15 text-slate-300 border-slate-500/20"
        : status === "expired"
          ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
          : "bg-primary/15 text-primary border-primary/20";

  return <Badge variant="outline" className={className}>{status}</Badge>;
}

export function InviteFriendsDialog({ trigger, open, onOpenChange }: InviteFriendsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [label, setLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const { toast } = useToast();

  const resolvedOpen = open ?? internalOpen;
  const setResolvedOpen = onOpenChange ?? setInternalOpen;
  const inviteBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/register?invite=`;
  }, []);

  useEffect(() => {
    if (!resolvedOpen) return;

    let active = true;
    setIsLoading(true);
    fetch(`${getApiBaseUrl()}/api/invites`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await parseApiError(response, "Could not load invites."));
        }
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setInvites(Array.isArray(data.invites) ? data.invites : []);
      })
      .catch((error: Error) => {
        if (!active) return;
        toast({
          title: "Could not load invites",
          description: error.message,
          variant: "destructive",
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [resolvedOpen, toast]);

  const copyInviteLink = async (code: string) => {
    const link = `${inviteBaseUrl}${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Invite link copied",
        description: "Share it anywhere you want to bring someone into the scene.",
      });
    } catch {
      toast({
        title: "Could not copy link",
        description: link,
      });
    }
  };

  const createInvite = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response, "Could not create invite."));
      }
      const data = await response.json();
      const nextInvite = data.invite as InviteRecord;
      setInvites((current) => [nextInvite, ...current]);
      setLabel("");
      await copyInviteLink(nextInvite.code);
    } catch (error: any) {
      toast({
        title: "Invite creation failed",
        description: error?.message || "Could not create invite.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeInvite = async (inviteId: number) => {
    setRevokingId(inviteId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/invites/${inviteId}/revoke`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response, "Could not revoke invite."));
      }
      const data = await response.json();
      setInvites((current) => current.map((invite) => invite.id === inviteId ? data.invite : invite));
    } catch (error: any) {
      toast({
        title: "Could not revoke invite",
        description: error?.message || "The invite is still active.",
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={setResolvedOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/60 bg-background/96 sm:max-w-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-primary" />
            Invite Friends
          </DialogTitle>
          <DialogDescription>
            Create one-time invite links you can text, DM, or drop into your circles. When someone joins through your link, it gets marked back to you.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Create a fresh invite</CardTitle>
            <CardDescription>Add an optional label so you remember who this link was meant for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                placeholder="Optional label: Luna, MUA friend, club team..."
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={120}
              />
              <Button onClick={createInvite} disabled={isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailPlus className="mr-2 h-4 w-4" />}
                Create Invite
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              New invites expire after 30 days and work once.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your invite links</div>
            <div className="text-xs text-muted-foreground">{invites.length} total</div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-border/50 p-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading invites...
            </div>
          ) : invites.length ? (
            <div className="space-y-3">
              {invites.map((invite) => (
                <Card key={invite.id} className="border-border/60 bg-card/40">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <InviteStatusBadge status={invite.status} />
                          {invite.label ? <Badge variant="secondary">{invite.label}</Badge> : null}
                        </div>
                        <div className="font-medium">{invite.label || "Untitled invite"}</div>
                        <div className="text-xs text-muted-foreground">
                          Expires {formatInviteDate(invite.expiresAt)} · created {formatInviteDate(invite.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => copyInviteLink(invite.code)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy link
                        </Button>
                        {invite.status === "pending" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeInvite(invite.id)}
                            disabled={revokingId === invite.id}
                          >
                            {revokingId === invite.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                      <Link2 className="h-4 w-4 text-primary" />
                      <span className="min-w-0 truncate">{inviteBaseUrl}{invite.code}</span>
                    </div>

                    {invite.acceptedUser ? (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={invite.acceptedUser.avatarUrl || ""} />
                          <AvatarFallback>{invite.acceptedUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{invite.acceptedUser.username} joined through this invite.</div>
                          <div className="text-xs text-muted-foreground">Accepted {formatInviteDate(invite.acceptedAt)}</div>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 p-10 text-center text-sm text-muted-foreground">
              No invite links yet. Create one and pass it around.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setResolvedOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
