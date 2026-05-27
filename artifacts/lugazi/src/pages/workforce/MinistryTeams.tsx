import { useQuery } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { workforceNavItems } from "./navItems";
  import { Users, Crown, User } from "lucide-react";

  interface TeamMember { id: number; userId: number; memberName: string; role: string | null; joinedAt: string; }
  interface MyTeam { id: number; name: string; description: string | null; leaderName: string | null; isActive: boolean; myRole: string; members: TeamMember[]; createdAt: string; }

  export default function WorkforceMinistryTeams() {
    const { data: teams = [], isLoading } = useQuery<MyTeam[]>({
      queryKey: ["my-ministry-teams"],
      queryFn: () => axios.get<MyTeam[]>("/api/ministry-teams/mine").then(r => r.data),
      refetchInterval: 60_000,
    });

    return (
      <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
        <PageHeader title="My Ministry Teams" description="The ministry teams you are part of" />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(2)].map((_,i)=><div key={i} className="glass-card p-5 h-48 animate-pulse"/>)}</div>
        ) : teams.length === 0 ? (
          <div className="glass-card p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground font-medium">You are not assigned to any ministry team yet.</p><p className="text-sm text-muted-foreground mt-1">Contact your leadership to be assigned to a team.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(team => (
              <div key={team.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-serif font-semibold text-base">{team.name}</h3>
                    {team.description && <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">{team.myRole}</span>
                </div>
                {team.leaderName && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Crown className="h-3.5 w-3.5 text-yellow-500"/>
                    <span>Team Lead: <span className="text-foreground font-medium">{team.leaderName}</span></span>
                  </div>
                )}
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{team.members.length} team members</p>
                  <div className="flex flex-wrap gap-2">
                    {team.members.slice(0, 8).map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-1 rounded-full">
                        <User className="h-3 w-3 text-muted-foreground"/>
                        <span className="truncate max-w-[100px]">{m.memberName}</span>
                      </div>
                    ))}
                    {team.members.length > 8 && <span className="text-xs text-muted-foreground px-2 py-1">+{team.members.length - 8} more</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalLayout>
    );
  }
  