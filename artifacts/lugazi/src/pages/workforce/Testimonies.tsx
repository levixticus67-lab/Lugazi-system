import { useState } from "react";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import { useAuth } from "@/contexts/AuthContext";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { workforceNavItems } from "./navItems";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Label } from "@/components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Star, Plus, CheckCircle2, Clock, X } from "lucide-react";
  import { useToast } from "@/hooks/use-toast";

  interface Testimony { id: number; memberName: string; title: string; content: string; category: string; isApproved: boolean; createdAt: string; }
  const CATEGORIES = ["healing","provision","salvation","protection","relationship","business","other"];
  const CAT_COLORS: Record<string,string> = { healing:"bg-rose-100 text-rose-700", provision:"bg-green-100 text-green-700", salvation:"bg-yellow-100 text-yellow-700", protection:"bg-blue-100 text-blue-700", relationship:"bg-pink-100 text-pink-700", business:"bg-purple-100 text-purple-700", other:"bg-slate-100 text-slate-600" };

  export default function WorkforceTestimonies() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const { toast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: "", content: "", category: "healing", isPublic: true });

    const { data: testimonies = [], isLoading } = useQuery<Testimony[]>({
      queryKey: ["testimonies-workforce"],
      queryFn: () => axios.get<Testimony[]>("/api/testimonies").then(r => (r.data as Testimony[]).filter(t => t.isApproved)),
    });

    const create = useMutation({
      mutationFn: (data: typeof form) => axios.post("/api/testimonies", { ...data, memberName: user?.displayName ?? "Member", memberId: user?.id }),
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["testimonies-workforce"] }); toast({ title: "Testimony submitted for review" }); setShowForm(false); setForm({ title: "", content: "", category: "healing", isPublic: true }); },
      onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
    });

    return (
      <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
        <PageHeader title="Testimonies" description="Share and celebrate what God has done" actions={
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="blue-gradient-bg text-white border-0 hover:opacity-90"><Plus className="h-4 w-4 mr-1" /> Share Testimony</Button>
        } />

        {showForm && (
          <div className="glass-card p-6 mb-6 space-y-4 animate-fade-in-scale">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Share Your Testimony</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Title of your testimony" className="mt-1" /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Your Testimony</Label><Textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} placeholder="Share what God has done in your life…" rows={5} className="mt-1" /></div>
            <div className="flex gap-3">
              <Button onClick={() => create.mutate(form)} disabled={!form.title || !form.content || create.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">{create.isPending ? "Submitting…" : "Submit"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="glass-card p-5 h-36 animate-pulse"/>)}</div>
        ) : testimonies.length === 0 ? (
          <div className="glass-card p-12 text-center"><Star className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">No testimonies yet. Be the first to share!</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonies.map(t => (
              <div key={t.id} className="glass-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 shrink-0"><Star className="h-4 w-4 text-yellow-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{t.title}</h3>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full capitalize ${CAT_COLORS[t.category] || CAT_COLORS.other}`}>{t.category}</span>
                    </div>
                    <p className="text-xs text-primary font-medium mt-0.5">{t.memberName}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{t.content}</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground"><Clock className="h-3 w-3"/>{new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalLayout>
    );
  }
  