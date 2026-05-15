import { NavItem } from "@/components/PortalLayout";
import {
  LayoutDashboard, User, CalendarCheck, CalendarDays, Heart,
  ArrowUpCircle, QrCode, HandHeart, Mic2, Users, HandCoins, Star
} from "lucide-react";

export const memberNavItems: NavItem[] = [
  { label: "Dashboard", href: "/member/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Profile", href: "/member/profile", icon: <User className="h-4 w-4" /> },
  { label: "My Family", href: "/member/family", icon: <Users className="h-4 w-4" /> },
  { label: "Attendance", href: "/member/attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Events", href: "/member/events", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Sermon Library", href: "/member/sermons", icon: <Mic2 className="h-4 w-4" /> },
  { label: "Prayer Request", href: "/member/prayer", icon: <HandHeart className="h-4 w-4" /> },
  { label: "Testimonies", href: "/member/testimonies", icon: <Star className="h-4 w-4" /> },
  { label: "My Giving", href: "/member/giving", icon: <HandCoins className="h-4 w-4" /> },
  { label: "Welfare", href: "/member/welfare", icon: <Heart className="h-4 w-4" /> },
  { label: "Upgrade Request", href: "/member/upgrade", icon: <ArrowUpCircle className="h-4 w-4" /> },
  { label: "My QR Code", href: "/member/qr", icon: <QrCode className="h-4 w-4" /> },
];
