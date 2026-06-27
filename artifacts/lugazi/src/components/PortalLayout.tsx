import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X, ChevronDown, Shield } from "lucide-react";
import { pastorNavItems } from "@/pages/pastor/navItems";

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
  title?: string;
}

export default function PortalLayout({ children, navItems, portalLabel }: PortalLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [portalSwitcherOpen, setPortalSwitcherOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isPastorRoute = location.startsWith("/pastor/") || location === "/pastor";
  const effectiveNav   = isPastorRoute ? pastorNavItems : navItems;
  const effectiveLabel = isPastorRoute ? "Pastor Portal" : portalLabel;

  const portals = [
    { label: "Admin",      href: "/admin/dashboard",      role: "admin" },
    { label: "Pastor",     href: "/pastor/dashboard",     role: "pastor" },
    { label: "Leadership", href: "/leadership/dashboard", role: "leadership" },
    { label: "Workforce",  href: "/workforce/dashboard",  role: "workforce" },
    { label: "Member",     href: "/member/dashboard",     role: "member" },
  ];

  // Bottom nav: first 4 items + "More"
  const bottomItems = effectiveNav.slice(0, 4);

  const UserAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => {
    const sz = size === "md" ? "w-9 h-9 text-sm" : "w-8 h-8 text-sm";
    return user?.photoUrl ? (
      <img src={user.photoUrl} alt={user.displayName}
        className={`${sz} rounded-full object-cover border border-border shrink-0`} />
    ) : (
      <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0`}>
        {user?.displayName?.charAt(0).toUpperCase()}
      </div>
    );
  };

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const isActive = location === item.href || location.startsWith(item.href + "/");
    return (
      <Link href={item.href}>
        <a
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
            isActive
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          onClick={onClick}
        >
          <span className="h-4 w-4 shrink-0">{item.icon}</span>
          {item.label}
        </a>
      </Link>
    );
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background" data-testid="portal-layout">

      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR  (lg and above)
          ════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col shrink-0 border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
          <img src="/dcl-logo.png" alt="DCL" className="w-9 h-9 rounded-full object-contain bg-white p-1 shrink-0" />
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm truncate">DCL Lugazi</p>
            <p className="text-sidebar-foreground/50 text-xs truncate">{effectiveLabel}</p>
          </div>
        </div>

        {/* Portal switcher (admin only) */}
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
                    <a className="block px-3 py-1.5 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs transition-colors"
                       onClick={() => setPortalSwitcherOpen(false)}
                       data-testid={`link-portal-${p.role}`}>
                      {p.label} Portal
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {effectiveNav.map(item => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                   data-testid={`nav-${item.href.split("/").pop()}`}>
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
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.displayName}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-sidebar-border" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-semibold text-xs shrink-0">
                {user?.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sidebar-foreground text-xs font-medium truncate">{user?.displayName}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate capitalize">{user?.role}</p>
            </div>
            <button onClick={logout} className="text-sidebar-foreground/50 hover:text-destructive transition-colors"
              data-testid="button-logout" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MAIN CONTENT
          ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Desktop topbar */}
        <header className="hidden lg:flex h-14 border-b border-border bg-card items-center px-4 gap-4 shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.displayName}</span>
            <UserAvatar />
          </div>
        </header>

        {/* Mobile topbar */}
        <header className="lg:hidden h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          <img src="/dcl-logo.png" alt="DCL" className="w-8 h-8 rounded-full object-contain bg-white p-1 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-semibold text-sm leading-tight">DCL Lugazi</p>
            <p className="text-muted-foreground text-xs leading-tight truncate">{effectiveLabel}</p>
          </div>
          <UserAvatar />
        </header>

        {/* Page content — extra bottom padding on mobile for the bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"
              style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
              data-mobile-padding>
          {/* Remove extra bottom padding on desktop */}
          <style>{`@media (min-width: 1024px) { [data-mobile-padding] { padding-bottom: 1.5rem !important; } }`}</style>
          {children}
        </main>
      </div>

      {/* ════════════════════════════════════════
          MOBILE BOTTOM NAV BAR
          ════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-16">
          {bottomItems.map(item => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors px-1",
                  isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}>
                  <span className={cn("h-5 w-5", isActive ? "text-primary" : "")}>{item.icon}</span>
                  <span className="truncate max-w-full leading-none">{item.label}</span>
                </a>
              </Link>
            );
          })}

          {/* More / Menu button */}
          <button
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors px-1",
              drawerOpen ? "text-primary" : "text-muted-foreground"
            )}
            onClick={() => setDrawerOpen(true)}
            data-testid="button-menu"
          >
            <Menu className="h-5 w-5" />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════
          MOBILE SLIDE-UP DRAWER (full nav)
          ════════════════════════════════════════ */}
      {drawerOpen && (
        <>
          {/* Scrim */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sheet */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card rounded-t-2xl flex flex-col shadow-2xl"
               style={{ maxHeight: '85dvh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <img src="/dcl-logo.png" alt="DCL" className="w-7 h-7 rounded-full object-contain bg-white p-0.5 shrink-0" />
                <span className="font-semibold text-sm">{effectiveLabel}</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav items list */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
              {effectiveNav.map(item => (
                <NavLink key={item.href} item={item} onClick={() => setDrawerOpen(false)} />
              ))}
            </div>

            {/* Portal switcher (admin) */}
            {isAdmin && (
              <div className="px-4 pt-2 pb-1 border-t border-border shrink-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Switch Portal</p>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {portals.map(p => (
                    <Link key={p.href} href={p.href}>
                      <a className="text-center text-xs px-2 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent font-medium transition-colors leading-tight"
                         onClick={() => setDrawerOpen(false)}>
                        {p.label}
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* User row + logout */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-border shrink-0">
              <UserAvatar size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-destructive font-medium shrink-0"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const NAV_ICONS = {};
