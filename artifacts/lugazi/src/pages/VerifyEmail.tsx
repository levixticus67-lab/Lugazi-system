import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, LogIn } from "lucide-react";
import axios from "@/lib/axios";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please use the link from your email.");
      return;
    }
    axios
      .get<{ message: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => { setStatus("success"); setMessage(res.data.message); })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.response?.data?.error ??
          "Verification failed. The link may have expired — please request a new one from the login page."
        );
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card shadow-lg p-8 text-center space-y-6">
        <div>
          <img src="/dcl-logo.png" alt="DCL Lugazi"
            className="mx-auto w-14 h-14 rounded-full object-contain bg-white p-1 shadow"
            onError={(e) => (e.currentTarget.style.display = "none")} />
          <p className="text-xs text-muted-foreground mt-2">Deliverance Church Lugazi</p>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying your email…</p>
          </div>
        )}
        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Email Verified!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Verification Failed</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
          </div>
        )}

        {status !== "loading" && (
          <a href="/login"
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg
                       bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition">
            <LogIn className="h-4 w-4" />
            {status === "success" ? "Sign in now" : "Back to Login"}
          </a>
        )}
      </div>
    </div>
  );
}
