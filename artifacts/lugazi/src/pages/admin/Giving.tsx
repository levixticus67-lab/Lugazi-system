import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { adminNavItems } from "./navItems";
import { DollarSign, TrendingUp, Plus, X, Trash2, Heart, HandCoins, Coins } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Contribution {
  id: number;
  memberName: string;
  email: string | null;
  type: string;
  amount: number;
  currency: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

const TYPES = ["tithe","offering","seed","donation","project"];
const CURRENCIES = ["UGX","USD","EUR","GBP","KES"];
const TYPE_COLORS: Record<string,string> = { tithe:"bg-blue-100 text-blue-700", offering:"bg-green-100 text-green-700", seed:"bg-yellow-100 text-yellow-700", donation:"bg-purple-100 text-purple-700", project:"bg-rose-100 text-rose-700" };
const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#f43f5e"];

const mock: Contribution[] = [
  { id:1, memberName:"Sis. Grace Nakato", email:"grace@example.com", type:"tithe", amount:150000, currency:"UGX", reference:"TIT-001", notes:null, createdAt: new Date(Date.now()-86400000).toISOString() },
  { id:2, memberName:"Bro. James Okello", email:null, type:"offering", amount:50000, currency:"UGX", reference:"OFF-001", notes:null, createdAt: new Date(Date.now()-172800000).toISOString() },
  { id:3, memberName:"Anonymous", email:null, type:"seed", amount:500000, currency:"UGX", reference:"SEED-001", notes:"For church building project", createdAt: new Date(Date.now()-259200000).toISOString() },
  { id:4, memberName:"Sis. Ruth Akello", email:null, type:"tithe", amount:80000, currency:"UGX", reference:null, notes:null, createdAt: new Date(Date.now()-345600000).toISOString() },
  { id:5, memberName:"Bro. David Ssemakula", email:null, type:"donation", amount:250000, currency:"UGX", reference:"DON-001", notes:"Monthly support", createdAt: new Date(Date.now()-432000000).toISOString() },
];

function fmt(n:number, cur:string) {
  if (cur==="UGX") return `UGX ${n.toLocaleString()}`;
  return `${cur} ${n.toLocaleString()}`;
}

export default function AdminGiving() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ memberName:"", email:"", type:"tithe", amount:"", currency:"UGX", reference:"", notes:"" });

  const { data: contributions = [], isLoading } = useQuery<Contribution[]>({
    queryKey: ["contributions"],
    queryFn: () => axios.get("/api/giving").then(r => r.data).catch(() => [] as Contribution[]),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/giving", { ...data, amount: Number(data.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contributions"] }); setShowForm(false); setForm({ memberName:"", email:"", type:"tithe", amount:"", currency:"UGX", reference:"", notes:"" }); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/giving/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contributions"] }),
  });

  const display = contributions.length > 0 ? contributions : mock;

  const totByType = TYPES.map(t => ({ name: t.charAt(0).toUpperCase()+t.slice(1), total: display.filter(c=>c.type===t).reduce((s,c)=>s+c.amount,0) })).filter(t=>t.total>0);
  const grandTotal = display.reduce((s,c)=>s+c.amount,0);

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={adminNavItems}>
      <PageHeader title="Giving & Payments" subtitle="Track tithes, offerings, seeds, and donations"
        actions={<button onClick={() => setShowForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" />Record Giving</button>} />

      <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        {TYPES.map((t,i) => {
          const total = display.filter(c=>c.type===t).reduce((s,c)=>s+c.amount,0);
          const count = display.filter(c=>c.type===t).length;
          return (
            <div key={t} className="glass-card p-3 text-center">
              <p className="text-xs text-muted-foreground capitalize mb-1">{t}</p>
              <p className="font-bold text-sm">{total>=1000000?`${(total/1000000).toFixed(1)}M`:total>=1000?`${(total/1000).toFixed(0)}K`:total.toString()}</p>
              <p className="text-[10px] text-muted-foreground">{count} records</p>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-4 lg:col-span-1">
          <p className="text-sm font-semibold mb-3">Giving by Type (UGX)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={totByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize:10 }} />
              <YAxis tick={{ fontSize:10 }} tickFormatter={v=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(0)}K`:`${v}`} />
              <Tooltip formatter={(v:number)=>fmt(v,"UGX")} />
              <Bar dataKey="total" radius={[4,4,0,0]}>
                {totByType.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total This Period</span><span className="font-bold">{fmt(grandTotal,"UGX")}</span></div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold text-sm">Recent Transactions</h3>
          {isLoading ? [...Array(5)].map((_,i)=><div key={i} className="glass-card h-14 animate-pulse" />) :
            display.slice(0,10).map(c => (
              <div key={c.id} className="glass-card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full blue-gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {c.memberName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{c.memberName}</span>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type]??""}`}>{c.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.reference && <span>{c.reference}</span>}
                    <span>{new Date(c.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{fmt(c.amount, c.currency)}</p>
                  <button onClick={()=>remove.mutate(c.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-1">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Record Giving</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            {[
              { label:"Member Name *", key:"memberName", placeholder:"Full name" },
              { label:"Email (optional)", key:"email", placeholder:"member@example.com" },
              { label:"Amount *", key:"amount", placeholder:"e.g. 50000", type:"number" },
              { label:"Reference", key:"reference", placeholder:"e.g. TIT-001" },
              { label:"Notes", key:"notes", placeholder:"Optional notes" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{f.label}</label>
                <input type={f.type ?? "text"} className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={f.placeholder} value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                  {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}>
                  {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={()=>{ if(form.memberName&&form.amount) create.mutate(form); }} disabled={!form.memberName||!form.amount} className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">Record</button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant context="church giving, tithes, offerings and financial stewardship" suggestions={[
        "How can I encourage consistent tithing in the congregation?",
        "Analyse our giving patterns and suggest improvements",
        "Draft a message about biblical stewardship",
        "How should we track and acknowledge faithful givers?",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
