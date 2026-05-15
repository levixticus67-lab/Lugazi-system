import { useGetMemberStats } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import LiveChat from "@/components/LiveChat";
import BroadcastCard from "@/components/BroadcastCard";
import TestimonySlider from "@/components/TestimonySlider";
import BirthdayCard from "@/components/BirthdayCard";
import MeetingDashCard from "@/components/MeetingDashCard";
import CellLeaderCard from "@/components/CellLeaderCard";
import { memberNavItems } from "./navItems";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarCheck, CalendarDays, Heart, Wallet, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type ChartData = {
  memberGrowth: { month: string; members: number }[];
};

const REFETCH_MS = 60_000;

export default function MemberDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetMemberStats({ query: { refetchInterval: REFETCH_MS } } as any);
  const { data: charts } = useQuery<ChartData>({
    queryKey: ["member-charts"],
    queryFn: () => axios.get<ChartData>("/api/dashboard/charts").then(r => r.data),
    refetchInterval: REFETCH_MS,
  });

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title={`Welcome, ${user?.displayName}`} description="Your personal church dashboard" />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <BroadcastCard />

          {/* Meeting card for congregation + Cell leader card (if leader) */}
          <MeetingDashCard portalTarget="congregation" />
          <MeetingDashCard portalTarget="all" />
          <CellLeaderCard />

          {/* Testimonies + Birthdays row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TestimonySlider />
            <BirthdayCard />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-in-up">
            <StatCard title="My Attendance" value={stats.myAttendanceCount} subtitle="Total check-ins" icon={<CalendarCheck className="h-5 w-5" />} />
            <StatCard title="My Giving" value={`UGX ${Number(stats.myGivingTotal).toLocaleString()}`} icon={<Wallet className="h-5 w-5" />} />
            <StatCard title="Welfare Requests" value={stats.pendingWelfareRequests} subtitle="Pending" icon={<Heart className="h-5 w-5" />} />
            <StatCard title="Upcoming Events" value={stats.upcomingEvents} icon={<CalendarDays className="h-5 w-5" />} />
          </div>

          {charts && (
            <div className="glass-card p-5 animate-slide-in-up stagger-2 card-hover">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-sky-500" />
                <h2 className="font-serif text-sm font-semibold">Church Growth (6 months)</h2>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={charts.memberGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="memberGradM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Members"]} />
                  <Area type="monotone" dataKey="members" stroke="hsl(217,91%,60%)" fill="url(#memberGradM)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="glass-card p-5 animate-slide-in-up stagger-3">
            <h2 className="font-serif text-lg font-semibold mb-3">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "View Events", href: "/member/events" },
                { label: "Submit Welfare", href: "/member/welfare" },
                { label: "Request Role Upgrade", href: "/member/upgrade" },
                { label: "My QR Code", href: "/member/qr" },
                { label: "My Profile", href: "/member/profile" },
                { label: "Prayer Request", href: "/member/prayer" },
              ].map(l => (
                <a key={l.href} href={l.href}
                   className="block p-3 rounded-xl border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-center card-hover">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <LiveChat />
    </PortalLayout>
  );
}
