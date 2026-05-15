import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { adminNavItems } from "./navItems";
import { BookOpen, Users, Award, Plus, X, TrendingUp, CheckCircle2, Clock } from "lucide-react";

interface Track {
  id: number;
  name: string;
  description: string | null;
  level: number;
  totalSessions: number;
  isActive: boolean;
  createdAt: string;
}

interface Enrollment {
  id: number;
  memberId: number;
  memberName: string;
  trackId: number;
  trackName: string;
  progress: number;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
}

const defaultTracks: Track[] = [
  { id:1, name:"Foundation Class", description:"Basic discipleship and introduction to DCL Lugazi", level:1, totalSessions:4, isActive:true, createdAt: new Date().toISOString() },
  { id:2, name:"Growth Track", description:"Spiritual maturity, prayer, and Bible study deep-dive", level:2, totalSessions:6, isActive:true, createdAt: new Date().toISOString() },
  { id:3, name:"Leadership Training", description:"Equipping leaders for ministry and service", level:3, totalSessions:8, isActive:true, createdAt: new Date().toISOString() },
  { id:4, name:"Marriage & Family", description:"Biblical foundations for family and relationships", level:2, totalSessions:5, isActive:true, createdAt: new Date().toISOString() },
];

const defaultEnrollments: Enrollment[] = [
  { id:1, memberId:1, memberName:"Sarah Namusoke", trackId:1, trackName:"Foundation Class", progress:75, status:"in_progress", enrolledAt: new Date(Date.now()-7*86400000).toISOString(), completedAt:null },
  { id:2, memberId:2, memberName:"John Kato", trackId:2, trackName:"Growth Track", progress:100, status:"completed", enrolledAt: new Date(Date.now()-30*86400000).toISOString(), completedAt: new Date(Date.now()-2*86400000).toISOString() },
  { id:3, memberId:3, memberName:"Grace Nakayima", trackId:1, trackName:"Foundation Class", progress:25, status:"enrolled", enrolledAt: new Date(Date.now()-3*86400000).toISOString(), completedAt:null },
  { id:4, memberId:4, memberName:"David Ssemakula", trackId:3, trackName:"Leadership Training", progress:60, status:"in_progress", enrolledAt: new Date(Date.now()-14*86400000).toISOString(), completedAt:null },
];

const levelColors = ["","bg-blue-500/10 text-blue-600 border-blue-200","bg-indigo-500/10 text-indigo-600 border-indigo-200","bg-purple-500/10 text-purple-600 border-purple-200"];
const statusColor: Record<string,string> = { enrolled:"bg-yellow-100 text-yellow-700", in_progress:"bg-blue-100 text-blue-700", completed:"bg-green-100 text-green-700" };
const statusLabel: Record<string,string> = { enrolled:"Enrolled", in_progress:"In Progress", completed:"Completed" };

