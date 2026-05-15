import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { adminNavItems } from "./navItems";
import { Home, Users, MapPin, Clock, Plus, X, TrendingUp, CheckCircle2, Search, User } from "lucide-react";

interface CellGroup {
  id: number;
  name: string;
  type: string;
  leaderName: string | null;
  leaderUserId: number | null;
  location: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Member {
  id: number;
  userId: number | null;
  fullName: string;
  photoUrl: string | null;
  role: string;
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const mockCells: CellGroup[] = [
  { id:1, name:"Zion Cell", type:"cell", leaderName:"Bro. James Okello", leaderUserId:null, location:"Kampala Road, Lugazi", meetingDay:"Wednesday", meetingTime:"18:00", memberCount:12, isActive:true, createdAt: new Date().toISOString() },
  { id:2, name:"Bethel Cell", type:"cell", leaderName:"Sis. Grace Nakato", leaderUserId:null, location:"Buikwe Road, Lugazi", meetingDay:"Friday", meetingTime:"17:30", memberCount:9, isActive:true, createdAt: new Date().toISOString() },
  { id:3, name:"Canaan Cell", type:"cell", leaderName:"Bro. Moses Sserunjogi", leaderUserId:null, location:"Njeru, Jinja Road", meetingDay:"Thursday", meetingTime:"18:30", memberCount:15, isActive:true, createdAt: new Date().toISOString() },
  { id:4, name:"Jordan Cell", type:"cell", leaderName:"Sis. Ruth Akello", leaderUserId:null, location:"Kayunga Road", meetingDay:"Saturday", meetingTime:"10:00", memberCount:7, isActive:false, createdAt: new Date().toISOString() },
];

export default function AdminCellFellowship() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState("");
  const [selectedLeader, setSelectedLeader] = useState<Member | null>(null);
  const [form, setForm] = useState({ name:"", location:"", meetingDay:"Wednesday", meetingTime:"18:00" });
  const [editCell, setEditCell] = useState<CellGroup | null>(null);
  const [editLeaderSearch, setEditLeaderSearch] = useState("");
  const [editSelectedLeader, setEditSelectedLeader] = useState<Member | null>(null);

  const { data: cells = [], isLoading } = useQuery<CellGroup[]>({
    queryKey: ["cells-fellowship"],
    queryFn: () => axios.get("/api/groups").then(r => r.data as CellGroup[]).catch(() => [] as CellGroup[]),
    staleTime: 30_000,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members-for-cells"],
    queryFn: () => axios.get("/api/members").then(r => r.data as Member[]).catch(() => [] as Member[]),
    staleTime: 60_000,
  });

  const displayCells = cells.length > 0 ? cells : mockCells;

  const create = useMutation({
    mutationFn: (data: { name: string; branchId: number; leaderName: string; leaderUserId: number | null; location: string; meetingDay: string; meetingTime: string; type: string }) =>
      axios.post("/api/groups", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cells-fellowship"] }); setShowForm(false); setSelectedLeader(null); setLeaderSearch(""); setForm({ name:"", location:"", meetingDay:"Wednesday", meetingTime:"18:00" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CellGroup> }) => axios.patch(`/api/groups/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cells-fellowship"] }); setEditCell(null); setEditSelectedLeader(null); setEditLeaderSearch(""); },
  });

  const del = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cells-fellowship"] }),
  });

  const filteredLeaders = (members as Member[]).filter(m =>
    m.fullName.toLowerCase().includes(leaderSearch.toLowerCase())
  ).slice(0, 8);

  const filteredEditLeaders = (members as Member[]).filter(m =>
    m.fullName.toLowerCase().includes(editLeaderSearch.toLowerCase())
  ).slice(0, 8);

  const active = displayCells.filter(c => c.isActive).length;
  const totalMembers = displayCells.reduce((s, c) => s + c.memberCount, 0);

  function handleCreate() {
    if (!form.name) return;
    create.mutate({
      name: form.name,
      branchId: 1,
      leaderName: selectedLeader?.fullName ?? "",
      leaderUserId: selectedLeader?.userId ?? selectedLeader?.id ?? null,
      location: form.location,
      meetingDay: form.meetingDay,
      meetingTime: form.meetingTime,
      type: "cell",
    });
  }

  function openEdit(cell: CellGroup) {
    setEditCell(cell);
    setEditSelectedLeader(null);
    setEditLeaderSearch("");
  }

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
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add New Cell Group</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cell Name *</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Zion Cell" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            {/* Leader selection from members */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cell Leader</label>
              {selectedLeader ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  {selectedLeader.photoUrl ? <img src={selectedLeader.photoUrl} className="w-6 h-6 rounded-full object-cover" alt={selectedLeader.fullName} /> :
                    <div className="w-6 h-6 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[9px] font-bold">{selectedLeader.fullName.charAt(0)}</div>}
                  <span className="text-sm flex-1">{selectedLeader.fullName}</span>
                  <button onClick={() => { setSelectedLeader(null); setLeaderSearch(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input className="w-full bg-muted rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Search members to select leader…" value={leaderSearch} onChange={e => setLeaderSearch(e.target.value)} />
                  </div>
                  {leaderSearch && (
                    <div className="mt-1 max-h-36 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                      {filteredLeaders.length > 0 ? filteredLeaders.map(m => (
                        <button key={m.id} onClick={() => { setSelectedLeader(m); setLeaderSearch(""); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition text-left">
                          {m.photoUrl ? <img src={m.photoUrl} className="w-5 h-5 rounded-full object-cover" alt={m.fullName} /> :
                            <div className="w-5 h-5 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[9px] font-bold">{m.fullName.charAt(0)}</div>}
                          <span className="text-xs">{m.fullName}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto capitalize">{m.role}</span>
                        </button>
                      )) : <p className="text-xs text-muted-foreground text-center py-2">No members found</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Meeting address" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Meeting Day</label>
              <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={form.meetingDay} onChange={e => setForm(p => ({ ...p, meetingDay: e.target.value }))}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Meeting Time</label>
              <input type="time" className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={form.meetingTime} onChange={e => setForm(p => ({ ...p, meetingTime: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted hover:bg-muted/80 transition">Cancel</button>
              <button onClick={handleCreate} disabled={!form.name || create.isPending}
                className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold hover:opacity-90 transition disabled:opacity-60">
                {create.isPending ? "Saving…" : "Save Cell"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cell Modal */}
      {editCell && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Edit {editCell.name}</h3>
              <button onClick={() => setEditCell(null)}><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Change Leader</label>
              {editSelectedLeader ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  {editSelectedLeader.photoUrl ? <img src={editSelectedLeader.photoUrl} className="w-6 h-6 rounded-full object-cover" alt={editSelectedLeader.fullName} /> :
                    <div className="w-6 h-6 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[9px] font-bold">{editSelectedLeader.fullName.charAt(0)}</div>}
                  <span className="text-sm flex-1">{editSelectedLeader.fullName}</span>
                  <button onClick={() => { setEditSelectedLeader(null); setEditLeaderSearch(""); }}><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Current: <span className="font-medium">{editCell.leaderName || "None"}</span></div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input className="w-full bg-muted rounded-lg pl-8 pr-3 py-2 text-sm outline-none"
                      placeholder="Search to change leader…" value={editLeaderSearch} onChange={e => setEditLeaderSearch(e.target.value)} />
                  </div>
                  {editLeaderSearch && (
                    <div className="mt-1 max-h-36 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                      {filteredEditLeaders.map(m => (
                        <button key={m.id} onClick={() => { setEditSelectedLeader(m); setEditLeaderSearch(""); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition text-left">
                          <span className="text-xs">{m.fullName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditCell(null)} className="flex-1 py-2 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={() => {
                if (editSelectedLeader) {
                  update.mutate({ id: editCell.id, data: { leaderName: editSelectedLeader.fullName, leaderUserId: editSelectedLeader.userId ?? editSelectedLeader.id } as any });
                }
              }} disabled={!editSelectedLeader || update.isPending}
                className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">
                {update.isPending ? "Saving…" : "Update"}
              </button>
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{cell.leaderName || "No leader assigned"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cell.isActive ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>
                    {cell.isActive ? "Active" : "Inactive"}
                  </span>
                  <button onClick={() => openEdit(cell)} className="text-[10px] text-primary hover:underline">Edit Leader</button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {cell.location && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{cell.location}</div>}
                {cell.meetingDay && <div className="flex items-center gap-2"><Clock className="h-3 w-3" />{cell.meetingDay}s at {cell.meetingTime}</div>}
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
              <div className="flex justify-end pt-1">
                <button onClick={() => { if (confirm(`Delete ${cell.name}?`)) del.mutate(cell.id); }}
                  className="text-[10px] text-destructive hover:underline">Delete</button>
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
