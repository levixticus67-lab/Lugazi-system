import { useListEvents } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { workforceNavItems } from "./navItems";
import { Clock, MapPin, Users, CalendarDays } from "lucide-react";
import { useState } from "react";

type Event = { id: number; title: string; description?: string | null; date: string; time: string; location: string; category: string; attendeeCount: number };

const CATEGORIES = ["service","youth","bible_study","conference","prayer","outreach","other"];
const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  service:     { label: "Service",     color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  youth:       { label: "Youth",       color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  bible_study: { label: "Bible Study", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  conference:  { label: "Conference",  color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  prayer:      { label: "Prayer",      color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  outreach:    { label: "Outreach",    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  other:       { label: "Other",       color: "bg-muted text-muted-foreground" },
};

export default function WorkforceEvents() {
  const { data: events = [], isLoading } = useListEvents();
  const [filterCat, setFilterCat] = useState("all");

  const all = events as Event[];
  const now = new Date();
  const upcoming = all.filter(e => new Date(e.date) >= now).sort((a,b)=>a.date.localeCompare(b.date));
  const past     = all.filter(e => new Date(e.date) <  now).sort((a,b)=>b.date.localeCompare(a.date));
  const applyFilter = (list: Event[]) => filterCat === "all" ? list : list.filter(e => e.category === filterCat);

  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Events" description={`${upcoming.length} upcoming · ${past.length} past`} />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button onClick={() => setFilterCat("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat === "all" ? "blue-gradient-bg text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          All ({all.length})
        </button>
        {CATEGORIES.map(c => {
          const count = all.filter(e => e.category === c).length;
          if (!count) return null;
          const cfg = CAT_CONFIG[c];
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat === c ? `${cfg.color} shadow ring-1 ring-current/30` : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="glass-card h-24 animate-pulse" />)}</div>
      ) : all.length === 0 ? (
        <div className="glass-card p-12 text-center"><CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground font-medium">No events yet</p></div>
      ) : (
        <div className="space-y-5">
          {applyFilter(upcoming).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">
                {applyFilter(upcoming).map(e => {
                  const cfg = CAT_CONFIG[e.category] ?? CAT_CONFIG.other;
                  const d = new Date(e.date + "T00:00:00");
                  return (
                    <div key={e.id} className="glass-card overflow-hidden flex hover:shadow-md transition-all">
                      <div className="w-16 shrink-0 blue-gradient-bg flex flex-col items-center justify-center py-4 text-white">
                        <span className="text-2xl font-bold leading-none">{d.toLocaleDateString("en-UG",{day:"2-digit"})}</span>
                        <span className="text-[10px] font-semibold tracking-wider mt-0.5">{d.toLocaleDateString("en-UG",{month:"short"}).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">{e.title}</p>
                            <p className="text-xs text-muted-foreground">{d.toLocaleDateString("en-UG",{weekday:"long"})}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{e.time}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{e.location}</span>
                          {e.attendeeCount > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{e.attendeeCount} attended</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {applyFilter(past).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h3>
              <div className="space-y-3">
                {applyFilter(past).map(e => {
                  const cfg = CAT_CONFIG[e.category] ?? CAT_CONFIG.other;
                  const d = new Date(e.date + "T00:00:00");
                  return (
                    <div key={e.id} className="glass-card overflow-hidden flex opacity-60 hover:opacity-100 transition-all">
                      <div className="w-16 shrink-0 bg-muted flex flex-col items-center justify-center py-4 text-muted-foreground">
                        <span className="text-2xl font-bold leading-none">{d.toLocaleDateString("en-UG",{day:"2-digit"})}</span>
                        <span className="text-[10px] font-semibold tracking-wider mt-0.5">{d.toLocaleDateString("en-UG",{month:"short"}).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm">{e.title}</p>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{e.time}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{e.location}</span>
                          {e.attendeeCount > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{e.attendeeCount} attended</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
