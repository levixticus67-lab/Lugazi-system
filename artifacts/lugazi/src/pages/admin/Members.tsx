import { useState } from "react";
import axios from "@/lib/axios";
import { useListMembers, useCreateMember, useDeleteMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Plus, Pencil, Trash2, Users, Phone, Mail, Building2, Search, UserCheck, UserX, Heart, X, Cake } from "lucide-react";

type Member = {
  id: number; fullName: string; email: string; phone?: string | null;
  role: string; branchId: number; department?: string | null;
  isActive: boolean; photoUrl?: string | null; createdAt: string; qrToken: string;
};

interface FamilyMember {
  id: number;
  fullName: string;
  relationship: string;
  birthday: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  linkedUserId: number | null;
  addedByName?: string | null; // only present in "linked" side
}

interface FamilyResponse {
  added: FamilyMember[];
  linked: FamilyMember[];
}

const blankForm = { fullName: "", email: "", phone: "", branchId: "1", department: "" };

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  pastor:     "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  leadership: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  workforce:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  member:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const relColors: Record<string, string> = {
  Spouse:"bg-rose-100 text-rose-700", Child:"bg-blue-100 text-blue-700", Parent:"bg-purple-100 text-purple-700",
  Sibling:"bg-green-100 text-green-700", Other:"bg-slate-100 text-slate-600",
};

