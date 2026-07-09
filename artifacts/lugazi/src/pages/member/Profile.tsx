import { useState, useEffect } from "react";
  import axios from "@/lib/axios";
  import { useGetMe, getGetMeQueryKey, useChangePassword } from "@workspace/api-client-react";
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
  import { Cake, Trash2 } from "lucide-react";

  export default function MemberProfile() {
    const { data: me, isLoading } = useGetMe();
    const changePasswordMutation = useChangePassword();
    const queryClient = useQueryClient();
    const { user, updateUser } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ displayName: "", phone: "", birthday: "" });
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [photoResult, setPhotoResult] = useState<UploadResult | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);

    useEffect(() => {
      if (me) setForm({ displayName: me.displayName, phone: me.phone || "", birthday: (me as any).birthday || "" });
    }, [me]);

    // effectivePhotoUrl: what photo to show/save right now
    const effectivePhotoUrl: string | null = removePhoto ? null : (photoResult?.url ?? me?.photoUrl ?? null);

    function handleRemovePhoto() { setPhotoResult(null); setRemovePhoto(true); }
    function handlePhotoUpload(result: UploadResult) { setPhotoResult(result); setRemovePhoto(false); }

    async function handleSave() {
      if (!user) return;
      if (!form.displayName.trim()) { toast({ title: "Display name is required", variant: "destructive" }); return; }
      setSaving(true);
      try {
        const body: Record<string, unknown> = {
          displayName: form.displayName,
          phone: form.phone || null,
          birthday: form.birthday || null,
          photoUrl: effectivePhotoUrl,   // null = remove, string = set, existing = unchanged
        };
        await axios.patch(`/api/users/${user.id}`, body);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        updateUser({ displayName: form.displayName, photoUrl: effectivePhotoUrl });
        setRemovePhoto(false);
        toast({ title: "Profile updated successfully" });
      } catch {
        toast({ title: "Update failed. Please try again.", variant: "destructive" });
      } finally {
        setSaving(false);
      }
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

            {/* Current avatar preview */}
            <div className="flex items-center gap-3 py-2">
              {effectivePhotoUrl ? (
                <img loading="lazy" src={effectivePhotoUrl} alt={me?.displayName} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
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

            {/* Photo upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Profile Photo</Label>
                {effectivePhotoUrl && (
                  <button onClick={handleRemovePhoto} className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors">
                    <Trash2 className="h-3 w-3" />Remove photo
                  </button>
                )}
              </div>
              {removePhoto ? (
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
                  Photo will be removed on save.{" "}
                  <button onClick={() => setRemovePhoto(false)} className="text-primary hover:underline">Undo</button>
                </div>
              ) : (
                <CloudinaryUploader accept="image/*" label="Upload photo" onUpload={handlePhotoUpload} currentUrl={effectivePhotoUrl} />
              )}
            </div>

            <div><Label>Display Name</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label className="flex items-center gap-1.5"><Cake className="h-3.5 w-3.5 text-pink-500" />Birthday</Label>
              <Input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="mt-1" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="blue-gradient-bg text-white border-0 hover:opacity-90">
              {saving ? "Saving…" : "Save Profile"}
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
  