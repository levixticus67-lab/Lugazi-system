import CellAttendancePage from "@/components/CellAttendancePage";
import { pastorNavItems } from "./navItems";

export default function PastorCellAttendance() {
  return <CellAttendancePage navItems={pastorNavItems} portalLabel="Pastor Portal" />;
}