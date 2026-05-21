import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { consumeReturnTo, navigateAfterAuth } from "@/lib/auth-redirect";

export default function Register() {
  const [, setLocation] = useLocation();
  const { mutate: register, isPending } = useRegister();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(
      { data: { username, email, password } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(["/api/auth/me"], data.user);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({ title: "Welcome to HollywoodHeartbeats.com!", description: "Your account has been created." });
          navigateAfterAuth(consumeReturnTo());
        },
        onError: (err: any) => {
          toast({ 
            title: "Registration failed", 
            description: err?.message || "Could not create account", 
            variant: "destructive" 
          });
        }
      }
    );
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
            Create your account and you will get a public artist page with editing tools from the start.
          </CardDescription>
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
