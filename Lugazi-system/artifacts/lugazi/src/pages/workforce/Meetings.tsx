import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import LiveChat from "@/components/LiveChat";
import AIAssistant from "@/components/AIAssistant";
import { workforceNavItems } from "./navItems";
import { Calendar, Clock, MapPin, CheckCircle2, XCircle } from "lucide-react";

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  scheduledAt: string;
  location: string;
  status: string;
  agenda: string | null;
}

const mockMeetings: Meeting[] = [
  { id:1, title:"Workforce Briefing", description:"Monthly workforce team update", scheduledAt: new Date(Date.now()+2*86400000).toISOString(), location:"Main Hall", status:"scheduled", agenda:"1. Department updates\n2. Upcoming events\n3. Service roster" },
  { id:2, title:"Media Team Meeting", description:"Planning for Sunday service coverage", scheduledAt: new Date(Date.now()+5*86400000).toISOString(), location:"Media Room", status:"scheduled", agenda:"Review equipment checklist" },
  { id:3, title:"Ushering Department", description:"Review entry procedures", scheduledAt: new Date(Date.now()-3*86400000).toISOString(), location:"Church Foyer", status:"completed", agenda:"Seating arrangements for special services" },
];

export default function WorkforceMeetings() {
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["meetings-workforce"],
    queryFn: () => axios.get("/api/meetings?target=workforce").then(r=>r.data).catch(()=>[] as Meeting[]),
  });

  const display = meetings.length > 0 ? meetings : mockMeetings;
  const upcoming = display.filter(m=>m.status==="scheduled" && new Date(m.scheduledAt)>=new Date());
  const past = display.filter(m=>m.status==="completed" || new Date(m.scheduledAt)<new Date());

  return (
    <PortalLayout title="DCL Lugazi ERP" navItems={workforceNavItems}>
      <PageHeader title="Meetings" subtitle="View scheduled meetings and briefings for your department" />

      <div className="p-6 space-y-6">
        {upcoming.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Upcoming Meetings</h3>
            <div className="space-y-3">
              {upcoming.map(m=>(
                <div key={m.id} className="glass-card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="blue-gradient-bg rounded-lg p-2.5 shrink-0"><Calendar className="h-4 w-4 text-white"/></div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{m.title}</h4>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(m.scheduledAt).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})} at {new Date(m.scheduledAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{m.location}</span>
                      </div>
                      {m.agenda && (
                        <div className="mt-3 bg-muted rounded-lg p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Agenda</p>
                          <p className="text-xs whitespace-pre-line">{m.agenda}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcoming.length === 0 && !isLoading && (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-primary"/>
            <p className="font-medium">No upcoming meetings scheduled.</p>
            <p className="text-xs mt-1">Check back later or contact your department leader.</p>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Past Meetings</h3>
            <div className="space-y-2">
              {past.map(m=>(
                <div key={m.id} className="glass-card p-4 opacity-75">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(m.scheduledAt).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} · {m.location}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3"/>Done</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AIAssistant context="workforce meetings and department coordination" suggestions={[
        "How should I prepare for my department meeting?",
        "What makes a productive church workforce briefing?",
        "Suggest ways to improve coordination between departments",
      ]} />
      <LiveChat />
    </PortalLayout>
  );
}
