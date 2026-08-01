import { useState } from "react";
import { useListReports, useUpdateReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle2, Clock, Users, TrendingUp, ChevronRight } from "lucide-react";

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
  const [viewReport, setViewReport] = useState<Report|null>(null);

  function handleReview(id: number) {
    updateMutation.mutate({ id, data: { status: "reviewed" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        toast({ title: "Report marked as reviewed" });
        // Update the sheet view too so the badge reflects the change immediately
        setViewReport(prev => prev?.id === id ? { ...prev, status: "reviewed" } : prev);
      },
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
          {label:"Total",    value:all.length,                                  color:"text-blue-600"},
          {label:"Pending",  value:pending,                                     color:"text-amber-600"},
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
            return (
              <div key={r.id}
                className="glass-card p-4 flex gap-3 items-center cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setViewReport(r)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && setViewReport(r)}
              >
                <div className="w-9 h-9 rounded-xl blue-gradient-bg flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.submittedByName ?? "Unknown"} · {r.period}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_LABEL[r.type]??r.type}</span>
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                    </div>
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

      {/* Full-page report sheet */}
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
                      <p className="text-xs text-muted-foreground mt-0.5">{viewReport.submittedByName ?? "Unknown"} · {viewReport.period}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_LABEL[viewReport.type]??viewReport.type}</span>
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
                    <p className="text-sm text-muted-foreground italic">No content provided.</p>
                  )}
                </ScrollArea>

                {viewReport.status === "draft" && (
                  <div className="px-5 py-4 border-t border-border/50 shrink-0 pb-safe">
                    <Button className="w-full" onClick={() => handleReview(viewReport.id)} disabled={updateMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-2"/>
                      {updateMutation.isPending ? "Marking…" : "Mark as Reviewed"}
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </PortalLayout>
  );
}
