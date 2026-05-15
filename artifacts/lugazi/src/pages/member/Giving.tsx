import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import { memberNavItems } from "./navItems";
import { DollarSign, TrendingUp, Plus, X, HandCoins, Clock } from "lucide-react";

interface Contribution {
  id: number;
  memberName: string;
  type: string;
  amount: number;
  currency: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

const TYPES = ["tithe","offering","seed","donation","project"];
const CURRENCIES = ["UGX","USD","EUR","GBP","KES"];
const TYPE_COLORS: Record<string,string> = {
  tithe:"bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  offering:"bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  seed:"bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  donation:"bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  project:"bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

function fmt(n:number,cur:string) {
  return cur==="UGX"?`UGX ${n.toLocaleString()}`:`${cur} ${n.toLocaleString()}`;
}

const mockContributions: Contribution[] = [
  { id:1, memberName:"You", type:"tithe", amount:100000, currency:"UGX", reference:"TIT-202", notes:null, createdAt: new Date(Date.now()-7*86400000).toISOString() },
  { id:2, memberName:"You", type:"offering", amount:30000, currency:"UGX", reference:null, notes:null, createdAt: new Date(Date.now()-14*86400000).toISOString() },
  { id:3, memberName:"You", type:"seed", amount:200000, currency:"UGX", reference:"SEED-055", notes:"Building project faith seed", createdAt: new Date(Date.now()-30*86400000).toISOString() },
];

export default function MemberGiving() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type:"tithe", amount:"", currency:"UGX", reference:"", notes:"" });

  const { data: contributions = [], isLoading } = useQuery<Contribution[]>({
    queryKey: ["my-contributions"],
    queryFn: () => axios.get("/api/giving?memberId=me").then(r=>r.data).catch(()=>[] as Contribution[]),
  });

  const display = contributions.length > 0 ? contributions : mockContributions;
  const totalUGX = display.filter(c=>c.currency==="UGX").reduce((s,c)=>s+c.amount,0);

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/giving", { ...data, memberName: user?.displayName ?? "Member", amount: Number(data.amount) }),
    onSuccess: () => { qc.invalidateQueries({queryKey:["my-contributions"]}); setShowForm(false); setForm({ type:"tithe", amount:"", currency:"UGX", reference:"", notes:"" }); },
  });

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={memberNavItems}>
      <PageHeader title="My Giving Record" subtitle="View your contribution history and record a new gift"
        actions={<button onClick={()=>setShowForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4"/>Record Giving</button>} />

      {/* Summary cards */}
      <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {TYPES.filter(t=>display.some(c=>c.type===t)).map(t=>(
          <div key={t} className="glass-card p-3 text-center">
            <p className="text-xs text-muted-foreground capitalize mb-1">{t}</p>
            <p className="font-bold text-sm">{fmt(display.filter(c=>c.type===t).reduce((s,c)=>s+c.amount,0),"UGX")}</p>
            <p className="text-[10px] text-muted-foreground">{display.filter(c=>c.type===t).length}× given</p>
          </div>
        ))}
      </div>

      <div className="px-6 pt-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="blue-gradient-bg rounded-full p-3"><DollarSign className="h-5 w-5 text-white"/></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Contributions (UGX)</p>
              <p className="text-2xl font-bold">{fmt(totalUGX,"UGX")}</p>
            </div>
          </div>
          <TrendingUp className="h-8 w-8 text-green-400"/>
        </div>
      </div>

      <div className="p-6 space-y-3">
        <h3 className="font-semibold text-sm">Transaction History</h3>
        {isLoading ? [...Array(4)].map((_,i)=><div key={i} className="glass-card h-14 animate-pulse"/>) :
          display.map(c=>(
            <div key={c.id} className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-full blue-gradient-bg flex items-center justify-center text-white shrink-0">
                <HandCoins className="h-4 w-4"/>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm capitalize">{c.type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type]??""}`}>{c.type}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3"/>
                  {new Date(c.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
                  {c.reference && <span>· {c.reference}</span>}
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{c.notes}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{fmt(c.amount,c.currency)}</p>
              </div>
            </div>
          ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Record a Gift</h3><button onClick={()=>setShowForm(false)}><X className="h-4 w-4"/></button></div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type of Giving</label>
              <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount *</label>
                <input type="number" className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
                  {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reference</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="e.g. TIT-001" value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="Optional purpose/note" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={()=>{if(form.amount)create.mutate(form);}} disabled={!form.amount} className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">Submit</button>
            </div>
          </div>
        </div>
      )}

      <LiveChat />
    </PortalLayout>
  );
}
