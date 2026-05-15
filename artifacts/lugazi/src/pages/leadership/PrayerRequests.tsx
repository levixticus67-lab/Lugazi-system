import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { HandHeart, X } from "lucide-react";
import { Badge } from "@/components/Badge";

type PrayerRequest = {
  id: number; displayName: string; subject: string; request: string;
  isAnonymous: boolean; status: string; adminNote?: string; createdAt: string;
};

const statusColors: Record<string, "default" | "success" | "warning" | "danger"> = {
  pending: "warning", praying: "default", answered: "success", closed: "danger",
};

export default function LeadershipPrayerRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: requests = [], isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["prayer-requests-leadership"],
    queryFn: () => axios.get<PrayerRequest[]>("/api/prayer-requests").then(r => r.data),
    refetchInterval: 30_000,
  });
  const [selected, setSelected] = useState<PrayerRequest | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleUpdate() {
    if (!selected) return;
    setSaving(true);
    try {
      await axios.patch(`/api/prayer-requests/${selected.id}`, { status: newStatus || selected.status, adminNote });
      queryClient.invalidateQueries({ queryKey: ["prayer-requests-leadership"] });
      toast({ title: "Updated" });
      setSelected(null);
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  const pending = (requests as PrayerRequest[]).filter(r => r.status === "pending").length;

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Prayer Requests" description={`${(requests as PrayerRequest[]).length} total · ${pending} pending`} />
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (requests as PrayerRequest[]).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><HandHeart className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No prayer requests yet</p></div>
      ) : (
        <div className="space-y-3 animate-slide-in-up">
          {(requests as PrayerRequest[]).map(r => (
            <div key={r.id} className="glass-card p-5 card-hover">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm">{r.isAnonymous ? "Anonymous" : r.displayName}</p>
                    <Badge variant={statusColors[r.status] ?? "default"}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-primary mb-1">{r.subject}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{r.request}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelected(r); setNewStatus(r.status); setAdminNote(r.adminNote || ""); }}>Respond</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Respond to Prayer Request</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="glass-card p-3">
                <p className="text-sm font-medium text-primary">{selected.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{selected.request}</p>
              </div>
              <div><Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="praying">Praying</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Note (optional)</Label>
                <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving} className="blue-gradient-bg text-white border-0">{saving ? "Saving…" : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
