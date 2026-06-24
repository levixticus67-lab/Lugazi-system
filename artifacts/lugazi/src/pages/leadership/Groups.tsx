import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Home, Users, Clock, MapPin, CheckCircle2, TrendingUp, Plus } from "lucide-react";

interface CellGroup {
  id: number;
  name: string;
  leaderName: string | null;
  location: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  memberCount: number;
  capacity?: number | null;
  isActive: boolean;
  createdAt: string;
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function LeadershipGroups() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", leaderName: "", location: "", meetingDay: "Wednesday", meetingTime: "18:00" });
  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const { data: rawCells = [], isLoading } = useQuery<CellGroup[]>({
    queryKey: ["cells-leadership"],
    queryFn: () => axios.get("/api/groups").then(r => r.data as CellGroup[]).catch(() => [] as CellGroup[]),
    staleTime: 30_000,
  });

  const createCell = useMutation({
    mutationFn: (data: object) => axios.post("/api/groups", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cells-leadership"] });
      toast({ title: "Cell group created" });
      setShowForm(false);
      setForm({ name: "", leaderName: "", location: "", meetingDay: "Wednesday", meetingTime: "18:00" });
    },
    onError: () => toast({ title: "Failed to create cell group", variant: "destructive" }),
  });

  function handleCreate() {
    if (!form.name.trim()) { toast({ title: "Cell name is required", variant: "destructive" }); return; }
    createCell.mutate({
      name: form.name,
      leaderName: form.leaderName || undefined,
      location: form.location || undefined,
      meetingDay: form.meetingDay || undefined,
      meetingTime: form.meetingTime || undefined,
    });
  }

  const cells = rawCells as CellGroup[];
  const totalMembers = cells.reduce((a, c) => a + (c.memberCount ?? 0), 0);
  const avgSize = cells.length ? Math.round(totalMembers / cells.length) : 0;

  const stats = [
    { label: "Total Cells",   value: cells.length,                        icon: <Home className="h-5 w-5 text-blue-500" />,   bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Active Cells",  value: cells.filter(c => c.isActive).length, icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, bg: "bg-green-50 dark:bg-green-950/40" },
    { label: "Total Members", value: totalMembers,                         icon: <Users className="h-5 w-5 text-purple-500" />, bg: "bg-purple-50 dark:bg-purple-950/40" },
    { label: "Avg. Size",     value: avgSize,                              icon: <TrendingUp className="h-5 w-5 text-rose-500" />,   bg: "bg-rose-50 dark:bg-rose-950/40" },
  ];

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader
        title="Cell Fellowship"
        description="View and manage home cell groups"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />New Cell
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cell cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="glass-card h-36 animate-pulse" />)}
        </div>
      ) : cells.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Home className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No cell groups yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create the first cell group to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cells.map(cell => {
            const cap = cell.capacity ?? 20;
            const pct = Math.min(100, Math.round(((cell.memberCount ?? 0) / cap) * 100));
            return (
              <div key={cell.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-serif font-semibold text-base">{cell.name}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    cell.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {cell.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                  {cell.leaderName && (
                    <p className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>{cell.leaderName}</span>
                    </p>
                  )}
                  {(cell.meetingDay || cell.meetingTime) && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{[cell.meetingDay, cell.meetingTime ? cell.meetingTime + "s" : null].filter(Boolean).join(" at ")}</span>
                    </p>
                  )}
                  {cell.location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{cell.location}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>{cell.memberCount ?? 0} member{(cell.memberCount ?? 0) !== 1 ? "s" : ""}</span>
                  </p>
                </div>

                {/* Capacity bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Capacity</span>
                    <span>{cell.memberCount ?? 0}/{cap}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create cell dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Cell Group</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>Cell Name *</Label>
              <Input className="mt-1" placeholder="e.g. Zion Cell" value={form.name} onChange={e => f("name", e.target.value)} />
            </div>
            <div>
              <Label>Leader Name</Label>
              <Input className="mt-1" placeholder="e.g. Bro. James Okello" value={form.leaderName} onChange={e => f("leaderName", e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input className="mt-1" placeholder="e.g. Kampala Road, Lugazi" value={form.location} onChange={e => f("location", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Meeting Day</Label>
                <Select value={form.meetingDay} onValueChange={v => f("meetingDay", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time</Label>
                <Input className="mt-1" type="time" value={form.meetingTime} onChange={e => f("meetingTime", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || createCell.isPending}>
              {createCell.isPending ? "Creating…" : "Create Cell"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
