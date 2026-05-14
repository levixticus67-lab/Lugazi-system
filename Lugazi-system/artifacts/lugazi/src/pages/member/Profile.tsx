import { useState, useEffect } from "react";
import { useGetMe, useUpdateUser, getGetMeQueryKey, useChangePassword } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { memberNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function MemberProfile() {
  const { data: me, isLoading } = useGetMe();
  const updateMutation = useUpdateUser();
  const changePasswordMutation = useChangePassword();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState({ displayName: "", phone: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (me) setForm({ displayName: me.displayName, phone: me.phone || "" });
  }, [me]);

  function handleSave() {
    if (!user) return;
    updateMutation.mutate({ id: user.id, data: { displayName: form.displayName, phone: form.phone || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }); toast({ title: "Profile updated" }); },
    });
  }

  function handlePasswordChange() {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast({ title: "Both passwords required", variant: "destructive" }); return; }
    changePasswordMutation.mutate({ data: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword } }, {
      onSuccess: () => { toast({ title: "Password changed successfully" }); setPwForm({ currentPassword: "", newPassword: "" }); },
      onError: () => toast({ title: "Current password incorrect", variant: "destructive" }),
    });
  }

  if (isLoading) return <PortalLayout navItems={memberNavItems} portalLabel="Member Portal"><div className="text-muted-foreground">Loading...</div></PortalLayout>;

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="My Profile" />
      <div className="max-w-lg space-y-6">
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold">Personal Information</h2>
          <div className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Email: </span>{me?.email}</div>
          <div className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Role: </span><span className="capitalize">{me?.role}</span></div>
          <div><Label>Display Name</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} data-testid="input-displayName" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-phone" /></div>
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-profile">Save Profile</Button>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold">Change Password</h2>
          <div><Label>Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} data-testid="input-current-password" /></div>
          <div><Label>New Password</Label><Input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} data-testid="input-new-password" /></div>
          <Button onClick={handlePasswordChange} disabled={changePasswordMutation.isPending} data-testid="button-change-password">Change Password</Button>
        </div>
      </div>
    </PortalLayout>
  );
}
