import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "@/lib/axios";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setTokenError("No reset token found. Please request a new password reset link.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (!/\d/.test(password)) {
      toast({ title: "Password too weak", description: "Include at least one number.", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      await axios.post("/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Reset failed. The link may have expired.";
      toast({ title: "Reset failed", description: msg, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: "linear-gradient(160deg, hsl(210,40%,96%) 0%, hsl(213,60%,93%) 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full blue-gradient-bg flex items-center justify-center mx-auto mb-3 glow-blue">
            <span className="text-white font-bold text-xs">DCL</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Deliverance Church Lugazi</h1>
          <p className="text-muted-foreground text-sm">The House of Kingdom Giants</p>
        </div>

        <div className="glass-card p-8">
          {tokenError ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="font-serif text-xl font-bold text-foreground mb-2">Invalid Link</h2>
              <p className="text-muted-foreground text-sm mb-5">{tokenError}</p>
              <Button className="w-full blue-gradient-bg text-white border-0" onClick={() => setLocation("/login")}>
                Back to Sign In
              </Button>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="font-serif text-xl font-bold text-foreground mb-2">Password Reset!</h2>
              <p className="text-muted-foreground text-sm mb-5">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Button className="w-full blue-gradient-bg text-white border-0 hover:opacity-90 glow-blue"
                onClick={() => setLocation("/login")}>
                <KeyRound className="mr-2 h-4 w-4" />
                Sign In Now
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-foreground">Set New Password</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Choose a strong password with at least 8 characters and one number.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input type="password" placeholder="At least 8 characters + a number"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    className="bg-white/70 border-blue-200 focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input type="password" placeholder="Repeat your new password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    className="bg-white/70 border-blue-200 focus:border-primary" />
                </div>
                <Button type="submit"
                  className="w-full blue-gradient-bg text-white border-0 hover:opacity-90 glow-blue mt-1"
                  disabled={pending}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
