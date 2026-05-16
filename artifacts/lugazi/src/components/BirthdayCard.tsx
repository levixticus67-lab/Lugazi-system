import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { Cake, Users } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface Member {
  id: number;
  fullName: string;
  birthday: string | null;
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
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["members-birthdays"],
    queryFn: () => axios.get("/api/members").then(r => r.data as Member[]).catch(() => [] as Member[]),
    staleTime: 300_000,
  });

  const withBirthday = (members as Member[]).filter(m => m.birthday);

  const upcoming = withBirthday
    .map(m => ({ ...m, daysUntil: getDaysUntilBirthday(m.birthday!) }))
    .filter(m => m.daysUntil <= 90)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 10);

  const today = upcoming.filter(m => m.daysUntil === 0);
  const thisWeek = upcoming.filter(m => m.daysUntil > 0 && m.daysUntil <= 7);
  const thisMonth = upcoming.filter(m => m.daysUntil > 7 && m.daysUntil <= 30);
  const later = upcoming.filter(m => m.daysUntil > 30);

  const pieData = [
    { name: "Today", value: today.length, color: "#ef4444" },
    { name: "This week", value: thisWeek.length, color: "#f59e0b" },
    { name: "This month", value: thisMonth.length, color: "#3b82f6" },
    { name: "Next 3 months", value: later.length, color: "#10b981" },
  ].filter(d => d.value > 0);

  const monthData = MONTH_NAMES.map((name, i) => ({
    month: name,
    count: withBirthday.filter(m => {
      const parts = m.birthday!.split("-");
      return Number(parts[1]) - 1 === i;
    }).length,
  }));

  const hasPieData = pieData.length > 0;
  const hasMonthData = withBirthday.length > 0;

  return (
    <div className="glass-card p-5 animate-slide-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="h-4 w-4 text-pink-500" />
        <h2 className="font-serif text-sm font-semibold">Upcoming Birthdays</h2>
        {withBirthday.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {withBirthday.length} with birthday set
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse bg-muted rounded-lg" />
      ) : !hasMonthData ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
          <Users className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">No birthday data yet</p>
          <p className="text-xs">Birthdays will appear once members set their date of birth.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hasPieData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Next 90 days</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${v} birthday${v !== 1 ? "s" : ""}`, name]} />
                    <Legend iconType="circle" iconSize={7} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {upcoming.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}>
                      {m.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.fullName}</p>
                      <p className="text-muted-foreground">{formatBirthday(m.birthday!)}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      m.daysUntil === 0 ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" :
                      m.daysUntil <= 7 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                    }`}>
                      {m.daysUntil === 0 ? "🎂 Today!" : `${m.daysUntil}d`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No birthdays in the next 90 days.</p>
          )}

          <div>
            <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Birthdays by month</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monthData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v}`, "Members"]} />
                <Bar dataKey="count" fill="#f472b6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
