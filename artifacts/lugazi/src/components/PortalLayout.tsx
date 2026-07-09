import { ReactNode, useState, useEffect } from "react";
import { cldAvatar } from "@/lib/cloudinary";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X, ChevronDown, Shield, Sun, Moon } from "lucide-react";
import { pastorNavItems } from "@/pages/pastor/navItems";
import { Capacitor } from "@capacitor/core";
import NotificationBell from "./NotificationBell";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [portalSwitcherOpen, setPortalSwitcherOpen] = useState(false);

  // Only installed Capacitor apps use the bottom-nav layout.
  // Any browser — mobile or desktop, PWA-installed or not — gets the sidebar.
  const isNative = Capacitor.isNativePlatform();

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => localStorage.getItem("dcl-theme") !== "light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("dcl-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Close mobile nav whenever the route changes
  useEffect(() => { setMobileNavOpen(false); setDrawerOpen(false); }, [location]);

  const isAdmin = user?.role === "admin";
  const isPastorRoute = location.startsWith("/pastor/") || location === "/pastor";
  const effectiveNav   = isPastorRoute ? pastorNavItems : navItems;
  const effectiveLabel = isPastorRoute ? "Pastor Portal" : portalLabel;
  const bottomItems    = effectiveNav.slice(0, 4);

  const portals = [
    { label: "Admin",      href: "/admin/dashboard",      role: "admin",      emoji: "🛡️" },
    { label: "Pastor",     href: "/pastor/dashboard",     role: "pastor",     emoji: "✝️" },
    { label: "Leadership", href: "/leadership/dashboard", role: "leadership", emoji: "⭐" },
    { label: "Workforce",  href: "/workforce/dashboard",  role: "workforce",  emoji: "🔧" },
    { label: "Member",     href: "/member/dashboard",     role: "member",     emoji: "🙏" },
  ];

  const UserAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => {
    const sz = size === "md" ? "w-9 h-9" : "w-8 h-8";
    return user?.photoUrl
      ? <img loading="lazy" src={cldAvatar(user.photoUrl)} alt={user.displayName} className={`${sz} rounded-full object-cover border border-border shrink-0`} />
      : <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0`}>
          {user?.displayName?.charAt(0).toUpperCase()}
        </div>;
  };

  const ThemeToggle = ({ className = "" }: { className?: string }) => (
    <button onClick={() => setIsDark(d => !d)} title="Toggle theme"
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all
        ${isDark ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"}
        ${className}`}>
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  const SidebarInner = ({ onNav }: { onNav?: () => void }) => (
    <>
      <div className="flex items-center gap-3 p-5 border-b border-sidebar-border shrink-0">
        <img loading="lazy" src="/dcl-logo.png" alt="DCL" className="w-9 h-9 rounded-full object-contain bg-white p-1 shrink-0" />
        <div className="min-w-0">
          <p className="text-sidebar-foreground font-semibold text-sm truncate">DCL Lugazi</p>
          <p className="text-sidebar-foreground/50 text-xs truncate">{effectiveLabel}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="px-3 py-2 border-b border-sidebar-border shrink-0">
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs transition-colors"
            onClick={() => setPortalSwitcherOpen(o => !o)}
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
                     onClick={() => { setPortalSwitcherOpen(false); onNav?.(); }}
                     data-testid={`link-portal-${p.role}`}>
                    {p.emoji} {p.label} Portal
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

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
                 onClick={() => onNav?.()}
                 data-testid={`nav-${item.href.split("/").pop()}`}>
                <span className="h-4 w-4 shrink-0">{item.icon}</span>
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-sidebar-accent">
          {user?.photoUrl
            ? <img loading="lazy" src={cldAvatar(user.photoUrl)} alt={user.displayName} className="w-7 h-7 rounded-full object-cover shrink-0 border border-sidebar-border" />
            : <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-semibold text-xs shrink-0">
                {user?.displayName?.charAt(0).toUpperCase()}
              </div>}
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground text-xs font-medium truncate">{user?.displayName}</p>
            <p className="text-sidebar-foreground/50 text-xs truncate capitalize">{user?.role}</p>
          </div>
          <ThemeToggle />
          <button onClick={logout} className="text-sidebar-foreground/50 hover:text-destructive transition-colors"
            data-testid="button-logout" title="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background" data-testid="portal-layout">

      {/* ── Scrim for mobile browser slide-in sidebar ── */}
      {!isNative && mobileNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SIDEBAR
          ┌─────────────┬─────────────┬─────────────────────────────────────┐
          │ Native app  │ mobile <lg  │ hidden (bottom nav used instead)    │
          │             │ desktop ≥lg │ static, always visible              │
          ├─────────────┼─────────────┼─────────────────────────────────────┤
          │ Any browser │ mobile <lg  │ fixed overlay, slides in from left  │
          │             │ desktop ≥lg │ static, always visible              │
          └─────────────┴─────────────┴─────────────────────────────────────┘ */}
      <aside className={cn(
        "w-64 bg-sidebar flex-col shrink-0 border-r border-sidebar-border",
        isNative
          ? "hidden lg:flex"
          : cn(
              "flex fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
              "lg:static lg:z-auto lg:translate-x-0",
              mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            )
      )}>
        <SidebarInner onNav={() => setMobileNavOpen(false)} />
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT COLUMN
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Browser topbar — all screen sizes; hamburger on mobile opens sidebar */}
        {!isNative && (
          <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
            <button
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <img loading="lazy" src="/dcl-logo.png" alt="DCL" className="w-7 h-7 rounded-full object-contain bg-white p-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground font-semibold text-sm leading-tight truncate">DCL Lugazi</p>
                <p className="text-muted-foreground text-[10px] leading-tight truncate">{effectiveLabel}</p>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <ThemeToggle className="hidden lg:flex" />
              <NotificationBell />
              <span className="hidden lg:block text-sm text-muted-foreground">{user?.displayName}</span>
              <UserAvatar />
            </div>
          </header>
        )}

        {/* Native mobile topbar (<lg) */}
        {isNative && (
          <header className="h-14 border-b border-border bg-card flex lg:hidden items-center px-4 gap-3 shrink-0">
            <img loading="lazy" src="/dcl-logo.png" alt="DCL" className="w-8 h-8 rounded-full object-contain bg-white p-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-semibold text-sm leading-tight">DCL Lugazi</p>
              <p className="text-muted-foreground text-xs leading-tight truncate">{effectiveLabel}</p>
            </div>
            <ThemeToggle />
            <NotificationBell />
            <UserAvatar />
          </header>
        )}

        {/* Native desktop topbar (≥lg) */}
        {isNative && (
          <header className="h-14 border-b border-border bg-card hidden lg:flex items-center px-4 gap-4 shrink-0">
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="text-sm text-muted-foreground">{user?.displayName}</span>
              <UserAvatar />
            </div>
          </header>
        )}

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6"
          style={isNative ? { paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' } : undefined}
          data-mobile-padding
        >
          {isNative && (
            <style>{`@media (min-width: 1024px) { [data-mobile-padding] { padding-bottom: 1.5rem !important; } }`}</style>
          )}
          {children}
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          NATIVE BOTTOM NAV  (<lg, native app only)
          ════════════════════════════════════════════════════════════════════ */}
      {isNative && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40"
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="mx-3 mb-2 rounded-2xl overflow-hidden"
               style={{
                 background: 'hsl(var(--card) / 0.82)',
                 backdropFilter: 'blur(24px) saturate(180%)',
                 WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                 border: '1px solid hsl(var(--primary) / 0.18)',
                 boxShadow: '0 -2px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04), 0 4px 32px hsl(var(--primary) / 0.07)',
               }}>
            <div className="flex items-stretch h-16 px-1">
              {bottomItems.map(item => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <div key={item.href} className="flex-1 flex">
                    <Link href={item.href}>
                      <a className="w-full flex flex-col items-center justify-center gap-1 py-2 px-0.5 transition-all">
                        <div className={cn(
                          "relative flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200",
                          isActive ? "bg-primary/20 shadow-[0_0_14px_hsl(var(--primary)/0.45)]" : ""
                        )}>
                          <span className={cn("h-[18px] w-[18px] transition-all duration-200",
                            isActive ? "text-primary" : "text-muted-foreground")}>
                            {item.icon}
                          </span>
                          {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />}
                        </div>
                        <span className={cn("text-[9px] font-semibold tracking-wide leading-none truncate max-w-[52px] text-center",
                          isActive ? "text-primary" : "text-muted-foreground")}>
                          {item.label}
                        </span>
                      </a>
                    </Link>
                  </div>
                );
              })}
              <button
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-0.5 min-w-0"
                onClick={() => setDrawerOpen(true)}
                data-testid="button-menu"
              >
                <div className={cn("relative flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200",
                  drawerOpen ? "bg-primary/20 shadow-[0_0_14px_hsl(var(--primary)/0.45)]" : "")}>
                  <Menu className={cn("h-[18px] w-[18px]", drawerOpen ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-[9px] font-semibold tracking-wide leading-none",
                  drawerOpen ? "text-primary" : "text-muted-foreground")}>Menu</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          NATIVE SLIDE-UP DRAWER  (<lg, native app only)
          ════════════════════════════════════════════════════════════════════ */}
      {isNative && drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
               onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex flex-col rounded-t-3xl shadow-2xl animate-slide-in-up"
               style={{
                 background: 'hsl(var(--card))',
                 border: '1px solid hsl(var(--border))',
                 borderBottom: 'none',
                 maxHeight: '88dvh',
                 paddingBottom: 'env(safe-area-inset-bottom, 0px)',
               }}>
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <img loading="lazy" src="/dcl-logo.png" alt="DCL" className="w-8 h-8 rounded-full object-contain bg-white p-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm leading-tight">DCL Lugazi</p>
                  <p className="text-muted-foreground text-xs leading-tight">{effectiveLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <button onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
              {effectiveNav.map(item => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )} onClick={() => setDrawerOpen(false)}>
                      <span className={cn("h-4 w-4 shrink-0", isActive && "text-primary")}>{item.icon}</span>
                      {item.label}
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />}
                    </a>
                  </Link>
                );
              })}
            </div>

            {isAdmin && (
              <div className="px-4 pt-3 pb-2 border-t border-border shrink-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <Shield className="h-3.5 w-3.5 text-primary/70" />
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Switch Portal</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {portals.map(p => {
                    const isCurrent = location.startsWith(`/${p.role}/`);
                    return (
                      <Link key={p.href} href={p.href}>
                        <a className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all",
                          isCurrent
                            ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]"
                            : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                        )} onClick={() => setDrawerOpen(false)}>
                          <span className="text-sm">{p.emoji}</span>
                          <span className="truncate">{p.label}</span>
                          {isCurrent && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </a>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-3 border-t border-border shrink-0">
              <UserAvatar size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <button onClick={logout}
                className="flex items-center gap-1.5 text-xs font-semibold text-destructive shrink-0 px-3 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/15 transition-colors">
                <LogOut className="h-3.5 w-3.5" />
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
