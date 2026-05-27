import { useState, useEffect } from "react";
  import { useQuery } from "@tanstack/react-query";
  import axios from "@/lib/axios";
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
  import { Cake } from "lucide-react";
  
  interface CellGroup { id: number; name: string; meetingDay: string | null; location: string | null; }

  export default function MemberProfile() {
    const { data: me, isLoading } = useGetMe();
    const updateMutation = useUpdateUser();
    const changePasswordMutation = useChangePassword();
    const queryClient = useQueryClient();
    const { user, updateUser } = useAuth();
    const { toast } = useToast();
    const [form, setForm] = useState({ displayName: "", phone: "", birthday: "" });
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [photoResult, setPhotoResult] = useState<UploadResult | null>(null);
  
    const { data: cellGroup } = useQuery<CellGroup | null>({
      queryKey: ["my-member-cell-group", user?.id],
      queryFn: async () => {
        if (!user?.id) return null;
        const res = await axios.get<{ cellGroupId: number | null; cellGroupName: string | null }>("/api/users/me/member-info").catch(() => null);
        if (!res?.data?.cellGroupId) return null;
        const grp = await axios.get<CellGroup>(`/api/groups/${res.data.cellGroupId}`).catch(() => null);
        return grp?.data ?? null;
      },
      enabled: !!user,
      staleTime: 60_000,
    });

    useEffect(() => {
      if (me) setForm({ displayName: me.displayName, phone: me.phone || "", birthday: (me as any).birthday || "" });
    }, [me]);

    function handleSave() {
      if (!user) return;
      if (!form.displayName.trim()) { toast({ title: "Display name is required", variant: "destructive" }); return; }
      const newPhotoUrl = photoResult?.url ?? (me?.photoUrl ?? undefined);
      updateMutation.mutate({
        id: user.id,
        data: { displayName: form.displayName, phone: form.phone || undefined, birthday: form.birthday || undefined, photoUrl: newPhotoUrl } as any,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          updateUser({ displayName: form.displayName, photoUrl: newPhotoUrl ?? null });
          toast({ title: "Profile updated successfully" });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      });
    }

    function handlePasswordChange() {
      if (!pwForm.currentPassword || !pwForm.newPassword) { toast({ title: "All password fields are required", variant: "destructive" }); return; }
      if (pwForm.newPassword.length < 8) { toast({ title: "New password must be at least 8 characters", variant: "destructive" }); return; }
      if (pwForm.newPassword !== pwForm.confirmPassword) { toast({ title: "New passwords do not match", variant: "destructive" }); return; }
      changePasswordMutation.mutate({ data: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword } }, {
        onSuccess: () => { toast({ title: "Password changed successfully" }); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
        onError: (err: any) => toast({ title: err?.response?.data?.error || "Current password is incorrect", variant: "destructive" }),
      });
    }

    if (isLoading) return <PortalLayout navItems={memberNavItems} portalLabel="Member Portal"><div className="text-muted-foreground p-6">Loading...</div></PortalLayout>;

    return (
      <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
        <PageHeader title="My Profile" description="Manage your personal information and security" />
        <div className="max-w-lg space-y-6 animate-slide-in-up">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold">Personal Information</h2>
            <div className="flex items-center gap-3 py-2">
              {photoResult?.url || me?.photoUrl ? (
                <img src={photoResult?.url ?? me?.photoUrl!} alt={me?.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="w-16 h-16 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-2xl">
                  {me?.displayName?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{me?.displayName}</p>
                <p className="text-xs text-primary font-medium capitalize mt-0.5">{me?.role}</p>
                <p className="text-xs text-muted-foreground">{me?.email}</p>
              </div>
            </div>
            <div><Label className="mb-2 block">Profile Photo</Label>
              <CloudinaryUploader accept="image/*" label="Upload photo" onUpload={setPhotoResult} currentUrl={photoResult?.url ?? me?.photoUrl ?? undefined} />
            </div>
            <div><Label>Display Name</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label className="flex items-center gap-1.5"><Cake className="h-3.5 w-3.5 text-pink-500" />Birthday</Label>
              <Input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="mt-1" />
            </div>
            
            {(cellGroup) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Cell Group: {cellGroup.name}</span>
              </div>
            )}
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">
              {updateMutation.isPending ? "Saving…" : "Save Profile"}
            </Button>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold">Change Password</h2>
            <div><Label>Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} className="mt-1" placeholder="Enter current password" /></div>
            <div><Label>New Password</Label><Input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} className="mt-1" placeholder="Min. 8 characters" /></div>
            <div><Label>Confirm New Password</Label><Input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} className="mt-1" placeholder="Repeat new password" /></div>
            <Button onClick={handlePasswordChange} disabled={changePasswordMutation.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">
              {changePasswordMutation.isPending ? "Updating…" : "Change Password"}
            </Button>
          </div>
        </div>
      </PortalLayout>
    );
  }
  