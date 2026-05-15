import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { leadershipNavItems } from "./navItems";
import { Users, User, Phone, Mail, CheckCircle2, Clock, Star } from "lucide-react";

interface Member {
  id: number;
  fullName: string;
  phone: string | null;
  email: string;
  department: string | null;
  profession: string | null;
  role: string;
  isActive: boolean;
  photoUrl: string | null;
  createdAt: string;
}

const mockTeam: Member[] = [
  { id:1, fullName:"Sis. Grace Nakato", phone:"+256 772 100001", email:"grace@dcllugazi.org", department:"Worship", profession:"Teacher", role:"workforce", isActive:true, photoUrl:null, createdAt: new Date().toISOString() },
  { id:2, fullName:"Bro. James Okello", phone:"+256 772 100002", email:"james@dcllugazi.org", department:"Evangelism", profession:"Businessman", role:"workforce", isActive:true, photoUrl:null, createdAt: new Date().toISOString() },
  { id:3, fullName:"Sis. Mary Namutebi", phone:"+256 772 100003", email:"mary@dcllugazi.org", department:"Children", profession:"Nurse", role:"workforce", isActive:true, photoUrl:null, createdAt: new Date().toISOString() },
  { id:4, fullName:"Bro. Peter Ssempijja", phone:"+256 772 100004", email:"peter@dcllugazi.org", department:"Ushering", profession:"Engineer", role:"member", isActive:true, photoUrl:null, createdAt: new Date().toISOString() },
  { id:5, fullName:"Sis. Hannah Akello", phone:"+256 772 100005", email:"hannah@dcllugazi.org", department:"Media", profession:"Journalist", role:"workforce", isActive:false, photoUrl:null, createdAt: new Date().toISOString() },
];

export default function LeadershipTeams() {
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["my-team-members"],
    queryFn: () => axios.get("/api/members?limit=20").then(r=>r.data).catch(()=>[] as Member[]),
  });

  const team = members.length > 0 ? members : mockTeam;
  const active = team.filter(m=>m.isActive).length;
  const depts = [...new Set(team.map(m=>m.department).filter(Boolean))];

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={leadershipNavItems}>
      <PageHeader title="My Teams" subtitle="Manage and oversee your assigned team members" />

      <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {label:"Team Members",value:team.length,icon:<Users className="h-4 w-4"/>,color:"text-blue-500"},
          {label:"Active",value:active,icon:<CheckCircle2 className="h-4 w-4"/>,color:"text-green-500"},
          {label:"Departments",value:depts.length,icon:<Star className="h-4 w-4"/>,color:"text-yellow-500"},
          {label:"Inactive",value:team.length-active,icon:<Clock className="h-4 w-4"/>,color:"text-red-400"},
        ].map(s=>(
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`${s.color} p-2 rounded-lg bg-current/10`}>{s.icon}</div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </div>
        ))}
      </div>

      {depts.length > 0 && (
        <div className="px-6 pt-4 flex flex-wrap gap-2">
          {depts.map(d=>(
            <span key={d} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{d}</span>
          ))}
        </div>
      )}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? [...Array(6)].map((_,i)=><div key={i} className="glass-card p-5 animate-pulse h-36"/>):
          team.map(m=>(
            <div key={m.id} className={`glass-card p-5 hover:shadow-md transition-shadow ${!m.isActive?"opacity-60":""}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {m.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="font-semibold text-sm">{m.fullName}</p>
                      {m.department && <p className="text-xs text-primary">{m.department}</p>}
                      {m.profession && <p className="text-xs text-muted-foreground">{m.profession}</p>}
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${m.isActive?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                      {m.isActive?"Active":"Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {m.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3"/>{m.phone}</div>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0"/><span className="truncate">{m.email}</span></div>
                  </div>
                  <div className="mt-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${m.role==="workforce"?"bg-indigo-100 text-indigo-700":m.role==="leadership"?"bg-sky-100 text-sky-700":"bg-slate-100 text-slate-600"}`}>{m.role}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

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
