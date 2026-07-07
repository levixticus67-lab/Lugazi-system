import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { pastorNavItems } from "./navItems";
import { Calendar, Clock, MapPin, Plus, X, CheckCircle2, XCircle, Search, UserCheck, ChevronRight } from "lucide-react";

interface Meeting {
  id: number; title: string; description: string | null; agenda: string | null;
  scheduledAt: string; location: string; portalTarget: string; status: string;
  notes: string | null; attendees: string | null; createdAt: string;
}
interface Member { id: number; fullName: string; photoUrl: string | null; role: string; }

const statusConfig: Record<string,{label:string;icon:React.ReactNode;color:string}> = {
  scheduled: { label:"Upcoming", icon:<Clock className="h-3.5 w-3.5"/>, color:"bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  completed: { label:"Completed", icon:<CheckCircle2 className="h-3.5 w-3.5"/>, color:"bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  cancelled: { label:"Cancelled", icon:<XCircle className="h-3.5 w-3.5"/>, color:"bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export default function PastorMeetings() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Meeting|null>(null);
  const [form, setForm] = useState({ title:"", description:"", agenda:"", scheduledAt:"", location:"Main Hall", notes:"" });
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [markSearch, setMarkSearch] = useState("");
  const [markedAttendees, setMarkedAttendees] = useState<string[]>([]);

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["meetings", "pastor"],
    queryFn: () => axios.get("/api/meetings?target=pastor").then(r=>r.data).catch(()=>[] as Meeting[]),
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members-list-meetings"],
    queryFn: () => axios.get("/api/members").then(r => r.data as Member[]).catch(() => [] as Member[]),
    staleTime: 60_000,
  });

  const allMeetings = meetings as Meeting[];
  const now = new Date();
  const upcoming = allMeetings.filter(m => new Date(m.scheduledAt) >= now).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
  const past = allMeetings.filter(m => new Date(m.scheduledAt) < now).sort((a,b)=>b.scheduledAt.localeCompare(a.scheduledAt));

  const create = useMutation({
    mutationFn: (data: typeof form & { attendees: string }) => axios.post("/api/meetings", { ...data, portalTarget:"pastor" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); setShowForm(false); setSelectedAttendees([]); setForm({title:"",description:"",agenda:"",scheduledAt:"",location:"Main Hall",notes:""}); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{status:string;notes:string;attendees:string}> }) => axios.patch(`/api/meetings/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setSelected(prev => prev ? { ...prev, ...vars.data } : null);
      setEditingNotes(false);
    },
  });

  function toggle(list: string[], setList: (v: string[]) => void, name: string) {
    setList(list.includes(name) ? list.filter(n => n !== name) : [...list, name]);
  }

  const filteredForCreate = (members as Member[]).filter(m => m.fullName.toLowerCase().includes(attendeeSearch.toLowerCase())).slice(0, 8);
  const filteredForMark = (members as Member[]).filter(m => m.fullName.toLowerCase().includes(markSearch.toLowerCase())).slice(0, 10);

  function openMeeting(m: Meeting) {
    setSelected(m);
    setMarkedAttendees(m.attendees ? m.attendees.split(",").map(s=>s.trim()).filter(Boolean) : []);
    setMarkSearch("");
    setEditingNotes(false);
    setNotesValue(m.notes ?? "");
  }

  function saveAttendees() {
    if (!selected) return;
    update.mutate({ id: selected.id, data: { attendees: markedAttendees.join(", "), status: "completed" } });
  }

  return (
    <PortalLayout navItems={pastorNavItems} portalLabel="Pastor Portal">
      <PageHeader title="Meetings" description={`${upcoming.length} upcoming · ${past.length} completed`}
        actions={<button onClick={() => setShowForm(true)} className="blue-gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" />Schedule Meeting</button>} />

      {allMeetings.length === 0 ? (
        <div className="glass-card p-12 text-center"><Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3"/><p className="text-muted-foreground">No meetings scheduled yet.</p></div>
      ) : (
        <div className="space-y-6 p-6">
          {upcoming.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h3>
              <div className="space-y-3">
                {upcoming.map(m=>(
                  <div key={m.id} className="glass-card p-4 hover:shadow-md transition-all cursor-pointer" onClick={()=>openMeeting(m)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{m.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(m.scheduledAt).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} at {new Date(m.scheduledAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{m.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[m.status]?.color}`}>
                          {statusConfig[m.status]?.icon}{statusConfig[m.status]?.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
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
                {past.slice(0,8).map(m=>(
                  <div key={m.id} className="glass-card p-4 opacity-80 hover:opacity-100 hover:shadow-md transition-all cursor-pointer" onClick={()=>openMeeting(m)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{m.title}</p>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(m.scheduledAt).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
                        {m.attendees && <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><UserCheck className="h-3 w-3 text-green-500"/>{m.attendees.split(",").filter(Boolean).length} attended</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[m.status]?.color}`}>{statusConfig[m.status]?.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meeting Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div>
                <h3 className="font-semibold">{selected.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selected.scheduledAt).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · {selected.location}
                </p>
              </div>
              <button onClick={()=>setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4"/></button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${statusConfig[selected.status]?.color}`}>
                  {statusConfig[selected.status]?.icon}{statusConfig[selected.status]?.label}
                </span>
                {selected.status !== "completed" && (
                  <button onClick={() => update.mutate({id:selected.id,data:{status:"completed"}})}
                    className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium">
                    Mark Completed
                  </button>
                )}
                {selected.status !== "cancelled" && (
                  <button onClick={() => update.mutate({id:selected.id,data:{status:"cancelled"}})}
                    className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium">
                    Cancel
                  </button>
                )}
              </div>

              {selected.agenda && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agenda</p>
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-sans bg-muted/40 rounded-xl p-3">{selected.agenda}</pre>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attendance</p>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input className="w-full text-xs bg-muted rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Search members to mark attendance…"
                    value={markSearch} onChange={e => setMarkSearch(e.target.value)} />
                </div>
                {markSearch && (
                  <div className="max-h-32 overflow-y-auto border border-border rounded-xl divide-y divide-border/30 mb-2">
                    {filteredForMark.map(m => (
                      <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer">
                        <input type="checkbox" className="rounded" checked={markedAttendees.includes(m.fullName)}
                          onChange={() => toggle(markedAttendees, setMarkedAttendees, m.fullName)} />
                        <span className="text-xs">{m.fullName}</span>
                        <span className="text-[10px] text-muted-foreground capitalize ml-auto">{m.role}</span>
                      </label>
                    ))}
                  </div>
                )}
                {markedAttendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {markedAttendees.map(n => (
                      <span key={n} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-medium">
                        <UserCheck className="h-2.5 w-2.5"/>{n}
                        <button type="button" onClick={() => toggle(markedAttendees, setMarkedAttendees, n)} className="ml-0.5 hover:opacity-70"><X className="h-2.5 w-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <button onClick={saveAttendees} disabled={update.isPending}
                  className="w-full py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity">
                  {update.isPending ? "Saving…" : `Save Attendance (${markedAttendees.length} present)`}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meeting Notes</p>
                  {!editingNotes && (
                    <button onClick={() => { setEditingNotes(true); setNotesValue(selected.notes ?? ""); }}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      {selected.notes ? "Edit" : "Add Notes"}
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea className="w-full bg-muted rounded-xl px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/40" rows={4}
                      placeholder="Write meeting notes, decisions, action items…"
                      value={notesValue} onChange={e => setNotesValue(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingNotes(false)} className="flex-1 py-2 rounded-xl text-sm bg-muted">Cancel</button>
                      <button onClick={() => update.mutate({id:selected.id,data:{notes:notesValue}})} disabled={update.isPending}
                        className="flex-1 py-2 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">
                        {update.isPending ? "Saving…" : "Save Notes"}
                      </button>
                    </div>
                  </div>
                ) : selected.notes ? (
                  <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground bg-muted/40 rounded-xl p-3">{selected.notes}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Schedule Meeting</h3><button onClick={()=>setShowForm(false)}><X className="h-4 w-4"/></button></div>
            {[
              {label:"Title *",key:"title",placeholder:"Meeting title"},
              {label:"Description",key:"description",placeholder:"Brief description"},
              {label:"Location",key:"location",placeholder:"e.g. Main Hall"},
            ].map(field=>(
              <div key={field.key}>
                <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                <input className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e=>setForm(p=>({...p,[field.key]:e.target.value}))} />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date & Time *</label>
              <input type="datetime-local" className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={form.scheduledAt} onChange={e=>setForm(p=>({...p,scheduledAt:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Agenda</label>
              <textarea className="w-full bg-muted rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/40" rows={4}
                placeholder="Meeting agenda items…"
                value={form.agenda} onChange={e=>setForm(p=>({...p,agenda:e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Expected Attendees (optional)</label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input className="w-full text-xs bg-muted rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Search members…"
                  value={attendeeSearch} onChange={e => setAttendeeSearch(e.target.value)} />
              </div>
              {attendeeSearch && (
                <div className="max-h-28 overflow-y-auto border border-border rounded-lg divide-y divide-border/30 mb-2">
                  {filteredForCreate.map(m => (
                    <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                      <input type="checkbox" className="rounded" checked={selectedAttendees.includes(m.fullName)}
                        onChange={() => toggle(selectedAttendees, setSelectedAttendees, m.fullName)} />
                      <span className="text-xs">{m.fullName}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedAttendees.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAttendees.map(n => (
                    <span key={n} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {n}
                      <button type="button" onClick={() => toggle(selectedAttendees, setSelectedAttendees, n)}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={()=>{ if(form.title&&form.scheduledAt) create.mutate({ ...form, attendees: selectedAttendees.join(", ") }); }}
                disabled={!form.title||!form.scheduledAt||create.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant context="pastor meeting management and pastoral council planning" suggestions={[
        "Suggest agenda items for a pastoral council meeting",
        "How should I run an effective pastoral meeting?",
        "Help me write minutes for a completed meeting",
        "What pastoral matters should be reviewed this month?",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
