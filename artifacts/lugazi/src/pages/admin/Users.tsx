import { useState } from "react";
import { useListUsers, useUpdateUserRole, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/Badge";

type User = { id: number; email: string; displayName: string; role: string; isActive: boolean; createdAt: string };

export default function AdminUsers() {
  const { data: users = [], isLoading } = useListUsers();
  const updateRoleMutation = useUpdateUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");

  function handleRoleChange() {
    if (!editUser) return;
    updateRoleMutation.mutate({ id: editUser.id, data: { role: newRole } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Role updated successfully. User must re-login to see the change." });
        setEditUser(null);
      },
      onError: () => toast({ title: "Error updating role", variant: "destructive" }),
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Users & Roles" description="Manage user accounts and permissions" />
      <DataTable
        columns={[
          { header: "Name", key: "displayName" },
          { header: "Email", key: "email" },
          { header: "Role", key: "role", render: r => <Badge variant="default">{r.role}</Badge> },
          { header: "Status", key: "isActive", render: r => <Badge variant={r.isActive ? "success" : "danger"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
          { header: "Joined", key: "createdAt", render: r => new Date(r.createdAt).toLocaleDateString() },
          {
            header: "Actions", key: "actions",
            render: r => (
              <Button size="sm" variant="outline" onClick={() => { setEditUser(r); setNewRole(r.role); }} data-testid={`button-change-role-${r.id}`}>
                Change Role
              </Button>
            )
          },
        ]}
        data={users as User[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No users found."
      />

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent data-testid="dialog-change-role">
          <DialogHeader><DialogTitle>Change Role — {editUser?.displayName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="leadership">Leadership</SelectItem>
                <SelectItem value="workforce">Workforce</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">The user must re-login to see the role change take effect.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={updateRoleMutation.isPending} data-testid="button-confirm-role-change">Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
