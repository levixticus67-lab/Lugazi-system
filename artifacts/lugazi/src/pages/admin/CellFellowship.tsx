import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { adminNavItems } from "./navItems";
import { Home, Users, MapPin, Clock, Plus, X, TrendingUp, CheckCircle2 } from "lucide-react";

interface CellGroup {
  id: number;
  name: string;
  leader: string;
  location: string;
  meetingDay: string;
  meetingTime: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const mockCells: CellGroup[] = [
  { id:1, name:"Zion Cell", leader:"Bro. James Okello", location:"Kampala Road, Lugazi", meetingDay:"Wednesday", meetingTime:"18:00", memberCount:12, isActive:true, createdAt: new Date().toISOString() },
  { id:2, name:"Bethel Cell", leader:"Sis. Grace Nakato", location:"Buikwe Road, Lugazi", meetingDay:"Friday", meetingTime:"17:30", memberCount:9, isActive:true, createdAt: new Date().toISOString() },
  { id:3, name:"Canaan Cell", leader:"Bro. Moses Sserunjogi", location:"Njeru, Jinja Road", meetingDay:"Thursday", meetingTime:"18:30", memberCount:15, isActive:true, createdAt: new Date().toISOString() },
  { id:4, name:"Jordan Cell", leader:"Sis. Ruth Akello", location:"Kayunga Road", meetingDay:"Saturday", meetingTime:"10:00", memberCount:7, isActive:false, createdAt: new Date().toISOString() },
];

export default function AdminCellFellowship() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", leader:"", location:"", meetingDay:"Wednesday", meetingTime:"18:00" });

  const { data: cells = [], isLoading } = useQuery<CellGroup[]>({
    queryKey: ["cells-fellowship"],
    queryFn: () => axios.get("/api/groups?type=cell").then(r => r.data).catch(() => [] as CellGroup[]),
    staleTime: 30_000,
  });

  const displayCells = cells.length > 0 ? cells : mockCells;

  function handleSubmit() {
    if (!form.name || !form.leader) return;
    setShowForm(false);
    setForm({ name:"", leader:"", location:"", meetingDay:"Wednesday", meetingTime:"18:00" });
  }

  const active = displayCells.filter(c => c.isActive).length;
  const totalMembers = displayCells.reduce((s, c) => s + c.memberCount, 0);

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={adminNavItems}>
      <PageHeader title="Cell Fellowship" subtitle="Manage home cell groups and fellowship meetings"
        actions={<button onClick={() => setShowForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" />New Cell</button>} />

      {/* Stats */}
      <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Total Cells", value: displayCells.length, icon:<Home className="h-4 w-4" />, color:"text-blue-500" },
          { label:"Active Cells", value: active, icon:<CheckCircle2 className="h-4 w-4" />, color:"text-green-500" },
          { label:"Total Members", value: totalMembers, icon:<Users className="h-4 w-4" />, color:"text-sky-500" },
          { label:"Avg. Size", value: displayCells.length ? Math.round(totalMembers/displayCells.length) : 0, icon:<TrendingUp className="h-4 w-4" />, color:"text-indigo-500" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`${s.color} p-2 rounded-lg bg-current/10`}>{s.icon}</div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Add Cell Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add New Cell</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            {[
              { label:"Cell Name", key:"name", placeholder:"e.g. Zion Cell" },
              { label:"Cell Leader", key:"leader", placeholder:"Leader's name" },
              { label:"Location", key:"location", placeholder:"Meeting address" },
              { label:"Meeting Time", key:"meetingTime", placeholder:"HH:MM" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{f.label}</label>
                <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={f.placeholder} value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Meeting Day</label>
              <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={form.meetingDay} onChange={e => setForm(prev => ({ ...prev, meetingDay: e.target.value }))}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted hover:bg-muted/80 transition">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold hover:opacity-90 transition">Save Cell</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? [...Array(4)].map((_,i) => <div key={i} className="glass-card p-5 animate-pulse h-40" />) :
          displayCells.map(cell => (
            <div key={cell.id} className={`glass-card p-5 space-y-3 hover:shadow-md transition-shadow ${!cell.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{cell.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Led by {cell.leader}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cell.isActive ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>
                  {cell.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{cell.location}</div>
                <div className="flex items-center gap-2"><Clock className="h-3 w-3" />{cell.meetingDay}s at {cell.meetingTime}</div>
                <div className="flex items-center gap-2"><Users className="h-3 w-3" />{cell.memberCount} members</div>
              </div>
              <div className="pt-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{cell.memberCount}/20</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full blue-gradient-bg rounded-full transition-all" style={{ width: `${Math.min(100, (cell.memberCount/20)*100)}%` }} />
                </div>
              </div>
            </div>
          ))}
      </div>

      <AIAssistant context="cell fellowship management and home group growth" suggestions={[
        "How can I grow cell fellowship attendance?",
        "What's the ideal cell group size for a church like ours?",
        "Suggest strategies for starting new cells in our community",
        "How should I select and train cell leaders?",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
