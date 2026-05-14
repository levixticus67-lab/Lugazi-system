import { useListAttendance } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { memberNavItems } from "./navItems";

type AttendanceRecord = { id: number; memberName: string; eventName: string; checkedInAt: string; method: string; memberId: number };

export default function MemberAttendance() {
  const { data: records = [], isLoading } = useListAttendance();
  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="Attendance History" description="Your check-in records" />
      <DataTable
        columns={[{ header: "Event", key: "eventName" }, { header: "Method", key: "method" }, { header: "Date & Time", key: "checkedInAt", render: r => new Date(r.checkedInAt).toLocaleString() }]}
        data={records as AttendanceRecord[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No attendance records yet."
      />
    </PortalLayout>
  );
}
