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
import { workforceNavItems } from "./navItems";
import { CalendarCheck, CalendarDays, Heart, Wallet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
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
          <BroadcastCard />

          {/* Testimonies + Birthdays row */}
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

          {charts && (
            <div className="glass-card p-5 animate-slide-in-up stagger-2 card-hover">
              <div className="flex items-center gap-2 mb-4">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-sm font-semibold">Church Weekly Attendance</h2>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={charts.weeklyAttendance} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Attendance"]} />
                  <Bar dataKey="count" fill="hsl(217,91%,45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="glass-card p-5 animate-slide-in-up stagger-3">
            <h2 className="font-serif text-base font-semibold mb-3">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Check In", href: "/workforce/attendance" },
                { label: "Events", href: "/workforce/events" },
                { label: "Upload Media", href: "/workforce/media" },
                { label: "Reports", href: "/workforce/reports" },
              ].map(a => (
                <a key={a.href} href={a.href}
                   className="block p-3 rounded-xl border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-center card-hover">
                  {a.label}
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
