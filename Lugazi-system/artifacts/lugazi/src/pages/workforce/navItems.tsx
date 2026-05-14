import { NavItem } from "@/components/PortalLayout";
import { LayoutDashboard, CalendarCheck, CalendarDays, FileText, Image, User, Mic2 } from "lucide-react";

export const workforceNavItems: NavItem[] = [
  { label: "Dashboard", href: "/workforce/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Profile", href: "/workforce/profile", icon: <User className="h-4 w-4" /> },
  { label: "Attendance", href: "/workforce/attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Events", href: "/workforce/events", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Sermon Library", href: "/workforce/sermons", icon: <Mic2 className="h-4 w-4" /> },
  { label: "Reports", href: "/workforce/reports", icon: <FileText className="h-4 w-4" /> },
  { label: "Media", href: "/workforce/media", icon: <Image className="h-4 w-4" /> },
];
