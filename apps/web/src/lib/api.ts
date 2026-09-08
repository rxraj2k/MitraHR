import {
  AdminAccount,
  AttendanceDay,
  AttendanceToday,
  Client,
  CompOffEntry,
  Employee,
  EmployeeInput,
  EmployeeSkillEntry,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  LookupItem,
  MyProjectAssignment,
  Project,
  ProjectAssignment,
  UtilizationResponse,
  TrainingCourse,
  EmployeeTraining,
  TrainingProgressEntry,
  Technology,
  Asset,
  AssetAssignment,
} from '../types';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(err.message || 'Login failed');
  }
  return res.json();
}

export async function fetchMe(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function requestEmployeeOtp(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/employee/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Could not send a login code' }));
    throw new Error(err.message || 'Could not send a login code');
  }
  return res.json();
}

export async function verifyEmployeeOtp(email: string, code: string) {
  const res = await fetch(`${API_BASE}/auth/employee/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Invalid or expired code' }));
    throw new Error(err.message || 'Invalid or expired code');
  }
  return res.json();
}

async function authFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Request failed (${res.status})` }));
    throw new Error(err.message || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- Employees ---

export function getEmployees(token: string): Promise<Employee[]> {
  return authFetch(token, '/employees');
}

export function getEmployee(token: string, id: string): Promise<Employee> {
  return authFetch(token, `/employees/${id}`);
}

export function createEmployee(token: string, data: EmployeeInput): Promise<Employee> {
  return authFetch(token, '/employees', { method: 'POST', body: JSON.stringify(data) });
}

export function updateEmployee(token: string, id: string, data: Partial<EmployeeInput>): Promise<Employee> {
  return authFetch(token, `/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteEmployee(token: string, id: string): Promise<void> {
  return authFetch(token, `/employees/${id}`, { method: 'DELETE' });
}

export function updateMyProfile(token: string, data: { phone?: string }): Promise<Employee> {
  return authFetch(token, '/employees/me', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function uploadEmployeePhoto(token: string, id: string, file: File): Promise<Employee> {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${API_BASE}/employees/${id}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets the multipart boundary
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Photo upload failed' }));
    throw new Error(err.message || 'Photo upload failed');
  }
  return res.json();
}

export function replaceEmployeeSkills(
  token: string,
  id: string,
  skills: EmployeeSkillEntry[],
): Promise<Employee> {
  const payload = {
    skills: skills
      .filter((s) => s.skillId && s.proficiency && s.yearsExperience !== '')
      .map((s) => ({
        skillId: s.skillId,
        proficiency: s.proficiency,
        yearsExperience: Number(s.yearsExperience),
      })),
  };
  return authFetch(token, `/employees/${id}/skills`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function uploadEmployeeDocument(
  token: string,
  id: string,
  documentType: string,
  file: File,
): Promise<Employee> {
  const formData = new FormData();
  formData.append('documentType', documentType);
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/employees/${id}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Document upload failed' }));
    throw new Error(err.message || 'Document upload failed');
  }
  return res.json();
}

export function deleteEmployeeDocument(token: string, id: string, documentId: string): Promise<Employee> {
  return authFetch(token, `/employees/${id}/documents/${documentId}`, { method: 'DELETE' });
}

// --- Departments ---

export function getDepartments(token: string): Promise<LookupItem[]> {
  return authFetch(token, '/departments');
}
export function createDepartment(token: string, name: string): Promise<LookupItem> {
  return authFetch(token, '/departments', { method: 'POST', body: JSON.stringify({ name }) });
}
export function updateDepartment(token: string, id: string, name: string): Promise<LookupItem> {
  return authFetch(token, `/departments/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}
export function deleteDepartment(token: string, id: string): Promise<void> {
  return authFetch(token, `/departments/${id}`, { method: 'DELETE' });
}

// --- Designations ---

export function getDesignations(token: string): Promise<LookupItem[]> {
  return authFetch(token, '/designations');
}
export function createDesignation(token: string, name: string): Promise<LookupItem> {
  return authFetch(token, '/designations', { method: 'POST', body: JSON.stringify({ name }) });
}
export function updateDesignation(token: string, id: string, name: string): Promise<LookupItem> {
  return authFetch(token, `/designations/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}
export function deleteDesignation(token: string, id: string): Promise<void> {
  return authFetch(token, `/designations/${id}`, { method: 'DELETE' });
}

// --- Skills ---

export function getSkills(token: string): Promise<LookupItem[]> {
  return authFetch(token, '/skills');
}
export function createSkill(token: string, name: string): Promise<LookupItem> {
  return authFetch(token, '/skills', { method: 'POST', body: JSON.stringify({ name }) });
}
export function updateSkill(token: string, id: string, name: string): Promise<LookupItem> {
  return authFetch(token, `/skills/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}
export function deleteSkill(token: string, id: string): Promise<void> {
  return authFetch(token, `/skills/${id}`, { method: 'DELETE' });
}

// --- Admins (staff accounts) ---

export function getAdmins(token: string): Promise<AdminAccount[]> {
  return authFetch(token, '/auth/admin/users');
}

export function inviteAdmin(
  token: string,
  name: string,
  email: string,
  employeeId?: string,
): Promise<AdminAccount> {
  return authFetch(token, '/auth/admin/invite', {
    method: 'POST',
    body: JSON.stringify({ name, email, employeeId: employeeId || undefined }),
  });
}

export async function setPassword(token: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/admin/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Could not set password' }));
    throw new Error(err.message || 'Could not set password');
  }
  return res.json();
}

// --- Leave Types ---

export function getLeaveTypes(token: string): Promise<LeaveType[]> {
  return authFetch(token, '/leave-types');
}
export function createLeaveType(
  token: string,
  data: Omit<LeaveType, 'id' | 'active'> & { active?: boolean },
): Promise<LeaveType> {
  return authFetch(token, '/leave-types', { method: 'POST', body: JSON.stringify(data) });
}
export function updateLeaveType(token: string, id: string, data: Omit<LeaveType, 'id'>): Promise<LeaveType> {
  return authFetch(token, `/leave-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteLeaveType(token: string, id: string): Promise<void> {
  return authFetch(token, `/leave-types/${id}`, { method: 'DELETE' });
}

// --- Holidays ---

export function getHolidays(token: string): Promise<Holiday[]> {
  return authFetch(token, '/holidays');
}
export function createHoliday(
  token: string,
  data: { name: string; date: string; region: string },
): Promise<Holiday> {
  return authFetch(token, '/holidays', { method: 'POST', body: JSON.stringify(data) });
}
export function updateHoliday(
  token: string,
  id: string,
  data: { name: string; date: string; region: string },
): Promise<Holiday> {
  return authFetch(token, `/holidays/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteHoliday(token: string, id: string): Promise<void> {
  return authFetch(token, `/holidays/${id}`, { method: 'DELETE' });
}

// --- Leave Requests ---

export function getLeaveBalances(token: string, employeeId?: string): Promise<LeaveBalance[]> {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return authFetch(token, `/leave-requests/balances${qs}`);
}

export function getLeaveRequests(
  token: string,
  params?: { employeeId?: string; status?: string },
): Promise<LeaveRequest[]> {
  const qs = new URLSearchParams();
  if (params?.employeeId) qs.set('employeeId', params.employeeId);
  if (params?.status) qs.set('status', params.status);
  const s = qs.toString();
  return authFetch(token, `/leave-requests${s ? `?${s}` : ''}`);
}

export function createLeaveRequest(
  token: string,
  data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    dayPart?: string;
    reason?: string;
    employeeId?: string;
  },
): Promise<LeaveRequest> {
  return authFetch(token, '/leave-requests', { method: 'POST', body: JSON.stringify(data) });
}

export function cancelLeaveRequest(token: string, id: string): Promise<LeaveRequest> {
  return authFetch(token, `/leave-requests/${id}/cancel`, { method: 'PATCH' });
}

export function decideLeaveRequest(
  token: string,
  id: string,
  status: 'APPROVED' | 'REJECTED',
  decisionNote?: string,
): Promise<LeaveRequest> {
  return authFetch(token, `/leave-requests/${id}/decide`, {
    method: 'PATCH',
    body: JSON.stringify({ status, decisionNote }),
  });
}

export function getLeaveCalendar(
  token: string,
  year: number,
  month: number,
): Promise<{ requests: LeaveRequest[]; holidays: Holiday[] }> {
  return authFetch(token, `/leave-requests/calendar?year=${year}&month=${month}`);
}

export async function uploadLeaveAttachment(token: string, id: string, file: File): Promise<LeaveRequest> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/leave-requests/${id}/attachment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Attachment upload failed' }));
    throw new Error(err.message || 'Attachment upload failed');
  }
  return res.json();
}

// --- Compensatory Off ---

export function getCompOffEntries(
  token: string,
  params?: { employeeId?: string; status?: string },
): Promise<CompOffEntry[]> {
  const qs = new URLSearchParams();
  if (params?.employeeId) qs.set('employeeId', params.employeeId);
  if (params?.status) qs.set('status', params.status);
  const s = qs.toString();
  return authFetch(token, `/comp-off${s ? `?${s}` : ''}`);
}

export function createCompOffEntry(
  token: string,
  data: { workedDate: string; reason: string; daysEarned?: number; employeeId?: string },
): Promise<CompOffEntry> {
  return authFetch(token, '/comp-off', { method: 'POST', body: JSON.stringify(data) });
}

export function decideCompOffEntry(
  token: string,
  id: string,
  status: 'APPROVED' | 'REJECTED',
  decisionNote?: string,
): Promise<CompOffEntry> {
  return authFetch(token, `/comp-off/${id}/decide`, {
    method: 'PATCH',
    body: JSON.stringify({ status, decisionNote }),
  });
}

// --- Clients ---

export function getClients(token: string): Promise<Client[]> {
  return authFetch(token, '/clients');
}
export function getClient(token: string, id: string): Promise<Client> {
  return authFetch(token, `/clients/${id}`);
}
export function createClient(token: string, data: Partial<Client>): Promise<Client> {
  return authFetch(token, '/clients', { method: 'POST', body: JSON.stringify(data) });
}
export function updateClient(token: string, id: string, data: Partial<Client>): Promise<Client> {
  return authFetch(token, `/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteClient(token: string, id: string): Promise<void> {
  return authFetch(token, `/clients/${id}`, { method: 'DELETE' });
}

// --- Projects ---

export function getProjects(
  token: string,
  params?: { clientId?: string; status?: string },
): Promise<Project[]> {
  const qs = new URLSearchParams();
  if (params?.clientId) qs.set('clientId', params.clientId);
  if (params?.status) qs.set('status', params.status);
  const s = qs.toString();
  return authFetch(token, `/projects${s ? `?${s}` : ''}`);
}
export function getProject(token: string, id: string): Promise<Project> {
  return authFetch(token, `/projects/${id}`);
}
export function createProject(token: string, data: Partial<Project>): Promise<Project> {
  return authFetch(token, '/projects', { method: 'POST', body: JSON.stringify(data) });
}
export function updateProject(token: string, id: string, data: Partial<Project>): Promise<Project> {
  return authFetch(token, `/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteProject(token: string, id: string): Promise<void> {
  return authFetch(token, `/projects/${id}`, { method: 'DELETE' });
}
export function endProject(
  token: string,
  id: string,
  data: { endDate?: string; closureSummary: string },
): Promise<Project> {
  return authFetch(token, `/projects/${id}/end`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function getMyProjects(token: string, employeeId?: string): Promise<MyProjectAssignment[]> {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return authFetch(token, `/projects/my${qs}`);
}

// --- Project Assignments ---

export function addProjectAssignment(
  token: string,
  projectId: string,
  data: { employeeId: string; roleOnProject?: string; allocationPercent?: number; startDate?: string },
): Promise<ProjectAssignment> {
  return authFetch(token, `/projects/${projectId}/assignments`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateProjectAssignment(
  token: string,
  projectId: string,
  assignmentId: string,
  data: { roleOnProject?: string; allocationPercent?: number; endDate?: string | null },
): Promise<ProjectAssignment> {
  return authFetch(token, `/projects/${projectId}/assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
export function removeProjectAssignment(token: string, projectId: string, assignmentId: string): Promise<void> {
  return authFetch(token, `/projects/${projectId}/assignments/${assignmentId}`, { method: 'DELETE' });
}

// --- Bench / Utilization ---

export function getUtilization(token: string): Promise<UtilizationResponse> {
  return authFetch(token, '/utilization');
}

// --- Training & Certifications ---

export function getTrainingCourses(token: string, includeInactive?: boolean): Promise<TrainingCourse[]> {
  const qs = includeInactive ? '?includeInactive=true' : '';
  return authFetch(token, `/training/courses${qs}`);
}
export function createTrainingCourse(token: string, data: Partial<TrainingCourse>): Promise<TrainingCourse> {
  return authFetch(token, '/training/courses', { method: 'POST', body: JSON.stringify(data) });
}
export function updateTrainingCourse(token: string, id: string, data: Partial<TrainingCourse>): Promise<TrainingCourse> {
  return authFetch(token, `/training/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteTrainingCourse(token: string, id: string): Promise<void> {
  return authFetch(token, `/training/courses/${id}`, { method: 'DELETE' });
}
export function getTrainingProgress(token: string): Promise<TrainingProgressEntry[]> {
  return authFetch(token, '/training/progress');
}
export function assignTraining(token: string, data: { employeeIds: string[]; courseIds: string[] }): Promise<void> {
  return authFetch(token, '/training/assignments', { method: 'POST', body: JSON.stringify(data) });
}
export function updateTrainingAssignmentStatus(token: string, id: string, status: string): Promise<EmployeeTraining> {
  return authFetch(token, `/training/assignments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export function removeTrainingAssignment(token: string, id: string): Promise<void> {
  return authFetch(token, `/training/assignments/${id}`, { method: 'DELETE' });
}
export function getMyTraining(token: string, employeeId?: string): Promise<EmployeeTraining[]> {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return authFetch(token, `/training/my${qs}`);
}

// --- Technologies ---

export function getTechnologies(token: string, category?: string): Promise<Technology[]> {
  const qs = category ? `?category=${category}` : '';
  return authFetch(token, `/technologies${qs}`);
}
export function createTechnology(token: string, data: { name: string; category: string; active?: boolean }): Promise<Technology> {
  return authFetch(token, '/technologies', { method: 'POST', body: JSON.stringify(data) });
}
export function updateTechnology(
  token: string,
  id: string,
  data: { name: string; category: string; active?: boolean },
): Promise<Technology> {
  return authFetch(token, `/technologies/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteTechnology(token: string, id: string): Promise<void> {
  return authFetch(token, `/technologies/${id}`, { method: 'DELETE' });
}

// --- Attendance ---

export function checkIn(token: string, data?: { employeeId?: string; date?: string }): Promise<any> {
  return authFetch(token, '/attendance/check-in', { method: 'POST', body: JSON.stringify(data || {}) });
}

export function getAttendanceToday(token: string): Promise<AttendanceToday> {
  return authFetch(token, '/attendance/today');
}

export function getAttendanceCalendar(
  token: string,
  year: number,
  month: number,
  employeeId?: string,
): Promise<{ days: AttendanceDay[] }> {
  const qs = employeeId ? `&employeeId=${employeeId}` : '';
  return authFetch(token, `/attendance/calendar?year=${year}&month=${month}${qs}`);
}


// --- Asset Management ---

export function getAssets(token: string, params?: { category?: string; status?: string }): Promise<Asset[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.status) qs.set('status', params.status);
  const s = qs.toString();
  return authFetch(token, `/assets${s ? `?${s}` : ''}`);
}
export function getAsset(token: string, id: string): Promise<Asset> {
  return authFetch(token, `/assets/${id}`);
}
export function createAsset(token: string, data: Partial<Asset>): Promise<Asset> {
  return authFetch(token, '/assets', { method: 'POST', body: JSON.stringify(data) });
}
export function updateAsset(token: string, id: string, data: Partial<Asset>): Promise<Asset> {
  return authFetch(token, `/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteAsset(token: string, id: string): Promise<void> {
  return authFetch(token, `/assets/${id}`, { method: 'DELETE' });
}
export function assignAsset(
  token: string,
  id: string,
  data: { employeeId: string; conditionAtAssignment?: string },
): Promise<AssetAssignment> {
  return authFetch(token, `/assets/${id}/assign`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function returnAsset(
  token: string,
  id: string,
  data: { conditionAtReturn?: string; returnNotes?: string; resultingStatus?: string },
): Promise<AssetAssignment> {
  return authFetch(token, `/assets/${id}/return`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function setAssetStatus(token: string, id: string, status: string): Promise<Asset> {
  return authFetch(token, `/assets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export function getMyAssets(token: string, employeeId?: string): Promise<AssetAssignment[]> {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return authFetch(token, `/assets/my${qs}`);
}
