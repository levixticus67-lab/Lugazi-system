import { useState } from "react";
import { useListMedia, useCreateMedia, useDeleteMedia, getListMediaQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Plus, Trash2, ExternalLink, ImageIcon, Video, Music, FileText } from "lucide-react";

type MediaItem = {
  id: number; title: string; type: string; url: string;
  thumbnailUrl?: string | null; description?: string | null;
  cloudinaryId?: string | null; createdAt: string;
};

const AUDIO_FMTS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "opus"]);

function resolveMediaType(result: UploadResult): string {
  if (result.resourceType === "image") return "image";
  if (result.resourceType === "video") {
    if (AUDIO_FMTS.has(result.format.toLowerCase())) return "audio";
    return "video";
  }
  return "document";
}

function MediaPreview({ item }: { item: MediaItem }) {
  if (item.type === "image") {
    return (
      <div className="aspect-video bg-muted overflow-hidden">
        <img src={item.url} alt={item.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
    );
  }
  if (item.type === "video") {
    return (
      <div className="aspect-video bg-black">
        <video src={item.url} controls className="w-full h-full" preload="metadata" />
      </div>
    );
  }
  if (item.type === "audio") {
    return (
      <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-2 px-3">
        <Music className="h-8 w-8 text-green-500" />
        <audio src={item.url} controls className="w-full" preload="metadata" />
      </div>
    );
  }
  return (
    <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-2">
      <FileText className="h-10 w-10 text-orange-400" />
      <span className="text-xs font-medium text-muted-foreground uppercase">{item.type}</span>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === "image") return <ImageIcon className="h-3.5 w-3.5 text-blue-400" />;
  if (type === "video") return <Video className="h-3.5 w-3.5 text-purple-400" />;
  if (type === "audio") return <Music className="h-3.5 w-3.5 text-green-400" />;
  return <FileText className="h-3.5 w-3.5 text-orange-400" />;
}

const blank = { title: "", description: "" };

export default function AdminMedia() {
  const { data: items = [], isLoading } = useListMedia();
  const createMutation = useCreateMedia();
  const deleteMutation = useDeleteMedia();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function resetDialog() {
    setForm(blank);
    setUploadResult(null);
  }

  function handleAdd() {
    if (!form.title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!uploadResult) { toast({ title: "Please upload a file first", variant: "destructive" }); return; }

    const mediaType = resolveMediaType(uploadResult);
    createMutation.mutate(
      {
        data: {
          title: form.title,
          type: mediaType,
          url: uploadResult.url,
          cloudinaryId: uploadResult.publicId,
          description: form.description || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          toast({ title: "Media uploaded successfully" });
          setShowAdd(false);
          resetDialog();
        },
        onError: () => toast({ title: "Failed to save media", variant: "destructive" }),
      },
    );
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this media item?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Media Gallery"
        description="Church photos, videos, audio & documents"
        actions={
          <Button size="sm" onClick={() => { resetDialog(); setShowAdd(true); }} data-testid="button-add-media">
            <Plus className="h-4 w-4 mr-1" /> Upload Media
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (items as MediaItem[]).length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center text-muted-foreground shadow-sm">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">No media yet</p>
          <p className="text-sm mt-1">Upload photos, videos, audio or documents to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(items as MediaItem[]).map((item) => (
            <div key={item.id} className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm group" data-testid={`media-item-${item.id}`}>
              <MediaPreview item={item} />
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TypeIcon type={item.type} />
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                </div>
                {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid={`link-media-${item.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button className="text-muted-foreground hover:text-destructive transition-colors ml-auto" onClick={() => handleDelete(item.id)} data-testid={`button-delete-media-${item.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) resetDialog(); setShowAdd(o); }}>
        <DialogContent className="max-w-md" data-testid="dialog-add-media">
          <DialogHeader><DialogTitle>Upload Media</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">File (image, video, audio or document)</Label>
              <CloudinaryUploader
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                label="Drop or click to upload any file"
                onUpload={setUploadResult}
                currentUrl={uploadResult?.url}
              />
            </div>
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="e.g. Sunday Service Photos" className="mt-1" />
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={form.description} onChange={(e) => f("description", e.target.value)} placeholder="Brief description…" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetDialog(); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || !uploadResult} data-testid="button-save-media">
              {createMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
