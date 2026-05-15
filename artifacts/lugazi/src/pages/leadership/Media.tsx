import { useListMedia, useCreateMedia, getListMediaQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Plus, ExternalLink, Image, Video, Music, FileText } from "lucide-react";

type MediaItem = { id: number; title: string; type: string; url: string; thumbnailUrl?: string; createdAt: string };

const typeIcon: Record<string, React.ReactNode> = {
  image: <Image className="h-5 w-5 text-blue-400" />,
  video: <Video className="h-5 w-5 text-purple-400" />,
  audio: <Music className="h-5 w-5 text-green-400" />,
  document: <FileText className="h-5 w-5 text-orange-400" />,
};

export default function LeadershipMedia() {
  const { data: items = [], isLoading } = useListMedia();
  const createMutation = useCreateMedia();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { title: "", type: "image" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

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
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="group glass-card overflow-hidden rounded-xl hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2"><p className="text-xs font-medium truncate">{item.title}</p></div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Video className="h-4 w-4 text-purple-400" /><h2 className="font-semibold text-sm">Videos ({videos.length})</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map(item => (
                  <div key={item.id} className="glass-card overflow-hidden rounded-xl">
                    <div className="aspect-video bg-black"><video src={item.url} controls className="w-full h-full" preload="metadata" /></div>
                    <div className="p-3 flex items-center justify-between"><p className="text-sm font-medium truncate">{item.title}</p>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </div>
                  </div>
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
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center"><Music className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{item.title}</p><audio controls src={item.url} className="w-full h-8 mt-1" /></div>
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
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                    {typeIcon[item.type] ?? <FileText className="h-5 w-5 text-muted-foreground" />}
                    <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={o => { if (!o) { setUploadResult(null); setForm(blank); } setShowAdd(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Media</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1" placeholder="e.g. Sunday Service Photos" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["image","video","audio","document"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Upload File *</Label>
              <CloudinaryUploader
                accept={form.type === "image" ? "image/*" : form.type === "video" ? "video/*" : form.type === "audio" ? "audio/*" : "*/*"}
                label={`Upload ${form.type}`}
                onUpload={setUploadResult}
                currentUrl={uploadResult?.url}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || !uploadResult} className="blue-gradient-bg text-white border-0">
              {createMutation.isPending ? "Uploading…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
