import { useState } from "react";
import { useListReports, useCreateReport, getListReportsQueryKey } from "@workspace/api-client-react";
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
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle2, Clock, Plus, ChevronDown, ChevronUp, Eye, Users, TrendingUp } from "lucide-react";

type Report = { id: number; title: string; type: string; period: string; status: string; content?: string | null; attendance?: number | null; soulWinning?: number | null; createdAt: string };

const TYPE_CONFIG: Record<string,string> = { weekly_branch:"Weekly Branch", monthly_branch:"Monthly Branch", quarterly:"Quarterly", annual:"Annual", special:"Special" };
const STATUS_CONFIG: Record<string,{label:string;color:string;icon:React.ReactNode}> = {
  draft:    { label:"Pending Review", color:"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",  icon:<Clock className="h-3 w-3"/> },
  reviewed: { label:"Reviewed",       color:"bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",  icon:<CheckCircle2 className="h-3 w-3"/> },
};
const REPORT_TYPES = ["weekly_branch","monthly_branch","quarterly","annual","special"];

export default function PastorReports() {
  const { data: reports = [], isLoading } = useListReports();
  const createMutation = useCreateReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { title:"", type:"weekly_branch", content:"", period:"", attendance:"", soulWinning:"" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<number|null>(null);
  function f(k: string, v: string) { setForm(p=>({...p,[k]:v})); }

  function handleAdd() {
    if (!form.title || !form.content || !form.period) { toast({ title:"Title, period and content are required", variant:"destructive" }); return; }
    createMutation.mutate({ data: { title:form.title, type:form.type, content:form.content, period:form.period, attendance:form.attendance?Number(form.attendance):undefined, soulWinning:form.soulWinning?Number(form.soulWinning):undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey:getListReportsQueryKey() }); toast({ title:"Report submitted to admin" }); setShowAdd(false); setForm(blank); },
      onError: () => toast({ title:"Failed to submit", variant:"destructive" }),
    });
  }

  const all = reports as Report[];
  const displayed = filterStatus==="all" ? all : all.filter(r=>r.status===filterStatus);

  return (
    <PortalLayout navItems={pastorNavItems} portalLabel="Pastor Portal">
      <PageHeader title="My Reports" description={`${all.length} report${all.length!==1?"s":""} submitted`}
        actions={<Button size="sm" onClick={()=>{ setForm(blank); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1"/>Submit Report</Button>} />

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
            const expanded = expandedId===r.id;
            return (
              <div key={r.id} className="glass-card overflow-hidden">
                <div className="p-4 flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-xl blue-gradient-bg flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-white"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.period}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_CONFIG[r.type]??r.type}</span>
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                      </div>
                    </div>
                    {(r.attendance||r.soulWinning) && (
                      <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                        {r.attendance && <span className="flex items-center gap-1"><Users className="h-3 w-3"/>Attendance: {r.attendance}</span>}
                        {r.soulWinning && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3"/>Soul-winning: {r.soulWinning}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-UG",{day:"numeric",month:"short",year:"numeric"})}</span>
                      <button onClick={()=>setExpandedId(expanded?null:r.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Eye className="h-3 w-3"/>{expanded?"Hide":"Read"}
                        {expanded?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}
                      </button>
                    </div>
                  </div>
                </div>
                {expanded && r.content && (
                  <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{r.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={v=>{if(!v)setShowAdd(false);}}>
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
            <div><Label>Content *</Label><Textarea className="mt-1 resize-none" rows={4} placeholder="Describe what happened this period…" value={form.content} onChange={e=>f("content",e.target.value)}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>{createMutation.isPending?"Submitting…":"Submit to Admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
