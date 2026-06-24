import { useState } from "react";
import { useListReports, useUpdateReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle2, Clock, Eye, ChevronDown, ChevronUp, Users, TrendingUp } from "lucide-react";

type Report = { id: number; title: string; type: string; submittedByName?: string | null; period: string; status: string; content?: string | null; attendance?: number | null; soulWinning?: number | null; createdAt: string };

const TYPE_LABEL: Record<string,string> = { weekly_branch:"Weekly Branch", monthly_branch:"Monthly Branch", quarterly:"Quarterly", annual:"Annual", special:"Special" };
const STATUS_CONFIG: Record<string,{label:string;color:string;icon:React.ReactNode}> = {
  draft:    { label:"Submitted", color:"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",  icon:<Clock className="h-3 w-3"/> },
  reviewed: { label:"Reviewed",  color:"bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",  icon:<CheckCircle2 className="h-3 w-3"/> },
};

export default function AdminReports() {
  const { data: reports = [], isLoading } = useListReports();
  const updateMutation = useUpdateReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<number|null>(null);
  const [viewReport, setViewReport] = useState<Report|null>(null);

  function handleReview(id: number) {
    updateMutation.mutate({ id, data: { status: "reviewed" } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() }); toast({ title: "Report marked as reviewed" }); },
      onError: () => toast({ title: "Failed to update", variant:"destructive" }),
    });
  }

  const all = reports as Report[];
  const pending = all.filter(r => r.status === "draft").length;
  const displayed = filterStatus === "all" ? all : all.filter(r => r.status === filterStatus);

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Reports" description={`${pending} pending review · ${all.length} total`} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {label:"Total",    value:all.length,                              color:"text-blue-600"},
          {label:"Pending",  value:pending,                                 color:"text-amber-600"},
          {label:"Reviewed", value:all.filter(r=>r.status==="reviewed").length, color:"text-green-600"},
        ].map(s=>(
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {(["all","draft","reviewed"] as const).map(s => (
          <button key={s} onClick={()=>setFilterStatus(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus===s ? (s==="all"?"blue-gradient-bg text-white shadow":s==="draft"?"bg-amber-100 text-amber-700 ring-1 ring-amber-300":"bg-green-100 text-green-700 ring-1 ring-green-300") : "bg-muted text-muted-foreground"}`}>
            {s==="all"?`All (${all.length})`:s==="draft"?`Pending (${pending})`:`Reviewed (${all.filter(r=>r.status==="reviewed").length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="glass-card h-24 animate-pulse"/>)}</div>
      ) : displayed.length===0 ? (
        <div className="glass-card p-12 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3"/><p className="text-muted-foreground font-medium">No reports</p></div>
      ) : (
        <div className="space-y-3">
          {displayed.map(r => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft;
            const expanded = expandedId === r.id;
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
                        <p className="text-xs text-muted-foreground">{r.submittedByName ?? "Unknown"} · {r.period}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_LABEL[r.type]??r.type}</span>
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                      </div>
                    </div>
                    {(r.attendance||r.soulWinning) && (
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        {r.attendance && <span className="flex items-center gap-1"><Users className="h-3 w-3"/>Attendance: {r.attendance}</span>}
                        {r.soulWinning && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3"/>Soul-winning: {r.soulWinning}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-UG",{day:"numeric",month:"short",year:"numeric"})}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>setExpandedId(expanded?null:r.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="h-3 w-3"/>{expanded?"Hide":"Read"}
                          {expanded?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}
                        </button>
                        {r.status === "draft" && (
                          <Button size="sm" className="h-7 text-xs" onClick={()=>handleReview(r.id)} disabled={updateMutation.isPending}>
                            <CheckCircle2 className="h-3 w-3 mr-1"/>Mark Reviewed
                          </Button>
                        )}
                      </div>
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
    </PortalLayout>
  );
}
