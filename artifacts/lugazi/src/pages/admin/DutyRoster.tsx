import { useState } from "react";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { adminNavItems } from "./navItems";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
  import { Textarea } from "@/components/ui/textarea";
  import { useToast } from "@/hooks/use-toast";
  import { Plus, Trash2, Calendar, User } from "lucide-react";

  interface DutyEntry { id: number; assignedToName: string; serviceDate: string; serviceType: string; dutyRole: string; location: string | null; notes: string | null; createdAt: string; }
  interface UserOption { id: number; displayName: string; role: string; }
  const SERVICE_TYPES = ["Sunday Service","Mid-Week Service","Prayer Night","Youth Service","Special Event","Other"];
  const DUTY_ROLES = ["Worship Team","Usher","Sound/Media","Greeter","Children Ministry","Security","Intercession","Other"];

  export default function AdminDutyRoster() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ assignedToUserId: "", assignedToName: "", serviceDate: "", serviceType: "Sunday Service", dutyRole: "Usher", location: "", notes: "" });

    const { data: duties = [], isLoading } = useQuery<DutyEntry[]>({
      queryKey: ["admin-duty-roster"],
      queryFn: () => axios.get<DutyEntry[]>("/api/duty-roster").then(r => r.data),
    });

    const { data: users = [] } = useQuery<UserOption[]>({
      queryKey: ["users-workforce"],
      queryFn: () => axios.get<UserOption[]>("/api/users").then(r => r.data.filter(u => ["workforce","leadership"].includes(u.role))),
    });

    const createMut = useMutation({
      mutationFn: (d: typeof form) => axios.post("/api/duty-roster", {...d, assignedToUserId: d.assignedToUserId ? Number(d.assignedToUserId) : undefined}),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-duty-roster"]}); toast({title:"Duty assigned"}); setShowCreate(false); setForm({assignedToUserId:"",assignedToName:"",serviceDate:"",serviceType:"Sunday Service",dutyRole:"Usher",location:"",notes:""}); },
    });

    const deleteMut = useMutation({
      mutationFn: (id: number) => axios.delete(`/api/duty-roster/${id}`),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-duty-roster"]}); toast({title:"Entry removed"}); },
    });

    function handleUserSelect(uid: string) {
      const u = users.find(u => String(u.id) === uid);
      setForm(f => ({...f, assignedToUserId: uid, assignedToName: u?.displayName || ""}));
    }

    const upcoming = duties.filter(d => new Date(d.serviceDate) >= new Date(new Date().toDateString()));
    const past = duties.filter(d => new Date(d.serviceDate) < new Date(new Date().toDateString()));

    return (
      <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
        <PageHeader title="Duty Roster" description="Schedule and manage service duty assignments" actions={
          <Button size="sm" onClick={()=>setShowCreate(true)} className="blue-gradient-bg text-white border-0 hover:opacity-90"><Plus className="h-4 w-4 mr-1"/>Schedule Duty</Button>
        } />

        {isLoading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="glass-card p-4 h-16 animate-pulse"/>)}</div>
         : duties.length === 0 ? (
          <div className="glass-card p-12 text-center"><Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3"/><p className="text-muted-foreground">No duties scheduled yet.</p></div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="font-serif text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming ({upcoming.length})</h2>
                <div className="space-y-2">
                  {upcoming.map(d=>(
                    <div key={d.id} className="glass-card p-4 flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div><p className="text-xs text-muted-foreground">Person</p><p className="font-medium flex items-center gap-1"><User className="h-3 w-3"/>{d.assignedToName}</p></div>
                        <div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium">{d.dutyRole}</p></div>
                        <div><p className="text-xs text-muted-foreground">Service</p><p className="font-medium">{d.serviceType}</p></div>
                        <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{new Date(d.serviceDate).toLocaleDateString()}</p></div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0 shrink-0" onClick={()=>deleteMut.mutate(d.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div className="opacity-60">
                <h2 className="font-serif text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past ({past.length})</h2>
                <div className="space-y-2">
                  {past.slice(0, 10).map(d=>(
                    <div key={d.id} className="glass-card p-3 flex items-center gap-3 text-sm">
                      <span className="font-medium flex-1">{d.assignedToName}</span>
                      <span className="text-muted-foreground">{d.dutyRole}</span>
                      <span className="text-muted-foreground">{d.serviceType}</span>
                      <span className="text-muted-foreground">{new Date(d.serviceDate).toLocaleDateString()}</span>
                      <Button size="sm" variant="ghost" className="text-destructive h-6 w-6 p-0" onClick={()=>deleteMut.mutate(d.id)}><Trash2 className="h-3 w-3"/></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Duty Assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Assign To *</Label>
                <Select value={form.assignedToUserId} onValueChange={handleUserSelect}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select person…"/></SelectTrigger>
                  <SelectContent>{users.map(u=><SelectItem key={u.id} value={String(u.id)}>{u.displayName} ({u.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Service Date *</Label><Input type="date" value={form.serviceDate} onChange={e=>setForm(f=>({...f,serviceDate:e.target.value}))} className="mt-1"/></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} className="mt-1" placeholder="Main Hall"/></div>
              </div>
              <div><Label>Service Type *</Label>
                <Select value={form.serviceType} onValueChange={v=>setForm(f=>({...f,serviceType:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Duty Role *</Label>
                <Select value={form.dutyRole} onValueChange={v=>setForm(f=>({...f,dutyRole:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>{DUTY_ROLES.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="mt-1" rows={2}/></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setShowCreate(false)}>Cancel</Button>
              <Button onClick={()=>createMut.mutate(form)} disabled={!form.assignedToName||!form.serviceDate||createMut.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PortalLayout>
    );
  }
  