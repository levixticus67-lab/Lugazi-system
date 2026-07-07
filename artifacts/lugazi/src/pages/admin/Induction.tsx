import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { adminNavItems } from "./navItems";
import { BookOpen, Users, Award, Plus, X, Clock, Trash2, Pencil, Power, Search, TrendingUp } from "lucide-react";

interface Track {
  id: number; name: string; description: string | null;
  level: number; totalSessions: number; isActive: boolean; createdAt: string;
}
interface Enrollment {
  id: number; memberId: number; memberName: string;
  trackId: number; trackName: string; progress: number;
  status: string; enrolledAt: string; completedAt: string | null;
}
interface Member { id: number; fullName: string; phone: string | null; photoUrl?: string | null; }

const LEVEL_LABELS: Record<number, string> = { 1: "Foundation", 2: "Growth", 3: "Leadership" };
const levelColors = ["","bg-blue-500/10 text-blue-600 border-blue-200","bg-indigo-500/10 text-indigo-600 border-indigo-200","bg-purple-500/10 text-purple-600 border-purple-200"];
const statusColor: Record<string,string> = { enrolled:"bg-yellow-100 text-yellow-700", in_progress:"bg-blue-100 text-blue-700", completed:"bg-green-100 text-green-700" };
const statusLabel: Record<string,string> = { enrolled:"Enrolled", in_progress:"In Progress", completed:"Completed" };

