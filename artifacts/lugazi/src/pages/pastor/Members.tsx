import { useState } from "react";
import { cldAvatar } from "@/lib/cloudinary";
import axios from "@/lib/axios";
import { useListMembers, useCreateMember, getListMembersQueryKey, useListMemberSessions, useDeleteSession, getListMemberSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { pastorNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Plus, Pencil, Users, Phone, Mail, Building2, Search, UserCheck, UserX, MonitorSmartphone, LogOut, MapPin, Clock } from "lucide-react";

type Member = {
  id: number; fullName: string; email: string; phone?: string | null;
  role: string; branchId: number; department?: string | null;
  isActive: boolean; photoUrl?: string | null; createdAt: string; qrToken: string;
  userId?: number | null;
};

const blankForm = { fullName: "", email: "", phone: "", branchId: "1", department: "" };

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  pastor:     "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  leadership: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  workforce:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  member:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export default function PastorMembers() {
  const { data: members = [], isLoading } = useListMembers();
  const createMutation = useCreateMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [sessionsMember, setSessionsMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [photoResult, setPhotoResult] = useState<UploadResult | null>(null);
  const [editPhotoResult, setEditPhotoResult] = useState<UploadResult | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const { data: memberSessions = [], isLoading: sessionsLoading } = useListMemberSessions(
    sessionsMember?.id ?? 0,
    { query: { enabled: !!sessionsMember } }
  );
  const deleteSessionMutation = useDeleteSession();

  function handleSignOutSession(sessionId: number) {
    deleteSessionMutation.mutate({ id: sessionId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMemberSessionsQueryKey(sessionsMember?.id ?? 0) });
        toast({ title: "Session signed out" });
      },
      onError: () => toast({ title: "Failed to sign out session", variant: "destructive" }),
    });
  }

  function resetForm() { setForm(blankForm); setPhotoResult(null); }

  function handleAdd() {
    if (!form.fullName || !form.email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    createMutation.mutate({
      data: { fullName: form.fullName, email: form.email, phone: form.phone || undefined, branchId: Number(form.branchId), department: form.department || undefined, photoUrl: photoResult?.url ?? undefined },
    }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); toast({ title: "Member added" }); setShowAdd(false); resetForm(); },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: msg ?? "Error adding member", variant: "destructive" });
      },
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
    <PortalLayout navItems={pastorNavItems} portalLabel="Pastor Portal">
      <PageHeader title="Members" description={`${active} active · ${all.length} total`}
        actions={<Button size="sm" onClick={() => { setForm(blankForm); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />Add Member</Button>} />

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
        <div className="glass-card p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No members found</p>
          <p className="text-sm text-muted-foreground mt-1">{search ? "Try a different search." : "Add your first church member to get started."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(m => (
            <div key={m.id} className={`glass-card p-4 flex gap-3 hover:shadow-md transition-all ${!m.isActive ? "opacity-60" : ""}`}>
              {m.photoUrl ? (
                <img loading="lazy" src={cldAvatar(m.photoUrl)} alt={m.fullName} className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-background shadow" />
              ) : (
                <div className="w-12 h-12 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-base shrink-0 shadow">
                  {m.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{m.fullName}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[m.role] ?? "bg-muted text-muted-foreground"}`}>{m.role}</span>
                      {!m.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleToggleActive(m)} className={`p-1.5 rounded-lg transition-colors ${m.isActive ? "hover:bg-amber-100 text-muted-foreground hover:text-amber-600" : "hover:bg-green-100 text-muted-foreground hover:text-green-600"}`} title={m.isActive ? "Deactivate member" : "Activate member"}>
                      {m.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => setSessionsMember(m)} className="p-1.5 rounded-lg hover:bg-blue-100 text-muted-foreground hover:text-blue-600 transition-colors" title="Active sessions">
                      <MonitorSmartphone className="h-3.5 w-3.5" />
                    </button>
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
      {/* ── Active Sessions Dialog ── */}
      <Dialog open={!!sessionsMember} onOpenChange={v => { if (!v) setSessionsMember(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-blue-500"/>
              {sessionsMember?.fullName}'s Active Sessions
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 max-h-[60vh] overflow-y-auto">
            {sessionsLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse"/>)}</div>
            ) : !sessionsMember?.userId ? (
              <div className="text-center py-8 text-muted-foreground">
                <MonitorSmartphone className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                <p className="text-sm font-medium">No account linked</p>
                <p className="text-xs mt-1">This member doesn't have a login account yet.</p>
              </div>
            ) : memberSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MonitorSmartphone className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                <p className="text-sm">No active sessions</p>
              </div>
            ) : (
              memberSessions.map(s => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                    <MonitorSmartphone className="h-4 w-4 text-blue-600 dark:text-blue-300"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{s.deviceName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0"/>{s.ipAddress}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0"/>Last seen {new Date(s.lastSeenAt).toLocaleString("en-UG", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline"
                    className="h-7 text-[10px] px-2 gap-1 shrink-0 hover:text-red-600 hover:border-red-300"
                    onClick={() => handleSignOutSession(s.id)}
                    disabled={deleteSessionMutation.isPending}>
                    <LogOut className="h-3 w-3"/>Sign out
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionsMember(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
