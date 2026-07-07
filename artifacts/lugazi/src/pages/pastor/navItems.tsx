import {
  LayoutDashboard, Users, CalendarCheck, CalendarDays,
  Image, Heart, FileText, TrendingUp, FolderOpen, User, Mic2, HandHeart,
  Megaphone, Home, BookOpen, HandCoins, Star, ClipboardList, CalendarRange, UsersRound, Bell,
} from "lucide-react";
import type { NavItem } from "@/components/PortalLayout";

export const pastorNavItems: NavItem[] = [
  { label: "Dashboard",          href: "/pastor/dashboard",       icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Profile",         href: "/pastor/profile",         icon: <User className="h-4 w-4" /> },
  { label: "Members",            href: "/pastor/members",         icon: <Users className="h-4 w-4" /> },
  { label: "Role Requests",      href: "/pastor/role-requests",   icon: <Bell className="h-4 w-4" /> },
  { label: "Cell Fellowship",    href: "/pastor/cell-fellowship", icon: <Home className="h-4 w-4" /> },
  { label: "Ministry Teams",     href: "/pastor/ministry-teams",  icon: <UsersRound className="h-4 w-4" /> },
  { label: "Task Assignments",   href: "/pastor/tasks",           icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Duty Roster",        href: "/pastor/duty-roster",     icon: <CalendarRange className="h-4 w-4" /> },
  { label: "Induction & Growth", href: "/pastor/induction",       icon: <BookOpen className="h-4 w-4" /> },
  { label: "Attendance",         href: "/pastor/attendance",      icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Events",             href: "/pastor/events",          icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Giving & Payments",  href: "/pastor/giving",          icon: <HandCoins className="h-4 w-4" /> },
  { label: "Welfare",            href: "/pastor/welfare",         icon: <Heart className="h-4 w-4" /> },
  { label: "Prayer Requests",    href: "/pastor/prayer-requests", icon: <HandHeart className="h-4 w-4" /> },
  { label: "Testimonies",        href: "/pastor/testimonies",     icon: <Star className="h-4 w-4" /> },
  { label: "Sermon Library",     href: "/pastor/sermons",         icon: <Mic2 className="h-4 w-4" /> },
  { label: "Pipeline",           href: "/pastor/pipeline",        icon: <TrendingUp className="h-4 w-4" /> },
  { label: "Communication",      href: "/pastor/communication",   icon: <Megaphone className="h-4 w-4" /> },
  { label: "Media",              href: "/pastor/media",           icon: <Image className="h-4 w-4" /> },
  { label: "Reports",            href: "/pastor/reports",         icon: <FileText className="h-4 w-4" /> },
  { label: "Documents",          href: "/pastor/documents",       icon: <FolderOpen className="h-4 w-4" /> },
];
