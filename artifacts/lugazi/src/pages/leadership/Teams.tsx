import { useQuery } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import LiveChat from "@/components/LiveChat";
  import AIAssistant from "@/components/AIAssistant";
  import { leadershipNavItems } from "./navItems";
  import { Users, Phone, Mail, CheckCircle2, Clock, Star } from "lucide-react";

  interface Member {
    id: number; fullName: string; phone: string | null; email: string;
    department: string | null; profession: string | null; role: string;
    isActive: boolean; photoUrl: string | null; createdAt: string;
  }

  export default function LeadershipTeams() {
    const { data: members = [], isLoading } = useQuery<Member[]>({
      queryKey: ["leadership-team-members"],
      queryFn: () => axios.get<Member[]>("/api/members?limit=100").then(r => {
        const data = r.data as Member[];
        return data.filter(m => m.role === "workforce" || m.role === "leadership");
      }),
      staleTime: 60_000,
    });

    const active = members.filter(m => m.isActive).length;
    const depts = [...new Set(members.map(m => m.department).filter(Boolean))] as string[];

    return (
      <PortalLayout title="DCL Lugazi ERP" navItems={leadershipNavItems} portalLabel="Leadership Portal">
        <PageHeader title="My Teams" subtitle="Workforce and leadership members under your oversight" />

        <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Team Members", value: members.length, icon: <Users className="h-4 w-4" />, color: "text-blue-500" },
            { label: "Active", value: active, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-500" },
            { label: "Departments", value: depts.length, icon: <Star className="h-4 w-4" />, color: "text-yellow-500" },
            { label: "Inactive", value: members.length - active, icon: <Clock className="h-4 w-4" />, color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
              <div className={`${s.color} p-2 rounded-lg bg-current/10`}>{s.icon}</div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          ))}
        </div>

        {depts.length > 0 && (
          <div className="px-6 pt-4 flex flex-wrap gap-2">
            {depts.map(d => (
              <span key={d} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{d}</span>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass-card p-5 animate-pulse h-36" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="p-6"><div className="glass-card p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">No workforce or leadership members found.</p></div></div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {members.map(m => (
              <div key={m.id} className={`glass-card p-5 hover:shadow-md transition-shadow ${!m.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.fullName} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {m.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="font-semibold text-sm">{m.fullName}</p>
                        {m.department && <p className="text-xs text-primary">{m.department}</p>}
                        {m.profession && <p className="text-xs text-muted-foreground">{m.profession}</p>}
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${m.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {m.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{m.phone}</div>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{m.email}</span></div>
                    </div>
                    <div className="mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${m.role === "workforce" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700"}`}>{m.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AIAssistant context="leadership team management and member development" suggestions={[
          "How can I better support my team members spiritually and professionally?",
          "Which team members may need additional coaching or mentorship?",
          "Suggest team-building activities appropriate for a church workforce",
          "How should I handle an inactive or disengaged team member?",
        ]} />
        <LiveChat />
      </PortalLayout>
    );
  }
  