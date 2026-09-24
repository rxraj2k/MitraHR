import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Home from './pages/Home';
import Settings from './pages/Settings';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import OnboardTalentWizard from './pages/employees/OnboardTalentWizard';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import OrgChart from './pages/OrgChart';
import OrganizationOverview from './pages/organization/OrganizationOverview';
import OrganizationDirectory from './pages/organization/OrganizationDirectory';
import OrganizationDepartmentTree from './pages/organization/OrganizationDepartmentTree';
import OrganizationAnnouncementsPolicies from './pages/organization/OrganizationAnnouncementsPolicies';
import OrganizationBirthdays from './pages/organization/OrganizationBirthdays';
import OrganizationNewHires from './pages/organization/OrganizationNewHires';
import MySpaceSummary from './pages/myspace/MySpace';
import MySpaceAttendanceLeave from './pages/myspace/MySpaceAttendanceLeave';
import MySpaceApprovalsDocuments from './pages/myspace/MySpaceApprovalsDocuments';
import MySpacePerformance from './pages/myspace/MySpacePerformance';
import MyTeamDirectReports from './pages/myteam/MyTeam';
import MyTeamAttendanceApprovals from './pages/myteam/MyTeamAttendanceApprovals';
import MyTeamTree from './pages/myteam/MyTeamTree';
import MyLeave from './pages/leave/MyLeave';
import AdminLeave from './pages/leave/AdminLeave';
import ClientsPage from './pages/projects/ClientsPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetail from './pages/projects/ProjectDetail';
import UtilizationPage from './pages/projects/UtilizationPage';
import LearningCenter from './pages/training/LearningCenter';
import MyLearning from './pages/training/MyLearning';
import AssetManagement from './pages/assets/AssetManagement';
import DocumentManagement from './pages/documents/DocumentManagement';
import ReportsPreview from './pages/reports/ReportsPreview';
import StaffingSandbox from './pages/staffing/StaffingSandbox';
import ExitClearance from './pages/exits/ExitClearance';
import Recruitment from './pages/recruitment/Recruitment';
import AdminPerformance from './pages/performance/AdminPerformance';
import MyPerformance from './pages/performance/MyPerformance';
import Engagement from './pages/engagement/Engagement';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;
  }
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Staff-only page guard — an OTP-logged-in employee who navigates here
// directly (typed URL, old bookmark) gets bounced to the employee list
// instead of the admin form/settings.
function StaffOnlyRoute({ children }: { children: JSX.Element }) {
  const { isStaff } = useAuth();
  if (!isStaff) return <Navigate to="/employees" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="employees" element={<EmployeeList />} />
        <Route
          path="employees/new"
          element={
            <StaffOnlyRoute>
              <OnboardTalentWizard />
            </StaffOnlyRoute>
          }
        />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="org-chart" element={<OrgChart />} />

        <Route path="organization" element={<Navigate to="/organization/overview" replace />} />
        <Route path="organization/overview" element={<OrganizationOverview />} />
        <Route path="organization/directory" element={<OrganizationDirectory />} />
        <Route path="organization/department-tree" element={<OrganizationDepartmentTree />} />
        <Route path="organization/announcements-policies" element={<OrganizationAnnouncementsPolicies />} />
        {/* Old individual routes kept as redirects for back-compat (bookmarks, old links) rather than removed. */}
        <Route path="organization/announcements" element={<Navigate to="/organization/announcements-policies" replace />} />
        <Route path="organization/policies" element={<Navigate to="/organization/announcements-policies" replace />} />
        {/* Reachable from Overview's widget "View all" links — not primary
            sidebar sub-nav entries themselves, see AppLayout's SPACES. */}
        <Route path="organization/birthdays" element={<OrganizationBirthdays />} />
        <Route path="organization/new-hires" element={<OrganizationNewHires />} />

        <Route path="my-space" element={<Navigate to="/my-space/summary" replace />} />
        <Route path="my-space/summary" element={<MySpaceSummary />} />
        <Route path="my-space/attendance-leave" element={<MySpaceAttendanceLeave />} />
        <Route path="my-space/approvals-documents" element={<MySpaceApprovalsDocuments />} />
        {/* Old individual routes kept as redirects for back-compat rather than removed. */}
        <Route path="my-space/leave" element={<Navigate to="/my-space/attendance-leave" replace />} />
        <Route path="my-space/attendance" element={<Navigate to="/my-space/attendance-leave" replace />} />
        <Route path="my-space/files" element={<Navigate to="/my-space/approvals-documents" replace />} />
        {/* Unlisted in the primary sidebar now, but kept reachable — see MySpace.tsx's "My Performance ->" quick link. */}
        <Route path="my-space/performance" element={<MySpacePerformance />} />

        <Route path="my-team" element={<Navigate to="/my-team/direct-reports" replace />} />
        <Route path="my-team/direct-reports" element={<MyTeamDirectReports />} />
        <Route path="my-team/attendance-approvals" element={<MyTeamAttendanceApprovals />} />
        {/* Old individual routes kept as redirects for back-compat rather than removed. */}
        <Route path="my-team/attendance" element={<Navigate to="/my-team/attendance-approvals" replace />} />
        <Route path="my-team/approvals" element={<Navigate to="/my-team/attendance-approvals" replace />} />
        <Route path="my-team/tree" element={<MyTeamTree />} />
        <Route
          path="leave"
          element={
            <StaffOnlyRoute>
              <AdminLeave />
            </StaffOnlyRoute>
          }
        />
        <Route path="my-leave" element={<MyLeave />} />
        <Route
          path="clients"
          element={
            <StaffOnlyRoute>
              <ClientsPage />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="projects"
          element={
            <StaffOnlyRoute>
              <ProjectsPage />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="projects/:id"
          element={
            <StaffOnlyRoute>
              <ProjectDetail />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="utilization"
          element={
            <StaffOnlyRoute>
              <UtilizationPage />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="staffing-sandbox"
          element={
            <StaffOnlyRoute>
              <StaffingSandbox />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="training"
          element={
            <StaffOnlyRoute>
              <LearningCenter />
            </StaffOnlyRoute>
          }
        />
        <Route path="my-learning" element={<MyLearning />} />
        <Route
          path="assets"
          element={
            <StaffOnlyRoute>
              <AssetManagement />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="documents"
          element={
            <StaffOnlyRoute>
              <DocumentManagement />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="exits"
          element={
            <StaffOnlyRoute>
              <ExitClearance />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="recruitment"
          element={
            <StaffOnlyRoute>
              <Recruitment />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="performance"
          element={
            <StaffOnlyRoute>
              <AdminPerformance />
            </StaffOnlyRoute>
          }
        />
        <Route path="my-performance" element={<MyPerformance />} />
        <Route path="engagement" element={<Engagement />} />
        <Route
          path="reports"
          element={
            <StaffOnlyRoute>
              <ReportsPreview />
            </StaffOnlyRoute>
          }
        />
        <Route
          path="settings"
          element={
            <StaffOnlyRoute>
              <Settings />
            </StaffOnlyRoute>
          }
        />
      </Route>
    </Routes>
  );
}
