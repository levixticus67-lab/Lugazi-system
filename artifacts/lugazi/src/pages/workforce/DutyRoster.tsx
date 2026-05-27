import { useQuery } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { workforceNavItems } from "./navItems";
  import { Calendar, Clock, MapPin, Info } from "lucide-react";

  interface DutyEntry { id: number; assignedToName: string; serviceDate: string; serviceType: string; dutyRole: string; location: string | null; notes: string | null; createdAt: string; }

  function isUpcoming(date: string) { return new Date(date) >= new Date(new Date().toDateString()); }

  export default function WorkforceDutyRoster() {
    const { data: duties = [], isLoading } = useQuery<DutyEntry[]>({
      queryKey: ["my-duty-roster"],
      queryFn: () => axios.get<DutyEntry[]>("/api/duty-roster").then(r => r.data),
      refetchInterval: 60_000,
    });

    const upcoming = duties.filter(d => isUpcoming(d.serviceDate));
    const past = duties.filter(d => !isUpcoming(d.serviceDate));

    return (
      <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
        <PageHeader title="My Duty Roster" description="Your upcoming and past service assignments" />

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="glass-card p-5 h-20 animate-pulse"/>)}</div>
        ) : duties.length === 0 ? (
          <div className="glass-card p-12 text-center"><Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">No duties scheduled yet. Check back soon.</p></div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="font-serif text-base font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary"/> Upcoming Duties</h2>
                <div className="space-y-3">
                  {upcoming.map(d => (
                    <div key={d.id} className="glass-card p-5 border-l-4 border-primary">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{d.dutyRole}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{d.serviceType}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{new Date(d.serviceDate).toLocaleDateString("en-UG", {weekday:"long", year:"numeric", month:"long", day:"numeric"})}</span>
                            {d.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{d.location}</span>}
                          </div>
                          {d.notes && <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0"/>{d.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="font-serif text-base font-semibold mb-3 text-muted-foreground">Past Duties</h2>
                <div className="space-y-3 opacity-70">
                  {past.map(d => (
                    <div key={d.id} className="glass-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{d.dutyRole}</span>
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{d.serviceType}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(d.serviceDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PortalLayout>
    );
  }
  