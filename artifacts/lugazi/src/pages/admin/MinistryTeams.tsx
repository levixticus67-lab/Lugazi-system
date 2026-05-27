import { useState } from "react";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { adminNavItems } from "./navItems";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
  import { useToast } from "@/hooks/use-toast";
  import { Plus, Trash2, Users, Crown, UserPlus, UserMinus, ChevronDown, ChevronUp } from "lucide-react";

  interface TeamMember { id: number; userId: number; memberName: string; role: string | null; joinedAt: string; }
  interface Team { id: number; name: string; description: string | null; leaderName: string | null; leaderId: number | null; isActive: boolean; members: TeamMember[]; createdAt: string; }
  interface UserOption { id: number; displayName: string; role: string; }

  export default function AdminMinistryTeams() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
    const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
    const [newTeam, setNewTeam] = useState({ name: "", description: "", leaderId: "", leaderName: "" });
    const [newMember, setNewMember] = useState({ userId: "", memberName: "" });

    const { data: teams = [], isLoading } = useQuery<Team[]>({
      queryKey: ["admin-ministry-teams"],
      queryFn: () => axios.get<Team[]>("/api/ministry-teams").then(r => r.data),
    });

    const { data: users = [] } = useQuery<UserOption[]>({
      queryKey: ["users-all"],
      queryFn: () => axios.get<UserOption[]>("/api/users").then(r => r.data),
    });

    const createTeam = useMutation({
      mutationFn: (d: typeof newTeam) => axios.post("/api/ministry-teams", { ...d, leaderId: d.leaderId ? Number(d.leaderId) : undefined }),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-ministry-teams"]}); toast({title:"Team created"}); setShowCreate(false); setNewTeam({name:"",description:"",leaderId:"",leaderName:""}); },
    });

    const deleteTeam = useMutation({
      mutationFn: (id: number) => axios.delete(`/api/ministry-teams/${id}`),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-ministry-teams"]}); toast({title:"Team deleted"}); },
    });

    const addMember = useMutation({
      mutationFn: ({teamId, data}: {teamId: number; data: typeof newMember}) => axios.post(`/api/ministry-teams/${teamId}/members`, {userId: Number(data.userId), memberName: data.memberName}),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-ministry-teams"]}); toast({title:"Member added"}); setAddMemberTeam(null); setNewMember({userId:"",memberName:""}); },
      onError: (e: any) => toast({title: e?.response?.data?.error || "Failed to add member", variant:"destructive"}),
    });

    const removeMember = useMutation({
      mutationFn: ({teamId, userId}: {teamId: number; userId: number}) => axios.delete(`/api/ministry-teams/${teamId}/members/${userId}`),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-ministry-teams"]}); toast({title:"Member removed"}); },
    });

    function handleLeaderSelect(userId: string) {
      const u = users.find(u => String(u.id) === userId);
      setNewTeam(f => ({...f, leaderId: userId, leaderName: u?.displayName || ""}));
    }

    function handleAddMemberSelect(userId: string) {
      const u = users.find(u => String(u.id) === userId);
      setNewMember(f => ({...f, userId, memberName: u?.displayName || ""}));
    }

    return (
      <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
        <PageHeader title="Ministry Teams" description="Create and manage church ministry teams" actions={
          <Button size="sm" onClick={()=>setShowCreate(true)} className="blue-gradient-bg text-white border-0 hover:opacity-90"><Plus className="h-4 w-4 mr-1"/>New Team</Button>
        } />

        {isLoading ? <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="glass-card p-5 h-28 animate-pulse"/>)}</div>
         : teams.length === 0 ? (
          <div className="glass-card p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3"/><p className="text-muted-foreground">No ministry teams yet. Create the first one!</p></div>
        ) : (
          <div className="space-y-4">
            {teams.map(team => (
              <div key={team.id} className="glass-card overflow-hidden">
                <div className="p-5 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif font-semibold text-base">{team.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${team.isActive?"bg-green-100 text-green-700":"bg-muted text-muted-foreground"}`}>{team.isActive?"Active":"Inactive"}</span>
                    </div>
                    {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
                    {team.leaderName && <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground"><Crown className="h-3.5 w-3.5 text-yellow-500"/>Lead: <span className="text-foreground font-medium">{team.leaderName}</span></div>}
                    <p className="text-xs text-muted-foreground mt-1">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={()=>setAddMemberTeam(team)} className="text-xs h-7 gap-1"><UserPlus className="h-3 w-3"/>Add</Button>
                    <Button size="sm" variant="ghost" onClick={()=>setExpandedTeam(expandedTeam===team.id?null:team.id)} className="h-7 w-7 p-0">
                      {expandedTeam===team.id ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0" onClick={()=>deleteTeam.mutate(team.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                  </div>
                </div>
                {expandedTeam === team.id && team.members.length > 0 && (
                  <div className="border-t border-border px-5 py-3 bg-muted/30">
                    <div className="space-y-2">
                      {team.members.map(m=>(
                        <div key={m.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{m.memberName}</span>
                          <div className="flex items-center gap-2">
                            {m.role && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{m.role}</span>}
                            <Button size="sm" variant="ghost" className="text-destructive h-6 w-6 p-0" onClick={()=>removeMember.mutate({teamId:team.id,userId:m.userId})}><UserMinus className="h-3 w-3"/></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Ministry Team</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Team Name *</Label><Input value={newTeam.name} onChange={e=>setNewTeam(f=>({...f,name:e.target.value}))} className="mt-1" placeholder="e.g. Worship Team"/></div>
              <div><Label>Description</Label><Textarea value={newTeam.description} onChange={e=>setNewTeam(f=>({...f,description:e.target.value}))} className="mt-1" rows={2}/></div>
              <div><Label>Team Leader</Label>
                <Select value={newTeam.leaderId} onValueChange={handleLeaderSelect}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select leader…"/></SelectTrigger>
                  <SelectContent>{users.map(u=><SelectItem key={u.id} value={String(u.id)}>{u.displayName} ({u.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setShowCreate(false)}>Cancel</Button>
              <Button onClick={()=>createTeam.mutate(newTeam)} disabled={!newTeam.name||createTeam.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">Create Team</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!addMemberTeam} onOpenChange={()=>setAddMemberTeam(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Member to {addMemberTeam?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Select Person</Label>
                <Select value={newMember.userId} onValueChange={handleAddMemberSelect}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose person…"/></SelectTrigger>
                  <SelectContent>{users.filter(u=>!addMemberTeam?.members.find(m=>m.userId===u.id)).map(u=><SelectItem key={u.id} value={String(u.id)}>{u.displayName} ({u.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setAddMemberTeam(null)}>Cancel</Button>
              <Button onClick={()=>addMemberTeam && addMember.mutate({teamId:addMemberTeam.id,data:newMember})} disabled={!newMember.userId||addMember.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PortalLayout>
    );
  }
  