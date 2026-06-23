import { useState } from "react";
import { useListWelfare, useUpdateWelfare, getListWelfareQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Heart, Pencil, CheckCircle2, Clock, XCircle } from "lucide-react";

type WelfareRequest = { id: number; memberName: string; category: string; description: string; amountRequested?: number | null; status: string; adminNote?: string | null; createdAt: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "Pending",  color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",  icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",          icon: <XCircle className="h-3.5 w-3.5" /> },
};

export default function LeadershipWelfare() {
  const { data: requests = [], isLoading } = useListWelfare();
  const updateMutation = useUpdateWelfare();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reviewReq, setReviewReq] = useState<WelfareRequest | null>(null);
  const [status, setStatus] = useState("approved");
  const [adminNote, setAdminNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  function handleUpdate() {
    if (!reviewReq) return;
    updateMutation.mutate({ id: reviewReq.id, data: { status, adminNote: adminNote || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListWelfareQueryKey() }); toast({ title: "Request updated" }); setReviewReq(null); },
    });
  }

  const all = requests as WelfareRequest[];
  const pending = all.filter(r => r.status === "pending").length;
  const displayed = filterStatus === "all" ? all : all.filter(r => r.status === filterStatus);

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Welfare Requests" description={`${pending} pending · ${all.length} total`} />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {(["all", "pending", "approved", "rejected"] as const).map(s => {
          const count = s === "all" ? all.length : all.filter(r => r.status === s).length;
          const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${filterStatus === s ? (cfg ? `${cfg.color} ring-1 ring-current/30 shadow` : "blue-gradient-bg text-white shadow") : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {s === "all" ? `All (${count})` : `${STATUS_CONFIG[s].label} (${count})`}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="glass-card h-28 animate-pulse" />)}</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center"><Heart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground font-medium">No welfare requests</p></div>
      ) : (
        <div className="space-y-3">
          {displayed.map(r => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
            return (
              <div key={r.id} className="glass-card p-4 flex gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 self-start ${cfg.color.split(" ")[0]}`}>
                  <Heart className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-sm">{r.memberName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.category.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                      {r.amountRequested && <span className="text-xs font-medium">UGX {Number(r.amountRequested).toLocaleString()}</span>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
                  {r.adminNote && <p className="text-xs mt-1.5 italic text-muted-foreground">Note: {r.adminNote}</p>}
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-UG",{day:"numeric",month:"short",year:"numeric"})}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => { setReviewReq(r); setStatus(r.status === "pending" ? "approved" : r.status); setAdminNote(r.adminNote ?? ""); }}>
                      <Pencil className="h-3 w-3" />Review
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!reviewReq} onOpenChange={v => { if (!v) setReviewReq(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Welfare Request</DialogTitle></DialogHeader>
          {reviewReq && (
            <div className="space-y-4 py-1">
              <div className="p-3 rounded-xl bg-muted/60 text-sm">
                <p className="font-medium">{reviewReq.memberName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{reviewReq.category.replace(/_/g," ")}</p>
              </div>
              <div><Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Note (optional)</Label>
                <Textarea className="mt-1 resize-none" rows={3} placeholder="Add a note for the member…" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewReq(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending?"Saving…":"Update Status"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
