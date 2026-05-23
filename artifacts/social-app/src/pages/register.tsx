import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { consumeReturnTo, navigateAfterAuth } from "@/lib/auth-redirect";
import { Badge } from "@/components/ui/badge";
import { getApiBaseUrl, parseApiError } from "@/lib/api";

export default function Register() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("invite") || "";
  });
  const [inviteMeta, setInviteMeta] = useState<{ label?: string | null; inviter?: { username: string } | null; isValid?: boolean; status?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);

  useEffect(() => {
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      setInviteMeta(null);
      return;
    }

    let active = true;
    setIsCheckingInvite(true);
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/invites/by-code/${encodeURIComponent(trimmedCode)}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(await parseApiError(response, "This invite link could not be verified."));
        }
        const data = await response.json();
        if (!active) return;
        setInviteMeta(data.invite ?? null);
      } catch {
        if (!active) return;
        setInviteMeta({ isValid: false, status: "invalid" });
      } finally {
        if (active) setIsCheckingInvite(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [inviteCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
        inviteCode: inviteCode.trim() || undefined,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await parseApiError(response, "Could not create account"));
        }
        return response.json();
      })
      .then((data) => {
          queryClient.setQueryData(["/api/auth/me"], data.user);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({ title: "Welcome to HollywoodHeartbeats.com!", description: "Your account has been created." });
          navigateAfterAuth(consumeReturnTo());
      })
      .catch((err: any) => {
        toast({ 
          title: "Registration failed", 
          description: err?.message || "Could not create account", 
          variant: "destructive" 
        });
      })
      .finally(() => {
        setIsPending(false);
      });
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden"
      style={{ backgroundImage: "url(/auth-bg-2.png)", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent pointer-events-none" />
      
      <Card className="w-full max-w-md relative z-10 border-border/60 bg-background/80 backdrop-blur-2xl shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-6">
          <CardTitle className="space-y-2 text-center">
            <div className="brand-wordmark text-[1.5rem] tracking-[0.34em] text-foreground">HollywoodHeartbeats</div>
            <div className="brand-submark text-muted-foreground">Join the scene</div>
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Where photographers, models, and visual artists build their scene.
          </CardDescription>
          <p className="text-sm text-muted-foreground">Share work. Discover creatives. Book collaborations. Build your portfolio.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Optional invite link code"
                className="bg-input/50"
              />
              <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
                {isCheckingInvite ? <span>Checking invite...</span> : null}
                {!isCheckingInvite && inviteMeta?.isValid && inviteMeta?.inviter ? (
                  <>
                    <Badge variant="secondary">Invite ready</Badge>
                    <span>
                      {inviteMeta.label ? `${inviteMeta.label} · ` : ""}
                      invited by {inviteMeta.inviter.username}
                    </span>
                  </>
                ) : null}
                {!isCheckingInvite && inviteCode.trim() && inviteMeta?.isValid === false ? (
                  <span className="text-destructive">This invite code is not valid right now.</span>
                ) : null}
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={isPending}>
              {isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/50 pt-6">
          <p className="text-sm text-muted-foreground">
            Already in the scene?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
