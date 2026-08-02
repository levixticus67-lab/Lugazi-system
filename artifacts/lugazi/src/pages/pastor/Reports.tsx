import { useState } from "react";
import { useListReports, useCreateReport, useUpdateReport, useDeleteReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { pastorNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { FileText, CheckCircle2, Clock, Plus, Users, TrendingUp, ChevronRight, Paperclip, Pencil, Trash2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";

type Report = {
  id: number; title: string; type: string; period: string; status: string;
  content?: string | null; attendance?: number | null; soulWinning?: number | null;
  createdAt: string; fileUrl?: string | null; fileType?: string | null; fileSize?: string | null;
};

const TYPE_CONFIG: Record<string,string> = { weekly_branch:"Weekly Branch", monthly_branch:"Monthly Branch", quarterly:"Quarterly", annual:"Annual", special:"Special" };
const STATUS_CONFIG: Record<string,{label:string;color:string;icon:React.ReactNode}> = {
  draft:    { label:"Pending Review", color:"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",  icon:<Clock className="h-3 w-3"/> },
  reviewed: { label:"Reviewed",       color:"bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",  icon:<CheckCircle2 className="h-3 w-3"/> },
};
const REPORT_TYPES = ["weekly_branch","monthly_branch","quarterly","annual","special"];
const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp";

function getMimeType(ext: string): string {
  const t = (ext ?? "").toLowerCase();
  if (t === "pdf")  return "application/pdf";
  if (t === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (t === "doc")  return "application/msword";
  if (t === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (t === "xls")  return "application/vnd.ms-excel";
  if (t === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (t === "ppt")  return "application/vnd.ms-powerpoint";
  if (t === "txt")  return "text/plain";
  if (t === "csv")  return "text/csv";
  return "application/octet-stream";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function openDocument(url: string, fileType: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      // If the URL already has an extension (new uploads embed it in public_id), use as-is
      const rawName = url.split("/").pop()?.split("?")[0] ?? "report";
      const hasExt = rawName.includes(".");
      const fileName = hasExt ? rawName : rawName + "." + fileType;
      const ext = fileName.split(".").pop() ?? fileType;
      const response = await fetch(url);
      const base64 = await blobToBase64(await response.blob());
      const { uri } = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
      await FileOpener.open({ filePath: uri, contentType: getMimeType(ext), openWithDefault: true });
    } catch {
      await Browser.open({ url });
    }
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const blank = { title:"", type:"weekly_branch", content:"", period:"", attendance:"", soulWinning:"" };

export default function PastorReports() {
  const { data: reports = [], isLoading } = useListReports();
  const createMutation = useCreateReport();
  const updateMutation = useUpdateReport();
  const deleteMutation = useDeleteReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(blank);
  const [editUploadResult, setEditUploadResult] = useState<UploadResult | null>(null);
  const [editKeepFile, setEditKeepFile] = useState(true); // keep existing attachment unless user replaces

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [viewReport, setViewReport] = useState<Report|null>(null);

  function f(k: string, v: string) { setForm(p=>({...p,[k]:v})); }
  function ef(k: string, v: string) { setEditForm(p=>({...p,[k]:v})); }

  function handleAdd() {
    if (!form.title || !form.period) { toast({ title:"Title and period are required", variant:"destructive" }); return; }
    if (!form.content && !uploadResult) { toast({ title:"Add report content or attach a document", variant:"destructive" }); return; }
    createMutation.mutate({ data: {
      title: form.title, type: form.type, content: form.content || undefined, period: form.period,
      attendance: form.attendance ? Number(form.attendance) : undefined,
      soulWinning: form.soulWinning ? Number(form.soulWinning) : undefined,
      ...(uploadResult ? {
        fileUrl: uploadResult.url,
        fileType: uploadResult.originalName.split(".").pop() ?? uploadResult.format ?? "file",
        fileSize: String(uploadResult.bytes),
      } : {}),
    }}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey:getListReportsQueryKey() });
        toast({ title:"Report submitted to admin" });
        setShowAdd(false); setForm(blank); setUploadResult(null);
      },
      onError: () => toast({ title:"Failed to submit", variant:"destructive" }),
    });
  }

  function openEditDialog(r: Report) {
    setEditForm({
      title: r.title, type: r.type, content: r.content ?? "",
      period: r.period,
      attendance: r.attendance != null ? String(r.attendance) : "",
      soulWinning: r.soulWinning != null ? String(r.soulWinning) : "",
    });
    setEditUploadResult(null);
    setEditKeepFile(true);
    setShowEdit(true);
  }

  function handleEdit() {
    if (!viewReport) return;
    if (!editForm.title || !editForm.period) { toast({ title:"Title and period are required", variant:"destructive" }); return; }
    const fileFields = editUploadResult
      ? { fileUrl: editUploadResult.url, fileType: editUploadResult.originalName.split(".").pop() ?? editUploadResult.format ?? "file", fileSize: String(editUploadResult.bytes) }
      : editKeepFile
        ? {} // keep existing — send nothing
        : { fileUrl: null, fileType: null, fileSize: null };
    updateMutation.mutate({ id: viewReport.id, data: {
      title: editForm.title, type: editForm.type as string,
      period: editForm.period, content: editForm.content || undefined,
      attendance: editForm.attendance ? Number(editForm.attendance) : undefined,
      soulWinning: editForm.soulWinning ? Number(editForm.soulWinning) : undefined,
      ...fileFields,
    }}, {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey:getListReportsQueryKey() });
        toast({ title:"Report updated" });
        setViewReport(updated as unknown as Report);
        setShowEdit(false);
      },
      onError: () => toast({ title:"Failed to update", variant:"destructive" }),
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey:getListReportsQueryKey() });
        toast({ title:"Report deleted" });
        setDeleteTarget(null);
        setViewReport(null);
      },
      onError: () => toast({ title:"Failed to delete", variant:"destructive" }),
    });
  }

  const all = reports as Report[];
  const displayed = filterStatus==="all" ? all : all.filter(r=>r.status===filterStatus);

  return (
    <PortalLayout navItems={pastorNavItems} portalLabel="Pastor Portal">
      <PageHeader title="My Reports" description={`${all.length} report${all.length!==1?"s":""} submitted`}
        actions={<Button size="sm" onClick={()=>{ setForm(blank); setUploadResult(null); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1"/>Submit Report</Button>} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {label:"Total",    value:all.length,                                  color:"text-blue-600"},
          {label:"Pending",  value:all.filter(r=>r.status==="draft").length,    color:"text-amber-600"},
          {label:"Reviewed", value:all.filter(r=>r.status==="reviewed").length, color:"text-green-600"},
        ].map(s=>(
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {(["all","draft","reviewed"] as const).map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus===s?(s==="all"?"blue-gradient-bg text-white shadow":s==="draft"?"bg-amber-100 text-amber-700 ring-1 ring-amber-300":"bg-green-100 text-green-700 ring-1 ring-green-300"):"bg-muted text-muted-foreground"}`}>
            {s==="all"?`All (${all.length})`:s==="draft"?`Pending (${all.filter(r=>r.status==="draft").length})`:`Reviewed (${all.filter(r=>r.status==="reviewed").length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="glass-card h-24 animate-pulse"/>)}</div>
      ) : displayed.length===0 ? (
        <div className="glass-card p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3"/>
          <p className="text-muted-foreground font-medium">No reports yet</p>
          <p className="text-sm text-muted-foreground mt-1">Submit your first report to the admin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(r=>{
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft;
            return (
              <div key={r.id}
                className="glass-card p-4 flex gap-3 items-center cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setViewReport(r)}
                role="button" tabIndex={0} onKeyDown={e => e.key==="Enter" && setViewReport(r)}
              >
                <div className="w-9 h-9 rounded-xl blue-gradient-bg flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.period}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_CONFIG[r.type]??r.type}</span>
                    {r.fileUrl && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"><Paperclip className="h-2.5 w-2.5"/>Attachment</span>}
                  </div>
                  {(r.attendance||r.soulWinning) && (
                    <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                      {r.attendance && <span className="flex items-center gap-1"><Users className="h-3 w-3"/>Attendance: {r.attendance}</span>}
                      {r.soulWinning && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3"/>Soul-winning: {r.soulWinning}</span>}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(r.createdAt).toLocaleDateString("en-UG",{day:"numeric",month:"short",year:"numeric"})}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* View sheet */}
      <Sheet open={!!viewReport} onOpenChange={open => { if (!open) setViewReport(null); }}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-2xl px-0 pb-0">
          {viewReport && (() => {
            const cfg = STATUS_CONFIG[viewReport.status] ?? STATUS_CONFIG.draft;
            return (
              <>
                <SheetHeader className="px-5 pt-2 pb-3 border-b border-border/50 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <SheetTitle className="text-base leading-snug text-left">{viewReport.title}</SheetTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{viewReport.period}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_CONFIG[viewReport.type]??viewReport.type}</span>
                    {viewReport.attendance != null && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        <Users className="h-2.5 w-2.5"/>Attendance: {viewReport.attendance}
                      </span>
                    )}
                    {viewReport.soulWinning != null && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300">
                        <TrendingUp className="h-2.5 w-2.5"/>Soul-winning: {viewReport.soulWinning}
                      </span>
                    )}
                  </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-5 py-4">
                  {viewReport.content ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewReport.content}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No typed content.</p>
                  )}
                  {viewReport.fileUrl && (
                    <div className="mt-5 pt-4 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Attached Document</p>
                      <button
                        onClick={() => openDocument(viewReport.fileUrl!, viewReport.fileType ?? "pdf")}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                          <Paperclip className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Report Attachment</p>
                          <p className="text-xs text-muted-foreground">{(viewReport.fileType ?? "file").toUpperCase()} · Tap to open</p>
                        </div>
                      </button>
                    </div>
                  )}
                </ScrollArea>

                {/* Action footer */}
                <div className="px-5 py-4 border-t border-border/50 shrink-0 pb-safe flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => openEditDialog(viewReport)}>
                    <Pencil className="h-4 w-4 mr-2"/>Edit
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => setDeleteTarget(viewReport)}>
                    <Trash2 className="h-4 w-4 mr-2"/>Delete
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Submit dialog */}
      <Dialog open={showAdd} onOpenChange={v=>{if(!v){ setShowAdd(false); setUploadResult(null); }}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Report to Admin</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Title *</Label><Input className="mt-1" placeholder="e.g. Weekly Branch Report" value={form.title} onChange={e=>f("title",e.target.value)}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v=>f("type",v)}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>{REPORT_TYPES.map(t=><SelectItem key={t} value={t}>{TYPE_CONFIG[t]??t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Period *</Label><Input className="mt-1" placeholder="e.g. Jan 2026" value={form.period} onChange={e=>f("period",e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Attendance</Label><Input className="mt-1" type="number" placeholder="0" value={form.attendance} onChange={e=>f("attendance",e.target.value)}/></div>
              <div><Label>Soul-winning</Label><Input className="mt-1" type="number" placeholder="0" value={form.soulWinning} onChange={e=>f("soulWinning",e.target.value)}/></div>
            </div>
            <div><Label>Content</Label><Textarea className="mt-1 resize-none" rows={3} placeholder="Describe what happened this period… (optional if attaching a document)" value={form.content} onChange={e=>f("content",e.target.value)}/></div>
            <div>
              <Label>Attach Document <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="mt-1">
                <CloudinaryUploader
                  onUpload={setUploadResult}
                  accept={DOC_ACCEPT}
                  showNameInput
                  namePlaceholder="e.g. Weekly-Branch-Report-Jan-2026"
                  label={uploadResult ? `✓ ${(uploadResult.originalName.split(".").pop() ?? uploadResult.format ?? "file").toUpperCase()} attached` : "Upload PDF, Word, Excel…"}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{ setShowAdd(false); setUploadResult(null); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>{createMutation.isPending?"Submitting…":"Submit to Admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={v=>{ if(!v) setShowEdit(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Report</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Title *</Label><Input className="mt-1" value={editForm.title} onChange={e=>ef("title",e.target.value)}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={editForm.type} onValueChange={v=>ef("type",v)}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>{REPORT_TYPES.map(t=><SelectItem key={t} value={t}>{TYPE_CONFIG[t]??t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Period *</Label><Input className="mt-1" value={editForm.period} onChange={e=>ef("period",e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Attendance</Label><Input className="mt-1" type="number" value={editForm.attendance} onChange={e=>ef("attendance",e.target.value)}/></div>
              <div><Label>Soul-winning</Label><Input className="mt-1" type="number" value={editForm.soulWinning} onChange={e=>ef("soulWinning",e.target.value)}/></div>
            </div>
            <div><Label>Content</Label><Textarea className="mt-1 resize-none" rows={3} value={editForm.content} onChange={e=>ef("content",e.target.value)}/></div>
            <div>
              <Label>Attachment</Label>
              {viewReport?.fileUrl && editKeepFile && !editUploadResult ? (
                <div className="mt-1 flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <Paperclip className="h-4 w-4 text-blue-500 shrink-0"/>
                  <span className="text-xs flex-1 truncate">{(viewReport.fileType ?? "file").toUpperCase()} · existing attachment</span>
                  <button className="text-xs text-red-500 hover:underline shrink-0" onClick={()=>setEditKeepFile(false)}>Remove</button>
                </div>
              ) : (
                <div className="mt-1">
                  <CloudinaryUploader
                    onUpload={r=>{ setEditUploadResult(r); setEditKeepFile(false); }}
                    accept={DOC_ACCEPT}
                    showNameInput
                    namePlaceholder="e.g. Updated-Report"
                    label={editUploadResult ? `✓ ${(editUploadResult.originalName.split(".").pop() ?? "file").toUpperCase()} attached` : "Upload replacement document"}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>{updateMutation.isPending?"Saving…":"Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open=>{ if(!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Report?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-1">
            "<span className="font-medium text-foreground">{deleteTarget?.title}</span>" will be permanently deleted. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending?"Deleting…":"Delete Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
