import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import axios from "@/lib/axios";

type Tab = "login" | "register";
type View = "main" | "forgot" | "forgot-sent";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [tab, setTab] = useState<Tab>("login");
  const [view, setView] = useState<View>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [missionText, setMissionText] = useState<string | null>(null);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    axios.get<{ churchName: string; tagline: string; mission: string | null }>("/api/settings/public")
      .then(r => { if (r.data.mission) setMissionText(r.data.mission); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err) return;
    const messages: Record<string, string> = {
      google_denied:          "Google sign-in was cancelled.",
      google_token_failed:    "Google sign-in failed. Please try again.",
      google_profile_failed:  "Could not retrieve your Google profile. Please try again.",
      google_no_email:        "Your Google account didn't share an email address.",
      account_deactivated:    "Your account has been deactivated. Contact your administrator.",
      google_server_error:    "Something went wrong with Google sign-in. Please try again.",
    };
    toast({ title: "Sign-in error", description: messages[err] ?? "An unexpected error occurred.", variant: "destructive" });
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  function redirectByRole(role: string) {
    if (role === "admin")           setLocation("/admin/dashboard");
    else if (role === "leadership") setLocation("/leadership/dashboard");
    else if (role === "workforce")  setLocation("/workforce/dashboard");
    else if (role === "pastor")     setLocation("/pastor/dashboard");
    else                            setLocation("/member/dashboard");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await axios.post<{ token: string; user: any }>("/api/auth/login", { email, password, rememberMe });
      login(res.data.token, res.data.user);
      redirectByRole(res.data.user.role);
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.requiresRegistration) {
        toast({ title: "First time? Set up your account", description: "Your email is registered. Please create a password to continue." });
        setTab("register");
      } else {
        toast({ title: "Login failed", description: errData?.error || "Invalid email or password", variant: "destructive" });
      }
    } finally {
      setPending(false);
    }
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
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      await axios.post("/api/auth/forgot-password", { email: forgotEmail.trim() });
      setView("forgot-sent");
    } catch {
      // Always show success to prevent email enumeration
      setView("forgot-sent");
    } finally {
      setPending(false);
    }
  }

  function handleGoogleSignIn() {
    // Must use the full backend URL — the frontend is on Firebase, not the same domain as the API
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
    window.location.href = `${apiBase}/auth/google`;
  }

  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
         style={{ background: "linear-gradient(135deg, hsl(220,70%,14%) 0%, hsl(217,91%,25%) 60%, hsl(199,89%,30%) 100%)" }}>
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
          "{missionText || "Raising kingdom giants who transform society through the power of the Gospel"}"
        </blockquote>
        <p className="mt-4 text-white/50 text-sm">Mission Statement</p>
      </div>
      <div className="relative z-10 text-white/30 text-xs">
        DCL Lugazi ERP &copy; {new Date().getFullYear()}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" data-testid="page-login">
      {leftPanel}

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

          <div className="glass-card p-8">

            {/* ── Forgot Password: enter email ── */}
            {view === "forgot" && (
              <>
                <button onClick={() => setView("main")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-5 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </button>
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <KeyRound className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-foreground">Forgot Password?</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Email address</Label>
                    <Input type="email" placeholder="your@email.com" value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)} required
                      className="bg-white/70 border-blue-200 focus:border-primary" />
                  </div>
                  <Button type="submit" className="w-full blue-gradient-bg text-white border-0 hover:opacity-90 glow-blue"
                    disabled={pending}>
                    {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Send Reset Link
                  </Button>
                </form>
              </>
            )}

            {/* ── Forgot Password: sent confirmation ── */}
            {view === "forgot-sent" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Check your inbox</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  If <strong>{forgotEmail}</strong> is registered, a password reset link has been sent.
                  Check your spam folder if you don't see it within a few minutes.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setView("main"); setForgotEmail(""); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                </Button>
              </div>
            )}

            {/* ── Main login / register tabs ── */}
            {view === "main" && (
              <>
                <div className="flex rounded-xl overflow-hidden border border-border mb-6">
                  <button onClick={() => setTab("login")}
                    className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      tab === "login" ? "blue-gradient-bg text-white" : "text-muted-foreground hover:text-foreground bg-transparent"
                    }`}>
                    <LogIn className="h-4 w-4" /> Sign In
                  </button>
                  <button onClick={() => setTab("register")}
                    className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      tab === "register" ? "blue-gradient-bg text-white" : "text-muted-foreground hover:text-foreground bg-transparent"
                    }`}>
                    <UserPlus className="h-4 w-4" /> Register
                  </button>
                </div>

                {tab === "login" ? (
                  <>
                    <div className="mb-6">
                      <h2 className="font-serif text-2xl font-bold text-foreground">Welcome back</h2>
                      <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
                    </div>
                    <Button type="button" variant="outline" className="w-full mb-4 gap-2 border-gray-300 bg-white hover:bg-gray-50"
                      onClick={handleGoogleSignIn}>
                      <GoogleIcon />
                      Continue with Google
                    </Button>
                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white/80 px-2 text-muted-foreground">or sign in with email</span>
                      </div>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Email address</Label>
                        <Input type="email" placeholder="your@email.com" value={email}
                          onChange={e => setEmail(e.target.value)} required data-testid="input-email"
                          className="bg-white/70 border-blue-200 focus:border-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label>Password</Label>
                          <button type="button"
                            onClick={() => { setForgotEmail(email); setView("forgot"); }}
                            className="text-xs text-primary hover:underline font-medium">
                            Forgot password?
                          </button>
                        </div>
                        <Input type="password" placeholder="Enter your password" value={password}
                          onChange={e => setPassword(e.target.value)} required data-testid="input-password"
                          className="bg-white/70 border-blue-200 focus:border-primary" />
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-blue-300 accent-primary cursor-pointer" />
                          <span className="text-sm text-muted-foreground">Remember me for 14 days</span>
                        </label>
                      </div>
                      <Button type="submit" className="w-full blue-gradient-bg text-white border-0 hover:opacity-90 glow-blue mt-1"
                        disabled={pending} data-testid="button-submit">
                        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                        Sign In
                      </Button>
                    </form>
                    <p className="mt-4 text-center text-xs text-muted-foreground/70 leading-relaxed">
                      By signing in you agree to our{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
                    </p>
                    <p className="mt-3 text-center text-sm text-muted-foreground">
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
                    <Button type="button" variant="outline" className="w-full mb-4 gap-2 border-gray-300 bg-white hover:bg-gray-50"
                      onClick={handleGoogleSignIn}>
                      <GoogleIcon />
                      Continue with Google
                    </Button>
                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white/80 px-2 text-muted-foreground">or register with email</span>
                      </div>
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
                        <Input type="password" placeholder="At least 8 characters + a number" value={password}
                          onChange={e => setPassword(e.target.value)} required
                          className="bg-white/70 border-blue-200 focus:border-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Confirm Password</Label>
                        <Input type="password" placeholder="Repeat your password" value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)} required
                          className="bg-white/70 border-blue-200 focus:border-primary" />
                      </div>
                      <Button type="submit"
                        className="w-full blue-gradient-bg text-white border-0 hover:opacity-90 glow-blue mt-1"
                        disabled={pending}>
                        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
