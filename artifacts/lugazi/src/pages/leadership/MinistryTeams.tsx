import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Crown, ChevronDown, ChevronUp, UserPlus, UserMinus, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeamMember { id: number; userId: number; memberName: string; role: string | null; joinedAt: string; }
interface Team { id: number; name: string; description: string | null; leaderName: string | null; leaderId: number | null; isActive: boolean; members: TeamMember[]; createdAt: string; }
interface UserOption { id: number; displayName: string; role: string; photoUrl?: string | null; }

export default function LeadershipMinistryTeams() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["leadership-ministry-teams"],
    queryFn: () => axios.get<Team[]>("/api/ministry-teams").then(r => r.data),
    staleTime: 30_000,
  });

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-all-leadership"],
    queryFn: () => axios.get<UserOption[]>("/api/users").then(r => r.data).catch(() => [] as UserOption[]),
    staleTime: 60_000,
  });

  const addMember = useMutation({
    mutationFn: ({ teamId, userId, memberName }: { teamId: number; userId: number; memberName: string }) =>
      axios.post(`/api/ministry-teams/${teamId}/members`, { userId, memberName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leadership-ministry-teams"] }); toast({ title: "Member added to team" }); setAddMemberTeam(null); setSelectedUser(null); setMemberSearch(""); },
    onError: (e: any) => toast({ title: e?.response?.data?.error ?? "Error adding member", variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      axios.delete(`/api/ministry-teams/${teamId}/members/${userId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leadership-ministry-teams"] }); toast({ title: "Member removed" }); },
    onError: () => toast({ title: "Error removing member", variant: "destructive" }),
  });

  const filteredUsers = users
    .filter(u => u.displayName.toLowerCase().includes(memberSearch.toLowerCase()) &&
      !addMemberTeam?.members.some(m => m.userId === u.id))
    .slice(0, 6);

  function isLeaderOf(team: Team) {
    return user && team.leaderId != null && team.leaderId === user.id;
  }

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Ministry Teams" description="Overview of all active ministry teams" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Teams",   value: (teams as Team[]).length,                                    color: "text-blue-600" },
          { label: "Active Teams",  value: (teams as Team[]).filter(t => t.isActive).length,            color: "text-green-600" },
          { label: "Total Members", value: (teams as Team[]).reduce((a, t) => a + t.members.length, 0), color: "text-primary" },
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
        <div className="glass-card p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3"/>
          <p className="text-muted-foreground">No ministry teams have been created yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Contact the admin to set up ministry teams.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(teams as Team[]).map(team => {
            const iAmLeader = isLeaderOf(team);
            return (
              <div key={team.id} className={`glass-card overflow-hidden ${iAmLeader ? "ring-1 ring-primary/30" : ""}`}>
                <div className="p-5 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-serif font-semibold text-base">{team.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${team.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {team.isActive ? "Active" : "Inactive"}
                      </span>
                      {iAmLeader && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 flex items-center gap-1">
                          <Crown className="h-2.5 w-2.5"/>You are the Leader
                        </span>
                      )}
                    </div>
                    {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
                    {team.leaderName && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <Crown className="h-3.5 w-3.5 text-yellow-500"/>
                        <span>Lead: <span className="text-foreground font-medium">{team.leaderName}</span></span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Add member button — only for team leader */}
                    {iAmLeader && (
                      <button onClick={() => { setAddMemberTeam(team); setSelectedUser(null); setMemberSearch(""); }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl blue-gradient-bg text-white font-medium hover:opacity-90 transition-opacity">
                        <UserPlus className="h-3.5 w-3.5"/>Add
                      </button>
                    )}
                    {team.members.length > 0 && (
                      <button onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                        className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        {expandedTeam === team.id ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                      </button>
                    )}
                  </div>
                </div>

                {expandedTeam === team.id && team.members.length > 0 && (
                  <div className="border-t border-border/50 bg-muted/30 divide-y divide-border/30">
                    {team.members.map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                        {(() => { const u = (users as UserOption[]).find(u => u.id === m.userId); return u?.photoUrl ? (
                          <img src={u.photoUrl} alt={m.memberName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {m.memberName.charAt(0)}
                          </div>
                        ); })()}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.memberName}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{m.role ?? "Member"}</p>
                        </div>
                        {/* Remove button — only for team leader */}
                        {iAmLeader && (
                          <button onClick={() => { if(confirm(`Remove ${m.memberName} from the team?`)) removeMember.mutate({ teamId: team.id, userId: m.userId }); }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Remove from team">
                            <UserMinus className="h-3.5 w-3.5"/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add Member to {addMemberTeam.name}</h3>
              <button onClick={() => { setAddMemberTeam(null); setSelectedUser(null); setMemberSearch(""); }}><X className="h-4 w-4"/></button>
            </div>
            {selectedUser ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                {selectedUser.photoUrl ? (
                  <img src={selectedUser.photoUrl} alt={selectedUser.displayName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full blue-gradient-bg flex items-center justify-center text-white text-xs font-bold">{selectedUser.displayName.charAt(0)}</div>
                )}
                <span className="text-sm flex-1 font-medium">{selectedUser.displayName}</span>
                <button onClick={() => { setSelectedUser(null); setMemberSearch(""); }}><X className="h-3.5 w-3.5 text-muted-foreground"/></button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
                  <input className="w-full bg-muted rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Search users by name…"
                    value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                </div>
                {memberSearch && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
                    {filteredUsers.length > 0 ? filteredUsers.map(u => (
                      <button key={u.id} onClick={() => { setSelectedUser(u); setMemberSearch(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition text-left">
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt={u.displayName} className="w-6 h-6 rounded-full object-cover shrink-0" />
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
            <div className="flex gap-3">
              <button onClick={() => { setAddMemberTeam(null); setSelectedUser(null); setMemberSearch(""); }}
                className="flex-1 py-2 rounded-xl text-sm bg-muted hover:bg-muted/80 transition">Cancel</button>
              <button disabled={!selectedUser || addMember.isPending}
                onClick={() => { if(addMemberTeam && selectedUser) addMember.mutate({ teamId: addMemberTeam.id, userId: selectedUser.id, memberName: selectedUser.displayName }); }}
                className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">
                {addMember.isPending ? "Adding…" : "Add to Team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
