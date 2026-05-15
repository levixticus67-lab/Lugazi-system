import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { leadershipNavItems } from "./navItems";
import { Calendar, Clock, MapPin, Users, Plus, X, CheckCircle2, XCircle, Search, UserCheck, UserX } from "lucide-react";

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  agenda: string | null;
  scheduledAt: string;
  location: string;
  portalTarget: string;
  status: string;
  notes: string | null;
  attendees: string | null;
  createdAt: string;
}

interface Member {
  id: number;
  fullName: string;
  photoUrl: string | null;
  role: string;
}

const mockMeetings: Meeting[] = [
  { id:1, title:"Leadership Council Meeting", description:"Monthly leadership review", agenda:"1. Ministry updates\n2. Member welfare\n3. Upcoming events\n4. Financial report", scheduledAt: new Date(Date.now()+3*86400000).toISOString(), location:"Main Hall", portalTarget:"leadership", status:"scheduled", notes:null, attendees:null, createdAt: new Date().toISOString() },
  { id:2, title:"Department Heads Briefing", description:"Weekly check-in", agenda:"Department activity reports", scheduledAt: new Date(Date.now()+7*86400000).toISOString(), location:"Conference Room", portalTarget:"all", status:"scheduled", notes:null, attendees:null, createdAt: new Date().toISOString() },
  { id:3, title:"Evangelism Committee", description:"Plan for upcoming outreach", agenda:"1. Outreach targets\n2. Resource allocation\n3. Team assignments", scheduledAt: new Date(Date.now()-2*86400000).toISOString(), location:"Room B", portalTarget:"leadership", status:"completed", notes:"Great session. Action items assigned.", attendees:"James, Grace, Moses, Ruth", createdAt: new Date().toISOString() },
];

