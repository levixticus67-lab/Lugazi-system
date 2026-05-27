import { useState } from "react";
  import { useQuery, useQueryClient } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { workforceNavItems } from "./navItems";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Label } from "@/components/ui/label";
  import { useToast } from "@/hooks/use-toast";
  import { useAuth } from "@/contexts/AuthContext";
  import { HandHeart, Plus, Clock, CheckCircle2, X } from "lucide-react";

  type PrayerRequest = {
    id: number; subject: string; request: string; status: string;
    isAnonymous: boolean; adminNote?: string; createdAt: string;
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    praying: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    answered: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    closed: "bg-slate-100 text-slate-600",
  };

  export default function WorkforcePrayerRequests() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ subject: "", request: "", isAnonymous: false });
    const [submitting, setSubmitting] = useState(false);

    const { data: requests = [], isLoading } = useQuery<PrayerRequest[]>({
      queryKey: ["my-prayer-requests-workforce"],
      queryFn: () => axios.get<PrayerRequest[]>("/api/prayer-requests").then(r => r.data),
      refetchInterval: 30_000,
    });

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!form.subject.trim() || !form.request.trim()) { toast({ title: "Subject and request are required", variant: "destructive" }); return; }
      setSubmitting(true);
      try {
        await axios.post("/api/prayer-requests", { subject: form.subject, request: form.request, displayName: user?.displayName, isAnonymous: form.isAnonymous });
        queryClient.invalidateQueries({ queryKey: ["my-prayer-requests-workforce"] });
        toast({ title: "Prayer request submitted", description: "Our leadership team will be praying with you." });
        setForm({ subject: "", request: "", isAnonymous: false });
        setShowForm(false);
      } catch { toast({ title: "Failed to submit", variant: "destructive" }); }
      finally { setSubmitting(false); }
    }

    return (
      <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
        <PageHeader title="Prayer Requests" description="Share your prayer needs with church leadership" actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="blue-gradient-bg text-white border-0 hover:opacity-90">
            <Plus className="h-4 w-4 mr-1" /> New Request
          </Button>
        } />

        {showForm && (
          <form onSubmit={handleSubmit} className="glass-card p-6 mb-6 space-y-4 animate-fade-in-scale">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold flex items-center gap-2"><HandHeart className="h-5 w-5 text-primary" /> Share Your Prayer Need</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief subject…" className="mt-1" required /></div>
            <div><Label>Your Prayer Request</Label><Textarea value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))} placeholder="Share what you'd like prayer for…" rows={4} className="mt-1" required /></div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
              <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="rounded" />
              Submit anonymously
            </label>
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting} className="blue-gradient-bg text-white border-0 hover:opacity-90">{submitting ? "Submitting…" : "Submit Request"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card p-5 h-24 animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <HandHeart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No prayer requests yet. Share your first prayer need.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(r => (
              <div key={r.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{r.subject}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status] || STATUS_COLORS.closed}`}>{r.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.request}</p>
                    {r.adminNote && <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20"><p className="text-xs font-medium text-primary mb-1">Leadership Response:</p><p className="text-xs text-foreground">{r.adminNote}</p></div>}
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{new Date(r.createdAt).toLocaleDateString()}
                      {r.isAnonymous && <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">Anonymous</span>}
                    </div>
                  </div>
                  {r.status === "answered" && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalLayout>
    );
  }
  