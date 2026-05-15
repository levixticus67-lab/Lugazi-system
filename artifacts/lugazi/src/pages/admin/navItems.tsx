import { NavItem } from "@/components/PortalLayout";
import {
  LayoutDashboard, Users, UserCog, Bell, GitBranch, UsersRound,
  CalendarCheck, CalendarDays, Wallet, Image, Heart,
  FileText, TrendingUp, FolderOpen, Settings, User, Mic2, HandHeart, Cake,
  Megaphone, Home, BookOpen, HandCoins, BarChart3
} from "lucide-react";

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Profile", href: "/admin/profile", icon: <User className="h-4 w-4" /> },
  { label: "Members", href: "/admin/members", icon: <Users className="h-4 w-4" /> },
  { label: "Users & Roles", href: "/admin/users", icon: <UserCog className="h-4 w-4" /> },
  { label: "Role Requests", href: "/admin/role-requests", icon: <Bell className="h-4 w-4" /> },
  { label: "Branches", href: "/admin/branches", icon: <GitBranch className="h-4 w-4" /> },
  { label: "Cell Groups", href: "/admin/groups", icon: <UsersRound className="h-4 w-4" /> },
  { label: "Cell Fellowship", href: "/admin/cell-fellowship", icon: <Home className="h-4 w-4" /> },
  { label: "Induction & Growth", href: "/admin/induction", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Attendance", href: "/admin/attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Events", href: "/admin/events", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Finance", href: "/admin/finance", icon: <Wallet className="h-4 w-4" /> },
  { label: "Giving & Payments", href: "/admin/giving", icon: <HandCoins className="h-4 w-4" /> },
  { label: "Welfare", href: "/admin/welfare", icon: <Heart className="h-4 w-4" /> },
  { label: "Prayer Requests", href: "/admin/prayer-requests", icon: <HandHeart className="h-4 w-4" /> },
  { label: "Sermon Library", href: "/admin/sermons", icon: <Mic2 className="h-4 w-4" /> },
  { label: "Birthdays", href: "/admin/birthdays", icon: <Cake className="h-4 w-4" /> },
  { label: "Pipeline", href: "/admin/pipeline", icon: <TrendingUp className="h-4 w-4" /> },
  { label: "Communication", href: "/admin/communication", icon: <Megaphone className="h-4 w-4" /> },
  { label: "Media", href: "/admin/media", icon: <Image className="h-4 w-4" /> },
  { label: "Reports", href: "/admin/reports", icon: <FileText className="h-4 w-4" /> },
  { label: "Documents", href: "/admin/documents", icon: <FolderOpen className="h-4 w-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
];
