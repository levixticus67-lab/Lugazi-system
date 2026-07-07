import { NavItem } from "@/components/PortalLayout";
  import {
    LayoutDashboard, Users, CalendarCheck, CalendarDays, Heart,
    FileText, TrendingUp, User, HandHeart, Mic2, Calendar, CheckCircle2, UserCheck, Image, Home, HandCoins, QrCode,
    ClipboardList, CalendarRange, UsersRound
  } from "lucide-react";

  export const leadershipNavItems: NavItem[] = [
    { label: "Dashboard", href: "/leadership/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "My Profile", href: "/leadership/profile", icon: <User className="h-4 w-4" /> },
    { label: "Members", href: "/leadership/members", icon: <Users className="h-4 w-4" /> },
    { label: "My Teams", href: "/leadership/teams", icon: <UserCheck className="h-4 w-4" /> },
    { label: "Ministry Teams", href: "/leadership/ministry-teams", icon: <UsersRound className="h-4 w-4" /> },
    { label: "Task Assignments", href: "/leadership/tasks", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Duty Roster", href: "/leadership/duty-roster", icon: <CalendarRange className="h-4 w-4" /> },
    { label: "Cell Fellowship", href: "/leadership/groups", icon: <Home className="h-4 w-4" /> },
    { label: "Attendance", href: "/leadership/attendance", icon: <CalendarCheck className="h-4 w-4" /> },
    { label: "Events", href: "/leadership/events", icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Meetings", href: "/leadership/meetings", icon: <Calendar className="h-4 w-4" /> },
    { label: "Prayer Requests", href: "/leadership/prayer-requests", icon: <HandHeart className="h-4 w-4" /> },
    { label: "Welfare", href: "/leadership/welfare", icon: <Heart className="h-4 w-4" /> },
    { label: "Sermon Library", href: "/leadership/sermons", icon: <Mic2 className="h-4 w-4" /> },
    { label: "Media Gallery", href: "/leadership/media", icon: <Image className="h-4 w-4" /> },
    { label: "Reports", href: "/leadership/reports", icon: <FileText className="h-4 w-4" /> },
    { label: "Pipeline", href: "/leadership/pipeline", icon: <TrendingUp className="h-4 w-4" /> },
    { label: "My Giving", href: "/leadership/giving", icon: <HandCoins className="h-4 w-4" /> },
    { label: "My QR Code", href: "/leadership/qr", icon: <QrCode className="h-4 w-4" /> },
  ];
  