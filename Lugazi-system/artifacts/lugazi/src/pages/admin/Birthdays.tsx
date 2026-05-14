import { useListMembers } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Cake, Gift } from "lucide-react";
import { Badge } from "@/components/Badge";

type Member = { id: number; fullName: string; birthday?: string | null; email: string; photoUrl?: string | null; department?: string | null };

function getDaysUntilBirthday(birthday: string): number {
  const today = new Date();
  const bday = new Date(birthday);
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
  return Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatBirthday(birthday: string): string {
  const d = new Date(birthday);
  return d.toLocaleDateString("en-UG", { month: "long", day: "numeric" });
}

export default function AdminBirthdays() {
  const { data: members = [], isLoading } = useListMembers();

  const membersWithBirthdays = (members as Member[])
    .filter(m => m.birthday)
    .map(m => ({ ...m, daysUntil: getDaysUntilBirthday(m.birthday!) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const todaysBirthdays = membersWithBirthdays.filter(m => m.daysUntil === 0);
  const thisWeek = membersWithBirthdays.filter(m => m.daysUntil > 0 && m.daysUntil <= 7);
  const upcoming = membersWithBirthdays.filter(m => m.daysUntil > 7 && m.daysUntil <= 30);
  const later = membersWithBirthdays.filter(m => m.daysUntil > 30);
  const noBirthday = (members as Member[]).filter(m => !m.birthday);

  function MemberCard({ member, daysUntil }: { member: Member & { daysUntil: number }; daysUntil: number }) {
    return (
      <div className="glass-card p-4 card-hover flex items-center gap-3">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold flex-shrink-0">
            {member.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{member.fullName}</p>
          <p className="text-xs text-muted-foreground">{member.department || member.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-primary">{formatBirthday(member.birthday!)}</p>
          {daysUntil === 0 ? (
            <Badge variant="success">Today! 🎂</Badge>
          ) : (
            <p className="text-xs text-muted-foreground">in {daysUntil} day{daysUntil !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Birthday Tracker"
        description={`${membersWithBirthdays.length} members with birthdays recorded`}
        actions={
          todaysBirthdays.length > 0 ? (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-pink-100 text-pink-700">
              <Gift className="h-3.5 w-3.5" />
              {todaysBirthdays.length} birthday{todaysBirthdays.length > 1 ? "s" : ""} today!
            </span>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-8 animate-slide-in-up">
          {todaysBirthdays.length > 0 && (
            <section>
              <h2 className="font-serif text-base font-semibold text-pink-600 flex items-center gap-2 mb-3">
                <Cake className="h-4 w-4" /> Today's Birthdays
              </h2>
              <div className="space-y-2">{todaysBirthdays.map(m => <MemberCard key={m.id} member={m} daysUntil={0} />)}</div>
            </section>
          )}

          {thisWeek.length > 0 && (
            <section>
              <h2 className="font-serif text-base font-semibold text-primary flex items-center gap-2 mb-3">
                <Cake className="h-4 w-4" /> This Week
              </h2>
              <div className="space-y-2">{thisWeek.map(m => <MemberCard key={m.id} member={m} daysUntil={m.daysUntil} />)}</div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                <Cake className="h-4 w-4" /> This Month
              </h2>
              <div className="space-y-2">{upcoming.map(m => <MemberCard key={m.id} member={m} daysUntil={m.daysUntil} />)}</div>
            </section>
          )}

          {later.length > 0 && (
            <section>
              <h2 className="font-serif text-base font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                <Cake className="h-4 w-4" /> Coming Up
              </h2>
              <div className="space-y-2">{later.map(m => <MemberCard key={m.id} member={m} daysUntil={m.daysUntil} />)}</div>
            </section>
          )}

          {noBirthday.length > 0 && (
            <section>
              <p className="text-xs text-muted-foreground">
                {noBirthday.length} member{noBirthday.length > 1 ? "s have" : " has"} no birthday recorded.
                Update their profiles to see them here.
              </p>
            </section>
          )}

          {membersWithBirthdays.length === 0 && noBirthday.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Cake className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No member birthdays recorded yet.</p>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
