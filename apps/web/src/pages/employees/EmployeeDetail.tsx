import { useAuth } from '../../context/AuthContext';
import EmployeeForm from './EmployeeForm';
import EmployeeProfileView from './EmployeeProfileView';

// Same URL (/employees/:id) for everyone — staff get the full editable
// form, OTP-logged-in employees get a read-only profile (with a small
// self-service field on their own record). Keeps every link in the app
// (list, org chart) simple: they don't need to know or care who's viewing.
export default function EmployeeDetail() {
  const { isStaff } = useAuth();
  return isStaff ? <EmployeeForm /> : <EmployeeProfileView />;
}
