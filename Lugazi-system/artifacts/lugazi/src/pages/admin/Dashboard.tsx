import { useGetDashboardStats } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { adminNavItems } from "./navItems";
import {
  Users, GitBranch, UsersRound, CalendarCheck, Wallet, Heart,
  Bell, UserPlus, TrendingUp, Calendar, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type ChartData = {
  weeklyAttendance: { week: string; count: number }[];
  monthlyFinance: { month: string; income: number; expenses: number }[];
  memberGrowth: { month: string; members: number }[];
};

type ActivityItem = { type: string; description: string; date: string; icon: string };

const REFETCH_MS = 30_000;

function formatUGX(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

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
  if (icon === "user") return <UserPlus className={cn(cls, "text-blue-500")} />;
  if (icon === "wallet") return <Wallet className={cn(cls, "text-green-500")} />;
  if (icon === "heart") return <Heart className={cn(cls, "text-rose-500")} />;
  if (icon === "calendar") return <Calendar className={cn(cls, "text-purple-500")} />;
  return <RefreshCw className={cn(cls, "text-muted-foreground")} />;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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

  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ["dashboard-activity"],
    queryFn: () => axios.get<ActivityItem[]>("/api/dashboard/activity").then((r) => r.data),
    refetchInterval: REFETCH_MS,
  });

  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Dashboard"
        description="Church-wide overview and live metrics"
        actions={<LiveBadge updatedAt={updatedAt} />}
      />

      {statsLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Members" value={stats.totalMembers} subtitle={`${stats.activeMembers} active`} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Branches" value={stats.totalBranches} icon={<GitBranch className="h-5 w-5" />} />
            <StatCard title="Cell Groups" value={stats.totalGroups} icon={<UsersRound className="h-5 w-5" />} />
            <StatCard title="This Week Attendance" value={stats.thisWeekAttendance} subtitle={`Last week: ${stats.lastWeekAttendance}`} icon={<CalendarCheck className="h-5 w-5" />} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Monthly Income" value={`UGX ${Number(stats.monthlyIncome).toLocaleString()}`} icon={<Wallet className="h-5 w-5" />} />
            <StatCard title="Monthly Expenses" value={`UGX ${Number(stats.monthlyExpenses).toLocaleString()}`} icon={<Wallet className="h-5 w-5" />} />
            <StatCard title="Pending Welfare" value={stats.pendingWelfare} trend={stats.pendingWelfare > 0 ? "up" : "neutral"} icon={<Heart className="h-5 w-5" />} />
            <StatCard title="Role Requests" value={stats.pendingRoleRequests} subtitle="Awaiting approval" icon={<Bell className="h-5 w-5" />} />
          </div>

          {/* ── Charts Row ── */}
          {chartsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : charts ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weekly Attendance */}
                <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    <h2 className="font-serif text-sm font-semibold text-foreground">Weekly Attendance (8 weeks)</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={charts.weeklyAttendance} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Attendance"]} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Finance */}
                <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="h-4 w-4 text-green-500" />
                    <h2 className="font-serif text-sm font-semibold text-foreground">Monthly Finance (UGX)</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={charts.monthlyFinance} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={formatUGX} />
                      <Tooltip formatter={(v: number) => [`UGX ${v.toLocaleString()}`]} />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Member Growth */}
                <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <h2 className="font-serif text-sm font-semibold text-foreground">Member Growth (6 months)</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={charts.memberGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Members"]} />
                      <Area type="monotone" dataKey="members" stroke="hsl(var(--primary))" fill="url(#memberGrad)" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Activity Feed */}
                <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-serif text-sm font-semibold text-foreground">Recent Activity</h2>
                  </div>
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                  ) : (
                    <ul className="space-y-3 overflow-y-auto max-h-[200px] pr-1">
                      {activity.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 flex-shrink-0 p-1.5 bg-muted rounded-lg">
                            <ActivityIcon icon={item.icon} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground leading-tight truncate">{item.description}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(item.date).toLocaleString("en-UG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {/* ── Quick Actions ── */}
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Add Member", href: "/admin/members" },
                { label: "Record Finance", href: "/admin/finance" },
                { label: "Mark Attendance", href: "/admin/attendance" },
                { label: "Create Event", href: "/admin/events" },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="block p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm font-medium text-center"
                  data-testid={`action-${action.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </PortalLayout>
  );
}
