import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserPlus, Trash2, PencilLine, LogIn, KeyRound, UserCog, Calendar, Heart, Bell, Wallet } from "lucide-react";

interface ActivityLog {
  id: number;
  userId: number | null;
  displayName: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  entityName: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; color: "default" | "success" | "warning" | "danger"; icon: React.ReactNode }> = {
  login:                { label: "Login",                color: "success",  icon: <LogIn className="h-3.5 w-3.5" /> },
  register:             { label: "Register",             color: "success",  icon: <UserPlus className="h-3.5 w-3.5" /> },
  change_password:      { label: "Password Change",      color: "warning",  icon: <KeyRound className="h-3.5 w-3.5" /> },
  create_member:        { label: "Member Added",         color: "success",  icon: <UserPlus className="h-3.5 w-3.5" /> },
  update_member:        { label: "Member Edited",        color: "default",  icon: <PencilLine className="h-3.5 w-3.5" /> },
  delete_member:        { label: "Member Deleted",       color: "danger",   icon: <Trash2 className="h-3.5 w-3.5" /> },
  create_transaction:   { label: "Transaction Added",    color: "success",  icon: <Wallet className="h-3.5 w-3.5" /> },
  delete_transaction:   { label: "Transaction Deleted",  color: "danger",   icon: <Trash2 className="h-3.5 w-3.5" /> },
  change_role:          { label: "Role Changed",         color: "warning",  icon: <UserCog className="h-3.5 w-3.5" /> },
  deactivate_user:      { label: "User Deactivated",     color: "danger",   icon: <Shield className="h-3.5 w-3.5" /> },
  create_event:         { label: "Event Created",        color: "success",  icon: <Calendar className="h-3.5 w-3.5" /> },
  delete_event:         { label: "Event Deleted",        color: "danger",   icon: <Trash2 className="h-3.5 w-3.5" /> },
  welfare_submitted:    { label: "Welfare Submitted",    color: "default",  icon: <Heart className="h-3.5 w-3.5" /> },
  welfare_updated:      { label: "Welfare Updated",      color: "warning",  icon: <Heart className="h-3.5 w-3.5" /> },
  welfare_deleted:      { label: "Welfare Deleted",      color: "danger",   icon: <Trash2 className="h-3.5 w-3.5" /> },
  create_giving:        { label: "Giving Recorded",      color: "success",  icon: <Wallet className="h-3.5 w-3.5" /> },
  delete_giving:        { label: "Giving Deleted",       color: "danger",   icon: <Trash2 className="h-3.5 w-3.5" /> },
  create_announcement:  { label: "Announcement Posted",  color: "success",  icon: <Bell className="h-3.5 w-3.5" /> },
  delete_announcement:  { label: "Announcement Removed", color: "danger",   icon: <Trash2 className="h-3.5 w-3.5" /> },
};

function getMeta(action: string) {
  return ACTION_META[action] ?? { label: action, color: "default" as const, icon: null };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminActivityLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    if (!token) return;
    axios.get<ActivityLog[]>("/api/admin/activity-logs")
      .then(r => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = logs.filter(l => {
    const matchSearch =
      !search ||
      l.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (l.entityName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.details ?? "").toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || l.action === filterAction;
    return matchSearch && matchAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Activity Log"
        description="A record of everything that happens in the system — who did what and when."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input
          placeholder="Search by name, entity, or details..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{getMeta(a).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading activity log...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No activity found.</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(log => {
              const meta = getMeta(log.action);
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5 shrink-0 text-muted-foreground">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{log.displayName}</span>
                      <Badge variant={meta.color}>{meta.label}</Badge>
                      {log.entityName && (
                        <span className="text-sm text-muted-foreground truncate">→ {log.entityName}</span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(log.createdAt)}</span>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
