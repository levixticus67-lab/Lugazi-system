import { useGetMemberStats } from "@workspace/api-client-react";
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
  import { workforceNavItems } from "./navItems";
  import { CalendarCheck, CalendarDays, Heart, Wallet } from "lucide-react";
  import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer,
  } from "recharts";

  type ChartData = {
    weeklyAttendance: { week: string; count: number }[];
  };

  const REFETCH_MS = 30_000;

  export default function WorkforceDashboard() {
    const { data: stats, isLoading } = useGetMemberStats({ query: { refetchInterval: REFETCH_MS } } as any);
    const { data: charts } = useQuery<ChartData>({
      queryKey: ["workforce-charts"],
      queryFn: () => axios.get<ChartData>("/api/dashboard/charts").then(r => r.data),
      refetchInterval: REFETCH_MS,
    });

    return (
      <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
        <PageHeader title="Workforce Dashboard" description="Your ministry activity overview" />

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <HeroBanner />
            <BroadcastCard />

            <MeetingDashCard portalTarget="congregation" />
            <MeetingDashCard portalTarget="all" />
            <CellLeaderCard />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TestimonySlider />
              <BirthdayCard />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-in-up">
              <StatCard title="My Attendance" value={stats.myAttendanceCount} icon={<CalendarCheck className="h-5 w-5" />} />
              <StatCard title="My Giving (UGX)" value={Number(stats.myGivingTotal).toLocaleString()} icon={<Wallet className="h-5 w-5" />} />
              <StatCard title="Pending Welfare" value={stats.pendingWelfareRequests} icon={<Heart className="h-5 w-5" />} />
              <StatCard title="Upcoming Events" value={stats.upcomingEvents} icon={<CalendarDays className="h-5 w-5" />} />
            </div>

            <div className="glass-card p-5 animate-slide-in-up stagger-2 card-hover">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-sm font-semibold">My Engagement</h2>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                    { metric: "Attendance",  score: Math.min(100, Math.round(((stats?.myAttendanceCount ?? 0) / 4) * 100)) },
                    { metric: "My Giving",   score: Math.min(100, Math.round((Number(stats?.myGivingTotal ?? 0) / 50_000) * 100)) },
                    { metric: "Events",      score: Math.min(100, (stats?.upcomingEvents ?? 0) * 25) },
                    { metric: "Welfare",     score: Math.min(100, (stats?.pendingWelfareRequests ?? 0) * 25) },
                    { metric: "Commitment",  score: Math.min(100, Math.round(((stats?.myAttendanceCount ?? 0) / 5) * 100)) },
                  ]}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Score"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            

            <ChurchValuesCard />
          </div>
        ) : (
          <div className="glass-card p-8 text-center text-muted-foreground">Could not load dashboard data.</div>
        )}

        <LiveChat />
      </PortalLayout>
    );
  }
  