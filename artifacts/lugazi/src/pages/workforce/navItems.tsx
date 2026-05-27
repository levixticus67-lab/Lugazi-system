import { NavItem } from "@/components/PortalLayout";
  import {
    LayoutDashboard, CalendarCheck, CalendarDays, FileText, Image, User,
    Mic2, Calendar, HandCoins, QrCode, HandHeart, Heart, Star,
    ClipboardList, CalendarRange, Users
  } from "lucide-react";

  export const workforceNavItems: NavItem[] = [
    { label: "Dashboard", href: "/workforce/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "My Profile", href: "/workforce/profile", icon: <User className="h-4 w-4" /> },
    { label: "My Tasks", href: "/workforce/tasks", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Duty Roster", href: "/workforce/duty-roster", icon: <CalendarRange className="h-4 w-4" /> },
    { label: "Ministry Teams", href: "/workforce/ministry-teams", icon: <Users className="h-4 w-4" /> },
    { label: "Prayer Requests", href: "/workforce/prayer", icon: <HandHeart className="h-4 w-4" /> },
    { label: "Testimonies", href: "/workforce/testimonies", icon: <Star className="h-4 w-4" /> },
    { label: "Welfare", href: "/workforce/welfare", icon: <Heart className="h-4 w-4" /> },
    { label: "Attendance", href: "/workforce/attendance", icon: <CalendarCheck className="h-4 w-4" /> },
    { label: "Events", href: "/workforce/events", icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Meetings", href: "/workforce/meetings", icon: <Calendar className="h-4 w-4" /> },
    { label: "Sermon Library", href: "/workforce/sermons", icon: <Mic2 className="h-4 w-4" /> },
    { label: "Reports", href: "/workforce/reports", icon: <FileText className="h-4 w-4" /> },
    { label: "Media", href: "/workforce/media", icon: <Image className="h-4 w-4" /> },
    { label: "My Giving", href: "/workforce/giving", icon: <HandCoins className="h-4 w-4" /> },
    { label: "My QR Code", href: "/workforce/qr", icon: <QrCode className="h-4 w-4" /> },
  ];
  