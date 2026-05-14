import { useGetMemberStats } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { memberNavItems } from "./navItems";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarCheck, CalendarDays, Heart, Wallet } from "lucide-react";

export default function MemberDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetMemberStats();

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title={`Welcome, ${user?.displayName}`} description="Your personal church dashboard" />
      {isLoading ? <div className="text-muted-foreground text-sm">Loading...</div> : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="My Attendance" value={stats.myAttendanceCount} subtitle="Total check-ins" icon={<CalendarCheck className="h-5 w-5" />} />
          <StatCard title="My Giving" value={`UGX ${Number(stats.myGivingTotal).toLocaleString()}`} icon={<Wallet className="h-5 w-5" />} />
          <StatCard title="Welfare Requests" value={stats.pendingWelfareRequests} subtitle="Pending" icon={<Heart className="h-5 w-5" />} />
          <StatCard title="Upcoming Events" value={stats.upcomingEvents} icon={<CalendarDays className="h-5 w-5" />} />
        </div>
      ) : null}

      <div className="mt-6 bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h2 className="font-serif text-lg font-semibold mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "View Events", href: "/member/events" },
            { label: "Submit Welfare", href: "/member/welfare" },
            { label: "Request Role Upgrade", href: "/member/upgrade" },
            { label: "My QR Code", href: "/member/qr" },
            { label: "My Profile", href: "/member/profile" },
            { label: "Attendance History", href: "/member/attendance" },
          ].map(l => (
            <a key={l.href} href={l.href} className="block p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm font-medium text-center" data-testid={`link-${l.label.toLowerCase().replace(/\s/g, "-")}`}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
