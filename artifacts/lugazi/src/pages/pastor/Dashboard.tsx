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
import { pastorNavItems } from "./navItems";
import { Users, UsersRound, CalendarCheck, Heart, Bell, TrendingUp, Calendar, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type ChartData = { weeklyAttendance: { week: string; count: number }[] };
type ActivityItem = { type: string; description: string; date: string; icon: string };
const REFETCH_MS = 30_000;

function ActivityIcon({ icon }: { icon: string }) {
  if (icon === "user")     return <Users className="h-4 w-4 text-blue-500" />;
  if (icon === "heart")    return <Heart className="h-4 w-4 text-rose-500" />;
  if (icon === "calendar") return <Calendar className="h-4 w-4 text-purple-500" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

export default function PastorDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats(
    { query: { refetchInterval: REFETCH_MS } } as Parameters<typeof useGetDashboardStats>[0],
  );
  const { data: charts } = useQuery<ChartData>({
    queryKey: ["pastor-charts"],
    queryFn: () => axios.get<ChartData>("/api/dashboard/charts").then(r => r.data),
    refetchInterval: REFETCH_MS,
  });
  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ["pastor-activity"],
    queryFn: () => axios.get<ActivityItem[]>("/api/dashboard/activity").then(r => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  return (
    <PortalLayout navItems={pastorNavItems} portalLabel="Pastor Portal">
      <PageHeader title="Pastor Dashboard" description="Church-wide overview" />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <HeroBanner />
          <BroadcastCard />
          <MeetingDashCard portalTarget="all" />
          <CellLeaderCard />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TestimonySlider />
            <BirthdayCard />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-slide-in-up">
            <StatCard title="Total Members"    value={stats.totalMembers}           icon={<Users className="h-5 w-5" />} />
            <StatCard title="Cell Groups"      value={stats.cellGroups}             icon={<UsersRound className="h-5 w-5" />} />
            <StatCard title="Attendance Today" value={stats.attendanceToday}        icon={<CalendarCheck className="h-5 w-5" />} />
            <StatCard title="Pending Welfare"  value={stats.pendingWelfareRequests} icon={<Heart className="h-5 w-5" />} />
            <StatCard title="Role Requests"    value={stats.pendingRoleRequests}    icon={<Bell className="h-5 w-5" />} />
            <StatCard title="New Members"      value={stats.newMembersThisMonth}    icon={<TrendingUp className="h-5 w-5" />} />
          </div>

          {charts && (
            <div className="glass-card p-5 animate-slide-in-up card-hover">
              <h2 className="font-serif text-sm font-semibold mb-4 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />Weekly Attendance
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={(charts?.weeklyAttendance ?? []).map((d, i, arr) => ({
                    ...d,
                    avg: Math.round(arr.slice(Math.max(0,i-2),i+1).reduce((s,x)=>s+x.count,0)/Math.min(i+1,3)),
                  }))}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} name="Attendance" />
                  <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={false} name="3-Wk Avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activity.length > 0 && (
            <div className="glass-card p-5 animate-slide-in-up">
              <h2 className="font-serif text-sm font-semibold flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-primary" />Recent Activity
              </h2>
              <div className="space-y-3">
                {activity.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="p-1.5 rounded-lg bg-muted shrink-0"><ActivityIcon icon={item.icon} /></div>
                    <p className="flex-1 text-foreground">{item.description}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                ))}
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
