import { useState } from "react";
import { cldAvatar } from "@/lib/cloudinary";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Crown, UserPlus, UserMinus, ChevronDown, ChevronUp, Pencil, Search, X, Power } from "lucide-react";

interface TeamMember { id: number; userId: number; memberName: string; role: string | null; joinedAt: string; }
interface Team { id: number; name: string; description: string | null; leaderName: string | null; leaderId: number | null; isActive: boolean; members: TeamMember[]; createdAt: string; }
interface UserOption { id: number; displayName: string; role: string; photoUrl?: string | null; }

export default function AdminMinistryTeams() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [editLeaderTeam, setEditLeaderTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({ name: "", description: "", leaderId: "", leaderName: "" });
  const [newMember, setNewMember] = useState({ userId: "", memberName: "" });
  const [leaderSearch, setLeaderSearch] = useState("");
  const [selectedNewLeader, setSelectedNewLeader] = useState<UserOption | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

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

  const updateLeader = useMutation({
    mutationFn: ({ id, leaderId, leaderName }: { id: number; leaderId: number; leaderName: string }) =>
      axios.patch(`/api/ministry-teams/${id}`, { leaderId, leaderName }),
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-ministry-teams"]}); toast({title:"Team leader updated"}); setEditLeaderTeam(null); setSelectedNewLeader(null); setLeaderSearch(""); },
  });

  const addMember = useMutation({
    mutationFn: ({teamId, data}: {teamId: number; data: typeof newMember}) => axios.post(`/api/ministry-teams/${teamId}/members`, {userId: Number(data.userId), memberName: data.memberName}),
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-ministry-teams"]}); toast({title:"Member added"}); setNewMember({userId:"",memberName:""}); setMemberSearch(""); },
  });

  const removeMember = useMutation({
    mutationFn: ({teamId, userId}: {teamId: number; userId: number}) => axios.delete(`/api/ministry-teams/${teamId}/members/${userId}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-ministry-teams"]}); toast({title:"Member removed"}); },
  });

  const toggleTeamActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      axios.patch(`/api/ministry-teams/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministry-teams"] }),
  });

  const filteredLeaders = users.filter(u => u.displayName.toLowerCase().includes(leaderSearch.toLowerCase())).slice(0, 8);
  const filteredUsersForAdd = users.filter(u =>
    u.displayName.toLowerCase().includes(memberSearch.toLowerCase()) &&
    !addMemberTeam?.members.some(m => m.userId === u.id)
  ).slice(0, 6);

  const totalMembers = (teams as Team[]).reduce((s, t) => s + t.members.length, 0);

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Ministry Teams" description={`${(teams as Team[]).length} teams · ${totalMembers} total members`}
        actions={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />New Team</Button>} />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {[
          {label:"Total Teams", value:(teams as Team[]).length, color:"text-blue-600"},
          {label:"Active Teams", value:(teams as Team[]).filter(t=>t.isActive).length, color:"text-green-600"},
          {label:"Total Members", value:totalMembers, color:"text-primary"},
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="glass-card p-5 h-28 animate-pulse" />)}</div>
      ) : (teams as Team[]).length === 0 ? (
        <div className="glass-card p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">No ministry teams yet. Create your first team.</p></div>
      ) : (
        <div className="space-y-4">
          {(teams as Team[]).map(team => (
            <div key={team.id} className="glass-card overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-serif font-semibold text-base">{team.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${team.isActive?"bg-green-100 text-green-700":"bg-muted text-muted-foreground"}`}>{team.isActive?"Active":"Inactive"}</span>
                    </div>
                    {team.description && <p className="text-sm text-muted-foreground mb-1">{team.description}</p>}
                    {/* Leader row */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Crown className="h-3.5 w-3.5 text-yellow-500"/>
                        <span>{team.leaderName ?? <span className="italic">No leader assigned</span>}</span>
                      </div>
                      <button
                        onClick={() => { setEditLeaderTeam(team); setSelectedNewLeader(null); setLeaderSearch(""); }}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors font-medium">
                        <Pencil className="h-2.5 w-2.5" />Edit Leader
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{team.members.length} member{team.members.length!==1?"s":""}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setAddMemberTeam(team)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Add member">
                      <UserPlus className="h-4 w-4"/>
                    </button>
                    <button
                      onClick={() => toggleTeamActive.mutate({ id: team.id, isActive: !team.isActive })}
                      className={`p-2 rounded-xl transition-colors ${team.isActive ? "hover:bg-amber-100 dark:hover:bg-amber-950 text-muted-foreground hover:text-amber-600" : "hover:bg-green-100 dark:hover:bg-green-950 text-muted-foreground hover:text-green-600"}`}
                      title={team.isActive ? "Deactivate team" : "Activate team"}>
                      <Power className="h-4 w-4"/>
                    </button>
                    <button onClick={() => { if(confirm(`Delete "${team.name}"?`)) deleteTeam.mutate(team.id); }} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete team">
                      <Trash2 className="h-4 w-4"/>
                    </button>
                    {team.members.length > 0 && (
                      <button onClick={() => setExpandedTeam(expandedTeam===team.id?null:team.id)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        {expandedTeam===team.id ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded members */}
              {expandedTeam===team.id && team.members.length > 0 && (
                <div className="border-t border-border/50 bg-muted/30 divide-y divide-border/30">
                  {team.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      {(() => { const u = (users as UserOption[]).find(u => u.id === m.userId); return u?.photoUrl ? (
                        <img loading="lazy" src={cldAvatar(u.photoUrl)} alt={m.memberName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {m.memberName.charAt(0)}
                        </div>
                      ); })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.memberName}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{m.role ?? "Member"}</p>
                      </div>
                      <button onClick={() => { if(confirm(`Remove ${m.memberName}?`)) removeMember.mutate({teamId:team.id,userId:m.userId}); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <UserMinus className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Leader Dialog */}
      <Dialog open={!!editLeaderTeam} onOpenChange={v => { if(!v) { setEditLeaderTeam(null); setSelectedNewLeader(null); setLeaderSearch(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Team Leader</DialogTitle></DialogHeader>
          {editLeaderTeam && (
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground">Team: <span className="font-medium text-foreground">{editLeaderTeam.name}</span></p>
              {editLeaderTeam.leaderName && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/60 text-sm">
                  <Crown className="h-3.5 w-3.5 text-yellow-500"/>
                  <span className="text-muted-foreground">Current: </span>
                  <span className="font-medium">{editLeaderTeam.leaderName}</span>
                </div>
              )}
              {selectedNewLeader ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                  {selectedNewLeader.photoUrl ? (
                    <img loading="lazy" src={cldAvatar(selectedNewLeader.photoUrl)} alt={selectedNewLeader.displayName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full blue-gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">{selectedNewLeader.displayName.charAt(0)}</div>
                  )}
                  <span className="text-sm flex-1 font-medium">{selectedNewLeader.displayName}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{selectedNewLeader.role}</span>
                  <button onClick={() => { setSelectedNewLeader(null); setLeaderSearch(""); }}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-8 h-9 text-sm" placeholder="Search users to assign leader…" value={leaderSearch} onChange={e => setLeaderSearch(e.target.value)} />
                  </div>
                  {leaderSearch && (
                    <div className="mt-1 max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
                      {filteredLeaders.length > 0 ? filteredLeaders.map(u => (
                        <button key={u.id} onClick={() => { setSelectedNewLeader(u); setLeaderSearch(""); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition text-left">
                          {u.photoUrl ? (
                            <img loading="lazy" src={cldAvatar(u.photoUrl)} alt={u.displayName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[10px] font-bold shrink-0">{u.displayName.charAt(0)}</div>
                          )}
                          <span className="text-sm flex-1">{u.displayName}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">{u.role}</span>
                        </button>
                      )) : <p className="text-xs text-muted-foreground text-center py-3">No users found</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditLeaderTeam(null); setSelectedNewLeader(null); setLeaderSearch(""); }}>Cancel</Button>
            <Button disabled={!selectedNewLeader||updateLeader.isPending}
              onClick={() => { if(editLeaderTeam&&selectedNewLeader) updateLeader.mutate({id:editLeaderTeam.id,leaderId:selectedNewLeader.id,leaderName:selectedNewLeader.displayName}); }}>
              {updateLeader.isPending?"Saving…":"Update Leader"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={!!addMemberTeam} onOpenChange={v => { if(!v) { setAddMemberTeam(null); setNewMember({userId:"",memberName:""}); setMemberSearch(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Member to {addMemberTeam?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-9 text-sm" placeholder="Search users…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
            </div>
            {memberSearch && filteredUsersForAdd.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
                {filteredUsersForAdd.map(u => (
                  <button key={u.id} onClick={() => setNewMember({userId:String(u.id),memberName:u.displayName})}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition text-left ${newMember.userId===String(u.id)?"bg-primary/5":""}`}>
                    {u.photoUrl ? (
                      <img loading="lazy" src={cldAvatar(u.photoUrl)} alt={u.displayName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[10px] font-bold shrink-0">{u.displayName.charAt(0)}</div>
                    )}
                    <span className="text-sm flex-1">{u.displayName}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{u.role}</span>
                  </button>
                ))}
              </div>
            )}
            {newMember.userId && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                {(users as UserOption[]).find(u => String(u.id) === newMember.userId)?.photoUrl ? (
                  <img loading="lazy" src={cldAvatar((users as UserOption[]).find(u => String(u.id) === newMember.userId)!.photoUrl!)} alt={newMember.memberName} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[10px] font-bold">{newMember.memberName.charAt(0)}</div>
                )}
                <span className="font-medium">{newMember.memberName}</span>
                <button onClick={() => setNewMember({userId:"",memberName:""})} className="ml-auto"><X className="h-3.5 w-3.5 text-muted-foreground"/></button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddMemberTeam(null); setNewMember({userId:"",memberName:""}); setMemberSearch(""); }}>Cancel</Button>
            <Button disabled={!newMember.userId||addMember.isPending}
              onClick={() => { if(addMemberTeam) addMember.mutate({teamId:addMemberTeam.id,data:newMember}); }}>
              {addMember.isPending?"Adding…":"Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Ministry Team</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Team Name *</Label><Input className="mt-1" placeholder="e.g. Worship Team" value={newTeam.name} onChange={e=>setNewTeam(p=>({...p,name:e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea className="mt-1 resize-none" rows={2} placeholder="What does this team do?" value={newTeam.description} onChange={e=>setNewTeam(p=>({...p,description:e.target.value}))} /></div>
            <div><Label>Leader Name</Label><Input className="mt-1" placeholder="Leader's name" value={newTeam.leaderName} onChange={e=>setNewTeam(p=>({...p,leaderName:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowCreate(false)}>Cancel</Button>
            <Button disabled={!newTeam.name||createTeam.isPending} onClick={()=>createTeam.mutate(newTeam)}>{createTeam.isPending?"Creating…":"Create Team"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
