import { useCreateRoleRequest, useListRoleRequests } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { memberNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { statusBadge } from "@/components/Badge";

export default function MemberUpgrade() {
  const { user } = useAuth();
  const createMutation = useCreateRoleRequest();
  const { toast } = useToast();
  const [requestedRole, setRequestedRole] = useState("workforce");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    createMutation.mutate({ data: { requestedRole, reason: reason || undefined } }, {
      onSuccess: () => { toast({ title: "Role upgrade request submitted. Admin will review shortly." }); setSubmitted(true); },
      onError: (e: any) => toast({ title: e?.response?.data?.error || "Error submitting request", variant: "destructive" }),
    });
  }

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="Request Role Upgrade" description="Request access to a higher portal" />
      <div className="max-w-md">
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Current role: <span className="font-medium text-foreground capitalize">{user?.role}</span></p>
          </div>
          {submitted ? (
            <div className="text-center py-4">
              <p className="font-medium text-foreground">Request submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">Your request is pending admin review. You will be notified when it is processed.</p>
            </div>
          ) : (
            <>
              <div>
                <Label>Request Role</Label>
                <Select value={requestedRole} onValueChange={setRequestedRole}>
                  <SelectTrigger data-testid="select-requested-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workforce">Workforce (Volunteer/Deacon)</SelectItem>
                    <SelectItem value="leadership">Leadership (Pastor/Elder)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why you are requesting this role..." rows={3} data-testid="textarea-reason" />
              </div>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-upgrade">
                Submit Request
              </Button>
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
