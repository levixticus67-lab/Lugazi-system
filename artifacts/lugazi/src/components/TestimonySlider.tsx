import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { Star, Heart, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Testimony {
  id: number;
  memberName: string;
  title: string;
  content: string;
  category: string;
  isApproved: boolean;
  createdAt: string;
}

const CAT_COLORS: Record<string, string> = {
  healing: "from-rose-500 to-pink-600",
  provision: "from-green-500 to-emerald-600",
  salvation: "from-yellow-500 to-amber-600",
  protection: "from-blue-500 to-sky-600",
  relationship: "from-pink-500 to-rose-600",
  business: "from-purple-500 to-violet-600",
  other: "from-slate-500 to-gray-600",
};

const CATEGORIES = ["healing","provision","salvation","protection","relationship","business","other"];

export default function TestimonySlider() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "healing", isPublic: true });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: testimonies = [] } = useQuery<Testimony[]>({
    queryKey: ["testimonies-slider"],
    queryFn: () => axios.get("/api/testimonies").then(r => (r.data as Testimony[]).filter(t => t.isApproved)).catch(() => [] as Testimony[]),
    refetchInterval: 60_000,
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/testimonies", { ...data, memberName: user?.displayName ?? "Member", memberId: user?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testimonies-slider"] });
      qc.invalidateQueries({ queryKey: ["testimonies-public"] });
      setShowAdd(false);
      setSubmitted(true);
      setForm({ title: "", content: "", category: "healing", isPublic: true });
      setTimeout(() => setSubmitted(false), 4000);
    },
  });

  const items = testimonies.length > 0 ? testimonies : [];

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    intervalRef.current = setInterval(() => setCurrent(c => (c + 1) % items.length), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [items.length, paused]);

  if (items.length === 0 && !submitted) {
    return (
      <div className="glass-card p-4 animate-slide-in-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <h3 className="font-semibold text-sm">Testimonies</h3>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Share Yours
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center py-3">No testimonies yet. Be the first to share!</p>
        {showAdd && <TestimonyForm form={form} setForm={setForm} onCreate={create} onClose={() => setShowAdd(false)} />}
      </div>
    );
  }

  const t = items[current];

  return (
    <div className="animate-slide-in-up">
      {submitted && (
        <div className="mb-2 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-400">
          ✓ Testimony submitted! It will appear after admin review.
        </div>
      )}
      {t && (
        <div
          className="glass-card p-4 relative overflow-hidden cursor-pointer select-none"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setTimeout(() => setPaused(false), 3000)}
        >
          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${CAT_COLORS[t.category] ?? "from-blue-500 to-sky-600"} rounded-l`} />
          <div className="pl-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="font-semibold text-xs text-foreground">{t.title}</span>
                </div>
                <p className="text-[10px] text-primary font-medium">{t.memberName}</p>
              </div>
              <div className="flex items-center gap-1">
                {items.length > 1 && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + items.length) % items.length); setPaused(true); }}
                      className="p-1 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % items.length); setPaused(true); }}
                      className="p-1 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button onClick={() => setShowAdd(true)} className="p-1 rounded-full hover:bg-primary/10 transition text-primary" title="Share your testimony">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{t.content}</p>
            {items.length > 1 && (
              <div className="flex gap-1 mt-2 justify-center">
                {items.map((_, i) => (
                  <button key={i} onClick={() => { setCurrent(i); setPaused(true); }}
                    className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
                ))}
              </div>
            )}
            {paused && items.length > 1 && (
              <p className="text-[9px] text-muted-foreground text-center mt-1 opacity-70">Paused · scroll dots to navigate</p>
            )}
          </div>
        </div>
      )}

      {showAdd && <TestimonyForm form={form} setForm={setForm} onCreate={create} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function TestimonyForm({ form, setForm, onCreate, onClose }: {
  form: { title: string; content: string; category: string; isPublic: boolean };
  setForm: (fn: (p: typeof form) => typeof form) => void;
  onCreate: { mutate: (data: typeof form) => void; isPending: boolean };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Share Your Testimony</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Category</label>
          <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm capitalize" value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
          <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="Give your testimony a title"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Your Testimony *</label>
          <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm resize-none" rows={5}
            placeholder="Share what God has done for you…" value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ts-public" checked={form.isPublic}
            onChange={e => setForm(p => ({ ...p, isPublic: e.target.checked }))} className="rounded" />
          <label htmlFor="ts-public" className="text-xs text-muted-foreground">Make public (visible to all after approval)</label>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
          <button onClick={() => { if (form.title && form.content) onCreate.mutate(form); }}
            disabled={!form.title || !form.content || onCreate.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">
            {onCreate.isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
