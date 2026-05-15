import { useGetDashboardStats } from "@workspace/api-client-react";
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
import { leadershipNavItems } from "./navItems";
import { Users, CalendarCheck, Heart, TrendingUp, CalendarDays } from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type ChartData = {
  weeklyAttendance: { week: string; count: number }[];
  memberGrowth: { month: string; members: number }[];
};

const REFETCH_MS = 30_000;

export default function LeadershipDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({ query: { refetchInterval: REFETCH_MS } } as any);
  const { data: charts } = useQuery<ChartData>({
    queryKey: ["leadership-charts"],
    queryFn: () => axios.get<ChartData>("/api/dashboard/charts").then(r => r.data),
    refetchInterval: REFETCH_MS,
  });

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Leadership Dashboard" description="Branch and ministry overview" />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <BroadcastCard />

          {/* Meeting card for leadership + Cell leader management */}
          <MeetingDashCard portalTarget="leadership" />
          <CellLeaderCard />

          {/* Testimonies + Birthdays row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TestimonySlider />
            <BirthdayCard />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-in-up">
            <StatCard title="Total Members" value={stats.totalMembers} icon={<Users className="h-5 w-5" />} />
            <StatCard title="This Week" value={stats.thisWeekAttendance} subtitle={`Last: ${stats.lastWeekAttendance}`} icon={<CalendarCheck className="h-5 w-5" />} />
            <StatCard title="Pending Welfare" value={stats.pendingWelfare} icon={<Heart className="h-5 w-5" />} />
            <StatCard title="Upcoming Events" value={stats.upcomingEvents} icon={<CalendarDays className="h-5 w-5" />} />
          </div>

          {charts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-in-up stagger-2">
              <div className="glass-card p-5 card-hover">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-sm font-semibold">Weekly Attendance</h2>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={charts.weeklyAttendance} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "Attendance"]} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card p-5 card-hover">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-sky-500" />
                  <h2 className="font-serif text-sm font-semibold">Member Growth</h2>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={charts.memberGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="memberGradL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "Members"]} />
                    <Area type="monotone" dataKey="members" stroke="hsl(217,91%,60%)" fill="url(#memberGradL)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : null}
      <LiveChat />
    </PortalLayout>
  );
}
