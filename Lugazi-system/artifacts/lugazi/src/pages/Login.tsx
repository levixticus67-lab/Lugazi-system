import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user as any);
          const role = data.user.role;
          if (role === "admin") setLocation("/admin/dashboard");
          else if (role === "leadership") setLocation("/leadership/dashboard");
          else if (role === "workforce") setLocation("/workforce/dashboard");
          else setLocation("/member/dashboard");
        },
        onError: () => {
          toast({ title: "Login failed", description: "Invalid email or password", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex" data-testid="page-login">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">DCL</span>
            </div>
            <div>
              <h1 className="text-sidebar-foreground font-serif text-xl font-bold leading-tight">Deliverance Church Lugazi</h1>
              <p className="text-sidebar-foreground/60 text-xs">The House of Kingdom Giants</p>
            </div>
          </div>
        </div>
        <div>
          <blockquote className="text-sidebar-foreground/80 font-serif text-2xl italic leading-relaxed">
            "Raising kingdom giants who transform society through the power of the Gospel"
          </blockquote>
          <p className="mt-4 text-sidebar-foreground/50 text-sm">Mission Statement</p>
        </div>
        <div className="text-sidebar-foreground/40 text-xs">
          DCL Lugazi ERP &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="font-serif text-2xl font-bold text-foreground">Deliverance Church Lugazi</h1>
            <p className="text-muted-foreground text-sm">The House of Kingdom Giants</p>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-3xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-sidebar hover:bg-sidebar/90 text-sidebar-foreground"
              disabled={loginMutation.isPending}
              data-testid="button-submit"
            >
              {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Contact your administrator to create an account
          </p>
        </div>
      </div>
    </div>
  );
}
