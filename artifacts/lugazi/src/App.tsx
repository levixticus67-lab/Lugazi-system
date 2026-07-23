import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { Component, type ReactNode, type ErrorInfo, useEffect, lazy, Suspense } from "react";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { AuthProvider, useAuth } from "@/contexts/AuthContext";
  import { useKeepAlive } from "@/hooks/use-keep-alive";
import { PwaInstallBanner, PwaUpdateBanner } from "@/components/PwaPrompts";
import UpdateChecker from "@/components/UpdateChecker";
import InAppNotifications from "@/components/InAppNotifications";
import PushNotifications from "@/components/PushNotifications";
const Terms = lazy(() => import("@/pages/Terms"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Privacy = lazy(() => import("@/pages/Privacy"));
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import axios from "@/lib/axios";

  // Pages
  import Login from "@/pages/Login";
  import NotFound from "@/pages/not-found";

  // Admin pages
  const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
  const AdminProfile = lazy(() => import("@/pages/admin/Profile"));
  const AdminMembers = lazy(() => import("@/pages/admin/Members"));
  const AdminUsers = lazy(() => import("@/pages/admin/Users"));
  const AdminRoleRequests = lazy(() => import("@/pages/admin/RoleRequests"));
  const AdminGroups = lazy(() => import("@/pages/admin/Groups"));
  const AdminAttendance = lazy(() => import("@/pages/admin/Attendance"));
  const AdminEvents = lazy(() => import("@/pages/admin/Events"));
  const AdminMedia = lazy(() => import("@/pages/admin/Media"));
  const AdminWelfare = lazy(() => import("@/pages/admin/Welfare"));
  const AdminPrayerRequests = lazy(() => import("@/pages/admin/PrayerRequests"));
  const AdminSermons = lazy(() => import("@/pages/admin/Sermons"));
  const AdminBirthdays = lazy(() => import("@/pages/admin/Birthdays"));
  const AdminReports = lazy(() => import("@/pages/admin/Reports"));
  const AdminPipeline = lazy(() => import("@/pages/admin/Pipeline"));
  const AdminDocuments = lazy(() => import("@/pages/admin/Documents"));
  const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
  const AdminCommunication = lazy(() => import("@/pages/admin/Communication"));
  const AdminCellFellowship = lazy(() => import("@/pages/admin/CellFellowship"));
  const AdminInduction = lazy(() => import("@/pages/admin/Induction"));
  const AdminGiving = lazy(() => import("@/pages/admin/Giving"));
  const AdminTestimonies = lazy(() => import("@/pages/admin/Testimonies"));
  const AdminTasks = lazy(() => import("@/pages/admin/Tasks"));
  const AdminMinistryTeams = lazy(() => import("@/pages/admin/MinistryTeams"));
  const AdminDutyRoster = lazy(() => import("@/pages/admin/DutyRoster"));
  const AdminActivityLogs = lazy(() => import("@/pages/admin/ActivityLogs"));
  const AdminFamily = lazy(() => import("@/pages/admin/Family"));

  // Pastor pages
  const PastorDashboard = lazy(() => import("@/pages/pastor/Dashboard"));
  const PastorAttendance = lazy(() => import("@/pages/pastor/Attendance"));
  const PastorReports = lazy(() => import("@/pages/pastor/Reports"));
  const PastorMembers = lazy(() => import("@/pages/pastor/Members"));
  const PastorRoleRequests = lazy(() => import("@/pages/pastor/RoleRequests"));
  const PastorMeetings = lazy(() => import("@/pages/pastor/Meetings"));
  const PastorFamily = lazy(() => import("@/pages/pastor/Family"));

  // Leadership pages
  const LeadershipDashboard = lazy(() => import("@/pages/leadership/Dashboard"));
  const LeadershipProfile = lazy(() => import("@/pages/leadership/Profile"));
  const LeadershipMembers = lazy(() => import("@/pages/leadership/Members"));
  const LeadershipGroups = lazy(() => import("@/pages/leadership/Groups"));
  const LeadershipAttendance = lazy(() => import("@/pages/leadership/Attendance"));
  const LeadershipEvents = lazy(() => import("@/pages/leadership/Events"));
  const LeadershipWelfare = lazy(() => import("@/pages/leadership/Welfare"));
  const LeadershipPrayerRequests = lazy(() => import("@/pages/leadership/PrayerRequests"));
  const LeadershipSermons = lazy(() => import("@/pages/leadership/Sermons"));
  const LeadershipReports = lazy(() => import("@/pages/leadership/Reports"));
  const LeadershipPipeline = lazy(() => import("@/pages/leadership/Pipeline"));
  const LeadershipMeetings = lazy(() => import("@/pages/leadership/Meetings"));
  const LeadershipTeams = lazy(() => import("@/pages/leadership/Teams"));
  const LeadershipMedia = lazy(() => import("@/pages/leadership/Media"));
  const LeadershipGiving = lazy(() => import("@/pages/leadership/Giving"));
  const LeadershipQrCode = lazy(() => import("@/pages/leadership/QrCode"));
  const LeadershipTasks = lazy(() => import("@/pages/leadership/Tasks"));
  const LeadershipDutyRoster = lazy(() => import("@/pages/leadership/DutyRoster"));
  const LeadershipMinistryTeams = lazy(() => import("@/pages/leadership/MinistryTeams"));
  const LeadershipFamily = lazy(() => import("@/pages/leadership/Family"));

  // Workforce pages
  const WorkforceDashboard = lazy(() => import("@/pages/workforce/Dashboard"));
  const WorkforceProfile = lazy(() => import("@/pages/workforce/Profile"));
  const WorkforceAttendance = lazy(() => import("@/pages/workforce/Attendance"));
  const WorkforceEvents = lazy(() => import("@/pages/workforce/Events"));
  const WorkforceSermons = lazy(() => import("@/pages/workforce/Sermons"));
  const WorkforceReports = lazy(() => import("@/pages/workforce/Reports"));
  const WorkforceMedia = lazy(() => import("@/pages/workforce/Media"));
  const WorkforceMeetings = lazy(() => import("@/pages/workforce/Meetings"));
  const WorkforceGiving = lazy(() => import("@/pages/workforce/Giving"));
  const WorkforceQrCode = lazy(() => import("@/pages/workforce/QrCode"));
  const WorkforcePrayerRequests = lazy(() => import("@/pages/workforce/PrayerRequests"));
  const WorkforceTasks = lazy(() => import("@/pages/workforce/Tasks"));
  const WorkforceDutyRoster = lazy(() => import("@/pages/workforce/DutyRoster"));
  const WorkforceMinistryTeams = lazy(() => import("@/pages/workforce/MinistryTeams"));
  const WorkforceWelfare = lazy(() => import("@/pages/workforce/Welfare"));
  const WorkforceTestimonies = lazy(() => import("@/pages/workforce/Testimonies"));
  const WorkforceFamily = lazy(() => import("@/pages/workforce/Family"));

  // Member pages
  const MemberDashboard = lazy(() => import("@/pages/member/Dashboard"));
  const MemberProfile = lazy(() => import("@/pages/member/Profile"));
  const MemberAttendance = lazy(() => import("@/pages/member/Attendance"));
  const MemberEvents = lazy(() => import("@/pages/member/Events"));
  const MemberSermons = lazy(() => import("@/pages/member/Sermons"));
  const MemberPrayerRequest = lazy(() => import("@/pages/member/PrayerRequest"));
  const MemberWelfare = lazy(() => import("@/pages/member/Welfare"));
  const MemberUpgrade = lazy(() => import("@/pages/member/Upgrade"));
  const MemberQrCode = lazy(() => import("@/pages/member/QrCode"));
  const MemberFamily = lazy(() => import("@/pages/member/Family"));
  const MemberGiving = lazy(() => import("@/pages/member/Giving"));
  const MemberTestimonies = lazy(() => import("@/pages/member/Testimonies"));
  const MemberMedia = lazy(() => import("@/pages/member/Media"));

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000 },
    },
  });

  // ── Deep link handler (Capacitor native only) ────────────────────────────────
  // Listens for dclugazi:// URLs that Android fires after Google OAuth redirects
  // back to the app. Exchanges the one-time oauth_code for a full session.
  function DeepLinkHandler() {
    const { login } = useAuth();

    useEffect(() => {
      if (!Capacitor.isNativePlatform()) return;

      const ROLE_MAP: Record<string, string> = {
        admin: "/admin/dashboard",
        pastor: "/pastor/dashboard",
        leadership: "/leadership/dashboard",
        workforce: "/workforce/dashboard",
        member: "/member/dashboard",
      };

      let handle: { remove: () => Promise<void> } | undefined;

      CapApp.addListener("appUrlOpen", async (event: { url: string }) => {
        try {
          const url = new URL(event.url);
          if (url.protocol !== "dclugazi:") return;

          const error = url.searchParams.get("error");
          if (error) {
            Browser.close().catch(() => {});
            window.location.href = `/login?error=${error}`;
            return;
          }

          const code = url.searchParams.get("oauth_code");
          if (!code) return;

          // Do the OAuth exchange FIRST before closing the browser.
          // Closing the Custom Tab causes the WebView to resume and re-render;
          // if we haven't written to localStorage yet the user ends up on the
          // login page with no session. Exchange → persist → close → navigate.
          const res = await axios.post<{ token: string; user: any }>("/api/auth/oauth-exchange", { code });

          // Persist to localStorage so AuthContext reads it even if the page reloads
          if (res.data.token) localStorage.setItem("dcl_token_jwt", res.data.token);
          localStorage.setItem("dcl_user", JSON.stringify(res.data.user));
          login(res.data.token, res.data.user);

          // Now safe to close — auth is already persisted
          await Browser.close().catch(() => {});

          window.location.href = ROLE_MAP[res.data.user.role] ?? "/member/dashboard";
        } catch {
          Browser.close().catch(() => {});
          window.location.href = "/login?error=google_server_error";
        }
      }).then(h => { handle = h; });

      return () => { handle?.remove(); };
    }, [login]);

    return null;
  }

  function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm animate-pulse">DCL</div>
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        </div>
      );
    }

    if (!user) return <Redirect to="/login" />;

    if (roles && !roles.includes(user.role)) {
      const portalMap: Record<string, string> = {
        admin: "/admin/dashboard",
        pastor: "/pastor/dashboard",
        leadership: "/leadership/dashboard",
        workforce: "/workforce/dashboard",
        member: "/member/dashboard",
      };
      return <Redirect to={portalMap[user.role] ?? "/login"} />;
    }

    return <>{children}</>;
  }

  function RootRedirect() {
    const { user, isLoading } = useAuth();
    if (isLoading) return null;
    if (!user) return <Redirect to="/login" />;
    const map: Record<string, string> = {
      admin: "/admin/dashboard",
      pastor: "/pastor/dashboard",
      leadership: "/leadership/dashboard",
      workforce: "/workforce/dashboard",
      member: "/member/dashboard",
    };
    return <Redirect to={map[user.role] ?? "/login"} />;
  }

  function Router() {
    return (
      <Switch>
        <Route path="/" component={RootRedirect} />
        <Route path="/login" component={Login} />
        <Route path="/verify-email" component={VerifyEmail} />

        {/* ── Admin portal ── */}
        <Route path="/admin/dashboard"><RequireAuth roles={["admin"]}><AdminDashboard /></RequireAuth></Route>
        <Route path="/admin/profile"><RequireAuth roles={["admin"]}><AdminProfile /></RequireAuth></Route>
        <Route path="/admin/members"><RequireAuth roles={["admin"]}><AdminMembers /></RequireAuth></Route>
        <Route path="/admin/users"><RequireAuth roles={["admin"]}><AdminUsers /></RequireAuth></Route>
        <Route path="/admin/role-requests"><RequireAuth roles={["admin"]}><AdminRoleRequests /></RequireAuth></Route>
        <Route path="/admin/groups"><RequireAuth roles={["admin"]}><AdminGroups /></RequireAuth></Route>
        <Route path="/admin/cell-fellowship"><RequireAuth roles={["admin"]}><AdminCellFellowship /></RequireAuth></Route>
        <Route path="/admin/induction"><RequireAuth roles={["admin"]}><AdminInduction /></RequireAuth></Route>
        <Route path="/admin/attendance"><RequireAuth roles={["admin"]}><AdminAttendance /></RequireAuth></Route>
        <Route path="/admin/events"><RequireAuth roles={["admin"]}><AdminEvents /></RequireAuth></Route>
        <Route path="/admin/giving"><RequireAuth roles={["admin"]}><AdminGiving /></RequireAuth></Route>
        <Route path="/admin/media"><RequireAuth roles={["admin"]}><AdminMedia /></RequireAuth></Route>
        <Route path="/admin/welfare"><RequireAuth roles={["admin"]}><AdminWelfare /></RequireAuth></Route>
        <Route path="/admin/prayer-requests"><RequireAuth roles={["admin"]}><AdminPrayerRequests /></RequireAuth></Route>
        <Route path="/admin/testimonies"><RequireAuth roles={["admin"]}><AdminTestimonies /></RequireAuth></Route>
        <Route path="/admin/sermons"><RequireAuth roles={["admin"]}><AdminSermons /></RequireAuth></Route>
        <Route path="/admin/birthdays"><RequireAuth roles={["admin"]}><AdminBirthdays /></RequireAuth></Route>
        <Route path="/admin/reports"><RequireAuth roles={["admin"]}><AdminReports /></RequireAuth></Route>
        <Route path="/admin/pipeline"><RequireAuth roles={["admin"]}><AdminPipeline /></RequireAuth></Route>
        <Route path="/admin/communication"><RequireAuth roles={["admin"]}><AdminCommunication /></RequireAuth></Route>
        <Route path="/admin/documents"><RequireAuth roles={["admin"]}><AdminDocuments /></RequireAuth></Route>
        <Route path="/admin/settings"><RequireAuth roles={["admin"]}><AdminSettings /></RequireAuth></Route>
        <Route path="/admin/tasks"><RequireAuth roles={["admin"]}><AdminTasks /></RequireAuth></Route>
        <Route path="/admin/ministry-teams"><RequireAuth roles={["admin"]}><AdminMinistryTeams /></RequireAuth></Route>
        <Route path="/admin/duty-roster"><RequireAuth roles={["admin"]}><AdminDutyRoster /></RequireAuth></Route>
        <Route path="/admin/activity-logs"><RequireAuth roles={["admin"]}><AdminActivityLogs /></RequireAuth></Route>
        <Route path="/admin/family"><RequireAuth roles={["admin"]}><AdminFamily /></RequireAuth></Route>

        {/* ── Pastor portal ── */}
        <Route path="/pastor/dashboard"><RequireAuth roles={["admin", "pastor"]}><PastorDashboard /></RequireAuth></Route>
        <Route path="/pastor/profile"><RequireAuth roles={["admin", "pastor"]}><AdminProfile /></RequireAuth></Route>
        <Route path="/pastor/members"><RequireAuth roles={["admin", "pastor"]}><PastorMembers /></RequireAuth></Route>
        <Route path="/pastor/role-requests"><RequireAuth roles={["admin", "pastor"]}><PastorRoleRequests /></RequireAuth></Route>
        <Route path="/pastor/cell-fellowship"><RequireAuth roles={["admin", "pastor"]}><AdminCellFellowship /></RequireAuth></Route>
        <Route path="/pastor/ministry-teams"><RequireAuth roles={["admin", "pastor"]}><AdminMinistryTeams /></RequireAuth></Route>
        <Route path="/pastor/tasks"><RequireAuth roles={["admin", "pastor"]}><AdminTasks /></RequireAuth></Route>
        <Route path="/pastor/duty-roster"><RequireAuth roles={["admin", "pastor"]}><AdminDutyRoster /></RequireAuth></Route>
        <Route path="/pastor/induction"><RequireAuth roles={["admin", "pastor"]}><AdminInduction /></RequireAuth></Route>
        <Route path="/pastor/attendance"><RequireAuth roles={["admin", "pastor"]}><PastorAttendance /></RequireAuth></Route>
        <Route path="/pastor/events"><RequireAuth roles={["admin", "pastor"]}><AdminEvents /></RequireAuth></Route>
        <Route path="/pastor/meetings"><RequireAuth roles={["admin", "pastor"]}><PastorMeetings /></RequireAuth></Route>
        <Route path="/pastor/giving"><RequireAuth roles={["admin", "pastor"]}><AdminGiving /></RequireAuth></Route>
        <Route path="/pastor/welfare"><RequireAuth roles={["admin", "pastor"]}><AdminWelfare /></RequireAuth></Route>
        <Route path="/pastor/prayer-requests"><RequireAuth roles={["admin", "pastor"]}><AdminPrayerRequests /></RequireAuth></Route>
        <Route path="/pastor/testimonies"><RequireAuth roles={["admin", "pastor"]}><AdminTestimonies /></RequireAuth></Route>
        <Route path="/pastor/sermons"><RequireAuth roles={["admin", "pastor"]}><AdminSermons /></RequireAuth></Route>
        <Route path="/pastor/pipeline"><RequireAuth roles={["admin", "pastor"]}><AdminPipeline /></RequireAuth></Route>
        <Route path="/pastor/communication"><RequireAuth roles={["admin", "pastor"]}><AdminCommunication /></RequireAuth></Route>
        <Route path="/pastor/media"><RequireAuth roles={["admin", "pastor"]}><AdminMedia /></RequireAuth></Route>
        <Route path="/pastor/reports"><RequireAuth roles={["admin", "pastor"]}><PastorReports /></RequireAuth></Route>
        <Route path="/pastor/documents"><RequireAuth roles={["admin", "pastor"]}><AdminDocuments /></RequireAuth></Route>
        <Route path="/pastor/groups"><RequireAuth roles={["admin", "pastor"]}><AdminGroups /></RequireAuth></Route>
        <Route path="/pastor/family"><RequireAuth roles={["admin", "pastor"]}><PastorFamily /></RequireAuth></Route>

        {/* ── Leadership portal ── */}
        <Route path="/leadership/dashboard"><RequireAuth roles={["admin", "leadership"]}><LeadershipDashboard /></RequireAuth></Route>
        <Route path="/leadership/profile"><RequireAuth roles={["admin", "leadership"]}><LeadershipProfile /></RequireAuth></Route>
        <Route path="/leadership/members"><RequireAuth roles={["admin", "leadership"]}><LeadershipMembers /></RequireAuth></Route>
        <Route path="/leadership/teams"><RequireAuth roles={["admin", "leadership"]}><LeadershipTeams /></RequireAuth></Route>
        <Route path="/leadership/ministry-teams"><RequireAuth roles={["admin", "leadership"]}><LeadershipMinistryTeams /></RequireAuth></Route>
        <Route path="/leadership/groups"><RequireAuth roles={["admin", "leadership"]}><LeadershipGroups /></RequireAuth></Route>
        <Route path="/leadership/attendance"><RequireAuth roles={["admin", "leadership"]}><LeadershipAttendance /></RequireAuth></Route>
        <Route path="/leadership/events"><RequireAuth roles={["admin", "leadership"]}><LeadershipEvents /></RequireAuth></Route>
        <Route path="/leadership/meetings"><RequireAuth roles={["admin", "leadership"]}><LeadershipMeetings /></RequireAuth></Route>
        <Route path="/leadership/welfare"><RequireAuth roles={["admin", "leadership"]}><LeadershipWelfare /></RequireAuth></Route>
        <Route path="/leadership/prayer-requests"><RequireAuth roles={["admin", "leadership"]}><LeadershipPrayerRequests /></RequireAuth></Route>
        <Route path="/leadership/sermons"><RequireAuth roles={["admin", "leadership"]}><LeadershipSermons /></RequireAuth></Route>
        <Route path="/leadership/media"><RequireAuth roles={["admin", "leadership"]}><LeadershipMedia /></RequireAuth></Route>
        <Route path="/leadership/reports"><RequireAuth roles={["admin", "leadership"]}><LeadershipReports /></RequireAuth></Route>
        <Route path="/leadership/pipeline"><RequireAuth roles={["admin", "leadership"]}><LeadershipPipeline /></RequireAuth></Route>
        <Route path="/leadership/giving"><RequireAuth roles={["admin", "leadership"]}><LeadershipGiving /></RequireAuth></Route>
        <Route path="/leadership/qr"><RequireAuth roles={["admin", "leadership"]}><LeadershipQrCode /></RequireAuth></Route>
        <Route path="/leadership/tasks"><RequireAuth roles={["admin", "leadership"]}><LeadershipTasks /></RequireAuth></Route>
        <Route path="/leadership/duty-roster"><RequireAuth roles={["admin", "leadership"]}><LeadershipDutyRoster /></RequireAuth></Route>
        <Route path="/leadership/family"><RequireAuth roles={["admin", "leadership"]}><LeadershipFamily /></RequireAuth></Route>

        {/* ── Workforce portal ── */}
        <Route path="/workforce/dashboard"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceDashboard /></RequireAuth></Route>
        <Route path="/workforce/profile"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceProfile /></RequireAuth></Route>
        <Route path="/workforce/attendance"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceAttendance /></RequireAuth></Route>
        <Route path="/workforce/events"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceEvents /></RequireAuth></Route>
        <Route path="/workforce/meetings"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceMeetings /></RequireAuth></Route>
        <Route path="/workforce/sermons"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceSermons /></RequireAuth></Route>
        <Route path="/workforce/reports"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceReports /></RequireAuth></Route>
        <Route path="/workforce/media"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceMedia /></RequireAuth></Route>
        <Route path="/workforce/giving"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceGiving /></RequireAuth></Route>
        <Route path="/workforce/qr"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceQrCode /></RequireAuth></Route>
        <Route path="/workforce/prayer"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforcePrayerRequests /></RequireAuth></Route>
        <Route path="/workforce/tasks"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceTasks /></RequireAuth></Route>
        <Route path="/workforce/duty-roster"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceDutyRoster /></RequireAuth></Route>
        <Route path="/workforce/ministry-teams"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceMinistryTeams /></RequireAuth></Route>
        <Route path="/workforce/welfare"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceWelfare /></RequireAuth></Route>
        <Route path="/workforce/testimonies"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceTestimonies /></RequireAuth></Route>
        <Route path="/workforce/family"><RequireAuth roles={["admin", "workforce"]}><WorkforceFamily /></RequireAuth></Route>

        {/* ── Member portal — all roles ── */}
        <Route path="/member/dashboard"><RequireAuth><MemberDashboard /></RequireAuth></Route>
        <Route path="/member/profile"><RequireAuth><MemberProfile /></RequireAuth></Route>
        <Route path="/member/family"><RequireAuth><MemberFamily /></RequireAuth></Route>
        <Route path="/member/attendance"><RequireAuth><MemberAttendance /></RequireAuth></Route>
        <Route path="/member/events"><RequireAuth><MemberEvents /></RequireAuth></Route>
        <Route path="/member/sermons"><RequireAuth><MemberSermons /></RequireAuth></Route>
        <Route path="/member/prayer"><RequireAuth><MemberPrayerRequest /></RequireAuth></Route>
        <Route path="/member/testimonies"><RequireAuth><MemberTestimonies /></RequireAuth></Route>
        <Route path="/member/giving"><RequireAuth><MemberGiving /></RequireAuth></Route>
        <Route path="/member/welfare"><RequireAuth><MemberWelfare /></RequireAuth></Route>
        <Route path="/member/upgrade"><RequireAuth><MemberUpgrade /></RequireAuth></Route>
        <Route path="/member/media"><RequireAuth><MemberMedia /></RequireAuth></Route>
        <Route path="/member/qr"><RequireAuth><MemberQrCode /></RequireAuth></Route>

        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  function PageLoadingFallback() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full blue-gradient-bg flex items-center justify-center text-white font-bold text-sm animate-pulse">DCL</div>
      </div>
    );
  }

  class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    constructor(props: { children: ReactNode }) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error: Error) { return { error }; }
    componentDidCatch(error: Error, info: ErrorInfo) {
      console.error("[DCL] App crash:", error, info);
    }
    render() {
      if (this.state.error) {
        return (
          <div style={{ padding: 32, fontFamily: "sans-serif", textAlign: "center" }}>
            <h2 style={{ color: "#6D1F3C", marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: "#555", marginBottom: 20, fontSize: 14 }}>{this.state.error.message}</p>
            <button
              style={{ padding: "10px 24px", background: "#6D1F3C", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            >
              Reload app
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  function App() {
    useKeepAlive();
    return (
      <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <DeepLinkHandler />
            <InAppNotifications />
            <PushNotifications />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Suspense fallback={<PageLoadingFallback />}>
                <Router />
              </Suspense>
            </WouterRouter>
          </AuthProvider>
          <Toaster />
          <UpdateChecker />
          <PwaUpdateBanner />
          <PwaInstallBanner />
        </TooltipProvider>
      </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  export default App;
