import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { MediaViewer } from "@/components/MediaViewer";
import { Mic2, Plus, Pencil, Trash2, FileText, Video, X, Play } from "lucide-react";

type Sermon = {
  id: number; title: string; preacher: string; sermonDate: string; series?: string;
  description?: string; mediaUrl?: string; mediaType?: string; thumbnailUrl?: string; scriptureRef?: string;
};

const blank = { title: "", preacher: "", sermonDate: "", series: "", description: "", scriptureRef: "", mediaType: "audio" };

export default function LeadershipSermons() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: sermons = [], isLoading } = useQuery<Sermon[]>({
    queryKey: ["sermons-leadership"],
    queryFn: () => axios.get<Sermon[]>("/api/sermons").then(r => r.data),
  });
  const [showAdd, setShowAdd] = useState(false);
  const [editSermon, setEditSermon] = useState<Sermon | null>(null);
  const [form, setForm] = useState(blank);
  const [mediaResult, setMediaResult] = useState<UploadResult | null>(null);
  const [thumbResult, setThumbResult] = useState<UploadResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewType, setViewType] = useState<string | undefined>();
  const [viewTitle, setViewTitle] = useState<string | undefined>();

  function resetForm() { setForm(blank); setMediaResult(null); setThumbResult(null); }

  async function handleSave() {
    if (!form.title || !form.preacher || !form.sermonDate) {
      toast({ title: "Title, preacher, and date required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, mediaUrl: mediaResult?.url, thumbnailUrl: thumbResult?.url };
      if (editSermon) {
        await axios.patch(`/api/sermons/${editSermon.id}`, payload);
        toast({ title: "Sermon updated" });
        setEditSermon(null);
      } else {
        await axios.post("/api/sermons", payload);
        toast({ title: "Sermon added" });
        setShowAdd(false);
      }
      queryClient.invalidateQueries({ queryKey: ["sermons-leadership"] });
      resetForm();
    } catch { toast({ title: "Save failed", variant: "destructive" }); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this sermon?")) return;
    try {
      await axios.delete(`/api/sermons/${id}`);
      queryClient.invalidateQueries({ queryKey: ["sermons-leadership"] });
      toast({ title: "Sermon deleted" });
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  function openEdit(s: Sermon) {
    setEditSermon(s);
    setForm({ title: s.title, preacher: s.preacher, sermonDate: s.sermonDate, series: s.series || "", description: s.description || "", scriptureRef: s.scriptureRef || "", mediaType: s.mediaType || "audio" });
    setMediaResult(null); setThumbResult(null);
  }

  const activeForm = showAdd || !!editSermon;

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader
        title="Sermon Library"
        description={`${(sermons as Sermon[]).length} sermons`}
        actions={
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} className="blue-gradient-bg text-white border-0 hover:opacity-90">
            <Plus className="h-4 w-4 mr-1" /> Add Sermon
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (sermons as Sermon[]).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mic2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No sermons yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in-up">
          {(sermons as Sermon[]).map(s => (
            <div key={s.id} className="glass-card p-5 card-hover">
              <div className="flex gap-3">
                {s.thumbnailUrl ? (
                  <button onClick={() => { setViewUrl(s.thumbnailUrl!); setViewType("image"); setViewTitle(s.title); }} className="shrink-0">
                    <img src={s.thumbnailUrl} alt={s.title} className="w-16 h-16 rounded-lg object-cover" />
                  </button>
                ) : (
                  <div className="w-16 h-16 rounded-lg blue-gradient-bg flex items-center justify-center flex-shrink-0">
                    {s.mediaType === "document" ? <FileText className="h-7 w-7 text-white" /> :
                     s.mediaType === "video" ? <Video className="h-7 w-7 text-white" /> :
                     <Mic2 className="h-7 w-7 text-white" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.preacher} · {new Date(s.sermonDate).toLocaleDateString()}</p>
                  {s.series && <p className="text-xs text-primary mt-0.5">{s.series}</p>}
                  {s.scriptureRef && <p className="text-xs text-muted-foreground italic mt-0.5">{s.scriptureRef}</p>}
                </div>
              </div>
              {s.mediaUrl && (
                <div className="mt-3">
                  {s.mediaType === "audio" ? (
                    <audio controls src={s.mediaUrl} className="w-full h-8 mt-1" />
                  ) : (
                    <button
                      onClick={() => { setViewUrl(s.mediaUrl!); setViewType(s.mediaType); setViewTitle(s.title); }}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition text-sm font-medium text-primary"
                    >
                      <Play className="h-4 w-4" />
                      {s.mediaType === "video" ? "Watch Video" : "View Document"}
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
              <h2 className="font-semibold text-base">{editSermon ? "Edit Sermon" : "Add Sermon"}</h2>
              <button onClick={() => { setShowAdd(false); setEditSermon(null); resetForm(); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                  <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Sermon title" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Preacher *</label>
                  <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.preacher} onChange={e => setForm(f => ({ ...f, preacher: e.target.value }))} placeholder="Preacher name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date *</label>
                  <input type="date" className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.sermonDate} onChange={e => setForm(f => ({ ...f, sermonDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Series</label>
                  <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))} placeholder="e.g. Faith Series" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Scripture Reference</label>
                <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.scriptureRef} onChange={e => setForm(f => ({ ...f, scriptureRef: e.target.value }))} placeholder="e.g. John 3:16" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Media Type</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.mediaType} onChange={e => setForm(f => ({ ...f, mediaType: e.target.value }))}>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="document">Document / Notes</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Upload Sermon Media</label>
                <CloudinaryUploader accept="audio/*,video/*,.pdf,.doc,.docx" label="Upload media file" onUpload={setMediaResult} currentUrl={mediaResult?.url ?? (editSermon?.mediaUrl ?? undefined)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Thumbnail / Cover Image (optional)</label>
                <CloudinaryUploader accept="image/*" label="Upload thumbnail" onUpload={setThumbResult} currentUrl={thumbResult?.url ?? (editSermon?.thumbnailUrl ?? undefined)} />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
              <button onClick={() => { setShowAdd(false); setEditSermon(null); resetForm(); }} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl blue-gradient-bg text-white text-sm font-semibold disabled:opacity-60">
                {saving ? "Saving…" : editSermon ? "Save Changes" : "Add Sermon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewUrl && <MediaViewer url={viewUrl} title={viewTitle} mediaType={viewType} onClose={() => setViewUrl(null)} />}
    </PortalLayout>
  );
}
