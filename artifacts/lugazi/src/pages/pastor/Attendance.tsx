import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { pastorNavItems } from "./navItems";
import { Users, CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AttendanceSummary = {
  eventId: number | null;
  eventName: string;
  count: number;
  lastCheckedIn: string;
};

export default function PastorAttendance() {
  const { data: summary = [], isLoading } = useQuery<AttendanceSummary[]>({
    queryKey: ["attendance-summary"],
    queryFn: () => axios.get<AttendanceSummary[]>("/api/attendance/summary").then(r => r.data),
    staleTime: 30_000,
  });

  const totalAttendees = summary.reduce((sum, s) => sum + s.count, 0);

  return (
    <PortalLayout navItems={pastorNavItems} portalLabel="Pastor Portal">
      <PageHeader
        title="Attendance Overview"
        description={`${summary.length} events · ${totalAttendees} total attendees`}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : summary.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          No attendance records yet.
        </div>
      ) : (
        <div className="space-y-3">
          {summary.map(s => (
            <div key={`${s.eventId ?? s.eventName}`} className="glass-card px-5 py-4 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{s.eventName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last check-in: {new Date(s.lastCheckedIn).toLocaleString()}
                </p>
              </div>
              <Badge className="flex items-center gap-1.5 shrink-0 text-sm px-3 py-1">
                <Users className="h-3.5 w-3.5" />
                {s.count}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
