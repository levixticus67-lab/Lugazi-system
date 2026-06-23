import { useState } from "react";
import { useListMembers, useCreateMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Phone, Mail, Building2, Search } from "lucide-react";

type Member = { id: number; fullName: string; email: string; phone?: string | null; role: string; branchId: number; department?: string | null; isActive: boolean; photoUrl?: string | null };

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  pastor:     "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  leadership: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  workforce:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  member:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export default function LeadershipMembers() {
  const { data: members = [], isLoading } = useListMembers();
  const createMutation = useCreateMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", branchId: "1" });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  function handleAdd() {
    if (!form.fullName || !form.email) { toast({ title: "Name and email required", variant: "destructive" }); return; }
    createMutation.mutate({ data: { fullName: form.fullName, email: form.email, phone: form.phone || undefined, branchId: Number(form.branchId) } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); toast({ title: "Member added" }); setShowAdd(false); setForm({ fullName:"",email:"",phone:"",branchId:"1" }); },
    });
  }

  const all = members as Member[];
  const roles = Array.from(new Set(all.map(m => m.role)));
  let displayed = filterRole === "all" ? all : all.filter(m => m.role === filterRole);
  if (search.trim()) {
    const q = search.toLowerCase();
    displayed = displayed.filter(m => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.department ?? "").toLowerCase().includes(q));
  }

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Members" description={`${all.filter(m=>m.isActive).length} active · ${all.length} total`}
        actions={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Member</Button>} />

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, department…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button onClick={() => setFilterRole("all")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterRole === "all" ? "blue-gradient-bg text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>All ({all.length})</button>
        {roles.map(r => (
          <button key={r} onClick={() => setFilterRole(r)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${filterRole === r ? `${ROLE_COLORS[r] ?? "bg-muted text-foreground"} ring-1 ring-current/30 shadow` : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {r} ({all.filter(m=>m.role===r).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Array.from({length:6}).map((_,i) => <div key={i} className="glass-card h-24 animate-pulse" />)}</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground font-medium">No members found</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(m => (
            <div key={m.id} className={`glass-card p-4 flex gap-3 hover:shadow-md transition-all ${!m.isActive ? "opacity-60" : ""}`}>
              {m.photoUrl ? (
                <img src={m.photoUrl} alt={m.fullName} className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-background shadow" />
              ) : (
                <div className="w-12 h-12 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-base shrink-0 shadow">
                  {m.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="font-semibold text-sm truncate">{m.fullName}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[m.role] ?? "bg-muted text-muted-foreground"}`}>{m.role}</span>
                      {!m.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0"/>{m.email}</p>
                  {m.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3 shrink-0"/>{m.phone}</p>}
                  {m.department && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Building2 className="h-3 w-3 shrink-0"/>{m.department}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Full Name *</Label><Input className="mt-1" placeholder="Jane Doe" value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} /></div>
            <div><Label>Email *</Label><Input className="mt-1" type="email" placeholder="jane@example.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
            <div><Label>Phone</Label><Input className="mt-1" placeholder="+256 700 000 000" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>{createMutation.isPending?"Adding…":"Add Member"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