export default function AdminInduction() {
  const [tab, setTab] = useState<"tracks"|"enrollments">("tracks");
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [trackForm, setTrackForm] = useState({ name:"", description:"", level:1, totalSessions:4 });
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [progressEnrollment, setProgressEnrollment] = useState<Enrollment | null>(null);
  const [progressVal, setProgressVal] = useState(0);
  const [statusVal, setStatusVal] = useState("enrolled");

  const qc = useQueryClient();

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ["induction-tracks"],
    queryFn: () => axios.get("/api/induction/tracks").then(r => r.data),
  });
  const { data: enrollments = [], isLoading: enrollLoading } = useQuery<Enrollment[]>({
    queryKey: ["induction-enrollments"],
    queryFn: () => axios.get("/api/induction/enrollments").then(r => r.data),
  });
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members-list"],
    queryFn: () => axios.get("/api/members").then(r => r.data),
  });

  const filteredMembers = useMemo(() =>
    memberSearch.trim().length > 1
      ? members.filter(m => m.fullName.toLowerCase().includes(memberSearch.toLowerCase())).slice(0,8)
      : [],
    [members, memberSearch]
  );
  const activeTracks = tracks.filter(t => t.isActive);

  const createTrack = useMutation({
    mutationFn: (d: typeof trackForm) => axios.post("/api/induction/tracks", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["induction-tracks"] }); closeTrackForm(); },
  });
  const updateTrack = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof trackForm & { isActive: boolean }> }) =>
      axios.patch(`/api/induction/tracks/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["induction-tracks"] }); closeTrackForm(); },
  });
  const deleteTrack = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/induction/tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["induction-tracks"] }),
  });
  const createEnrollment = useMutation({
    mutationFn: (d: { memberId: number; memberName: string; trackId: number; trackName: string }) =>
      axios.post("/api/induction/enrollments", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["induction-enrollments"] }); closeEnrollForm(); },
  });
  const updateProgress = useMutation({
    mutationFn: ({ id, progress, status }: { id: number; progress: number; status: string }) =>
      axios.patch(`/api/induction/enrollments/${id}`, { progress, status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["induction-enrollments"] }); setProgressEnrollment(null); },
  });
  const deleteEnrollment = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/induction/enrollments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["induction-enrollments"] }),
  });

  function closeTrackForm() { setShowTrackForm(false); setEditTrack(null); setTrackForm({ name:"", description:"", level:1, totalSessions:4 }); }
  function closeEnrollForm() { setShowEnrollForm(false); setSelectedMember(null); setMemberSearch(""); setSelectedTrackId(null); }

  function openEditTrack(track: Track) {
    setEditTrack(track);
    setTrackForm({ name: track.name, description: track.description ?? "", level: track.level, totalSessions: track.totalSessions });
    setShowTrackForm(true);
  }

  function handleEnroll() {
    if (!selectedMember || !selectedTrackId) return;
    const track = tracks.find(t => t.id === selectedTrackId);
    if (!track) return;
    createEnrollment.mutate({ memberId: selectedMember.id, memberName: selectedMember.fullName, trackId: track.id, trackName: track.name });
  }

  function openProgressModal(e: Enrollment) {
    setProgressEnrollment(e); setProgressVal(e.progress); setStatusVal(e.status);
  }

  const stats = [
    { label:"Active Tracks",  value: activeTracks.length,                                    icon:<BookOpen className="h-4 w-4"/>, color:"text-blue-500"   },
    { label:"Total Enrolled", value: enrollments.length,                                     icon:<Users className="h-4 w-4"/>,   color:"text-sky-500"    },
    { label:"In Progress",    value: enrollments.filter(e=>e.status==="in_progress").length,  icon:<Clock className="h-4 w-4"/>,   color:"text-yellow-500" },
    { label:"Completed",      value: enrollments.filter(e=>e.status==="completed").length,    icon:<Award className="h-4 w-4"/>,   color:"text-green-500"  },
  ];

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={adminNavItems}>
      <PageHeader title="Induction & Growth" subtitle="Spiritual development tracks and member progress"
        actions={
          <div className="flex gap-2">
            <button onClick={() => { closeTrackForm(); setShowTrackForm(true); }}
              className="bg-muted hover:bg-muted/80 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
              <BookOpen className="h-4 w-4"/>New Track
            </button>
            <button onClick={() => setShowEnrollForm(true)}
              className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4"/>Enroll Member
            </button>
          </div>
        }/>

      {/* Stats */}
      <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`${s.color} p-2 rounded-lg bg-current/10`}>{s.icon}</div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-2">
        {(["tracks","enrollments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab===t?"blue-gradient-bg text-white":"bg-muted hover:bg-muted/80"}`}>
            {t==="tracks" ? `Development Tracks (${tracks.length})` : `Enrollments (${enrollments.length})`}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="p-6">
        {tab === "tracks" ? (
          tracksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="glass-card h-44 animate-pulse bg-muted/50 rounded-2xl"/>)}
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40"/>
              <p className="font-medium text-muted-foreground">No tracks yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first spiritual development track to get started</p>
              <button onClick={() => setShowTrackForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold">
                Create First Track
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tracks.map(track => {
                const enrolled = enrollments.filter(e => e.trackId === track.id);
                const done = enrolled.filter(e => e.status === "completed").length;
                return (
                  <div key={track.id} className={`glass-card p-5 space-y-3 hover:shadow-md transition-all ${!track.isActive?"opacity-60":""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <BookOpen className="h-4 w-4 text-primary shrink-0"/>
                        <span className="font-semibold truncate">{track.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${levelColors[track.level]??""}`}>
                        L{track.level} · {LEVEL_LABELS[track.level]??""}
                      </span>
                    </div>
                    {track.description && <p className="text-xs text-muted-foreground line-clamp-2">{track.description}</p>}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{track.totalSessions} sessions</span>
                      <span className={`font-semibold ${track.isActive?"text-green-600":"text-red-500"}`}>
                        {track.isActive?"● Active":"○ Inactive"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {enrolled.length} enrolled · {done} completed
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t border-border/40">
                      <button onClick={() => openEditTrack(track)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3"/>Edit
                      </button>
                      <button onClick={() => updateTrack.mutate({ id:track.id, data:{ isActive:!track.isActive } })}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-colors ${track.isActive?"hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600":"hover:bg-green-50 dark:hover:bg-green-950 text-green-600"}`}>
                        <Power className="h-3 w-3"/>{track.isActive?"Deactivate":"Activate"}
                      </button>
                      <button onClick={() => { if(confirm(`Delete "${track.name}"? This cannot be undone.`)) deleteTrack.mutate(track.id); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3"/>Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          enrollLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="glass-card h-20 animate-pulse bg-muted/50 rounded-2xl"/>)}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-20">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40"/>
              <p className="font-medium text-muted-foreground">No enrollments yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Enroll your first member into a development track</p>
              <button onClick={() => setShowEnrollForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold">
                Enroll First Member
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map(e => (
                <div key={e.id} className="glass-card p-4">
                  <div className="flex items-center gap-4">
                    {(() => { const m = members.find(m => m.id === e.memberId); return m?.photoUrl ? (
                      <img src={m.photoUrl} alt={e.memberName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {e.memberName.charAt(0).toUpperCase()}
                      </div>
                    ); })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm">{e.memberName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[e.status]??"bg-muted text-muted-foreground"}`}>
                          {statusLabel[e.status]??e.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{e.trackName}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full blue-gradient-bg rounded-full transition-all duration-500" style={{ width:`${e.progress}%` }}/>
                        </div>
                        <span className="text-xs font-bold shrink-0 w-8 text-right">{e.progress}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{new Date(e.enrolledAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>
                      <div className="flex gap-1">
                        <button onClick={() => openProgressModal(e)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-muted-foreground hover:text-blue-600 transition-colors" title="Update progress">
                          <TrendingUp className="h-3.5 w-3.5"/>
                        </button>
                        <button onClick={() => { if(confirm(`Remove ${e.memberName} from "${e.trackName}"?`)) deleteEnrollment.mutate(e.id); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Remove enrollment">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>
                    </div>
                  </div>
                  {e.completedAt && (
                    <p className="text-xs text-green-600 mt-2 pl-14">
                      ✓ Completed {new Date(e.completedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Track Form Modal (create & edit) ────────────────────────── */}
      {showTrackForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editTrack?"Edit Track":"Create Development Track"}</h3>
              <button onClick={closeTrackForm}><X className="h-4 w-4"/></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Track Name *</label>
              <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="e.g. Foundation Class"
                value={trackForm.name} onChange={e=>setTrackForm(p=>({...p,name:e.target.value}))}/>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm resize-none" rows={3}
                placeholder="What will members learn in this track?" value={trackForm.description}
                onChange={e=>setTrackForm(p=>({...p,description:e.target.value}))}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Level</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={trackForm.level}
                  onChange={e=>setTrackForm(p=>({...p,level:Number(e.target.value)}))}>
                  <option value={1}>1 – Foundation</option>
                  <option value={2}>2 – Growth</option>
                  <option value={3}>3 – Leadership</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total Sessions</label>
                <input type="number" min="1" max="52" className="w-full bg-muted rounded-lg px-3 py-2 text-sm"
                  value={trackForm.totalSessions} onChange={e=>setTrackForm(p=>({...p,totalSessions:Number(e.target.value)}))}/>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={closeTrackForm} className="flex-1 py-2 rounded-xl text-sm bg-muted">Cancel</button>
              <button
                onClick={() => editTrack ? updateTrack.mutate({id:editTrack.id,data:trackForm}) : createTrack.mutate(trackForm)}
                disabled={!trackForm.name.trim() || createTrack.isPending || updateTrack.isPending}
                className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-50">
                {(createTrack.isPending||updateTrack.isPending)?"Saving…":(editTrack?"Save Changes":"Create Track")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Enroll Member Modal ──────────────────────────────────────── */}
      {showEnrollForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Enroll Member in Track</h3>
              <button onClick={closeEnrollForm}><X className="h-4 w-4"/></button>
            </div>

            {/* Member picker */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Select Member *</label>
              {selectedMember ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  {selectedMember.photoUrl ? (
                    <img src={selectedMember.photoUrl} alt={selectedMember.fullName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full blue-gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {selectedMember.fullName.charAt(0)}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium">{selectedMember.fullName}</span>
                  <button onClick={()=>{setSelectedMember(null);setMemberSearch("");}}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"/></button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                  <input className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm"
                    placeholder="Type a member's name to search…"
                    value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} autoFocus/>
                  {filteredMembers.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-xl shadow-xl z-10 overflow-hidden">
                      {filteredMembers.map(m => (
                        <button key={m.id} onClick={()=>{setSelectedMember(m);setMemberSearch("");}}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm flex items-center gap-2.5 transition-colors">
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt={m.fullName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full blue-gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {m.fullName.charAt(0)}
                            </div>
                          )}
                          {m.fullName}
                        </button>
                      ))}
                    </div>
                  )}
                  {memberSearch.trim().length > 1 && filteredMembers.length === 0 && (
                    <div className="absolute top-full mt-1 w-full text-center text-xs text-muted-foreground py-3 bg-background border border-border rounded-xl shadow">
                      No members found for "{memberSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Track picker */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Select Track *</label>
              {activeTracks.length === 0 ? (
                <div className="p-3 rounded-xl bg-muted/60 text-center">
                  <p className="text-xs text-muted-foreground">No active tracks yet.</p>
                  <button onClick={()=>{closeEnrollForm();setShowTrackForm(true);}} className="text-xs text-primary underline mt-1">Create a track first</button>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {activeTracks.map(t => (
                    <button key={t.id} onClick={()=>setSelectedTrackId(t.id)}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${selectedTrackId===t.id?"border-blue-400 bg-blue-50 dark:bg-blue-950":"border-border hover:border-blue-300 hover:bg-muted/60"}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${levelColors[t.level]??""}`}>L{t.level}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.totalSessions} sessions · {LEVEL_LABELS[t.level]??""}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeEnrollForm} className="flex-1 py-2 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={handleEnroll}
                disabled={!selectedMember || !selectedTrackId || createEnrollment.isPending || activeTracks.length===0}
                className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-50">
                {createEnrollment.isPending?"Enrolling…":"Enroll Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update Progress Modal ────────────────────────────────────── */}
      {progressEnrollment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Update Progress</h3>
              <button onClick={()=>setProgressEnrollment(null)}><X className="h-4 w-4"/></button>
            </div>
            <div className="p-3 rounded-xl bg-muted/60">
              <p className="font-medium text-sm">{progressEnrollment.memberName}</p>
              <p className="text-xs text-muted-foreground">{progressEnrollment.trackName}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">Progress</label>
                <span className="text-sm font-bold">{progressVal}%</span>
              </div>
              <input type="range" min="0" max="100" step="5" className="w-full accent-blue-500"
                value={progressVal} onChange={e=>setProgressVal(Number(e.target.value))}/>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full blue-gradient-bg rounded-full transition-all duration-300" style={{ width:`${progressVal}%`}}/>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(["enrolled","in_progress","completed"] as const).map(s => (
                  <button key={s} onClick={()=>setStatusVal(s)}
                    className={`py-2 rounded-xl text-xs font-medium transition-all border ${statusVal===s?"blue-gradient-bg text-white border-transparent":"bg-muted border-transparent hover:border-blue-300"}`}>
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setProgressEnrollment(null)} className="flex-1 py-2 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={()=>updateProgress.mutate({id:progressEnrollment.id,progress:progressVal,status:statusVal})}
                disabled={updateProgress.isPending}
                className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-50">
                {updateProgress.isPending?"Saving…":"Save Progress"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant context="member induction and spiritual growth tracking" suggestions={[
        "Which members should be prioritized for Leadership Training?",
        "How can I improve completion rates for Foundation Class?",
        "Suggest a follow-up plan for enrolled members",
        "What topics should I add to the Growth Track?",
      ]}/>
      <LiveChat/>
    </PortalLayout>
  );
}
