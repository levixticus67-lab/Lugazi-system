import { useState } from "react";
import { useListDocuments, useCreateDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Plus, Trash2, ExternalLink, FileText, FileSpreadsheet, File, Presentation } from "lucide-react";

type Document = { id: number; title: string; description?: string | null; category: string; fileUrl: string; fileType: string; uploadedByName?: string | null; createdAt: string };

const CATEGORIES = ["general","constitution","sermon","training","minutes","report","policy","other"];
const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  general:      { label: "General",      color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  constitution: { label: "Constitution", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  sermon:       { label: "Sermon",       color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  training:     { label: "Training",     color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  minutes:      { label: "Minutes",      color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  report:       { label: "Report",       color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  policy:       { label: "Policy",       color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  other:        { label: "Other",        color: "bg-muted text-muted-foreground" },
};

function DocIcon({ type }: { type: string }) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("xls") || t.includes("csv") || t.includes("ods")) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (t.includes("ppt") || t.includes("odp")) return <Presentation className="h-5 w-5 text-orange-500" />;
  if (t.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-blue-500" />;
}

const blank = { title: "", description: "", category: "general" };
const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp";

export default function AdminDocuments() {
  const { data: documents = [], isLoading } = useListDocuments();
  const createMutation = useCreateDocument();
  const deleteMutation = useDeleteDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleAdd() {
    if (!form.title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!uploadResult) { toast({ title: "Please upload a file first", variant: "destructive" }); return; }
    createMutation.mutate({ data: { title: form.title, description: form.description || undefined, category: form.category, fileUrl: uploadResult.url, fileType: uploadResult.format || "pdf", fileSize: String(uploadResult.bytes) } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() }); toast({ title: "Document uploaded" }); setShowAdd(false); setForm(blank); setUploadResult(null); },
      onError: () => toast({ title: "Failed to save document", variant: "destructive" }),
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this document?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() }) });
  }

  const all = documents as Document[];
  const displayed = filterCat === "all" ? all : all.filter(d => d.category === filterCat);

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Documents" description={`${all.length} document${all.length!==1?"s":""} stored`}
        actions={<Button size="sm" onClick={() => { setForm(blank); setUploadResult(null); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1"/>Upload Document</Button>} />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button onClick={() => setFilterCat("all")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat==="all" ? "blue-gradient-bg text-white shadow" : "bg-muted text-muted-foreground"}`}>All ({all.length})</button>
        {CATEGORIES.map(c => {
          const count = all.filter(d => d.category === c).length;
          if (!count) return null;
          const cfg = CAT_CONFIG[c];
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat===c ? `${cfg.color} ring-1 ring-current/30 shadow` : "bg-muted text-muted-foreground"}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="glass-card h-20 animate-pulse"/>)}</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3"/><p className="text-muted-foreground font-medium">No documents yet</p></div>
      ) : (
        <div className="space-y-3">
          {displayed.map(doc => {
            const cfg = CAT_CONFIG[doc.category] ?? CAT_CONFIG.other;
            return (
              <div key={doc.id} className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <DocIcon type={doc.fileType} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{doc.title}</p>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  {doc.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    {doc.uploadedByName && <span>by {doc.uploadedByName}</span>}
                    <span>{new Date(doc.createdAt).toLocaleDateString("en-UG",{day:"numeric",month:"short",year:"numeric"})}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="h-4 w-4"/>
                  </a>
                  <button onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4"/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={v => { if(!v){setShowAdd(false);}}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Title *</Label><Input className="mt-1" placeholder="Document title" value={form.title} onChange={e=>f("title",e.target.value)}/></div>
            <div><Label>Description</Label><Textarea className="mt-1 resize-none" rows={2} value={form.description} onChange={e=>f("description",e.target.value)}/></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v=>f("category",v)}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{CAT_CONFIG[c].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>File *</Label>
              <div className="mt-1">
                <CloudinaryUploader accept={DOC_ACCEPT} resourceType="raw" onUpload={r => setUploadResult(r)}
                  label={uploadResult ? `✓ ${uploadResult.url.split("/").pop()?.slice(0,30)}…` : "Choose file to upload"} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>{createMutation.isPending?"Uploading…":"Upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
