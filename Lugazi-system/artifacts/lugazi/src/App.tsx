import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

// Pages
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

// Admin pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProfile from "@/pages/admin/Profile";
import AdminMembers from "@/pages/admin/Members";
import AdminUsers from "@/pages/admin/Users";
import AdminRoleRequests from "@/pages/admin/RoleRequests";
import AdminBranches from "@/pages/admin/Branches";
import AdminGroups from "@/pages/admin/Groups";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminEvents from "@/pages/admin/Events";
import AdminFinance from "@/pages/admin/Finance";
import AdminMedia from "@/pages/admin/Media";
import AdminWelfare from "@/pages/admin/Welfare";
import AdminPrayerRequests from "@/pages/admin/PrayerRequests";
import AdminSermons from "@/pages/admin/Sermons";
import AdminBirthdays from "@/pages/admin/Birthdays";
import AdminReports from "@/pages/admin/Reports";
import AdminPipeline from "@/pages/admin/Pipeline";
import AdminDocuments from "@/pages/admin/Documents";
import AdminSettings from "@/pages/admin/Settings";

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

// Workforce pages
import WorkforceDashboard from "@/pages/workforce/Dashboard";
import WorkforceProfile from "@/pages/workforce/Profile";
import WorkforceAttendance from "@/pages/workforce/Attendance";
import WorkforceEvents from "@/pages/workforce/Events";
import WorkforceSermons from "@/pages/workforce/Sermons";
import WorkforceReports from "@/pages/workforce/Reports";
import WorkforceMedia from "@/pages/workforce/Media";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

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
      <Route path="/admin/branches"><RequireAuth roles={["admin"]}><AdminBranches /></RequireAuth></Route>
      <Route path="/admin/groups"><RequireAuth roles={["admin"]}><AdminGroups /></RequireAuth></Route>
      <Route path="/admin/attendance"><RequireAuth roles={["admin"]}><AdminAttendance /></RequireAuth></Route>
      <Route path="/admin/events"><RequireAuth roles={["admin"]}><AdminEvents /></RequireAuth></Route>
      <Route path="/admin/finance"><RequireAuth roles={["admin"]}><AdminFinance /></RequireAuth></Route>
      <Route path="/admin/media"><RequireAuth roles={["admin"]}><AdminMedia /></RequireAuth></Route>
      <Route path="/admin/welfare"><RequireAuth roles={["admin"]}><AdminWelfare /></RequireAuth></Route>
      <Route path="/admin/prayer-requests"><RequireAuth roles={["admin"]}><AdminPrayerRequests /></RequireAuth></Route>
      <Route path="/admin/sermons"><RequireAuth roles={["admin"]}><AdminSermons /></RequireAuth></Route>
      <Route path="/admin/birthdays"><RequireAuth roles={["admin"]}><AdminBirthdays /></RequireAuth></Route>
      <Route path="/admin/reports"><RequireAuth roles={["admin"]}><AdminReports /></RequireAuth></Route>
      <Route path="/admin/pipeline"><RequireAuth roles={["admin"]}><AdminPipeline /></RequireAuth></Route>
      <Route path="/admin/documents"><RequireAuth roles={["admin"]}><AdminDocuments /></RequireAuth></Route>
      <Route path="/admin/settings"><RequireAuth roles={["admin"]}><AdminSettings /></RequireAuth></Route>

      {/* ── Leadership portal ── */}
      <Route path="/leadership/dashboard"><RequireAuth roles={["admin", "leadership"]}><LeadershipDashboard /></RequireAuth></Route>
      <Route path="/leadership/profile"><RequireAuth roles={["admin", "leadership"]}><LeadershipProfile /></RequireAuth></Route>
      <Route path="/leadership/members"><RequireAuth roles={["admin", "leadership"]}><LeadershipMembers /></RequireAuth></Route>
      <Route path="/leadership/groups"><RequireAuth roles={["admin", "leadership"]}><LeadershipGroups /></RequireAuth></Route>
      <Route path="/leadership/attendance"><RequireAuth roles={["admin", "leadership"]}><LeadershipAttendance /></RequireAuth></Route>
      <Route path="/leadership/events"><RequireAuth roles={["admin", "leadership"]}><LeadershipEvents /></RequireAuth></Route>
      <Route path="/leadership/welfare"><RequireAuth roles={["admin", "leadership"]}><LeadershipWelfare /></RequireAuth></Route>
      <Route path="/leadership/prayer-requests"><RequireAuth roles={["admin", "leadership"]}><LeadershipPrayerRequests /></RequireAuth></Route>
      <Route path="/leadership/sermons"><RequireAuth roles={["admin", "leadership"]}><LeadershipSermons /></RequireAuth></Route>
      <Route path="/leadership/reports"><RequireAuth roles={["admin", "leadership"]}><LeadershipReports /></RequireAuth></Route>
      <Route path="/leadership/pipeline"><RequireAuth roles={["admin", "leadership"]}><LeadershipPipeline /></RequireAuth></Route>

      {/* ── Workforce portal ── */}
      <Route path="/workforce/dashboard"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceDashboard /></RequireAuth></Route>
      <Route path="/workforce/profile"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceProfile /></RequireAuth></Route>
      <Route path="/workforce/attendance"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceAttendance /></RequireAuth></Route>
      <Route path="/workforce/events"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceEvents /></RequireAuth></Route>
      <Route path="/workforce/sermons"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceSermons /></RequireAuth></Route>
      <Route path="/workforce/reports"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceReports /></RequireAuth></Route>
      <Route path="/workforce/media"><RequireAuth roles={["admin", "leadership", "workforce"]}><WorkforceMedia /></RequireAuth></Route>

      {/* ── Member portal — all roles ── */}
      <Route path="/member/dashboard"><RequireAuth><MemberDashboard /></RequireAuth></Route>
      <Route path="/member/profile"><RequireAuth><MemberProfile /></RequireAuth></Route>
      <Route path="/member/attendance"><RequireAuth><MemberAttendance /></RequireAuth></Route>
      <Route path="/member/events"><RequireAuth><MemberEvents /></RequireAuth></Route>
      <Route path="/member/sermons"><RequireAuth><MemberSermons /></RequireAuth></Route>
      <Route path="/member/prayer"><RequireAuth><MemberPrayerRequest /></RequireAuth></Route>
      <Route path="/member/welfare"><RequireAuth><MemberWelfare /></RequireAuth></Route>
      <Route path="/member/upgrade"><RequireAuth><MemberUpgrade /></RequireAuth></Route>
      <Route path="/member/qr"><RequireAuth><MemberQrCode /></RequireAuth></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
