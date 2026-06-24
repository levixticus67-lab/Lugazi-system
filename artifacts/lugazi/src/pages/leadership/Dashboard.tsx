import { useGetDashboardStats } from "@workspace/api-client-react";
  import { useQuery } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import StatCard from "@/components/StatCard";
  import LiveChat from "@/components/LiveChat";
  import BroadcastCard from "@/components/BroadcastCard";
  import HeroBanner from "@/components/HeroBanner";
  import TestimonySlider from "@/components/TestimonySlider";
  import BirthdayCard from "@/components/BirthdayCard";
  import MeetingDashCard from "@/components/MeetingDashCard";
  import CellLeaderCard from "@/components/CellLeaderCard";
  import ChurchValuesCard from "@/components/ChurchValuesCard";
  import { leadershipNavItems } from "./navItems";
  import { Users, CalendarCheck, Heart, CalendarDays } from "lucide-react";
  import {
    RadialBarChart, RadialBar, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
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
            <HeroBanner />
            <BroadcastCard />

            <MeetingDashCard portalTarget="leadership" />
            <CellLeaderCard />

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
                    <RadialBarChart cx="50%" cy="55%" innerRadius="20%" outerRadius="88%"
                      data={(charts?.weeklyAttendance ?? []).slice(-4).map((w) => ({ name: w.week, count: w.count }))}>
                      <RadialBar dataKey="count" cornerRadius={6} label={false}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </RadialBar>
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => [v, "Attendance"]} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card p-5 card-hover">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="font-serif text-sm font-semibold">Member Growth</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={charts.memberGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-lead-growth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="members" stroke="#10b981" strokeWidth={2.5} fill="url(#grad-lead-growth)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <ChurchValuesCard />
          </div>
        ) : (
          <div className="glass-card p-8 text-center text-muted-foreground">Could not load dashboard data.</div>
        )}

        <LiveChat />
      </PortalLayout>
    );
  }
  