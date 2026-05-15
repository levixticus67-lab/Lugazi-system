import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { leadershipNavItems } from "./navItems";
import { CheckCircle2, XCircle, Clock, Heart, FolderOpen, AlertCircle, Eye } from "lucide-react";

interface WelfareRequest {
  id: number;
  memberName: string;
  category: string;
  description: string;
  amount: number | null;
  status: string;
  createdAt: string;
}

const mockRequests: WelfareRequest[] = [
  { id:1, memberName:"Sis. Sarah Namusoke", category:"Medical", description:"Hospital bills for emergency surgery. Requesting financial support for UGX 800,000 shortfall.", amount:800000, status:"pending", createdAt: new Date(Date.now()-86400000).toISOString() },
  { id:2, memberName:"Bro. David Ssemakula", category:"Education", description:"School fees for 3 children for next term. The family lost their main income source.", amount:450000, status:"pending", createdAt: new Date(Date.now()-172800000).toISOString() },
  { id:3, memberName:"Sis. Rose Nakku", category:"Food", description:"Family of 5 in need of basic food provisions for the month.", amount:null, status:"pending", createdAt: new Date(Date.now()-259200000).toISOString() },
  { id:4, memberName:"Bro. Moses Sserunjogi", category:"Housing", description:"Roof repair needed before rainy season. House is leaking badly.", amount:300000, status:"approved", createdAt: new Date(Date.now()-432000000).toISOString() },
  { id:5, memberName:"Sis. Prossy Nakirya", category:"Medical", description:"Diabetes medication for 3 months.", amount:150000, status:"declined", createdAt: new Date(Date.now()-604800000).toISOString() },
];

const statusConfig: Record<string,{color:string;icon:any;bg:string}> = {
  pending: { color:"text-yellow-600", icon:<Clock className="h-3.5 w-3.5"/>, bg:"bg-yellow-100" },
  approved: { color:"text-green-600", icon:<CheckCircle2 className="h-3.5 w-3.5"/>, bg:"bg-green-100" },
  declined: { color:"text-red-500", icon:<XCircle className="h-3.5 w-3.5"/>, bg:"bg-red-100" },
};

const catColors: Record<string,string> = {
  Medical:"bg-rose-100 text-rose-700", Education:"bg-blue-100 text-blue-700", Food:"bg-green-100 text-green-700", Housing:"bg-yellow-100 text-yellow-700",
};

function fmt(n:number) { return n>=1000000?`UGX ${(n/1000000).toFixed(1)}M`:n>=1000?`UGX ${(n/1000).toFixed(0)}K`:`UGX ${n}`; }

export default function LeadershipApprovals() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending"|"all">("pending");
  const [selected, setSelected] = useState<WelfareRequest|null>(null);

  const { data: requests = [], isLoading } = useQuery<WelfareRequest[]>({
    queryKey: ["welfare-all"],
    queryFn: () => axios.get("/api/welfare").then(r=>r.data).catch(()=>[] as WelfareRequest[]),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id:number; status:string }) => axios.patch(`/api/welfare/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["welfare-all"] }); setSelected(null); },
  });

  const display = requests.length > 0 ? requests : mockRequests;
  const pending = display.filter(r=>r.status==="pending");
  const shown = tab === "pending" ? pending : display;

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={leadershipNavItems}>
      <PageHeader title="Approval System" subtitle="Review and act on welfare and support requests" />

      <div className="px-6 pt-4 grid grid-cols-3 gap-4">
        {[
          {label:"Pending",value:pending.length,color:"text-yellow-500",icon:<Clock className="h-4 w-4"/>},
          {label:"Approved",value:display.filter(r=>r.status==="approved").length,color:"text-green-500",icon:<CheckCircle2 className="h-4 w-4"/>},
          {label:"Declined",value:display.filter(r=>r.status==="declined").length,color:"text-red-400",icon:<XCircle className="h-4 w-4"/>},
        ].map(s=>(
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`${s.color} p-2 rounded-lg bg-current/10`}>{s.icon}</div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div>
          </div>
        ))}
      </div>

      <div className="px-6 pt-4 flex gap-2">
        {(["pending","all"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab===t?"blue-gradient-bg text-white":"bg-muted hover:bg-muted/80"}`}>
            {t==="pending"?`Pending (${pending.length})`:"All Requests"}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="px-6 pb-6 mt-4">
          <button onClick={()=>setSelected(null)} className="text-sm text-primary mb-4 flex items-center gap-1 hover:underline">← Back</button>
          <div className="glass-card p-6 max-w-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base">{selected.memberName}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColors[selected.category]??""}`}>{selected.category}</span>
              </div>
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${statusConfig[selected.status]?.bg} ${statusConfig[selected.status]?.color}`}>
                {statusConfig[selected.status]?.icon}{selected.status}
              </span>
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm">{selected.description}</div>
            {selected.amount && <div className="text-sm font-semibold">Amount Requested: {fmt(selected.amount)}</div>}
            <p className="text-xs text-muted-foreground">Submitted {new Date(selected.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p>
            {selected.status==="pending" && (
              <div className="flex gap-3 pt-2">
                <button onClick={()=>update.mutate({id:selected.id,status:"declined"})} className="flex-1 py-2.5 rounded-xl text-sm bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition flex items-center justify-center gap-2"><XCircle className="h-4 w-4"/>Decline</button>
                <button onClick={()=>update.mutate({id:selected.id,status:"approved"})} className="flex-1 py-2.5 rounded-xl text-sm bg-green-100 text-green-700 font-semibold hover:bg-green-200 transition flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4"/>Approve</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-3">
          {isLoading ? [...Array(3)].map((_,i)=><div key={i} className="glass-card p-4 animate-pulse h-24"/>) :
            shown.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500"/>
                <p className="font-medium">All caught up! No pending approvals.</p>
              </div>
            ) :
            shown.map(req=>(
              <div key={req.id} className="glass-card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={()=>setSelected(req)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0"><Heart className="h-4 w-4 text-rose-500"/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{req.memberName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${catColors[req.category]??""}`}>{req.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {req.amount && <span className="font-semibold text-foreground">{fmt(req.amount)}</span>}
                        <span>{new Date(req.createdAt).toLocaleDateString("en-GB")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[req.status]?.bg} ${statusConfig[req.status]?.color}`}>
                      {statusConfig[req.status]?.icon}{req.status}
                    </span>
                    <Eye className="h-4 w-4 text-muted-foreground ml-1"/>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <AIAssistant context="welfare request approvals and member support decisions" suggestions={[
        "How should I prioritize welfare requests when resources are limited?",
        "What criteria should guide approval of support requests?",
        "Suggest a compassionate way to decline a welfare request",
        "How can the church better track welfare disbursements?",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
