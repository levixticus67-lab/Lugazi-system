import { useState } from "react";
import { useListGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, getListGroupsQueryKey, useListBranches } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Group = { id: number; name: string; branchId: number; leaderName?: string | null; meetingDay?: string | null; meetingTime?: string | null; memberCount: number };
type Branch = { id: number; name: string };

export default function AdminGroups() {
  const { data: groups = [], isLoading } = useListGroups();
  const { data: branches = [] } = useListBranches();
  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();
  const deleteMutation = useDeleteGroup();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { name: "", branchId: "1", leaderName: "", meetingDay: "", meetingTime: "" };
  const [showAdd, setShowAdd] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [form, setForm] = useState(blank);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleAdd() {
    createMutation.mutate({ data: { name: form.name, branchId: Number(form.branchId), leaderName: form.leaderName || undefined, meetingDay: form.meetingDay || undefined, meetingTime: form.meetingTime || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }); toast({ title: "Group created" }); setShowAdd(false); setForm(blank); },
    });
  }

  function handleUpdate() {
    if (!editGroup) return;
    updateMutation.mutate({ id: editGroup.id, data: { name: form.name, leaderName: form.leaderName || undefined, meetingDay: form.meetingDay || undefined, meetingTime: form.meetingTime || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }); toast({ title: "Group updated" }); setEditGroup(null); },
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this group?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() }) });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Cell Groups" description={`${(groups as Group[]).length} groups`} actions={
        <Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-group"><Plus className="h-4 w-4 mr-1" /> Add Group</Button>
      } />
      <DataTable
        columns={[
          { header: "Name", key: "name" },
          { header: "Leader", key: "leaderName", render: r => r.leaderName || "-" },
          { header: "Meeting Day", key: "meetingDay", render: r => r.meetingDay || "-" },
          { header: "Meeting Time", key: "meetingTime", render: r => r.meetingTime || "-" },
          { header: "Members", key: "memberCount" },
          { header: "Actions", key: "actions", render: r => (
            <div className="flex gap-2">
              <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditGroup(r); setForm({ name: r.name, branchId: String(r.branchId), leaderName: r.leaderName || "", meetingDay: r.meetingDay || "", meetingTime: r.meetingTime || "" }); }} data-testid={`button-edit-group-${r.id}`}><Pencil className="h-4 w-4" /></button>
              <button className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)} data-testid={`button-delete-group-${r.id}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          )},
        ]}
        data={groups as Group[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No groups found."
      />
      {[{ open: showAdd, onClose: () => setShowAdd(false), onSave: handleAdd, isPending: createMutation.isPending, isNew: true },
        { open: !!editGroup, onClose: () => setEditGroup(null), onSave: handleUpdate, isPending: updateMutation.isPending, isNew: false }
      ].map(({ open, onClose, onSave, isPending, isNew }) => (
        <Dialog key={isNew ? "add" : "edit"} open={open} onOpenChange={onClose}>
          <DialogContent>
            <DialogHeader><DialogTitle>{isNew ? "Add" : "Edit"} Cell Group</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
              {isNew && (
                <div>
                  <Label>Branch</Label>
                  <Select value={form.branchId} onValueChange={v => f("branchId", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(branches as Branch[]).map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Leader Name</Label><Input value={form.leaderName} onChange={e => f("leaderName", e.target.value)} /></div>
              <div><Label>Meeting Day</Label><Input placeholder="e.g. Wednesday" value={form.meetingDay} onChange={e => f("meetingDay", e.target.value)} /></div>
              <div><Label>Meeting Time</Label><Input placeholder="e.g. 19:00" value={form.meetingTime} onChange={e => f("meetingTime", e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave} disabled={isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </PortalLayout>
  );
}