export default function AdminInduction() {
  const [tab, setTab] = useState<"tracks"|"enrollments">("tracks");
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [trackForm, setTrackForm] = useState({ name:"", description:"", level:1, totalSessions:4 });
  const [enrollForm, setEnrollForm] = useState({ memberName:"", trackId:"1" });

  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ["induction-tracks"],
    queryFn: () => axios.get("/api/induction/tracks").then(r => r.data).catch(() => [] as Track[]),
  });
  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["induction-enrollments"],
    queryFn: () => axios.get("/api/induction/enrollments").then(r => r.data).catch(() => [] as Enrollment[]),
  });

  const displayTracks = tracks.length > 0 ? tracks : defaultTracks;
  const displayEnrollments = enrollments.length > 0 ? enrollments : defaultEnrollments;

  const qc = useQueryClient();
  const createTrack = useMutation({
    mutationFn: (data: typeof trackForm) => axios.post("/api/induction/tracks", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["induction-tracks"] }); setShowTrackForm(false); },
  });
  const createEnrollment = useMutation({
    mutationFn: (data: { memberName: string; trackId: number; memberId: number; trackName: string }) => axios.post("/api/induction/enrollments", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["induction-enrollments"] }); setShowEnrollForm(false); },
  });

  const completed = displayEnrollments.filter(e => e.status === "completed").length;
  const inProgress = displayEnrollments.filter(e => e.status === "in_progress").length;

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={adminNavItems}>
      <PageHeader title="Induction & Growth" subtitle="Spiritual development tracks and member progress"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowTrackForm(true)} className="bg-muted hover:bg-muted/80 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition"><BookOpen className="h-4 w-4" />New Track</button>
            <button onClick={() => setShowEnrollForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" />Enroll Member</button>
          </div>
        } />

      <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Active Tracks", value: displayTracks.filter(t=>t.isActive).length, icon:<BookOpen className="h-4 w-4"/>, color:"text-blue-500" },
          { label:"Total Enrolled", value: displayEnrollments.length, icon:<Users className="h-4 w-4"/>, color:"text-sky-500" },
          { label:"In Progress", value: inProgress, icon:<Clock className="h-4 w-4"/>, color:"text-yellow-500" },
          { label:"Completed", value: completed, icon:<Award className="h-4 w-4"/>, color:"text-green-500" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`${s.color} p-2 rounded-lg bg-current/10`}>{s.icon}</div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </div>
        ))}
      </div>

      <div className="px-6 pt-4 flex gap-2">
        {(["tracks","enrollments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab===t ? "blue-gradient-bg text-white" : "bg-muted hover:bg-muted/80"}`}>
            {t === "tracks" ? "Development Tracks" : "Enrollments"}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "tracks" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayTracks.map(track => (
              <div key={track.id} className="glass-card p-5 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{track.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${levelColors[track.level] ?? ""}`}>Level {track.level}</span>
                </div>
                <p className="text-xs text-muted-foreground">{track.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{track.totalSessions} sessions</span>
                  <span className={`font-medium ${track.isActive ? "text-green-600" : "text-red-500"}`}>{track.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="pt-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    {displayEnrollments.filter(e=>e.trackId===track.id).length} enrolled
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayEnrollments.map(e => (
              <div key={e.id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {e.memberName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{e.memberName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[e.status]}`}>{statusLabel[e.status]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{e.trackName}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full blue-gradient-bg rounded-full transition-all" style={{ width: `${e.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold">{e.progress}%</span>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <p>Enrolled</p>
                  <p>{new Date(e.enrolledAt).toLocaleDateString("en-GB")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Track Form Modal */}
      {showTrackForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Create Development Track</h3>
              <button onClick={() => setShowTrackForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="Track name" value={trackForm.name} onChange={e=>setTrackForm(p=>({...p,name:e.target.value}))} />
            <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm resize-none" rows={3} placeholder="Description" value={trackForm.description} onChange={e=>setTrackForm(p=>({...p,description:e.target.value}))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Level</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={trackForm.level} onChange={e=>setTrackForm(p=>({...p,level:Number(e.target.value)}))}>
                  <option value={1}>1 – Foundation</option><option value={2}>2 – Growth</option><option value={3}>3 – Leadership</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sessions</label>
                <input type="number" min="1" max="20" className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={trackForm.totalSessions} onChange={e=>setTrackForm(p=>({...p,totalSessions:Number(e.target.value)}))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowTrackForm(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={() => createTrack.mutate(trackForm)} className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold">Save Track</button>
            </div>
          </div>
        </div>
      )}

      {showEnrollForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Enroll Member</h3>
              <button onClick={() => setShowEnrollForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder="Member name" value={enrollForm.memberName} onChange={e=>setEnrollForm(p=>({...p,memberName:e.target.value}))} />
            <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={enrollForm.trackId} onChange={e=>setEnrollForm(p=>({...p,trackId:e.target.value}))}>
              {displayTracks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEnrollForm(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={() => {
                const track = displayTracks.find(t=>t.id===Number(enrollForm.trackId));
                if (!enrollForm.memberName || !track) return;
                createEnrollment.mutate({ memberName:enrollForm.memberName, trackId:track.id, memberId:0, trackName:track.name });
              }} className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold">Enroll</button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant context="member induction and spiritual growth tracking" suggestions={[
        "Which members should be prioritized for Leadership Training?",
        "How can I improve completion rates for Foundation Class?",
        "Suggest a follow-up plan for enrolled members",
        "What topics should I add to the Growth Track?",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
