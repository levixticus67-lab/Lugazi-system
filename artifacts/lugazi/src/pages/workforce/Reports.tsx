import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { workforceNavItems } from "./navItems";
import { FileText, Info } from "lucide-react";

export default function WorkforceReports() {
  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Reports" description="Branch and ministry reports" />
      <div className="glass-card p-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto">
          <FileText className="h-7 w-7 text-blue-500" />
        </div>
        <p className="font-semibold text-base">Reports are submitted by Leadership</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Branch and ministry reports are prepared and submitted by the leadership team and pastors.
          Please check with your leader for updates.
        </p>
        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground mt-2 p-3 rounded-xl bg-muted/60">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>Only leadership and pastors can submit reports to admin.</span>
        </div>
      </div>
    </PortalLayout>
  );
}