function FamilyCard({ f, showAddedBy = false }: { f: FamilyMember; showAddedBy?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
      <div className="w-9 h-9 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
        {f.fullName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{f.fullName}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${relColors[f.relationship] ?? "bg-slate-100 text-slate-600"}`}>{f.relationship}</span>
          {f.linkedUserId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1"><UserCheck className="h-2.5 w-2.5"/>Church member</span>}
        </div>
        <div className="mt-1 space-y-0.5">
          {showAddedBy && f.addedByName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400"/>Listed by {f.addedByName}</p>
          )}
          {f.birthday && <p className="text-xs text-muted-foreground flex items-center gap-1"><Cake className="h-3 w-3"/>{new Date(f.birthday).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</p>}
          {f.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3"/>{f.phone}</p>}
          {f.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3 shrink-0"/><span className="truncate">{f.email}</span></p>}
          {f.notes && <p className="text-xs text-muted-foreground italic">{f.notes}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminMembers() {
  const { data: members = [], isLoading } = useListMembers();
  const createMutation = useCreateMember();
  const deleteMutation = useDeleteMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [familyMember, setFamilyMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [photoResult, setPhotoResult] = useState<UploadResult | null>(null);
  const [editPhotoResult, setEditPhotoResult] = useState<UploadResult | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Fetch family members for whichever member the admin is viewing
  const { data: familyData, isLoading: familyLoading } = useQuery<FamilyResponse>({
    queryKey: ["admin-member-family", familyMember?.id],
    queryFn: () => axios.get(`/api/admin/members/${familyMember!.id}/family`).then(r => r.data),
    enabled: !!familyMember,
  });
  const familyAdded = familyData?.added ?? [];
  const familyLinked = familyData?.linked ?? [];

  function resetForm() { setForm(blankForm); setPhotoResult(null); }

  function handleAdd() {
    if (!form.fullName || !form.email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    createMutation.mutate({
      data: { fullName: form.fullName, email: form.email, phone: form.phone || undefined, branchId: Number(form.branchId), department: form.department || undefined, photoUrl: photoResult?.url ?? undefined },
    }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); toast({ title: "Member added" }); setShowAdd(false); resetForm(); },
      onError: () => toast({ title: "Error adding member", variant: "destructive" }),
    });
  }

  async function handleUpdate() {
    if (!editMember) return;
    setSaving(true);
    try {
      const photoUrl = editPhotoResult?.url ?? editMember.photoUrl ?? null;
      await axios.patch(`/api/members/${editMember.id}`, { fullName: form.fullName, phone: form.phone || null, department: form.department || null, photoUrl });
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      toast({ title: "Member updated" });
      setEditMember(null); resetForm(); setEditPhotoResult(null);
    } catch { toast({ title: "Error updating member", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this member?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }) });
  }

  async function handleToggleActive(m: Member) {
    try {
      await axios.patch(`/api/members/${m.id}`, { isActive: !m.isActive });
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      toast({ title: m.isActive ? "Member deactivated" : "Member activated" });
    } catch { toast({ title: "Failed to update member status", variant: "destructive" }); }
  }

  function openEdit(r: Member) {
    setEditMember(r);
    setForm({ fullName: r.fullName, email: r.email, phone: r.phone ?? "", branchId: String(r.branchId), department: r.department ?? "" });
    setEditPhotoResult(null);
  }

  const all = members as Member[];
  const roles = Array.from(new Set(all.map(m => m.role)));
  let displayed = all;
  if (filterRole !== "all") displayed = displayed.filter(m => m.role === filterRole);
  if (search.trim()) {
    const q = search.toLowerCase();
    displayed = displayed.filter(m =>
      m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.department ?? "").toLowerCase().includes(q)
    );
  }
  const active = all.filter(m => m.isActive).length;

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Members" description={`${active} active · ${all.length} total`}
        actions={<Button size="sm" onClick={() => { setForm(blankForm); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />Add Member</Button>} />

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, department…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
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
        <div className="glass-card p-12 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(m => (
            <div key={m.id} className={`glass-card p-4 flex gap-3 hover:shadow-md transition-all ${!m.isActive ? "opacity-60" : ""}`}>
              {m.photoUrl ? (
                <img src={m.photoUrl} alt={m.fullName} className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-background shadow" />
              ) : (
                <div className="w-12 h-12 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-lg shrink-0 shadow">
                  {m.fullName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{m.fullName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[m.role] ?? "bg-muted text-muted-foreground"}`}>{m.role}</span>
                  {!m.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Inactive</span>}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0"/>{m.email}</p>
                  {m.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3 shrink-0"/>{m.phone}</p>}
                  {m.department && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Building2 className="h-3 w-3 shrink-0"/>{m.department}</p>}
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <button onClick={() => openEdit(m)} className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition" title="Edit"><Pencil className="h-3.5 w-3.5"/></button>
                  <button onClick={() => handleToggleActive(m)} className="p-1 rounded-md hover:bg-amber-100 text-muted-foreground hover:text-amber-700 transition" title={m.isActive ? "Deactivate" : "Activate"}>
                    {m.isActive ? <UserX className="h-3.5 w-3.5"/> : <UserCheck className="h-3.5 w-3.5"/>}
                  </button>
                  <button onClick={() => setFamilyMember(m)} className="p-1 rounded-md hover:bg-rose-100 text-muted-foreground hover:text-rose-600 transition" title="View family">
                    <Heart className="h-3.5 w-3.5"/>
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" title="Delete"><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Member Dialog ── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <CloudinaryUploader onUpload={r => setPhotoResult(r)} label="Photo (optional)" />
            <div><Label>Full Name *</Label><Input className="mt-1" placeholder="Jane Doe" value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} /></div>
            <div><Label>Email *</Label><Input className="mt-1" type="email" placeholder="jane@example.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
            <div><Label>Phone</Label><Input className="mt-1" placeholder="+256 700 000 000" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} /></div>
            <div><Label>Department</Label><Input className="mt-1" placeholder="e.g. Worship, Youth" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>{createMutation.isPending?"Adding…":"Add Member"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Member Dialog ── */}
      <Dialog open={!!editMember} onOpenChange={v => { if(!v) setEditMember(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <CloudinaryUploader onUpload={r => setEditPhotoResult(r)} label="Change Photo" currentUrl={editMember?.photoUrl ?? undefined} />
            <div><Label>Full Name</Label><Input className="mt-1" value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} /></div>
            <div><Label>Phone</Label><Input className="mt-1" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} /></div>
            <div><Label>Department</Label><Input className="mt-1" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditMember(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving?"Saving…":"Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Family Members Dialog ── */}
      <Dialog open={!!familyMember} onOpenChange={v => { if(!v) setFamilyMember(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500"/>
              {familyMember?.fullName}'s Family
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto">
            {familyLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 rounded-xl bg-muted animate-pulse"/>)}</div>
            ) : familyAdded.length === 0 && familyLinked.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                <p className="text-sm">No family connections found</p>
              </div>
            ) : (
              <>
                {/* Records this member added themselves */}
                {familyAdded.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Added by {familyMember?.fullName}</p>
                    <div className="space-y-2">
                      {familyAdded.map(f => (
                        <FamilyCard key={f.id} f={f} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Records where others listed this member as family */}
                {familyLinked.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Listed as family by others</p>
                    <div className="space-y-2">
                      {familyLinked.map(f => (
                        <FamilyCard key={f.id} f={f} showAddedBy />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFamilyMember(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
