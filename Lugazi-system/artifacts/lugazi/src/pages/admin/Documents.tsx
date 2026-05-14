import { useState } from "react";
import { useListDocuments, useCreateDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Plus, Trash2, ExternalLink, FileText } from "lucide-react";

type Document = {
  id: number; title: string; category: string; fileUrl: string;
  fileType: string; uploadedByName?: string | null; createdAt: string;
};

const CATEGORIES = ["general", "constitution", "sermon", "training", "minutes", "report", "policy", "other"];

const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp";

const blank = { title: "", description: "", category: "general" };

export default function AdminDocuments() {
  const { data: documents = [], isLoading } = useListDocuments();
  const createMutation = useCreateDocument();
  const deleteMutation = useDeleteDocument();
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

    createMutation.mutate(
      {
        data: {
          title: form.title,
          description: form.description || undefined,
          category: form.category,
          fileUrl: uploadResult.url,
          fileType: uploadResult.format || "pdf",
          fileSize: String(uploadResult.bytes),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          toast({ title: "Document uploaded successfully" });
          setShowAdd(false);
          resetDialog();
        },
        onError: () => toast({ title: "Failed to save document", variant: "destructive" }),
      },
    );
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this document?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Documents"
        description="Church documents and resources"
        actions={
          <Button size="sm" onClick={() => { resetDialog(); setShowAdd(true); }} data-testid="button-add-document">
            <Plus className="h-4 w-4 mr-1" /> Upload Document
          </Button>
        }
      />
      <DataTable
        columns={[
          { header: "Title", key: "title", render: (r) => (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-400 flex-shrink-0" />
              <span>{r.title}</span>
            </div>
          )},
          { header: "Category", key: "category", render: (r) => <span className="capitalize">{r.category}</span> },
          { header: "Type", key: "fileType", render: (r) => <span className="uppercase text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{r.fileType}</span> },
          { header: "Uploaded By", key: "uploadedByName", render: (r) => r.uploadedByName || "-" },
          { header: "Date", key: "createdAt", render: (r) => new Date(r.createdAt).toLocaleDateString() },
          {
            header: "Actions", key: "actions", render: (r) => (
              <div className="flex gap-2">
                <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid={`link-document-${r.id}`}>
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDelete(r.id)} data-testid={`button-delete-document-${r.id}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={documents as Document[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No documents uploaded."
      />

      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) resetDialog(); setShowAdd(o); }}>
        <DialogContent className="max-w-md" data-testid="dialog-add-document">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Document File</Label>
              <CloudinaryUploader
                accept={DOC_ACCEPT}
                label="Drop or click to upload PDF, Word, Excel, PowerPoint…"
                onUpload={setUploadResult}
                currentUrl={uploadResult?.url}
              />
            </div>
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="e.g. 2024 Annual Report" className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => f("category", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={form.description} onChange={(e) => f("description", e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetDialog(); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || !uploadResult} data-testid="button-save-document">
              {createMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
