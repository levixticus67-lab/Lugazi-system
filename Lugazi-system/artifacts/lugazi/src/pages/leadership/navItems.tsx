import { NavItem } from "@/components/PortalLayout";
import { LayoutDashboard, Users, UsersRound, CalendarCheck, CalendarDays, Heart, FileText, TrendingUp, User, HandHeart, Mic2 } from "lucide-react";

export const leadershipNavItems: NavItem[] = [
  { label: "Dashboard", href: "/leadership/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Profile", href: "/leadership/profile", icon: <User className="h-4 w-4" /> },
  { label: "Members", href: "/leadership/members", icon: <Users className="h-4 w-4" /> },
  { label: "Cell Groups", href: "/leadership/groups", icon: <UsersRound className="h-4 w-4" /> },
  { label: "Attendance", href: "/leadership/attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Events", href: "/leadership/events", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Prayer Requests", href: "/leadership/prayer-requests", icon: <HandHeart className="h-4 w-4" /> },
  { label: "Sermon Library", href: "/leadership/sermons", icon: <Mic2 className="h-4 w-4" /> },
  { label: "Welfare", href: "/leadership/welfare", icon: <Heart className="h-4 w-4" /> },
  { label: "Reports", href: "/leadership/reports", icon: <FileText className="h-4 w-4" /> },
  { label: "Pipeline", href: "/leadership/pipeline", icon: <TrendingUp className="h-4 w-4" /> },
];
