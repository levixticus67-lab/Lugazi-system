import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { memberNavItems } from "./navItems";
import { Badge } from "@/components/ui/badge";

type AttendanceRecord = {
  id: number;
  memberName: string;
  eventName: string;
  checkedInAt: string;
  method: string;
};

export default function MemberAttendance() {
  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-mine"],
    queryFn: () => axios.get<AttendanceRecord[]>("/api/attendance/mine").then(r => r.data),
    staleTime: 30_000,
  });

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader
        title="My Attendance"
        description={`${records.length} check-in record${records.length !== 1 ? "s" : ""}`}
      />
      <DataTable
        columns={[
          { header: "Event", key: "eventName" },
          {
            header: "Method",
            key: "method",
            render: r => (
              <Badge variant="outline" className="text-xs capitalize">{r.method}</Badge>
            ),
          },
          {
            header: "Date & Time",
            key: "checkedInAt",
            render: r => new Date(r.checkedInAt).toLocaleString(),
          },
        ]}
        data={records}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No attendance records yet. Attend an event and get checked in!"
      />
    </PortalLayout>
  );
}
