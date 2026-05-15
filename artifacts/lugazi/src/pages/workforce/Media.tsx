import { useState } from "react";
import { useListMedia, useCreateMedia, getListMediaQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { workforceNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ExternalLink } from "lucide-react";

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

  function handleAdd() {
    if (!form.title || !form.url) { toast({ title: "Title and URL required", variant: "destructive" }); return; }
    createMutation.mutate({ data: { title: form.title, type: form.type, url: form.url } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }); toast({ title: "Media added" }); setShowAdd(false); setForm(blank); },
    });
  }

  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Media" actions={<Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-media"><Plus className="h-4 w-4 mr-1" /> Add Media</Button>} />
      {isLoading ? <div className="text-muted-foreground">Loading...</div> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(items as MediaItem[]).map(item => (
            <div key={item.id} className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm" data-testid={`media-${item.id}`}>
              {item.type === "image" && <div className="aspect-square bg-muted overflow-hidden"><img src={item.url} alt={item.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div>}
              {item.type !== "image" && <div className="aspect-square bg-muted flex items-center justify-center text-xs uppercase font-medium text-muted-foreground">{item.type}</div>}
              <div className="p-3 flex items-center justify-between gap-2">
                <p className="text-sm truncate">{item.title}</p>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0"><ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            </div>
          ))}
          {(items as MediaItem[]).length === 0 && <div className="col-span-4 text-center text-muted-foreground py-8">No media yet.</div>}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Media</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["image", "video", "audio"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>URL</Label><Input value={form.url} onChange={e => f("url", e.target.value)} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
