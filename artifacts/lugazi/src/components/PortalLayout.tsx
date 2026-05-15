import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, GitBranch, UsersRound, CalendarCheck,
  CalendarDays, Wallet, Image, Heart, FileText, TrendingUp, FolderOpen,
  Settings, LogOut, Menu, X, ChevronDown, UserCog, Bell, Shield,
  ClipboardList, ArrowUpCircle
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface PortalLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  portalLabel: string;
  portalColor?: string;
}

export default function PortalLayout({ children, navItems, portalLabel, portalColor = "bg-sidebar" }: PortalLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [portalSwitcherOpen, setPortalSwitcherOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  const portals = [
    { label: "Admin Portal", href: "/admin/dashboard", role: "admin" },
    { label: "Leadership Portal", href: "/leadership/dashboard", role: "leadership" },
    { label: "Workforce Portal", href: "/workforce/dashboard", role: "workforce" },
    { label: "Member Portal", href: "/member/dashboard", role: "member" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="portal-layout">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary-foreground font-bold text-xs">DCL</span>
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm truncate">DCL Lugazi</p>
            <p className="text-sidebar-foreground/50 text-xs truncate">{portalLabel}</p>
          </div>
          <button className="lg:hidden ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Admin portal switcher */}
        {isAdmin && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs transition-colors"
              onClick={() => setPortalSwitcherOpen(!portalSwitcherOpen)}
              data-testid="button-portal-switcher"
            >
              <Shield className="h-3.5 w-3.5 text-sidebar-primary" />
              <span>Switch Portal</span>
              <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", portalSwitcherOpen && "rotate-180")} />
            </button>
            {portalSwitcherOpen && (
              <div className="mt-1 space-y-0.5">
                {portals.map(p => (
                  <Link key={p.href} href={p.href}>
                    <a className="block px-3 py-1.5 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs transition-colors" onClick={() => setPortalSwitcherOpen(false)} data-testid={`link-portal-${p.role}`}>
                      {p.label}
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.href.split("/").pop()}`}
                >
                  <span className="h-4 w-4 shrink-0">{item.icon}</span>
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-sidebar-accent">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-semibold text-xs shrink-0">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sidebar-foreground text-xs font-medium truncate">{user?.displayName}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate capitalize">{user?.role}</p>
            </div>
            <button onClick={logout} className="text-sidebar-foreground/50 hover:text-destructive transition-colors" data-testid="button-logout" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0">
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)} data-testid="button-menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.displayName}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Nav item icon helpers
export const NAV_ICONS = {
  LayoutDashboard, Users, GitBranch, UsersRound, CalendarCheck,
  CalendarDays, Wallet, Image, Heart, FileText, TrendingUp, FolderOpen,
  Settings, UserCog, Bell, ClipboardList, ArrowUpCircle
};