const statusConfig: Record<string,{label:string;icon:React.ReactNode;color:string}> = {
  scheduled: { label:"Upcoming", icon:<Clock className="h-3.5 w-3.5"/>, color:"bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  completed: { label:"Completed", icon:<CheckCircle2 className="h-3.5 w-3.5"/>, color:"bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  cancelled: { label:"Cancelled", icon:<XCircle className="h-3.5 w-3.5"/>, color:"bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export default function LeadershipMeetings() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Meeting|null>(null);
  const [form, setForm] = useState({ title:"", description:"", agenda:"", scheduledAt:"", location:"Main Hall", notes:"" });
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [showAttendeesPicker, setShowAttendeesPicker] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["meetings","leadership"],
    queryFn: () => axios.get("/api/meetings?target=leadership").then(r=>r.data).catch(()=>[] as Meeting[]),
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members-list-meetings"],
    queryFn: () => axios.get("/api/members").then(r => r.data as Member[]).catch(() => [] as Member[]),
    staleTime: 60_000,
  });

  const display = meetings.length > 0 ? meetings : mockMeetings;

  const create = useMutation({
    mutationFn: (data: typeof form & { attendees: string }) => axios.post("/api/meetings", { ...data, portalTarget:"leadership" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); setShowForm(false); setSelectedAttendees([]); },
  });

  const updateMeeting = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Meeting> }) => axios.patch(`/api/meetings/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); },
  });

  const upcoming = display.filter(m=>m.status==="scheduled" && new Date(m.scheduledAt)>=new Date());
  const past = display.filter(m=>m.status==="completed" || new Date(m.scheduledAt)<new Date());

  const filteredMembers = (members as Member[]).filter(m =>
    m.fullName.toLowerCase().includes(attendeeSearch.toLowerCase())
  ).slice(0, 10);

  function toggleAttendee(name: string) {
    setSelectedAttendees(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  }

  function markStatus(m: Meeting, status: string) {
    updateMeeting.mutate({ id: m.id, data: { status, attendees: selectedAttendees.length > 0 ? selectedAttendees.join(", ") : m.attendees ?? undefined } as any });
    if (selected?.id === m.id) setSelected({ ...m, status });
  }

  function saveNotes(m: Meeting) {
    updateMeeting.mutate({ id: m.id, data: { notes: notesValue } as any });
    if (selected?.id === m.id) setSelected({ ...m, notes: notesValue });
    setEditingNotes(false);
  }

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={leadershipNavItems}>
      <PageHeader title="Meeting Management" subtitle="Schedule and track leadership meetings"
        actions={<button onClick={()=>setShowForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4"/>Schedule Meeting</button>} />

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        {[
          { label:"Upcoming", value:upcoming.length, color:"text-blue-500", icon:<Calendar className="h-4 w-4"/> },
          { label:"Completed", value:display.filter(m=>m.status==="completed").length, color:"text-green-500", icon:<CheckCircle2 className="h-4 w-4"/> },
          { label:"Total", value:display.length, color:"text-sky-500", icon:<Users className="h-4 w-4"/> },
        ].map(s=>(
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`${s.color} p-2 rounded-lg bg-current/10`}>{s.icon}</div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="px-6 pb-6">
          <button onClick={()=>setSelected(null)} className="text-sm text-primary mb-4 flex items-center gap-1 hover:underline">← Back to meetings</button>
          <div className="glass-card p-6 max-w-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.title}</h2>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${statusConfig[selected.status]?.color}`}>
                  {statusConfig[selected.status]?.icon}{statusConfig[selected.status]?.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/><span>{new Date(selected.scheduledAt).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4"/><span>{new Date(selected.scheduledAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4"/><span>{selected.location}</span></div>
            </div>

            {selected.agenda && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agenda</p>
                <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-line">{selected.agenda}</div>
              </div>
            )}

            {/* Attendees section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attendees</p>
                <button onClick={() => setShowAttendeesPicker(p => !p)} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> {showAttendeesPicker ? "Done" : "Mark Attendance"}
                </button>
              </div>

              {showAttendeesPicker && (
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input className="w-full text-xs bg-muted rounded-lg pl-8 pr-3 py-2 outline-none" placeholder="Search members…"
                      value={attendeeSearch} onChange={e => setAttendeeSearch(e.target.value)} />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                    {filteredMembers.map(m => (
                      <label key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted cursor-pointer">
                        <input type="checkbox" checked={selectedAttendees.includes(m.fullName)}
                          onChange={() => toggleAttendee(m.fullName)} className="rounded" />
                        {m.photoUrl ? <img src={m.photoUrl} className="w-5 h-5 rounded-full object-cover" alt={m.fullName} /> :
                          <div className="w-5 h-5 rounded-full blue-gradient-bg flex items-center justify-center text-white text-[9px] font-bold">{m.fullName.charAt(0)}</div>}
                        <span className="text-xs flex-1">{m.fullName}</span>
                        {selectedAttendees.includes(m.fullName) && <UserCheck className="h-3 w-3 text-green-500" />}
                      </label>
                    ))}
                    {filteredMembers.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No members found</p>}
                  </div>
                  <button onClick={() => {
                    const combined = [...new Set([...(selected.attendees?.split(", ").filter(Boolean) ?? []), ...selectedAttendees])];
                    updateMeeting.mutate({ id: selected.id, data: { attendees: combined.join(", ") } as any });
                    setSelected({ ...selected, attendees: combined.join(", ") });
                    setShowAttendeesPicker(false);
                  }} className="w-full py-1.5 text-xs rounded-lg blue-gradient-bg text-white font-medium">
                    Save Attendance ({selectedAttendees.length} selected)
                  </button>
                </div>
              )}

              {selected.attendees ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.attendees.split(",").map(name => name.trim()).filter(Boolean).map(name => (
                    <span key={name} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                      <UserCheck className="h-2.5 w-2.5" />{name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No attendees recorded yet. Click "Mark Attendance" to add them.</p>
              )}
            </div>

            {/* Notes / Minutes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Minutes / Notes</p>
                {!editingNotes && (
                  <button onClick={() => { setNotesValue(selected.notes || ""); setEditingNotes(true); }}
                    className="text-xs text-primary hover:underline">Edit</button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea className="w-full bg-muted rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/40" rows={4}
                    value={notesValue} onChange={e => setNotesValue(e.target.value)} placeholder="Type meeting minutes…" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingNotes(false)} className="flex-1 py-1.5 text-xs rounded-lg bg-muted">Cancel</button>
                    <button onClick={() => saveNotes(selected)} className="flex-1 py-1.5 text-xs rounded-lg blue-gradient-bg text-white">Save Notes</button>
                  </div>
                </div>
              ) : (
                selected.notes
                  ? <div className="bg-muted rounded-lg p-3 text-sm">{selected.notes}</div>
                  : <p className="text-xs text-muted-foreground italic">No notes yet.</p>
              )}
            </div>

            {/* Status actions */}
            {selected.status === "scheduled" && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={() => markStatus(selected, "completed")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 hover:bg-green-200 transition">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Completed
                </button>
                <button onClick={() => markStatus(selected, "cancelled")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 hover:bg-red-200 transition">
                  <XCircle className="h-3.5 w-3.5" /> Cancel Meeting
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6 space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h3>
              <div className="space-y-3">
                {upcoming.map(m=>(
                  <div key={m.id} className="glass-card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={()=>setSelected(m)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-primary"/>
                          <span className="font-semibold text-sm">{m.title}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(m.scheduledAt).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} at {new Date(m.scheduledAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{m.location}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[m.status]?.color}`}>
                        {statusConfig[m.status]?.icon}{statusConfig[m.status]?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Past Meetings</h3>
              <div className="space-y-3">
                {past.slice(0,5).map(m=>(
                  <div key={m.id} className="glass-card p-4 opacity-80 hover:opacity-100 hover:shadow-md transition-all cursor-pointer" onClick={()=>setSelected(m)}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-medium text-sm">{m.title}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(m.scheduledAt).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
                        {m.attendees && <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><UserCheck className="h-3 w-3 text-green-500" />{m.attendees.split(",").length} attended</div>}
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[m.status]?.color}`}>{statusConfig[m.status]?.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Schedule Meeting</h3><button onClick={()=>setShowForm(false)}><X className="h-4 w-4"/></button></div>
            {[
              {label:"Title *",key:"title",placeholder:"Meeting title"},
              {label:"Description",key:"description",placeholder:"Brief description"},
              {label:"Location",key:"location",placeholder:"e.g. Main Hall"},
            ].map(f=>(
              <div key={f.key}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm" placeholder={f.placeholder} value={form[f.key as keyof typeof form]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date & Time *</label>
              <input type="datetime-local" className="w-full bg-muted rounded-lg px-3 py-2 text-sm" value={form.scheduledAt} onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Agenda</label>
              <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm resize-none" rows={4} placeholder="Meeting agenda items…" value={form.agenda} onChange={e=>setForm(p=>({...p,agenda:e.target.value}))} />
            </div>
            {/* Expected attendees picker */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Expected Attendees (optional)</label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input className="w-full text-xs bg-muted rounded-lg pl-8 pr-3 py-2 outline-none" placeholder="Search members…"
                  value={attendeeSearch} onChange={e => setAttendeeSearch(e.target.value)} />
              </div>
              {attendeeSearch && (
                <div className="max-h-28 overflow-y-auto border border-border rounded-lg p-1 space-y-0.5">
                  {filteredMembers.map(m => (
                    <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                      <input type="checkbox" checked={selectedAttendees.includes(m.fullName)} onChange={() => toggleAttendee(m.fullName)} className="rounded" />
                      <span className="text-xs">{m.fullName}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedAttendees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedAttendees.map(n => (
                    <span key={n} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {n}<button onClick={() => toggleAttendee(n)}><X className="h-2 w-2" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={()=>{if(form.title&&form.scheduledAt)create.mutate({ ...form, attendees: selectedAttendees.join(", ") });}}
                disabled={!form.title||!form.scheduledAt||create.isPending} className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant context="leadership meeting management and agenda planning" suggestions={[
        "Suggest agenda items for a monthly leadership council meeting",
        "How should I run an effective church leadership meeting?",
        "Help me write minutes for a completed meeting",
        "What decisions should leadership review this month?",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
