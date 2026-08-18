import CellAttendancePage from "@/components/CellAttendancePage";
import { leadershipNavItems } from "./navItems";

export default function LeadershipCellAttendance() {
  return <CellAttendancePage navItems={leadershipNavItems} portalLabel="Leadership Portal" />;
}