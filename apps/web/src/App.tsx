import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Home from './pages/Home';
import Settings from './pages/Settings';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import OrgChart from './pages/OrgChart';
import MyLeave from './pages/leave/MyLeave';
import AdminLeave from './pages/leave/AdminLeave';

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
              <EmployeeForm />
            </StaffOnlyRoute>
          }
        />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="org-chart" element={<OrgChart />} />
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
