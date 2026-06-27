import { useState } from "react";
import { useListUsers, useUpdateUserRole, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, Search, Mail, Calendar, KeyRound, Copy, Check } from "lucide-react";
import axios from "@/lib/axios";

type User = { id: number; email: string; displayName: string; role: string; isActive: boolean; createdAt: string };

const ROLE_CONFIG: Record<string, { color: string; bg: string }> = {
  admin:      { color: "text-red-700 dark:text-red-300",     bg: "bg-red-100 dark:bg-red-950" },
  pastor:     { color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-100 dark:bg-purple-950" },
  leadership: { color: "text-blue-700 dark:text-blue-300",   bg: "bg-blue-100 dark:bg-blue-950" },
  workforce:  { color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-950" },
  member:     { color: "text-green-700 dark:text-green-300", bg: "bg-green-100 dark:bg-green-950" },
};
const ROLES = ["admin","pastor","leadership","workforce","member"] as const;

export default function AdminUsers() {
  const { data: users = [], isLoading } = useListUsers();
  const updateRoleMutation = useUpdateUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editUser, setEditUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Reset password state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleRoleChange() {
    if (!editUser) return;
    updateRoleMutation.mutate({ id: editUser.id, data: { role: newRole } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Role updated. User must re-login to see the change." });
        setEditUser(null);
      },
      onError: () => toast({ title: "Error updating role", variant: "destructive" }),
    });
  }

  async function handleResetPassword() {
    if (!resetUser) return;
    setResetPending(true);
    try {
      const res = await axios.post<{ tempPassword: string }>(`/api/users/${resetUser.id}/reset-password`);
      setTempPassword(res.data.tempPassword);
    } catch {
      toast({ title: "Failed to reset password", variant: "destructive" });
      setResetUser(null);
    } finally {
      setResetPending(false);
    }
  }

  function handleCopy() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function closeResetDialog() {
    setResetUser(null);
    setTempPassword(null);
    setCopied(false);
  }

  const all = users as User[];
  let displayed = filterRole === "all" ? all : all.filter(u => u.role === filterRole);
  if (search.trim()) {
    const q = search.toLowerCase();
    displayed = displayed.filter(u => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  const roleCounts = ROLES.reduce((acc, r) => ({ ...acc, [r]: all.filter(u => u.role === r).length }), {} as Record<string, number>);

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Users & Roles" description={`${all.length} total · ${all.filter(u=>u.isActive).length} active`} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label:"Total Users", value: all.length,                                      color:"text-blue-600" },
          { label:"Active",      value: all.filter(u=>u.isActive).length,                color:"text-green-600" },
          { label:"Admins",      value: roleCounts.admin ?? 0,                           color:"text-red-600" },
          { label:"Pastors",     value: roleCounts.pastor ?? 0,                          color:"text-purple-600" },
          { label:"Leadership",  value: roleCounts.leadership ?? 0,                      color:"text-blue-600" },
          { label:"Members",     value: (roleCounts.workforce??0)+(roleCounts.member??0), color:"text-green-600" },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button onClick={() => setFilterRole("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterRole==="all" ? "blue-gradient-bg text-white shadow" : "bg-muted text-muted-foreground"}`}>
          All ({all.length})
        </button>
        {ROLES.map(r => {
          const cfg = ROLE_CONFIG[r];
          return (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${filterRole===r ? `${cfg.bg} ${cfg.color} ring-1 ring-current/30 shadow` : "bg-muted text-muted-foreground"}`}>
              {r} ({roleCounts[r] ?? 0})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[...Array(6)].map((_,i)=><div key={i} className="glass-card h-24 animate-pulse"/>)}</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3"/><p className="text-muted-foreground font-medium">No users found</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(u => {
            const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.member;
            return (
              <div key={u.id} className={`glass-card p-4 flex gap-3 ${!u.isActive ? "opacity-60" : ""}`}>
                <div className="w-11 h-11 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-base shrink-0 shadow">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="font-semibold text-sm truncate">{u.displayName}</p>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${cfg.bg} ${cfg.color}`}>{u.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mb-0.5">
                    <Mail className="h-3 w-3 shrink-0"/>{u.email}
                  </p>
                  <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3"/>
                      {new Date(u.createdAt).toLocaleDateString("en-UG",{day:"numeric",month:"short",year:"numeric"})}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => { setResetUser(u); setTempPassword(null); }}>
                        <KeyRound className="h-3 w-3"/>Reset
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => { setEditUser(u); setNewRole(u.role); }}>
                        <Shield className="h-3 w-3"/>Role
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Change Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Role — {editUser?.displayName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="p-3 rounded-xl bg-muted/60 text-sm">
              <p className="font-medium">{editUser?.displayName}</p>
              <p className="text-xs text-muted-foreground">{editUser?.email}</p>
            </div>
            <div><Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">The user must re-login for the role change to take effect.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={closeResetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500"/>
              Reset Password
            </DialogTitle>
          </DialogHeader>

          {!tempPassword ? (
            <>
              <div className="space-y-3 py-1">
                <div className="p-3 rounded-xl bg-muted/60 text-sm">
                  <p className="font-medium">{resetUser?.displayName}</p>
                  <p className="text-xs text-muted-foreground">{resetUser?.email}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will generate a temporary password for this user. Share it with them via WhatsApp or phone — they can log in and change it from their profile.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeResetDialog}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                  {resetPending ? "Generating…" : "Generate Password"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-1">
                <p className="text-sm text-muted-foreground">
                  Temporary password for <span className="font-semibold text-foreground">{resetUser?.displayName}</span>:
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg font-bold tracking-widest text-center select-all">
                    {tempPassword}
                  </div>
                  <Button size="icon" variant="outline" className="shrink-0 h-11 w-11" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-600"/> : <Copy className="h-4 w-4"/>}
                  </Button>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg">
                  Share this password with the user securely. It will not be shown again.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeResetDialog} className="w-full">Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
