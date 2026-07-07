import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { AuthProvider, useAuth } from "@/contexts/AuthContext";
  import { ReactNode, useEffect } from "react";
  import { useKeepAlive } from "@/hooks/use-keep-alive";
import { PwaInstallBanner, PwaUpdateBanner } from "@/components/PwaPrompts";
import InAppNotifications from "@/components/InAppNotifications";
import Terms from "@/pages/Terms";
import ResetPassword from "@/pages/ResetPassword";
import Privacy from "@/pages/Privacy";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import axios from "@/lib/axios";

  // Pages
  import Login from "@/pages/Login";
  import NotFound from "@/pages/not-found";

  // Admin pages
  import AdminDashboard from "@/pages/admin/Dashboard";
  import AdminProfile from "@/pages/admin/Profile";
  import AdminMembers from "@/pages/admin/Members";
  import AdminUsers from "@/pages/admin/Users";
  import AdminRoleRequests from "@/pages/admin/RoleRequests";
  import AdminGroups from "@/pages/admin/Groups";
  import AdminAttendance from "@/pages/admin/Attendance";
  import AdminEvents from "@/pages/admin/Events";
  import AdminMedia from "@/pages/admin/Media";
  import AdminWelfare from "@/pages/admin/Welfare";
  import AdminPrayerRequests from "@/pages/admin/PrayerRequests";
  import AdminSermons from "@/pages/admin/Sermons";
  import AdminBirthdays from "@/pages/admin/Birthdays";
  import AdminReports from "@/pages/admin/Reports";
  import AdminPipeline from "@/pages/admin/Pipeline";
  import AdminDocuments from "@/pages/admin/Documents";
  import AdminSettings from "@/pages/admin/Settings";
  import AdminCommunication from "@/pages/admin/Communication";
  import AdminCellFellowship from "@/pages/admin/CellFellowship";
  import AdminInduction from "@/pages/admin/Induction";
  import AdminGiving from "@/pages/admin/Giving";
  import AdminTestimonies from "@/pages/admin/Testimonies";
  import AdminTasks from "@/pages/admin/Tasks";
  import AdminMinistryTeams from "@/pages/admin/MinistryTeams";
  import AdminDutyRoster from "@/pages/admin/DutyRoster";
  import AdminActivityLogs from "@/pages/admin/ActivityLogs";

  // Pastor pages
  import PastorDashboard from "@/pages/pastor/Dashboard";
  import PastorAttendance from "@/pages/pastor/Attendance";
  import PastorReports from "@/pages/pastor/Reports";
  import PastorMembers from "@/pages/pastor/Members";
  import PastorRoleRequests from "@/pages/pastor/RoleRequests";
  import PastorMeetings from "@/pages/pastor/Meetings";

  // Leadership pages
  import LeadershipDashboard from "@/pages/leadership/Dashboard";
  import LeadershipProfile from "@/pages/leadership/Profile";
  import LeadershipMembers from "@/pages/leadership/Members";
  import LeadershipGroups from "@/pages/leadership/Groups";
  import LeadershipAttendance from "@/pages/leadership/Attendance";
  import LeadershipEvents from "@/pages/leadership/Events";
  import LeadershipWelfare from "@/pages/leadership/Welfare";
  import LeadershipPrayerRequests from "@/pages/leadership/PrayerRequests";
  import LeadershipSermons from "@/pages/leadership/Sermons";
  import LeadershipReports from "@/pages/leadership/Reports";
  import LeadershipPipeline from "@/pages/leadership/Pipeline";
  import LeadershipMeetings from "@/pages/leadership/Meetings";
  import LeadershipTeams from "@/pages/leadership/Teams";
  import LeadershipMedia from "@/pages/leadership/Media";
  import LeadershipGiving from "@/pages/leadership/Giving";
  import LeadershipQrCode from "@/pages/leadership/QrCode";
  import LeadershipTasks from "@/pages/leadership/Tasks";
  import LeadershipDutyRoster from "@/pages/leadership/DutyRoster";
  import LeadershipMinistryTeams from "@/pages/leadership/MinistryTeams";

  // Workforce pages
  import WorkforceDashboard from "@/pages/workforce/Dashboard";
  import WorkforceProfile from "@/pages/workforce/Profile";
  import WorkforceAttendance from "@/pages/workforce/Attendance";
  import WorkforceEvents from "@/pages/workforce/Events";
  import WorkforceSermons from "@/pages/workforce/Sermons";
  import WorkforceReports from "@/pages/workforce/Reports";
  import WorkforceMedia from "@/pages/workforce/Media";
  import WorkforceMeetings from "@/pages/workforce/Meetings";
  import WorkforceGiving from "@/pages/workforce/Giving";
  import WorkforceQrCode from "@/pages/workforce/QrCode";
  import WorkforcePrayerRequests from "@/pages/workforce/PrayerRequests";
  import WorkforceTasks from "@/pages/workforce/Tasks";
  import WorkforceDutyRoster from "@/pages/workforce/DutyRoster";
  import WorkforceMinistryTeams from "@/pages/workforce/MinistryTeams";
  import WorkforceWelfare from "@/pages/workforce/Welfare";
  import WorkforceTestimonies from "@/pages/workforce/Testimonies";

  // Member pages
  import MemberDashboard from "@/pages/member/Dashboard";
  import MemberProfile from "@/pages/member/Profile";
  import MemberAttendance from "@/pages/member/Attendance";
  import MemberEvents from "@/pages/member/Events";
  import MemberSermons from "@/pages/member/Sermons";
  import MemberPrayerRequest from "@/pages/member/PrayerRequest";
  import MemberWelfare from "@/pages/member/Welfare";
  import MemberUpgrade from "@/pages/member/Upgrade";
  import MemberQrCode from "@/pages/member/QrCode";
  import MemberFamily from "@/pages/member/Family";
  import MemberGiving from "@/pages/member/Giving";
  import MemberTestimonies from "@/pages/member/Testimonies";
  import MemberMedia from "@/pages/member/Media";

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

  function App() {
    useKeepAlive();
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <DeepLinkHandler />
            <InAppNotifications />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
          <PwaUpdateBanner />
          <PwaInstallBanner />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  export default App;
