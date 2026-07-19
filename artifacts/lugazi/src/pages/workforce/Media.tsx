import { useState, useEffect } from "react";
import { cldThumb } from "@/lib/cloudinary";
import { useListMedia, useCreateMedia, getListMediaQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { workforceNavItems } from "./navItems";
import { MediaViewer } from "@/components/MediaViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Image, Video, Music, FileText, Play, ZoomIn } from "lucide-react";
import { evictDeletedMedia } from "@/hooks/use-media-cache";

type MediaItem = { id: number; title: string; type: string; url: string; createdAt: string };

export default function WorkforceMedia() {
  const { data: items = [], isLoading } = useListMedia();
  const createMutation = useCreateMedia();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { title: "", type: "image", url: "" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const [viewUrl, setViewUrl]   = useState<string | null>(null);
  const [viewType, setViewType] = useState<string | undefined>();
  const [viewTitle, setViewTitle] = useState<string | undefined>();
  const [viewId, setViewId]     = useState<number | undefined>();

  function openViewer(item: MediaItem) {
    setViewUrl(item.url); setViewType(item.type); setViewTitle(item.title); setViewId(item.id);
  }

  function handleAdd() {
    if (!form.title || !form.url) { toast({ title: "Title and URL required", variant: "destructive" }); return; }
    createMutation.mutate(
      { data: { title: form.title, type: form.type, url: form.url } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          toast({ title: "Media added" });
          setShowAdd(false); setForm(blank);
        },
      },
    );
  }

  useEffect(() => {
    if ((items as MediaItem[]).length > 0) evictDeletedMedia((items as MediaItem[]).map(i => i.id));
  }, [items]);

  const images = (items as MediaItem[]).filter(i => i.type === "image");
  const videos = (items as MediaItem[]).filter(i => i.type === "video");
  const audios = (items as MediaItem[]).filter(i => i.type === "audio");
  const others = (items as MediaItem[]).filter(i => !["image","video","audio"].includes(i.type));

  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader
        title="Media Gallery"
        description="Photos, videos, and audio from church activities"
        actions={
          <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-media">
            <Plus className="h-4 w-4 mr-1" /> Add Media
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (items as MediaItem[]).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No media yet.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-slide-in-up">
          {images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-blue-400" />
                <h2 className="font-semibold text-sm">Photos ({images.length})</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map(item => (
                  <button key={item.id} onClick={() => openViewer(item)}
                    className="group glass-card overflow-hidden rounded-xl hover:shadow-lg transition-shadow text-left relative"
                    data-testid={`media-${item.id}`}>
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img loading="lazy" src={cldThumb(item.url)} alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
              <div className="flex items-center gap-2 mb-3">
                <Video className="h-4 w-4 text-purple-400" />
                <h2 className="font-semibold text-sm">Videos ({videos.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map(item => (
                  <button key={item.id} onClick={() => openViewer(item)}
                    className="glass-card overflow-hidden rounded-xl text-left hover:shadow-lg transition-shadow group w-full"
                    data-testid={`media-${item.id}`}>
                    <div className="aspect-video bg-black overflow-hidden flex items-center justify-center relative">
                      <Video className="h-12 w-12 text-white/30" />
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
              <div className="flex items-center gap-2 mb-3">
                <Music className="h-4 w-4 text-green-400" />
                <h2 className="font-semibold text-sm">Audio ({audios.length})</h2>
              </div>
              <div className="space-y-3">
                {audios.map(item => (
                  <div key={item.id} className="glass-card p-4 flex items-center gap-3" data-testid={`media-${item.id}`}>
                    <button onClick={() => openViewer(item)}
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
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-orange-400" />
                <h2 className="font-semibold text-sm">Documents ({others.length})</h2>
              </div>
              <div className="space-y-2">
                {others.map(item => (
                  <button key={item.id} onClick={() => openViewer(item)}
                    className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow w-full text-left card-hover"
                    data-testid={`media-${item.id}`}>
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

      {viewUrl && (
        <MediaViewer
          url={viewUrl}
          mediaId={viewId}
          title={viewTitle}
          mediaType={viewType}
          onClose={() => { setViewUrl(null); setViewId(undefined); }}
        />
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Media</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["image","video","audio","document"].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>URL</Label><Input value={form.url} onChange={e => f("url", e.target.value)} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
