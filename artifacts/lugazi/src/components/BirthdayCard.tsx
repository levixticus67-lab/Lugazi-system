import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { Cake } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

export default function BirthdayCard() {
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members-birthdays"],
    queryFn: () => axios.get("/api/members").then(r => r.data as Member[]).catch(() => [] as Member[]),
    staleTime: 300_000,
  });

  const withBirthday = (members as Member[]).filter(m => m.birthday);

  const upcoming = withBirthday
    .map(m => ({ ...m, daysUntil: getDaysUntilBirthday(m.birthday!) }))
    .filter(m => m.daysUntil <= 60)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 8);

  if (upcoming.length === 0) return null;

  const today = upcoming.filter(m => m.daysUntil === 0);
  const thisWeek = upcoming.filter(m => m.daysUntil > 0 && m.daysUntil <= 7);
  const thisMonth = upcoming.filter(m => m.daysUntil > 7 && m.daysUntil <= 30);
  const later = upcoming.filter(m => m.daysUntil > 30);

  const pieData = [
    { name: "Today", value: today.length, color: "#ef4444" },
    { name: "This week", value: thisWeek.length, color: "#f59e0b" },
    { name: "This month", value: thisMonth.length, color: "#3b82f6" },
    { name: "Next 2 months", value: later.length, color: "#10b981" },
  ].filter(d => d.value > 0);

  return (
    <div className="glass-card p-5 animate-slide-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="h-4 w-4 text-pink-500" />
        <h2 className="font-serif text-sm font-semibold">Upcoming Birthdays</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [`${v} birthday${v !== 1 ? "s" : ""}`, name]} />
              <Legend iconType="circle" iconSize={8} />
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
    </div>
  );
}
