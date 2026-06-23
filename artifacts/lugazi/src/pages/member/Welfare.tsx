import { useState } from "react";
import { useListWelfare, useCreateWelfare, getListWelfareQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { memberNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Heart, CheckCircle2, Clock, XCircle } from "lucide-react";

type WelfareRequest = { id: number; category: string; description: string; amountRequested?: number | null; status: string; adminNote?: string | null; createdAt: string };

const CATEGORIES = ["medical","bereavement","education","housing","food","other"];
const CAT_LABEL = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "Pending",  color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",  icon: <Clock className="h-3 w-3" /> },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",  icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",          icon: <XCircle className="h-3 w-3" /> },
};

export default function MemberWelfare() {
  const { data: requests = [], isLoading } = useListWelfare();
  const createMutation = useCreateWelfare();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "medical", description: "", amountRequested: "" });
  const [filterStatus, setFilterStatus] = useState("all");
  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleSubmit() {
    if (!form.description.trim()) { toast({ title: "Description required", variant: "destructive" }); return; }
    createMutation.mutate({ data: { category: form.category, description: form.description, amountRequested: form.amountRequested ? Number(form.amountRequested) : undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListWelfareQueryKey() }); toast({ title: "Request submitted" }); setShowAdd(false); setForm({ category:"medical",description:"",amountRequested:"" }); },
    });
  }

  const all = requests as WelfareRequest[];
  const displayed = filterStatus === "all" ? all : all.filter(r => r.status === filterStatus);

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="My Welfare Requests" description={`${all.filter(r=>r.status==="pending").length} pending · ${all.length} total`}
        actions={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />New Request</Button>} />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {(["all","pending","approved","rejected"] as const).map(s => {
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
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="glass-card h-24 animate-pulse"/>)}</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center"><Heart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground font-medium">No requests yet</p><p className="text-sm text-muted-foreground mt-1">Submit a welfare request and we will review it.</p></div>
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
                      <p className="font-semibold text-sm capitalize">{CAT_LABEL(r.category)}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                    </div>
                    {r.amountRequested && <span className="text-sm font-semibold shrink-0">UGX {Number(r.amountRequested).toLocaleString()}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
                  {r.adminNote && (
                    <div className="mt-2 p-2 rounded-lg bg-muted/60 text-xs italic text-muted-foreground">
                      <span className="font-medium not-italic">Response: </span>{r.adminNote}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleDateString("en-UG",{day:"numeric",month:"short",year:"numeric"})}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Welfare Request</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v=>f("category",v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{CAT_LABEL(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description *</Label><Textarea className="mt-1 resize-none" rows={3} placeholder="Describe your need…" value={form.description} onChange={e=>f("description",e.target.value)} /></div>
            <div><Label>Amount Requested (UGX)</Label><Input className="mt-1" type="number" placeholder="Leave blank if unsure" value={form.amountRequested} onChange={e=>f("amountRequested",e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>{createMutation.isPending?"Submitting…":"Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
