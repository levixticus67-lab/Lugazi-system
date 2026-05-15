import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { memberNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { HandHeart, Plus } from "lucide-react";
import { Badge } from "@/components/Badge";

type PrayerRequest = {
  id: number; subject: string; request: string; status: string;
  isAnonymous: boolean; adminNote?: string; createdAt: string;
};

const statusColors: Record<string, "default" | "success" | "warning" | "danger"> = {
  pending: "warning", praying: "default", answered: "success", closed: "danger",
};

export default function MemberPrayerRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", request: "", isAnonymous: false });
  const [submitting, setSubmitting] = useState(false);

  const { data: requests = [], isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["my-prayer-requests"],
    queryFn: () => axios.get<PrayerRequest[]>("/api/prayer-requests").then(r => r.data),
    refetchInterval: 30_000,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.request.trim()) {
      toast({ title: "Subject and request are required", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      await axios.post("/api/prayer-requests", {
        subject: form.subject, request: form.request,
        displayName: user?.displayName, isAnonymous: form.isAnonymous,
      });
      queryClient.invalidateQueries({ queryKey: ["my-prayer-requests"] });
      toast({ title: "Prayer request submitted", description: "Our team will be praying with you." });
      setForm({ subject: "", request: "", isAnonymous: false });
      setShowForm(false);
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader
        title="Prayer Requests"
        description="Share your prayer needs with the church leadership"
        actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="blue-gradient-bg text-white border-0 hover:opacity-90">
            <Plus className="h-4 w-4 mr-1" /> New Request
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-6 space-y-4 animate-fade-in-scale">
          <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-primary" /> Share Your Prayer Need
          </h2>
          <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief subject…" className="mt-1" required /></div>
          <div><Label>Your Prayer Request</Label><Textarea value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))} placeholder="Share what you'd like the church to pray about…" rows={4} className="mt-1" required /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="rounded border-border" />
            <span className="text-sm text-muted-foreground">Submit anonymously</span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="blue-gradient-bg text-white border-0 hover:opacity-90">
              {submitting ? "Submitting…" : "Submit Prayer Request"}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (requests as PrayerRequest[]).length === 0 ? (
        <div className="text-center py-16">
          <HandHeart className="h-12 w-12 mx-auto mb-3 text-primary/30" />
          <p className="text-muted-foreground font-medium">No prayer requests yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "New Request" to share your needs</p>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-in-up">
          {(requests as PrayerRequest[]).map(r => (
            <div key={r.id} className="glass-card p-5 card-hover">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-sm text-primary">{r.subject}</p>
                <Badge variant={statusColors[r.status] ?? "default"}>{r.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{r.request}</p>
              {r.adminNote && (
                <div className="mt-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-sky-700 font-medium">Leadership note:</p>
                  <p className="text-xs text-sky-600 mt-0.5">{r.adminNote}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
