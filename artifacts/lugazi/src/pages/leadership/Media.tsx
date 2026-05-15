import { useListMedia, useCreateMedia, getListMediaQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { MediaViewer } from "@/components/MediaViewer";
import { Plus, Image, Video, Music, FileText, Play, ZoomIn, X } from "lucide-react";

type MediaItem = { id: number; title: string; type: string; url: string; thumbnailUrl?: string; createdAt: string };

export default function LeadershipMedia() {
  const { data: items = [], isLoading } = useListMedia();
  const createMutation = useCreateMedia();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { title: "", type: "image" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewType, setViewType] = useState<string | undefined>();
  const [viewTitle, setViewTitle] = useState<string | undefined>();

  function handleAdd() {
    if (!form.title || !uploadResult?.url) { toast({ title: "Title and upload required", variant: "destructive" }); return; }
    createMutation.mutate({ data: { title: form.title, type: form.type, url: uploadResult.url } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
        toast({ title: "Media uploaded" });
        setShowAdd(false); setForm(blank); setUploadResult(null);
      },
    });
  }

  function openViewer(url: string, type?: string, title?: string) {
    setViewUrl(url); setViewType(type); setViewTitle(title);
  }

  const images = (items as MediaItem[]).filter(i => i.type === "image");
  const videos = (items as MediaItem[]).filter(i => i.type === "video");
  const audios = (items as MediaItem[]).filter(i => i.type === "audio");
  const others = (items as MediaItem[]).filter(i => !["image","video","audio"].includes(i.type));

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Media Gallery" description="Church photos, videos, and audio"
        actions={<Button size="sm" onClick={() => { setForm(blank); setUploadResult(null); setShowAdd(true); }} className="blue-gradient-bg text-white border-0">
          <Plus className="h-4 w-4 mr-1" /> Upload Media
        </Button>} />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (items as MediaItem[]).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No media yet. Upload your first file.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-slide-in-up">
          {images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Image className="h-4 w-4 text-blue-400" /><h2 className="font-semibold text-sm">Photos ({images.length})</h2></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map(item => (
                  <button key={item.id} onClick={() => openViewer(item.url, "image", item.title)}
                    className="group glass-card overflow-hidden rounded-xl hover:shadow-lg transition-shadow text-left relative">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="h-6 w-6 text-white drop-shadow" />
                    </div>
                    <div className="p-2"><p className="text-xs font-medium truncate">{item.title}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Video className="h-4 w-4 text-purple-400" /><h2 className="font-semibold text-sm">Videos ({videos.length})</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map(item => (
                  <button key={item.id} onClick={() => openViewer(item.url, "video", item.title)}
                    className="glass-card overflow-hidden rounded-xl text-left hover:shadow-lg transition-shadow group w-full">
                    <div className="aspect-video bg-black overflow-hidden flex items-center justify-center relative">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="h-12 w-12 text-white/30" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3"><p className="text-sm font-medium truncate">{item.title}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {audios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Music className="h-4 w-4 text-green-400" /><h2 className="font-semibold text-sm">Audio ({audios.length})</h2></div>
              <div className="space-y-3">
                {audios.map(item => (
                  <div key={item.id} className="glass-card p-4 flex items-center gap-3">
                    <button onClick={() => openViewer(item.url, "audio", item.title)}
                      className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center hover:bg-green-200 transition shrink-0">
                      <Music className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <audio controls src={item.url} className="w-full h-8 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-orange-400" /><h2 className="font-semibold text-sm">Documents ({others.length})</h2></div>
              <div className="space-y-2">
                {others.map(item => (
                  <button key={item.id} onClick={() => openViewer(item.url, item.type, item.title)}
                    className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow w-full text-left card-hover">
                    <FileText className="h-5 w-5 text-orange-400 shrink-0" />
                    <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload modal — custom overlay to avoid Dialog keyboard issues */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
              <h2 className="font-semibold">Upload Media</h2>
              <button onClick={() => { setShowAdd(false); setUploadResult(null); setForm(blank); }}><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Sunday Service Photos" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {["image","video","audio","document"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Upload File *</label>
                <CloudinaryUploader
                  accept={form.type === "image" ? "image/*" : form.type === "video" ? "video/*" : form.type === "audio" ? "audio/*" : "*/*"}
                  label={`Upload ${form.type}`}
                  onUpload={setUploadResult}
                  currentUrl={uploadResult?.url}
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
              <button onClick={() => { setShowAdd(false); setUploadResult(null); setForm(blank); }} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-medium">Cancel</button>
              <button onClick={handleAdd} disabled={createMutation.isPending || !uploadResult}
                className="flex-1 py-2.5 rounded-xl blue-gradient-bg text-white text-sm font-semibold disabled:opacity-60">
                {createMutation.isPending ? "Uploading…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewUrl && <MediaViewer url={viewUrl} title={viewTitle} mediaType={viewType} onClose={() => setViewUrl(null)} />}
    </PortalLayout>
  );
}
