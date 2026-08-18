import CellAttendancePage from "@/components/CellAttendancePage";
import { memberNavItems } from "./navItems";

export default function MemberCellAttendance() {
  return <CellAttendancePage navItems={memberNavItems} portalLabel="Member Portal" />;
}