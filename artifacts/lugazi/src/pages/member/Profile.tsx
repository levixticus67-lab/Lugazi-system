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
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { User, Cake } from "lucide-react";

export default function MemberProfile() {
  const { data: me, isLoading } = useGetMe();
  const updateMutation = useUpdateUser();
  const changePasswordMutation = useChangePassword();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState({ displayName: "", phone: "", birthday: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [photoResult, setPhotoResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    if (me) setForm({ displayName: me.displayName, phone: me.phone || "", birthday: (me as any).birthday || "" });
  }, [me]);

  function handleSave() {
    if (!user) return;
    updateMutation.mutate({
      id: user.id,
      data: { displayName: form.displayName, phone: form.phone || undefined, birthday: form.birthday || undefined, photoUrl: photoResult?.url ?? undefined } as any,
    }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }); toast({ title: "Profile updated" }); },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
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
      <PageHeader title="My Profile" description="Manage your personal information" />
      <div className="max-w-lg space-y-6 animate-slide-in-up">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 blue-gradient-bg rounded-xl"><User className="h-5 w-5 text-white" /></div>
            <h2 className="font-serif text-lg font-semibold">Personal Information</h2>
          </div>

          <div className="flex items-center gap-3 py-2">
            {me?.photoUrl || photoResult?.url ? (
              <img src={photoResult?.url ?? me?.photoUrl!} alt={me?.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-2xl">
                {me?.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{me?.displayName}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{me?.role}</p>
              <p className="text-xs text-muted-foreground">{me?.email}</p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Profile Photo</Label>
            <CloudinaryUploader accept="image/*" label="Upload photo" onUpload={setPhotoResult} currentUrl={photoResult?.url ?? me?.photoUrl ?? undefined} />
          </div>

          <div>
            <Label className="mt-1">Display Name</Label>
            <Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Cake className="h-3.5 w-3.5 text-pink-500" />Birthday</Label>
            <Input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="mt-1" />
            <p className="text-[10px] text-muted-foreground mt-1">Used for birthday celebrations and church records</p>
          </div>

          <div className="text-sm text-muted-foreground pt-1">
            <span className="font-medium text-foreground">Email: </span>{me?.email}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Role: </span><span className="capitalize">{me?.role}</span>
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">
            {updateMutation.isPending ? "Saving…" : "Save Profile"}
          </Button>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold">Change Password</h2>
          <div><Label>Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} className="mt-1" /></div>
          <div><Label>New Password</Label><Input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} className="mt-1" /></div>
          <Button onClick={handlePasswordChange} disabled={changePasswordMutation.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">
            {changePasswordMutation.isPending ? "Updating…" : "Change Password"}
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
