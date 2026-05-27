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

            {charts?.memberGrowth && (
              <div className="glass-card p-5 animate-slide-in-up card-hover">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-sm font-semibold">Church Growth</h2>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={charts.memberGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="members" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
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
  