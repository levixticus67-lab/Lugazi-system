import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { leadershipNavItems } from "./navItems";
import { Calendar, Clock, MapPin, Users, Plus, X, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

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

const mockMeetings: Meeting[] = [
  { id:1, title:"Leadership Council Meeting", description:"Monthly leadership review", agenda:"1. Ministry updates\n2. Member welfare\n3. Upcoming events\n4. Financial report", scheduledAt: new Date(Date.now()+3*86400000).toISOString(), location:"Main Hall", portalTarget:"leadership", status:"scheduled", notes:null, attendees:null, createdAt: new Date().toISOString() },
  { id:2, title:"Department Heads Briefing", description:"Weekly check-in", agenda:"Department activity reports", scheduledAt: new Date(Date.now()+7*86400000).toISOString(), location:"Conference Room", portalTarget:"all", status:"scheduled", notes:null, attendees:null, createdAt: new Date().toISOString() },
  { id:3, title:"Evangelism Committee", description:"Plan for upcoming outreach", agenda:"1. Outreach targets\n2. Resource allocation\n3. Team assignments", scheduledAt: new Date(Date.now()-2*86400000).toISOString(), location:"Room B", portalTarget:"leadership", status:"completed", notes:"Great session. Action items assigned.", attendees:"James, Grace, Moses, Ruth", createdAt: new Date().toISOString() },
];

const statusConfig: Record<string,{label:string;icon:any;color:string}> = {
  scheduled: { label:"Upcoming", icon:<Clock className="h-3.5 w-3.5"/>, color:"bg-blue-100 text-blue-700" },
  completed: { label:"Completed", icon:<CheckCircle2 className="h-3.5 w-3.5"/>, color:"bg-green-100 text-green-700" },
  cancelled: { label:"Cancelled", icon:<XCircle className="h-3.5 w-3.5"/>, color:"bg-red-100 text-red-700" },
};

export default function LeadershipMeetings() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Meeting|null>(null);
  const [form, setForm] = useState({ title:"", description:"", agenda:"", scheduledAt:"", location:"Main Hall", notes:"" });

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["meetings","leadership"],
    queryFn: () => axios.get("/api/meetings?target=leadership").then(r=>r.data).catch(()=>[] as Meeting[]),
  });

  const display = meetings.length > 0 ? meetings : mockMeetings;

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/meetings", { ...data, portalTarget:"leadership" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); setShowForm(false); },
  });

  const upcoming = display.filter(m=>m.status==="scheduled" && new Date(m.scheduledAt)>=new Date());
  const past = display.filter(m=>m.status==="completed" || new Date(m.scheduledAt)<new Date());

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
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${statusConfig[selected.status]?.color}`}>
                {statusConfig[selected.status]?.icon}{statusConfig[selected.status]?.label}
              </span>
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
            {selected.attendees && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attendees</p>
                <p className="text-sm">{selected.attendees}</p>
              </div>
            )}
            {selected.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Minutes / Notes</p>
                <div className="bg-muted rounded-lg p-3 text-sm">{selected.notes}</div>
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
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-muted">Cancel</button>
              <button onClick={()=>{if(form.title&&form.scheduledAt)create.mutate(form);}} disabled={!form.title||!form.scheduledAt} className="flex-1 py-2.5 rounded-xl text-sm blue-gradient-bg text-white font-semibold disabled:opacity-60">Schedule</button>
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
