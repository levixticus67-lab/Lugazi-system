import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import axios from "@/lib/axios";

type Tab = "login" | "register";

export default function Login() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  function redirectByRole(role: string) {
    if (role === "admin") setLocation("/admin/dashboard");
    else if (role === "leadership") setLocation("/leadership/dashboard");
    else if (role === "workforce") setLocation("/workforce/dashboard");
    else setLocation("/member/dashboard");
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user as any);
          redirectByRole(data.user.role);
        },
        onError: (err: any) => {
          const errData = err?.response?.data;
          if (errData?.requiresRegistration) {
            toast({
              title: "First time? Set up your account",
              description: "Your email is registered. Please create a password to continue.",
            });
            setTab("register");
          } else {
            toast({ title: "Login failed", description: errData?.error || "Invalid email or password", variant: "destructive" });
          }
        },
      }
    );
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({ title: "Name required", description: "Please enter your display name.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      const res = await axios.post<{ token: string; user: any }>("/api/auth/register", { email, password, displayName });
      login(res.data.token, res.data.user);
      toast({ title: "Account created!", description: "Welcome to DCL Lugazi ERP." });
      redirectByRole(res.data.user.role);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Registration failed. Please try again.";
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  const isLoading = loginMutation.isPending || pending;

  return (
    <div className="min-h-screen flex" data-testid="page-login">
      {/* Left panel — glassmorphism */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
           style={{ background: "linear-gradient(135deg, hsl(220,70%,14%) 0%, hsl(217,91%,25%) 60%, hsl(199,89%,30%) 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
             style={{ background: "radial-gradient(circle, hsl(199,89%,58%) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-10"
             style={{ background: "radial-gradient(circle, hsl(217,91%,60%) 0%, transparent 70%)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center glow-sky"
                 style={{ background: "linear-gradient(135deg, hsl(199,89%,58%) 0%, hsl(217,91%,55%) 100%)" }}>
              <span className="text-white font-bold text-xs">DCL</span>
            </div>
            <div>
              <h1 className="text-white font-serif text-xl font-bold leading-tight">Deliverance Church Lugazi</h1>
              <p className="text-white/60 text-xs">The House of Kingdom Giants</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <blockquote className="text-white/90 font-serif text-2xl italic leading-relaxed">
            "Raising kingdom giants who transform society through the power of the Gospel"
          </blockquote>
          <p className="mt-4 text-white/50 text-sm">Mission Statement</p>
        </div>

        <div className="relative z-10 text-white/30 text-xs">
          DCL Lugazi ERP &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8"
           style={{ background: "linear-gradient(160deg, hsl(210,40%,96%) 0%, hsl(213,60%,93%) 100%)" }}>
        <div className="w-full max-w-md animate-fade-in-scale">
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center blue-gradient-bg glow-blue">
                <span className="text-white font-bold text-xs">DCL</span>
              </div>
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Deliverance Church Lugazi</h1>
            <p className="text-muted-foreground text-sm">The House of Kingdom Giants</p>
          </div>

          {/* Glass card */}
          <div className="glass-card p-8">
            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-border mb-6">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  tab === "login" ? "blue-gradient-bg text-white" : "text-muted-foreground hover:text-foreground bg-transparent"
                }`}
              >
                <LogIn className="h-4 w-4" /> Sign In
              </button>
              <button
                onClick={() => setTab("register")}
                className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  tab === "register" ? "blue-gradient-bg text-white" : "text-muted-foreground hover:text-foreground bg-transparent"
                }`}
              >
                <UserPlus className="h-4 w-4" /> Register
              </button>
            </div>

            {tab === "login" ? (
              <>
                <div className="mb-6">
                  <h2 className="font-serif text-2xl font-bold text-foreground">Welcome back</h2>
                  <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Email address</Label>
                    <Input type="email" placeholder="your@email.com" value={email}
                      onChange={e => setEmail(e.target.value)} required data-testid="input-email"
                      className="bg-white/70 border-blue-200 focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Enter your password" value={password}
                      onChange={e => setPassword(e.target.value)} required data-testid="input-password"
                      className="bg-white/70 border-blue-200 focus:border-primary" />
                  </div>
                  <Button type="submit" className="w-full blue-gradient-bg text-white border-0 hover:opacity-90 glow-blue mt-1"
                    disabled={isLoading} data-testid="button-submit">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Sign In
                  </Button>
                </form>
                <p className="mt-5 text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <button onClick={() => setTab("register")} className="text-primary font-medium hover:underline">
                    Create your account
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="font-serif text-2xl font-bold text-foreground">Create Account</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Join DCL Lugazi. If your email was pre-registered, it will be automatically linked.
                  </p>
                </div>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input placeholder="Your full name" value={displayName}
                      onChange={e => setDisplayName(e.target.value)} required
                      className="bg-white/70 border-blue-200 focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email address</Label>
                    <Input type="email" placeholder="your@email.com" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      className="bg-white/70 border-blue-200 focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input type="password" placeholder="At least 6 characters" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      className="bg-white/70 border-blue-200 focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="Repeat your password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} required
                      className="bg-white/70 border-blue-200 focus:border-primary" />
                  </div>
                  <Button type="submit" className="w-full blue-gradient-bg text-white border-0 hover:opacity-90 glow-blue mt-1"
                    disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Create Account
                  </Button>
                </form>
                <p className="mt-5 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => setTab("login")} className="text-primary font-medium hover:underline">
                    Sign in
                  </button>
                </p>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Contact your administrator for role upgrades
          </p>
        </div>
      </div>
    </div>
  );
}
