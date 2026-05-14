import { useGetMemberStats } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { workforceNavItems } from "./navItems";
import { CalendarCheck, CalendarDays, Heart, Wallet } from "lucide-react";

export default function WorkforceDashboard() {
  const { data: stats, isLoading } = useGetMemberStats();
  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Workforce Dashboard" description="Your ministry activity overview" />
      {isLoading ? <div className="text-muted-foreground text-sm">Loading...</div> : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="My Attendance" value={stats.myAttendanceCount} icon={<CalendarCheck className="h-5 w-5" />} />
          <StatCard title="My Giving (UGX)" value={Number(stats.myGivingTotal).toLocaleString()} icon={<Wallet className="h-5 w-5" />} />
          <StatCard title="Pending Welfare" value={stats.pendingWelfareRequests} icon={<Heart className="h-5 w-5" />} />
          <StatCard title="Upcoming Events" value={stats.upcomingEvents} icon={<CalendarDays className="h-5 w-5" />} />
        </div>
      ) : null}
    </PortalLayout>
  );
}
