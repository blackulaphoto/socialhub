import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { RegisterRequestProfileType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, User, Mic2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { mutate: register, isPending } = useRegister();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileType, setProfileType] = useState<RegisterRequestProfileType>("user");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(
      { data: { username, email, password, profileType } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(["/api/auth/me"], data.user);
          toast({ title: "Welcome to ArtistHub!", description: "Your account has been created." });
          setLocation("/");
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
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
      
      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Join ArtistHub</CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Create an account to connect with the creative underground.
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
            
            <div className="space-y-3 pt-2">
              <Label>I am joining as a...</Label>
              <RadioGroup 
                value={profileType} 
                onValueChange={(val) => setProfileType(val as RegisterRequestProfileType)}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="user" id="user" className="peer sr-only" />
                  <Label
                    htmlFor="user"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                  >
                    <User className="mb-2 h-6 w-6" />
                    Fan / Listener
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="artist" id="artist" className="peer sr-only" />
                  <Label
                    htmlFor="artist"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                  >
                    <Mic2 className="mb-2 h-6 w-6" />
                    Artist / Creator
                  </Label>
                </div>
              </RadioGroup>
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
