import { useListGroups, useCreateGroup, getListGroupsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

type Group = { id: number; name: string; leaderName?: string | null; meetingDay?: string | null; meetingTime?: string | null; memberCount: number };

export default function LeadershipGroups() {
  const { data: groups = [], isLoading } = useListGroups();
  const createMutation = useCreateGroup();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", branchId: "1", leaderName: "", meetingDay: "", meetingTime: "" });
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleAdd() {
    createMutation.mutate({ data: { name: form.name, branchId: Number(form.branchId), leaderName: form.leaderName || undefined, meetingDay: form.meetingDay || undefined, meetingTime: form.meetingTime || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }); toast({ title: "Group created" }); setShowAdd(false); },
    });
  }

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Cell Groups" actions={<Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-group"><Plus className="h-4 w-4 mr-1" /> Add Group</Button>} />
      <DataTable
        columns={[{ header: "Name", key: "name" }, { header: "Leader", key: "leaderName", render: r => r.leaderName || "-" }, { header: "Day", key: "meetingDay", render: r => r.meetingDay || "-" }, { header: "Time", key: "meetingTime", render: r => r.meetingTime || "-" }, { header: "Members", key: "memberCount" }]}
        data={groups as Group[]} keyField="id" isLoading={isLoading} emptyMessage="No groups."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Cell Group</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Leader Name</Label><Input value={form.leaderName} onChange={e => f("leaderName", e.target.value)} /></div>
            <div><Label>Meeting Day</Label><Input value={form.meetingDay} onChange={e => f("meetingDay", e.target.value)} placeholder="Wednesday" /></div>
            <div><Label>Meeting Time</Label><Input value={form.meetingTime} onChange={e => f("meetingTime", e.target.value)} placeholder="19:00" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
