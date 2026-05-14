import { useState } from "react";
import { useListMembers, useCreateMember, useUpdateMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/Badge";

type Member = { id: number; fullName: string; email: string; phone?: string | null; role: string; isActive: boolean };

export default function LeadershipMembers() {
  const { data: members = [], isLoading } = useListMembers();
  const createMutation = useCreateMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", branchId: "1" });

  function handleAdd() {
    createMutation.mutate({ data: { fullName: form.fullName, email: form.email, phone: form.phone || undefined, branchId: Number(form.branchId) } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); toast({ title: "Member added" }); setShowAdd(false); },
    });
  }

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Members" description={`${(members as Member[]).length} members`} actions={
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-member"><Plus className="h-4 w-4 mr-1" /> Add Member</Button>
      } />
      <DataTable
        columns={[
          { header: "Name", key: "fullName" },
          { header: "Email", key: "email" },
          { header: "Phone", key: "phone", render: r => r.phone || "-" },
          { header: "Role", key: "role", render: r => <Badge>{r.role}</Badge> },
          { header: "Status", key: "isActive", render: r => <Badge variant={r.isActive ? "success" : "danger"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
        ]}
        data={members as Member[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No members found."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-member">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
