import { useQuery } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { leadershipNavItems } from "./navItems";
  import { Users, Crown, User, ChevronDown, ChevronUp } from "lucide-react";
  import { useState } from "react";

  interface TeamMember { id: number; userId: number; memberName: string; role: string | null; joinedAt: string; }
  interface Team { id: number; name: string; description: string | null; leaderName: string | null; isActive: boolean; members: TeamMember[]; createdAt: string; }

  export default function LeadershipMinistryTeams() {
    const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

    const { data: teams = [], isLoading } = useQuery<Team[]>({
      queryKey: ["leadership-ministry-teams"],
      queryFn: () => axios.get<Team[]>("/api/ministry-teams").then(r => r.data),
      staleTime: 60_000,
    });

    return (
      <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
        <PageHeader title="Ministry Teams" description="Overview of all active ministry teams" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[
            {label:"Total Teams",value:teams.length,color:"text-blue-600"},
            {label:"Active Teams",value:teams.filter(t=>t.isActive).length,color:"text-green-600"},
            {label:"Total Members",value:teams.reduce((a,t)=>a+t.members.length,0),color:"text-primary"},
          ].map(s=>(
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="glass-card p-5 h-28 animate-pulse"/>)}</div>
        ) : teams.length === 0 ? (
          <div className="glass-card p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3"/><p className="text-muted-foreground">No ministry teams have been created yet.</p><p className="text-sm text-muted-foreground mt-1">Contact the admin to set up ministry teams.</p></div>
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
                    {team.leaderName && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <Crown className="h-3.5 w-3.5 text-yellow-500"/>
                        <span>Lead: <span className="text-foreground font-medium">{team.leaderName}</span></span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{team.members.length} member{team.members.length!==1?"s":""}</p>
                  </div>
                  {team.members.length > 0 && (
                    <button onClick={()=>setExpandedTeam(expandedTeam===team.id?null:team.id)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                      {expandedTeam===team.id ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                    </button>
                  )}
                </div>
                {expandedTeam === team.id && (
                  <div className="border-t border-border px-5 py-3 bg-muted/30">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {team.members.map(m=>(
                        <div key={m.id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-3 w-3 text-primary"/></div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-xs">{m.memberName}</p>
                            {m.role && <p className="text-[10px] text-muted-foreground">{m.role}</p>}
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
      </PortalLayout>
    );
  }
  