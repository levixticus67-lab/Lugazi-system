import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { Cake, Users } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import Avatar from "@/components/Avatar";

interface Member {
  id: number;
  fullName: string;
  birthday: string | null;
  photoUrl?: string | null;
}

function getDaysUntilBirthday(birthday: string): number {
  const today = new Date();
  const [, month, day] = birthday.split("-").map(Number);
  const next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

function formatBirthday(birthday: string): string {
  const [, month, day] = birthday.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[month - 1]} ${day}`;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

export default function BirthdayCard() {
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members-birthday"],
    queryFn: () => axios.get("/api/members").then(r => r.data as Member[]).catch(() => []),
    staleTime: 300_000,
  });

  const withBirthday = members.filter(m => m.birthday);
  const today = new Date();

  const upcoming = [...withBirthday]
    .map(m => ({ ...m, daysUntil: getDaysUntilBirthday(m.birthday!) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  const todayBirthdays = upcoming.filter(m => m.daysUntil === 0);
  const upcomingOnly = upcoming.filter(m => m.daysUntil > 0);

  const monthData = MONTH_NAMES.map((name, idx) => ({
    name,
    count: withBirthday.filter(m => {
      const [, month] = m.birthday!.split("-").map(Number);
      return month === idx + 1;
    }).length,
  }));

  const pieData = monthData.filter(d => d.count > 0);

  const currentMonth = today.getMonth();
  const nextFewMonths = Array.from({ length: 6 }, (_, i) => {
    const idx = (currentMonth + i) % 12;
    return { name: MONTH_NAMES[idx], count: monthData[idx].count };
  });

  return (
    <div className="space-y-4">
      {todayBirthdays.length > 0 && (
        <div className="glass-card p-4 border border-pink-200 dark:border-pink-800 bg-pink-50/60 dark:bg-pink-950/30">
          <div className="flex items-center gap-2 mb-3">
            <Cake className="h-4 w-4 text-pink-500" />
            <span className="font-semibold text-sm text-pink-700 dark:text-pink-300">🎂 Today's Birthdays</span>
          </div>
          <div className="space-y-2">
            {todayBirthdays.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.fullName} photoUrl={m.photoUrl} size="md" />
                <div>
                  <p className="text-sm font-semibold">{m.fullName}</p>
                  <p className="text-xs text-muted-foreground">🎉 Happy Birthday!</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingOnly.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-sm">Upcoming Birthdays</span>
          </div>
          <div className="space-y-2.5">
            {upcomingOnly.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.fullName} photoUrl={m.photoUrl} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.fullName}</p>
                  <p className="text-xs text-muted-foreground">{formatBirthday(m.birthday!)}</p>
                </div>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {m.daysUntil === 1 ? "tomorrow" : `in ${m.daysUntil}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {withBirthday.length === 0 && (
        <div className="glass-card p-6 text-center">
          <Cake className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No birthday data available</p>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="glass-card p-4">
          <p className="font-semibold text-sm mb-3">Birthdays by Month</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="count" nameKey="name" label={({ name, count }) => `${name}: ${count}`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {nextFewMonths.some(m => m.count > 0) && (
        <div className="glass-card p-4">
          <p className="font-semibold text-sm mb-3">Next 6 Months</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={nextFewMonths}>
              <defs>
                <linearGradient id="bdayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#bdayGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
