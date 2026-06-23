import { useState } from "react";
import { useListPipeline, useCreatePipelineContact, useUpdatePipelineContact, useDeletePipelineContact, getListPipelineQueryKey, useListBranches } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Phone, Mail, TrendingUp, UserPlus } from "lucide-react";

type PipelineContact = { id: number; name: string; phone: string; email?: string | null; stage: string; source: string; branchId: number; createdAt: string };

const STAGES = ["new_contact", "first_visit", "following_up", "committed", "member"] as const;
const STAGE_CONFIG: Record<string, { label: string; badge: string; accent: string; dot: string }> = {
  new_contact:   { label: "New Contact",   badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",     accent: "border-l-slate-400",   dot: "bg-slate-400" },
  first_visit:   { label: "First Visit",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",         accent: "border-l-blue-500",    dot: "bg-blue-500" },
  following_up:  { label: "Following Up",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",     accent: "border-l-amber-500",   dot: "bg-amber-500" },
  committed:     { label: "Committed",     badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300", accent: "border-l-orange-500",  dot: "bg-orange-500" },
  member:        { label: "Member",        badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",     accent: "border-l-green-500",   dot: "bg-green-500" },
};
const SOURCES = ["personal_outreach", "event", "social_media", "referral", "walk_in", "other"];
const sourceLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

export default function AdminPipeline() {
  const { data: contacts = [], isLoading } = useListPipeline();
  const { data: branches = [] } = useListBranches();
  const createMutation = useCreatePipelineContact();
  const updateMutation = useUpdatePipelineContact();
  const deleteMutation = useDeletePipelineContact();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { name: "", phone: "", email: "", stage: "new_contact", source: "personal_outreach", branchId: "1" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [activeStage, setActiveStage] = useState<string>("all");
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleAdd() {
    createMutation.mutate({ data: { name: form.name, phone: form.phone, email: form.email || undefined, stage: form.stage, source: form.source, branchId: Number(form.branchId) } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPipelineQueryKey() }); toast({ title: "Contact added" }); setShowAdd(false); setForm(blank); },
    });
  }
  function handleStageChange(id: number, stage: string) {
    updateMutation.mutate({ id, data: { stage } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPipelineQueryKey() }) });
  }
  function handleDelete(id: number) {
    if (!confirm("Remove this contact from the pipeline?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPipelineQueryKey() }) });
  }

  const all = contacts as PipelineContact[];
  const displayed = activeStage === "all" ? all : all.filter(c => c.stage === activeStage);

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Soul-Winning Pipeline" description="Track contacts through discipleship stages"
        actions={<Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />Add Contact</Button>} />

      {/* Stage filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button onClick={() => setActiveStage("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeStage === "all" ? "blue-gradient-bg text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          All ({all.length})
        </button>
        {STAGES.map(s => {
          const count = all.filter(c => c.stage === s).length;
          const cfg = STAGE_CONFIG[s];
          return (
            <button key={s} onClick={() => setActiveStage(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeStage === s ? `${cfg.badge} shadow ring-1 ring-current/30` : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Funnel progress */}
      {all.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Discipleship Funnel</span>
            <span>{all.filter(c => c.stage === "member").length} converted to members</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {STAGES.map(s => {
              const pct = all.length ? (all.filter(c => c.stage === s).length / all.length) * 100 : 0;
              return pct > 0 ? (
                <div key={s} className={`${STAGE_CONFIG[s].dot} transition-all`} style={{ width: `${pct}%` }} title={`${STAGE_CONFIG[s].label}: ${all.filter(c=>c.stage===s).length}`} />
              ) : null;
            })}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {STAGES.map(s => (
              <span key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${STAGE_CONFIG[s].dot}`} />
                {STAGE_CONFIG[s].label}: {all.filter(c=>c.stage===s).length}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact cards */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserPlus className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No contacts {activeStage !== "all" ? `in "${STAGE_CONFIG[activeStage]?.label}" stage` : "yet"}</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first soul-winning contact to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(c => {
            const cfg = STAGE_CONFIG[c.stage] ?? STAGE_CONFIG.new_contact;
            return (
              <div key={c.id} className={`glass-card p-4 border-l-4 ${cfg.accent} flex items-center gap-3`}>
                {/* Initials avatar */}
                <div className="w-9 h-9 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3"/>{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3"/>{c.email}</span>}
                    <span className="capitalize">{sourceLabel(c.source)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={c.stage} onValueChange={v => handleStageChange(c.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-32 bg-muted border-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map(s=><SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>)}</SelectContent>
                  </Select>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Contact to Pipeline</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Full Name *</Label><Input className="mt-1" placeholder="John Doe" value={form.name} onChange={e=>f("name",e.target.value)} /></div>
            <div><Label>Phone *</Label><Input className="mt-1" placeholder="+256 700 000 000" value={form.phone} onChange={e=>f("phone",e.target.value)} /></div>
            <div><Label>Email</Label><Input className="mt-1" type="email" placeholder="email@example.com" value={form.email} onChange={e=>f("email",e.target.value)} /></div>
            <div><Label>Starting Stage</Label>
              <Select value={form.stage} onValueChange={v=>f("stage",v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s=><SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Source</Label>
              <Select value={form.source} onValueChange={v=>f("source",v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map(s=><SelectItem key={s} value={s}>{sourceLabel(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name||!form.phone||createMutation.isPending}>
              {createMutation.isPending?"Adding…":"Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
