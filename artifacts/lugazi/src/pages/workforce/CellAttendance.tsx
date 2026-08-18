import CellAttendancePage from "@/components/CellAttendancePage";
import { workforceNavItems } from "./navItems";

export default function WorkforceCellAttendance() {
  return <CellAttendancePage navItems={workforceNavItems} portalLabel="Workforce Portal" />;
}