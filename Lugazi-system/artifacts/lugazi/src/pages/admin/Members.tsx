import { useState } from "react";
import { useListMembers, useCreateMember, useUpdateMember, useDeleteMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/Badge";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Plus, Pencil, Trash2, UserCircle } from "lucide-react";

type Member = {
  id: number; fullName: string; email: string; phone?: string | null;
  role: string; branchId: number; department?: string | null;
  isActive: boolean; photoUrl?: string | null; createdAt: string; qrToken: string;
};

const blankForm = { fullName: "", email: "", phone: "", branchId: "1", department: "" };

export default function AdminMembers() {
  const { data: members = [], isLoading } = useListMembers();
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  const deleteMutation = useDeleteMember();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [form, setForm] = useState(blankForm);
  const [photoResult, setPhotoResult] = useState<UploadResult | null>(null);
  const [editPhotoResult, setEditPhotoResult] = useState<UploadResult | null>(null);

  function resetForm() {
    setForm(blankForm);
    setPhotoResult(null);
  }

  function handleAdd() {
    if (!form.fullName || !form.email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    createMutation.mutate(
      {
        data: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          branchId: Number(form.branchId),
          department: form.department || undefined,
          photoUrl: photoResult?.url ?? undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          toast({ title: "Member added" });
          setShowAdd(false);
          resetForm();
        },
        onError: () => toast({ title: "Error adding member", variant: "destructive" }),
      },
    );
  }

  function handleUpdate() {
    if (!editMember) return;
    updateMutation.mutate(
      {
        id: editMember.id,
        data: {
          fullName: form.fullName,
          phone: form.phone || undefined,
          department: form.department || undefined,
          photoUrl: editPhotoResult?.url ?? editMember.photoUrl ?? undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          toast({ title: "Member updated" });
          setEditMember(null);
          resetForm();
          setEditPhotoResult(null);
        },
        onError: () => toast({ title: "Error updating member", variant: "destructive" }),
      },
    );
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this member?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }),
    });
  }

  function openEdit(r: Member) {
    setEditMember(r);
    setForm({ fullName: r.fullName, email: r.email, phone: r.phone || "", branchId: String(r.branchId), department: r.department || "" });
    setEditPhotoResult(null);
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Members"
        description={`${(members as Member[]).length} total members`}
        actions={
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} data-testid="button-add-member">
            <Plus className="h-4 w-4 mr-1" /> Add Member
          </Button>
        }
      />
      <DataTable
        columns={[
          {
            header: "Member", key: "fullName", render: (r) => (
              <div className="flex items-center gap-2">
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt={r.fullName} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <UserCircle className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{r.fullName}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </div>
              </div>
            ),
          },
          { header: "Phone", key: "phone", render: (r) => r.phone || "-" },
          { header: "Department", key: "department", render: (r) => r.department || "-" },
          { header: "Role", key: "role", render: (r) => <Badge variant="default">{r.role}</Badge> },
          { header: "Status", key: "isActive", render: (r) => <Badge variant={r.isActive ? "success" : "danger"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
          {
            header: "Actions", key: "actions",
            render: (r) => (
              <div className="flex gap-2">
                <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => openEdit(r as Member)} data-testid={`button-edit-member-${r.id}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDelete(r.id)} data-testid={`button-delete-member-${r.id}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={members as Member[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No members found. Add your first member."
      />

      {/* ── Add Dialog ── */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) resetForm(); setShowAdd(o); }}>
        <DialogContent className="max-w-md" data-testid="dialog-add-member">
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="mb-2 block">Profile Photo <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <CloudinaryUploader
                accept="image/*"
                label="Upload member photo"
                onUpload={setPhotoResult}
                currentUrl={photoResult?.url}
              />
            </div>
            <div><Label>Full Name <span className="text-destructive">*</span></Label><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="mt-1" data-testid="input-fullName" /></div>
            <div><Label>Email <span className="text-destructive">*</span></Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1" data-testid="input-email" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1" data-testid="input-phone" /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="mt-1" data-testid="input-department" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-member">
              {createMutation.isPending ? "Saving…" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editMember} onOpenChange={(o) => { if (!o) { setEditMember(null); setEditPhotoResult(null); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-member">
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="mb-2 block">Profile Photo</Label>
              <CloudinaryUploader
                accept="image/*"
                label="Upload new photo"
                onUpload={setEditPhotoResult}
                currentUrl={editPhotoResult?.url ?? editMember?.photoUrl}
              />
            </div>
            <div><Label>Full Name</Label><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditMember(null); setEditPhotoResult(null); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-save-edit-member">
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
