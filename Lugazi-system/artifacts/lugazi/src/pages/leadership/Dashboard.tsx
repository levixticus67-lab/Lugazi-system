import { useGetDashboardStats } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { leadershipNavItems } from "./navItems";
import { Users, CalendarCheck, Heart, FileText } from "lucide-react";

export default function LeadershipDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Leadership Dashboard" description="Branch and ministry overview" />
      {isLoading ? <div className="text-muted-foreground text-sm">Loading...</div> : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Members" value={stats.totalMembers} icon={<Users className="h-5 w-5" />} />
          <StatCard title="This Week Attendance" value={stats.thisWeekAttendance} subtitle={`Last week: ${stats.lastWeekAttendance}`} icon={<CalendarCheck className="h-5 w-5" />} />
          <StatCard title="Pending Welfare" value={stats.pendingWelfare} icon={<Heart className="h-5 w-5" />} />
          <StatCard title="Upcoming Events" value={stats.upcomingEvents} icon={<FileText className="h-5 w-5" />} />
        </div>
      ) : null}
    </PortalLayout>
  );
}
