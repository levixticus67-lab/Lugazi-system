import { useState, useEffect } from "react";
import { useGetMe, useUpdateUser, getGetMeQueryKey, useChangePassword } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CloudinaryUploader, { UploadResult } from "@/components/CloudinaryUploader";
import { Star } from "lucide-react";

export default function LeadershipProfile() {
  const { data: me, isLoading } = useGetMe();
  const updateMutation = useUpdateUser();
  const changePasswordMutation = useChangePassword();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ displayName: "", phone: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [photoResult, setPhotoResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    if (me) setForm({ displayName: me.displayName, phone: me.phone || "" });
  }, [me]);

  function handleSave() {
    if (!user) return;
    updateMutation.mutate({ id: user.id, data: { displayName: form.displayName, phone: form.phone || undefined, photoUrl: photoResult?.url ?? undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }); toast({ title: "Profile updated" }); },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    });
  }

  function handlePasswordChange() {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast({ title: "Both passwords required", variant: "destructive" }); return; }
    changePasswordMutation.mutate({ data: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword } }, {
      onSuccess: () => { toast({ title: "Password changed" }); setPwForm({ currentPassword: "", newPassword: "" }); },
      onError: () => toast({ title: "Current password incorrect", variant: "destructive" }),
    });
  }

  if (isLoading) return <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal"><div className="text-muted-foreground">Loading...</div></PortalLayout>;

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="My Profile" description="Manage your personal information and security" />
      <div className="max-w-lg space-y-6 animate-slide-in-up">
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold">Personal Information</h2>
          <div className="flex items-center gap-3 py-2">
            {me?.photoUrl ? (
              <img src={me.photoUrl} alt={me.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-2xl">
                {me?.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{me?.displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 text-sky-500" />
                <span className="text-xs text-sky-500 font-medium capitalize">{me?.role}</span>
              </div>
              <p className="text-xs text-muted-foreground">{me?.email}</p>
            </div>
          </div>
          <div><Label className="mb-2 block">Profile Photo</Label>
            <CloudinaryUploader accept="image/*" label="Upload photo" onUpload={setPhotoResult} currentUrl={photoResult?.url ?? me?.photoUrl ?? undefined} />
          </div>
          <div><Label>Display Name</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
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
