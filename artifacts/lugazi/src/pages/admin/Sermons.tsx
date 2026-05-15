import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Mic2, Plus, Pencil, Trash2, Play, FileText, Video } from "lucide-react";

type Sermon = {
  id: number; title: string; preacher: string; sermonDate: string; series?: string;
  description?: string; mediaUrl?: string; mediaType?: string; thumbnailUrl?: string;
  scriptureRef?: string; createdAt: string;
};

const blank = { title: "", preacher: "", sermonDate: "", series: "", description: "", scriptureRef: "", mediaType: "audio" };

export default function AdminSermons() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: sermons = [], isLoading } = useQuery<Sermon[]>({
    queryKey: ["sermons"],
    queryFn: () => axios.get<Sermon[]>("/api/sermons").then(r => r.data),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editSermon, setEditSermon] = useState<Sermon | null>(null);
  const [form, setForm] = useState(blank);
  const [mediaResult, setMediaResult] = useState<UploadResult | null>(null);
  const [thumbResult, setThumbResult] = useState<UploadResult | null>(null);
  const [saving, setSaving] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["sermons"] });
      resetForm();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this sermon?")) return;
    try {
      await axios.delete(`/api/sermons/${id}`);
      queryClient.invalidateQueries({ queryKey: ["sermons"] });
      toast({ title: "Sermon deleted" });
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  function openEdit(s: Sermon) {
    setEditSermon(s);
    setForm({ title: s.title, preacher: s.preacher, sermonDate: s.sermonDate, series: s.series || "", description: s.description || "", scriptureRef: s.scriptureRef || "", mediaType: s.mediaType || "audio" });
    setMediaResult(null); setThumbResult(null);
  }

  const sermonFormJsx = (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Title *</Label>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label>Preacher *</Label>
          <Input value={form.preacher} onChange={e => setForm(f => ({ ...f, preacher: e.target.value }))} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date *</Label>
          <Input type="date" value={form.sermonDate} onChange={e => setForm(f => ({ ...f, sermonDate: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label>Series</Label>
          <Input value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))} placeholder="e.g. Faith Series" className="mt-1" />
        </div>
      </div>
      <div>
        <Label>Scripture Reference</Label>
        <Input value={form.scriptureRef} onChange={e => setForm(f => ({ ...f, scriptureRef: e.target.value }))} placeholder="e.g. John 3:16" className="mt-1" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" />
      </div>
      <div>
        <Label>Media Type</Label>
        <Select value={form.mediaType} onValueChange={v => setForm(f => ({ ...f, mediaType: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="document">Document / Notes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Upload Sermon Media</Label>
        <CloudinaryUploader accept="audio/*,video/*,.pdf,.doc,.docx" label="Upload media file"
          onUpload={setMediaResult} currentUrl={mediaResult?.url ?? (editSermon?.mediaUrl ?? undefined)} />
      </div>
      <div>
        <Label className="mb-2 block">Thumbnail / Cover Image (optional)</Label>
        <CloudinaryUploader accept="image/*" label="Upload thumbnail"
          onUpload={setThumbResult} currentUrl={thumbResult?.url ?? (editSermon?.thumbnailUrl ?? undefined)} />
      </div>
    </div>
  );

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
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
          <p>No sermons yet. Add your first sermon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in-up">
          {(sermons as Sermon[]).map(s => (
            <div key={s.id} className="glass-card p-5 card-hover">
              <div className="flex gap-3">
                {s.thumbnailUrl ? (
                  <img src={s.thumbnailUrl} alt={s.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
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
                  ) : s.mediaType === "video" ? (
                    <div className="mt-2 rounded-lg overflow-hidden bg-black aspect-video">
                      <video src={s.mediaUrl} controls className="w-full h-full" preload="metadata" />
                    </div>
                  ) : (
                    <iframe src={s.mediaUrl} className="w-full h-48 rounded-lg border border-border mt-1" title={s.title} />
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

      <Dialog open={showAdd} onOpenChange={o => { if (!o) resetForm(); setShowAdd(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Sermon</DialogTitle></DialogHeader>
          {sermonFormJsx}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="blue-gradient-bg text-white border-0">{saving ? "Saving…" : "Add Sermon"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSermon} onOpenChange={o => { if (!o) { setEditSermon(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Sermon</DialogTitle></DialogHeader>
          {sermonFormJsx}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditSermon(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="blue-gradient-bg text-white border-0">{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
