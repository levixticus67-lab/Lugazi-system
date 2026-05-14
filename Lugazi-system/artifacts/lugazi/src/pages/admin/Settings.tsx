import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    churchName: "", tagline: "", mission: "", vision: "",
    coreValues: "", email: "", phone: "", address: "", website: ""
  });
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (settings) {
      setForm({
        churchName: settings.churchName || "",
        tagline: settings.tagline || "",
        mission: settings.mission || "",
        vision: settings.vision || "",
        coreValues: settings.coreValues || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        website: settings.website || "",
      });
    }
  }, [settings]);

  function handleSave() {
    updateMutation.mutate({ data: { churchName: form.churchName || undefined, tagline: form.tagline || undefined, mission: form.mission || undefined, vision: form.vision || undefined, coreValues: form.coreValues || undefined, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, website: form.website || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() }); toast({ title: "Settings saved" }); },
      onError: () => toast({ title: "Error saving settings", variant: "destructive" }),
    });
  }

  if (isLoading) return <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal"><div className="text-muted-foreground">Loading...</div></PortalLayout>;

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Church Settings" description="Manage church information" actions={
        <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-settings">Save Changes</Button>
      } />
      <div className="max-w-2xl space-y-6">
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold">Church Identity</h2>
          <div><Label>Church Name</Label><Input value={form.churchName} onChange={e => f("churchName", e.target.value)} data-testid="input-churchName" /></div>
          <div><Label>Tagline</Label><Input value={form.tagline} onChange={e => f("tagline", e.target.value)} data-testid="input-tagline" /></div>
          <div><Label>Mission Statement</Label><Textarea value={form.mission} onChange={e => f("mission", e.target.value)} data-testid="input-mission" /></div>
          <div><Label>Vision Statement</Label><Textarea value={form.vision} onChange={e => f("vision", e.target.value)} data-testid="input-vision" /></div>
          <div><Label>Core Values</Label><Textarea value={form.coreValues} onChange={e => f("coreValues", e.target.value)} data-testid="input-coreValues" /></div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold">Contact Information</h2>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => f("email", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={e => f("address", e.target.value)} /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={e => f("website", e.target.value)} /></div>
        </div>
      </div>
    </PortalLayout>
  );
}
