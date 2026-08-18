import CellAttendancePage from "@/components/CellAttendancePage";
import { adminNavItems } from "./navItems";

export default function AdminCellAttendance() {
  return <CellAttendancePage navItems={adminNavItems} portalLabel="Admin Portal" />;
}