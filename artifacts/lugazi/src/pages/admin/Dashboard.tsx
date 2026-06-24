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
  import { adminNavItems } from "./navItems";
  import {
    Users, UsersRound, CalendarCheck, Heart,
    Bell, UserPlus, TrendingUp, Calendar, Activity,
  } from "lucide-react";
  import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
  } from "recharts";

  type ChartData = {
    weeklyAttendance: { week: string; count: number }[];
    memberGrowth: { month: string; members: number }[];
  };

  type ActivityItem = { type: string; description: string; date: string; icon: string };

  const REFETCH_MS = 30_000;
  const ACTIVITY_REFETCH_MS = 15_000;

  function LiveBadge({ updatedAt }: { updatedAt: Date | null }) {
    if (!updatedAt) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        LIVE · {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }

  function ActivityIcon({ icon }: { icon: string }) {
    const cls = "h-4 w-4";
    if (icon === "user") return <UserPlus className={`${cls} text-blue-500`} />;
    if (icon === "heart") return <Heart className={`${cls} text-rose-500`} />;
    if (icon === "calendar") return <Calendar className={`${cls} text-purple-500`} />;
    return <Activity className={`${cls} text-muted-foreground`} />;
  }

  export default function AdminDashboard() {
    const { data: stats, isLoading: statsLoading, dataUpdatedAt } = useGetDashboardStats(
      { query: { refetchInterval: REFETCH_MS } } as Parameters<typeof useGetDashboardStats>[0],
    );

    const { data: charts, isLoading: chartsLoading } = useQuery<ChartData>({
      queryKey: ["dashboard-charts"],
      queryFn: () => axios.get<ChartData>("/api/dashboard/charts").then((r) => r.data),
      refetchInterval: REFETCH_MS,
    });

    const { data: activity = [], isLoading: activityLoading, dataUpdatedAt: activityUpdatedAt } = useQuery<ActivityItem[]>({
      queryKey: ["dashboard-activity"],
      queryFn: () => axios.get<ActivityItem[]>("/api/dashboard/activity").then((r) => r.data),
      refetchInterval: ACTIVITY_REFETCH_MS,
      staleTime: 0,
      retry: 2,
    });

    const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
    const activityRefreshedAt = activityUpdatedAt ? new Date(activityUpdatedAt) : null;

    return (
      <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
        <PageHeader
          title="Dashboard"
          description="Church-wide overview and live metrics"
          actions={<LiveBadge updatedAt={updatedAt} />}
        />

        {statsLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
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
              <StatCard title="Total Members"  value={stats.totalMembers}           icon={<Users className="h-5 w-5" />} />
              <StatCard title="Cell Groups"    value={stats.cellGroups}             icon={<UsersRound className="h-5 w-5" />} />
              <StatCard title="Attendance Today" value={stats.attendanceToday}      icon={<CalendarCheck className="h-5 w-5" />} />
              <StatCard title="Pending Welfare" value={stats.pendingWelfareRequests} icon={<Heart className="h-5 w-5" />} />
              <StatCard title="Role Requests"  value={stats.pendingRoleRequests}    icon={<Bell className="h-5 w-5" />} />
              <StatCard title="New Members"    value={stats.newMembersThisMonth}    icon={<TrendingUp className="h-5 w-5" />} />
            </div>

            {charts && !chartsLoading && (
              <div className="glass-card p-5 animate-slide-in-up card-hover">
                <h2 className="font-serif text-sm font-semibold mb-4 flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary"/>Weekly Attendance</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={charts.weeklyAttendance.map((d, i, arr) => ({ ...d, avg: Math.round(arr.slice(Math.max(0,i-2),i+1).reduce((s,x)=>s+x.count,0)/Math.min(i+1,3)) }))} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-admin-bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.85}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.25}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="url(#grad-admin-bar)" radius={[4, 4, 0, 0]} name="Attendance" />
                  <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="3-Wk Avg" />
                </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="glass-card p-5 animate-slide-in-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Recent Activity</h2>
                {activityRefreshedAt && <LiveBadge updatedAt={activityRefreshedAt} />}
              </div>
              {activityLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-muted rounded animate-pulse"/>)}</div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 rounded-lg bg-muted shrink-0"><ActivityIcon icon={item.icon} /></div>
                      <p className="flex-1 text-foreground">{item.description}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
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
