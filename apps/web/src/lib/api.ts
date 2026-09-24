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
  WorkLocation,
  AssetCategoryItem,
  AssetVendorItem,
  DocumentTypeItem,
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
  QuizStaff,
  QuizToTake,
  QuizAnswerSubmission,
  QuizSubmitResult,
  QuizResultRow,
  QuizDashboardStats,
  TrackQuizStatus,
  LearningTrack,
  LearningPortalCredential,
  LearningReferenceGroup,
  Technology,
  Asset,
  AssetAssignment,
  EmployeeDocumentWithOwner,
  CompanyDocument,
  CompanyDocumentAcknowledgmentStatus,
  DesignationHistoryEntry,
  ReportsPreviewUsClientAlignment,
  ReportsPreviewAttendanceTimeliness,
  ReportsPreviewTurnover,
  ReportsPreviewRecruitmentSpeed,
  ReportsPreviewFunnelRow,
  ReportsPreviewPerformanceEngagement,
  AppNotification,
  UpcomingBirthday,
  DashboardSummary,
  AbsenteeismRow,
  AttendanceAnalytics,
  AttendanceSettings,
  ProjectClosure,
  StaffingSandboxBoard,
  SandboxPlanChange,
  ReportsPreviewOverview,
  ReportsPreviewTrendPoint,
  ReportsPreviewTenureSpreadRow,
  ReportsPreviewAttendanceLedgerRow,
  ReportsPreviewTenureMobilityRow,
  ReportsPreviewAttritionRisk,
  ReportsPreviewComplianceRadar,
  ReportsPreviewComplianceRow,
  Announcement,
  AnnouncementComment,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  FavoriteColleague,
  ClientContract,
  ClientContractInput,
  EmployeeExit,
  InitiateExitInput,
  UpdateExitInput,
  UpdateExitFeedbackInput,
  ExitHandoverInput,
  ExitDocumentType,
  JobOpening,
  Candidate,
  CreateJobOpeningInput,
  UpdateJobOpeningInput,
  UpdateCandidateInput,
  ConvertCandidateInput,
  ContractTypeItem,
  CandidateSourceItem,
  ReviewCycle,
  Goal,
  CheckIn,
  PerformanceReview,
  ReviewFeedback,
  ProjectContextAssignment,
  KeyResult,
  CreateKeyResultInput,
  UpdateKeyResultInput,
  CreateReviewCycleInput,
  UpdateReviewCycleInput,
  CreateGoalInput,
  UpdateGoalInput,
  CreateCheckInInput,
  SubmitFeedbackInput,
  FinalizeReviewInput,
  Recognition,
  RecognitionComment,
  RecognitionLeaderboardEntry,
  CreateRecognitionInput,
  RecognitionReactionType,
  PulseSurvey,
  PulseSurveyDetail,
  PulseSurveyResults,
  PulseSurveyInsights,
  CreatePulseSurveyInput,
  UpdatePulseSurveyInput,
  PulseAnswerInput,
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
  if (!token) {
    console.error(`[api] authFetch(${path}) called with no auth token`);
    throw new Error('You are not signed in — please log in again.');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    // The browser's own "Failed to fetch" TypeError — the request never got
    // a response at all (API not running, wrong port, CORS, offline), as
    // opposed to a real HTTP error status below. Re-thrown with a message
    // that actually says what to check, plus a console.error carrying the
    // real error for debugging.
    console.error(`[api] Network error calling ${path}:`, err);
    throw new Error(`Could not reach the MitraHR API for ${path}. Check that the API server is running.`);
  }

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

export function getDesignationHistory(token: string, id: string): Promise<DesignationHistoryEntry[]> {
  return authFetch(token, `/employees/${id}/designation-history`);
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

// A plain fetch() can't report upload progress, so the two document
// upload forms (both now show a live progress bar in their drawers) go
// through XMLHttpRequest instead — same auth header, same error-shape
// contract as authFetch, just with a progress callback along the way.
function xhrUpload<T>(url: string, token: string, formData: FormData, onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : (undefined as any));
        } catch {
          resolve(undefined as any);
        }
      } else {
        let message = 'Upload failed';
        try {
          message = JSON.parse(xhr.responseText)?.message || message;
        } catch {
          /* response wasn't JSON — keep the generic message */
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection'));
    xhr.send(formData);
  });
}

export async function uploadEmployeeDocument(
  token: string,
  id: string,
  documentType: string,
  file: File,
  expiryDate?: string,
  notes?: string,
  onProgress?: (pct: number) => void,
): Promise<Employee> {
  const formData = new FormData();
  formData.append('documentType', documentType);
  if (expiryDate) formData.append('expiryDate', expiryDate);
  if (notes) formData.append('notes', notes);
  formData.append('file', file);
  return xhrUpload<Employee>(`${API_BASE}/employees/${id}/documents`, token, formData, onProgress);
}

export function updateEmployeeDocument(
  token: string,
  id: string,
  documentId: string,
  updates: { documentType?: string; expiryDate?: string | null; notes?: string | null },
): Promise<Employee> {
  return authFetch(token, `/employees/${id}/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteEmployeeDocument(token: string, id: string, documentId: string): Promise<Employee> {
  return authFetch(token, `/employees/${id}/documents/${documentId}`, { method: 'DELETE' });
}

export function getAllEmployeeDocuments(token: string): Promise<EmployeeDocumentWithOwner[]> {
  return authFetch(token, '/employees/documents/all');
}

export function getMyEmployeeDocuments(token: string, employeeId?: string) {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return authFetch(token, `/employees/documents/my${qs}`);
}

// Fetches a protected file (an employee document, a company document, or a
// leave attachment — anything served only through an authenticated route,
// not the public /uploads/ static path) and opens it in a new tab. A plain
// <a href> can't carry the Bearer token, so this fetches the bytes first.
export async function openAuthedFile(token: string, path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to load file');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

// Same authenticated fetch as openAuthedFile, but hands back the blob (and
// its content type) instead of opening a tab — for the Document Management
// preview drawer, which renders a PDF/image inline via an object URL rather
// than leaving the app.
export async function fetchAuthedFileBlob(token: string, path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to load file');
  return res.blob();
}

// Explicit "Download File" action (as opposed to the inline preview) — pulls
// the bytes through the same authenticated route and saves them under the
// document's real file name instead of the tab just showing a blob: URL.
export async function downloadAuthedFile(token: string, path: string, fileName: string) {
  const blob = await fetchAuthedFileBlob(token, path);
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

// --- Company Documents ---

export function getCompanyDocuments(token: string): Promise<CompanyDocument[]> {
  return authFetch(token, '/company-documents');
}

export async function createCompanyDocument(
  token: string,
  category: string,
  title: string,
  file: File,
  requiresAcknowledgment = false,
  description?: string,
  onProgress?: (pct: number) => void,
): Promise<CompanyDocument> {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('title', title);
  formData.append('requiresAcknowledgment', String(requiresAcknowledgment));
  if (description) formData.append('description', description);
  formData.append('file', file);
  return xhrUpload<CompanyDocument>(`${API_BASE}/company-documents`, token, formData, onProgress);
}

export function updateCompanyDocument(
  token: string,
  id: string,
  updates: { category?: string; title?: string; description?: string; requiresAcknowledgment?: boolean },
): Promise<CompanyDocument> {
  return authFetch(token, `/company-documents/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteCompanyDocument(token: string, id: string): Promise<void> {
  return authFetch(token, `/company-documents/${id}`, { method: 'DELETE' });
}

// Sprint 16: policy-acknowledgment tracking (POLICY-category documents only;
// see company-documents.service.ts).
export function acknowledgeCompanyDocument(token: string, id: string): Promise<void> {
  return authFetch(token, `/company-documents/${id}/acknowledge`, { method: 'POST' });
}

export function getCompanyDocumentAcknowledgments(token: string, id: string): Promise<CompanyDocumentAcknowledgmentStatus> {
  return authFetch(token, `/company-documents/${id}/acknowledgments`);
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
  role?: string,
): Promise<AdminAccount> {
  return authFetch(token, '/auth/admin/invite', {
    method: 'POST',
    body: JSON.stringify({ name, email, employeeId: employeeId || undefined, role: role || undefined }),
  });
}

export function updateAdminEmployeeLink(token: string, id: string, employeeId: string | null): Promise<AdminAccount> {
  return authFetch(token, `/auth/admin/${id}/employee-link`, {
    method: 'PATCH',
    body: JSON.stringify({ employeeId: employeeId || undefined }),
  });
}

export function updateAdminRole(token: string, id: string, role: string): Promise<AdminAccount> {
  return authFetch(token, `/auth/admin/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
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
  data: { name: string; date: string; region: string; type?: string },
): Promise<Holiday> {
  return authFetch(token, '/holidays', { method: 'POST', body: JSON.stringify(data) });
}
export function updateHoliday(
  token: string,
  id: string,
  data: { name: string; date: string; region: string; type?: string },
): Promise<Holiday> {
  return authFetch(token, `/holidays/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteHoliday(token: string, id: string): Promise<void> {
  return authFetch(token, `/holidays/${id}`, { method: 'DELETE' });
}

// --- Master Data: Work Locations (Locations tab) ---

export function getWorkLocations(token: string): Promise<WorkLocation[]> {
  return authFetch(token, '/work-locations');
}
export function createWorkLocation(
  token: string,
  data: { name: string; region?: string | null },
): Promise<WorkLocation> {
  return authFetch(token, '/work-locations', { method: 'POST', body: JSON.stringify(data) });
}
export function updateWorkLocation(
  token: string,
  id: string,
  data: { name: string; region?: string | null; active?: boolean },
): Promise<WorkLocation> {
  return authFetch(token, `/work-locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteWorkLocation(token: string, id: string): Promise<void> {
  return authFetch(token, `/work-locations/${id}`, { method: 'DELETE' });
}

// --- Master Data: Contract Types, Candidate Sources (Clients & Hiring tab) ---

export function getContractTypes(token: string): Promise<ContractTypeItem[]> {
  return authFetch(token, '/contract-types');
}
export function createContractType(token: string, data: { name: string }): Promise<ContractTypeItem> {
  return authFetch(token, '/contract-types', { method: 'POST', body: JSON.stringify(data) });
}
export function updateContractType(
  token: string,
  id: string,
  data: { name: string; active?: boolean },
): Promise<ContractTypeItem> {
  return authFetch(token, `/contract-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteContractType(token: string, id: string): Promise<void> {
  return authFetch(token, `/contract-types/${id}`, { method: 'DELETE' });
}

export function getCandidateSources(token: string): Promise<CandidateSourceItem[]> {
  return authFetch(token, '/candidate-sources');
}
export function createCandidateSource(token: string, data: { name: string }): Promise<CandidateSourceItem> {
  return authFetch(token, '/candidate-sources', { method: 'POST', body: JSON.stringify(data) });
}
export function updateCandidateSource(
  token: string,
  id: string,
  data: { name: string; active?: boolean },
): Promise<CandidateSourceItem> {
  return authFetch(token, `/candidate-sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteCandidateSource(token: string, id: string): Promise<void> {
  return authFetch(token, `/candidate-sources/${id}`, { method: 'DELETE' });
}

// --- Master Data: Asset Categories & Vendors, Document Types (Assets & Docs tab) ---

export function getAssetCategories(token: string): Promise<AssetCategoryItem[]> {
  return authFetch(token, '/asset-categories');
}
export function createAssetCategory(
  token: string,
  data: { name: string; kind?: string },
): Promise<AssetCategoryItem> {
  return authFetch(token, '/asset-categories', { method: 'POST', body: JSON.stringify(data) });
}
export function updateAssetCategory(
  token: string,
  id: string,
  data: { name: string; kind?: string; active?: boolean },
): Promise<AssetCategoryItem> {
  return authFetch(token, `/asset-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteAssetCategory(token: string, id: string): Promise<void> {
  return authFetch(token, `/asset-categories/${id}`, { method: 'DELETE' });
}

export function getAssetVendors(token: string): Promise<AssetVendorItem[]> {
  return authFetch(token, '/asset-vendors');
}
export function createAssetVendor(token: string, data: { name: string }): Promise<AssetVendorItem> {
  return authFetch(token, '/asset-vendors', { method: 'POST', body: JSON.stringify(data) });
}
export function updateAssetVendor(
  token: string,
  id: string,
  data: { name: string; active?: boolean },
): Promise<AssetVendorItem> {
  return authFetch(token, `/asset-vendors/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteAssetVendor(token: string, id: string): Promise<void> {
  return authFetch(token, `/asset-vendors/${id}`, { method: 'DELETE' });
}

export function getDocumentTypes(token: string, appliesTo?: string): Promise<DocumentTypeItem[]> {
  const qs = appliesTo ? `?appliesTo=${appliesTo}` : '';
  return authFetch(token, `/document-types${qs}`);
}
export function createDocumentType(
  token: string,
  data: { name: string; appliesTo: string },
): Promise<DocumentTypeItem> {
  return authFetch(token, '/document-types', { method: 'POST', body: JSON.stringify(data) });
}
export function updateDocumentType(
  token: string,
  id: string,
  data: { name: string; appliesTo: string; active?: boolean },
): Promise<DocumentTypeItem> {
  return authFetch(token, `/document-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteDocumentType(token: string, id: string): Promise<void> {
  return authFetch(token, `/document-types/${id}`, { method: 'DELETE' });
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

export function updateLeaveRequest(
  token: string,
  id: string,
  data: { leaveTypeId?: string; startDate?: string; endDate?: string; dayPart?: string; reason?: string },
): Promise<LeaveRequest> {
  return authFetch(token, `/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
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
  data: { employeeId: string; roleOnProject?: string; allocationPercent?: number; startDate?: string; mentorRole?: string },
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
export function getTrainingProgress(token: string, categories?: string[]): Promise<TrainingProgressEntry[]> {
  const qs = categories?.length ? `?categories=${categories.join(',')}` : '';
  return authFetch(token, `/training/progress${qs}`);
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

// --- Assessments (Learning Center "Assessments" tab) ---
// Course-scoped (IAM / DevOps) and track-scoped (Mandatory Training) quizzes
// share the same UpsertQuizDto shape server-side, so saveCourseQuiz/
// saveTrackQuiz take identical `data`.

type QuizWriteInput = {
  title?: string;
  passPercent?: number;
  active?: boolean;
  questions: { text: string; options: { text: string; isCorrect: boolean }[] }[];
};

export function getCourseQuiz(token: string, courseId: string): Promise<QuizStaff | null> {
  return authFetch(token, `/training/courses/${courseId}/quiz`);
}
export function saveCourseQuiz(token: string, courseId: string, data: QuizWriteInput): Promise<QuizStaff> {
  return authFetch(token, `/training/courses/${courseId}/quiz`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteCourseQuiz(token: string, courseId: string): Promise<void> {
  return authFetch(token, `/training/courses/${courseId}/quiz`, { method: 'DELETE' });
}
export function getTrackQuiz(token: string, track: LearningTrack): Promise<QuizStaff | null> {
  return authFetch(token, `/training/tracks/${track}/quiz`);
}
export function saveTrackQuiz(token: string, track: LearningTrack, data: QuizWriteInput): Promise<QuizStaff> {
  return authFetch(token, `/training/tracks/${track}/quiz`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteTrackQuiz(token: string, track: LearningTrack): Promise<void> {
  return authFetch(token, `/training/tracks/${track}/quiz`, { method: 'DELETE' });
}
export function getTrackQuizStatus(token: string, track: LearningTrack, employeeId?: string): Promise<TrackQuizStatus> {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return authFetch(token, `/training/tracks/${track}/quiz-status${qs}`);
}
export function getQuizToTake(token: string, quizId: string, employeeId?: string): Promise<QuizToTake> {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return authFetch(token, `/quizzes/${quizId}/take${qs}`);
}
export function submitQuiz(
  token: string,
  quizId: string,
  data: { employeeId?: string; answers: QuizAnswerSubmission[] },
): Promise<QuizSubmitResult> {
  return authFetch(token, `/quizzes/${quizId}/submit`, { method: 'POST', body: JSON.stringify(data) });
}
export function getQuizResults(token: string, categories?: string[]): Promise<QuizResultRow[]> {
  const qs = categories?.length ? `?categories=${categories.join(',')}` : '';
  return authFetch(token, `/quiz-results${qs}`);
}
export function getMyQuizResults(token: string, employeeId?: string, categories?: string[]): Promise<QuizResultRow[]> {
  const params = new URLSearchParams();
  if (employeeId) params.set('employeeId', employeeId);
  if (categories?.length) params.set('categories', categories.join(','));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return authFetch(token, `/my-quiz-results${qs}`);
}
export function getQuizDashboardStats(token: string, categories?: string[]): Promise<QuizDashboardStats> {
  const qs = categories?.length ? `?categories=${categories.join(',')}` : '';
  return authFetch(token, `/quiz-dashboard-stats${qs}`);
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

export function checkOut(token: string, data?: { employeeId?: string; date?: string }): Promise<any> {
  return authFetch(token, '/attendance/check-out', { method: 'POST', body: JSON.stringify(data || {}) });
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

// --- Notifications ---

export function getNotifications(token: string): Promise<AppNotification[]> {
  return authFetch(token, '/notifications');
}

export function getUnreadNotificationCount(token: string): Promise<{ count: number }> {
  return authFetch(token, '/notifications/unread-count');
}

export function markNotificationRead(token: string, id: string): Promise<AppNotification> {
  return authFetch(token, `/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(token: string): Promise<void> {
  return authFetch(token, '/notifications/read-all', { method: 'PATCH' });
}

export function getUpcomingBirthdays(token: string, days = 7): Promise<UpcomingBirthday[]> {
  return authFetch(token, `/employees/birthdays/upcoming?days=${days}`);
}

// Staff-only: runs the birthday + document-expiry check immediately
// instead of waiting for the daily 8am cron.
export function runDailyNotificationCheck(token: string): Promise<{ success: boolean }> {
  return authFetch(token, '/notifications/run-daily-check', { method: 'POST' });
}

// --- Reports & Dashboards ---

export function getDashboardSummary(token: string): Promise<DashboardSummary> {
  return authFetch(token, '/reports/dashboard-summary');
}

export function getAbsenteeismReport(token: string, year: number, month: number): Promise<AbsenteeismRow[]> {
  return authFetch(token, `/reports/absenteeism?year=${year}&month=${month}`);
}

export function getAttendanceAnalytics(token: string, year: number, month: number): Promise<AttendanceAnalytics> {
  return authFetch(token, `/reports/attendance-analytics?year=${year}&month=${month}`);
}

export function getProjectClosureReports(token: string): Promise<ProjectClosure[]> {
  return authFetch(token, '/reports/project-closures');
}

export function getAttendanceSettings(token: string): Promise<AttendanceSettings> {
  return authFetch(token, '/reports/attendance-settings');
}

export function updateAttendanceSettings(
  token: string,
  data: Partial<
    Pick<
      AttendanceSettings,
      'expectedStartTime' | 'expectedStartTimeDst' | 'graceMinutes' | 'earlyThresholdMinutes' | 'halfDayThresholdHours'
    >
  >,
): Promise<AttendanceSettings> {
  return authFetch(token, '/reports/attendance-settings', { method: 'PATCH', body: JSON.stringify(data) });
}

// --- Reports & Analytics preview (/reports-preview) ---

export function getReportsPreviewOverview(token: string): Promise<ReportsPreviewOverview> {
  return authFetch(token, '/reports/preview/overview');
}

export function getReportsPreviewAttendanceTrend(token: string, months = 6): Promise<ReportsPreviewTrendPoint[]> {
  return authFetch(token, `/reports/preview/attendance-trend?months=${months}`);
}

export function getReportsPreviewTenureSpread(token: string): Promise<ReportsPreviewTenureSpreadRow[]> {
  return authFetch(token, '/reports/preview/tenure-spread');
}

export function getReportsPreviewAttendanceLedger(token: string): Promise<ReportsPreviewAttendanceLedgerRow[]> {
  return authFetch(token, '/reports/preview/attendance-ledger');
}

export function getReportsPreviewTenureMobility(token: string): Promise<ReportsPreviewTenureMobilityRow[]> {
  return authFetch(token, '/reports/preview/tenure-mobility');
}

export function getReportsPreviewAttritionRisk(token: string): Promise<ReportsPreviewAttritionRisk[]> {
  return authFetch(token, '/reports/preview/attrition-risk');
}

export function getReportsPreviewComplianceRadar(token: string): Promise<ReportsPreviewComplianceRadar> {
  return authFetch(token, '/reports/preview/compliance-radar');
}

export function getReportsPreviewComplianceRoster(token: string): Promise<ReportsPreviewComplianceRow[]> {
  return authFetch(token, '/reports/preview/compliance-roster');
}

export function getReportsPreviewUsClientAlignment(token: string): Promise<ReportsPreviewUsClientAlignment> {
  return authFetch(token, '/reports/preview/us-client-alignment');
}

export function getReportsPreviewAttendanceTimeliness(token: string): Promise<ReportsPreviewAttendanceTimeliness> {
  return authFetch(token, '/reports/preview/attendance-timeliness');
}

export function getReportsPreviewTurnover(token: string): Promise<ReportsPreviewTurnover> {
  return authFetch(token, '/reports/preview/turnover');
}

export function getReportsPreviewRecruitmentSpeed(token: string): Promise<ReportsPreviewRecruitmentSpeed> {
  return authFetch(token, '/reports/preview/recruitment-speed');
}

export function getReportsPreviewRecruitmentFunnel(token: string): Promise<ReportsPreviewFunnelRow[]> {
  return authFetch(token, '/reports/preview/recruitment-funnel');
}

export function getReportsPreviewPerformanceEngagement(token: string): Promise<ReportsPreviewPerformanceEngagement> {
  return authFetch(token, '/reports/preview/performance-engagement');
}

// --- Staffing Sandbox ---

export function getStaffingSandboxBoard(token: string): Promise<StaffingSandboxBoard> {
  return authFetch(token, '/staffing-sandbox/board');
}

export function placeSandboxEmployee(token: string, employeeId: string, projectId: string | null): Promise<any> {
  return authFetch(token, '/staffing-sandbox/place', {
    method: 'PATCH',
    body: JSON.stringify({ employeeId, projectId }),
  });
}

export function resetStaffingSandbox(token: string): Promise<{ success: boolean }> {
  return authFetch(token, '/staffing-sandbox/reset', { method: 'POST' });
}

export function getStaffingSandboxPlan(token: string): Promise<SandboxPlanChange[]> {
  return authFetch(token, '/staffing-sandbox/plan');
}

export function applyStaffingSandboxPlan(token: string): Promise<{ success: boolean; changesApplied: number }> {
  return authFetch(token, '/staffing-sandbox/apply', { method: 'POST' });
}

// --- Learning Resources (portal access + reference glossary) ---

export function getLearningPortals(token: string, track: 'IAM' | 'DEVOPS'): Promise<LearningPortalCredential[]> {
  return authFetch(token, `/learning-resources/portals?track=${track}`);
}

export function getLearningReference(token: string, track: 'IAM' | 'DEVOPS'): Promise<LearningReferenceGroup[]> {
  return authFetch(token, `/learning-resources/reference?track=${track}`);
}

// --- Organization: Announcements ---

export function getAnnouncements(token: string, includeExpired = false): Promise<Announcement[]> {
  return authFetch(token, `/announcements${includeExpired ? '?includeExpired=true' : ''}`);
}

export async function createAnnouncement(token: string, input: CreateAnnouncementInput): Promise<Announcement> {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('body', input.body);
  if (input.category) formData.append('category', input.category);
  formData.append('pinned', String(!!input.pinned));
  formData.append('commentsDisabled', String(!!input.commentsDisabled));
  formData.append('audienceType', input.audienceType);
  if (input.audienceDepartmentIds?.length) {
    formData.append('audienceDepartmentIds', JSON.stringify(input.audienceDepartmentIds));
  }
  if (input.audienceEmployeeIds?.length) {
    formData.append('audienceEmployeeIds', JSON.stringify(input.audienceEmployeeIds));
  }
  if (input.expiresAt) formData.append('expiresAt', input.expiresAt);
  if (input.file) formData.append('file', input.file);
  const res = await fetch(`${API_BASE}/announcements`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to post announcement' }));
    throw new Error(err.message || 'Failed to post announcement');
  }
  return res.json();
}

export function updateAnnouncement(token: string, id: string, updates: UpdateAnnouncementInput): Promise<Announcement> {
  return authFetch(token, `/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAnnouncement(token: string, id: string): Promise<void> {
  return authFetch(token, `/announcements/${id}`, { method: 'DELETE' });
}

export function likeAnnouncement(token: string, id: string): Promise<void> {
  return authFetch(token, `/announcements/${id}/like`, { method: 'POST' });
}

export function unlikeAnnouncement(token: string, id: string): Promise<void> {
  return authFetch(token, `/announcements/${id}/like`, { method: 'DELETE' });
}

export function getAnnouncementComments(token: string, id: string): Promise<AnnouncementComment[]> {
  return authFetch(token, `/announcements/${id}/comments`);
}

export function addAnnouncementComment(token: string, id: string, body: string): Promise<AnnouncementComment> {
  return authFetch(token, `/announcements/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}

export function deleteAnnouncementComment(token: string, id: string, commentId: string): Promise<void> {
  return authFetch(token, `/announcements/${id}/comments/${commentId}`, { method: 'DELETE' });
}

// --- Organization: Favorite colleagues ---

export function getMyFavorites(token: string): Promise<FavoriteColleague[]> {
  return authFetch(token, '/favorites');
}

export function addFavorite(token: string, employeeId: string): Promise<{ success: boolean }> {
  return authFetch(token, `/favorites/${employeeId}`, { method: 'POST' });
}

export function removeFavorite(token: string, employeeId: string): Promise<{ success: boolean }> {
  return authFetch(token, `/favorites/${employeeId}`, { method: 'DELETE' });
}


// --- Client Contracts ---

export function getClientContracts(token: string, clientId?: string): Promise<ClientContract[]> {
  const qs = clientId ? `?clientId=${clientId}` : '';
  return authFetch(token, `/client-contracts${qs}`);
}

export function getClientContract(token: string, id: string): Promise<ClientContract> {
  return authFetch(token, `/client-contracts/${id}`);
}

// Multipart create — the signed contract file is optional (a contract can be
// logged before the scanned copy is on hand), same bypass-authFetch pattern
// as uploadEmployeeDocument.
export async function createClientContract(
  token: string,
  data: ClientContractInput,
  file?: File,
): Promise<ClientContract> {
  const formData = new FormData();
  formData.append('clientId', data.clientId);
  formData.append('title', data.title);
  if (data.contractType) formData.append('contractType', data.contractType);
  if (data.startDate) formData.append('startDate', data.startDate);
  if (data.endDate) formData.append('endDate', data.endDate);
  if (data.value) formData.append('value', data.value);
  if (data.status) formData.append('status', data.status);
  if (data.notes) formData.append('notes', data.notes);
  if (file) formData.append('file', file);
  const res = await fetch(`${API_BASE}/client-contracts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Contract could not be saved' }));
    throw new Error(err.message || 'Contract could not be saved');
  }
  return res.json();
}

export function updateClientContract(
  token: string,
  id: string,
  data: Partial<ClientContractInput>,
): Promise<ClientContract> {
  return authFetch(token, `/client-contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteClientContract(token: string, id: string): Promise<void> {
  return authFetch(token, `/client-contracts/${id}`, { method: 'DELETE' });
}

export function openClientContractFile(token: string, id: string) {
  return openAuthedFile(token, `/client-contracts/${id}/file`);
}

// --- Employee Exits (Exit & Clearance) ---

export function getEmployeeExits(token: string, status?: string): Promise<EmployeeExit[]> {
  const qs = status ? `?status=${status}` : '';
  return authFetch(token, `/employee-exits${qs}`);
}

export function getEmployeeExit(token: string, id: string): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${id}`);
}

export function initiateExit(token: string, data: InitiateExitInput): Promise<EmployeeExit> {
  return authFetch(token, '/employee-exits', { method: 'POST', body: JSON.stringify(data) });
}

export function updateExitClearanceItem(
  token: string,
  exitId: string,
  itemId: string,
  data: { completed?: boolean; notes?: string },
): Promise<EmployeeExit['items'][number]> {
  return authFetch(token, `/employee-exits/${exitId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function markExitCleared(token: string, id: string): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${id}/clear`, { method: 'POST' });
}

export function deleteExit(token: string, id: string): Promise<void> {
  return authFetch(token, `/employee-exits/${id}`, { method: 'DELETE' });
}

export function updateExit(token: string, id: string, data: UpdateExitInput): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function updateExitFeedback(token: string, id: string, data: UpdateExitFeedbackInput): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${id}/feedback`, { method: 'PATCH', body: JSON.stringify(data) });
}

// --- Exit category approvals (department sign-off) ---

export function approveExitCategory(
  token: string,
  exitId: string,
  group: string,
  notes?: string,
): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${exitId}/approvals/${group}`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export function revokeExitCategoryApproval(token: string, exitId: string, group: string): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${exitId}/approvals/${group}`, { method: 'DELETE' });
}

// --- Exit handovers (Project & Knowledge Handover tab) ---

export function upsertExitHandover(token: string, exitId: string, data: ExitHandoverInput): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${exitId}/handovers`, { method: 'POST', body: JSON.stringify(data) });
}

export function deleteExitHandover(token: string, exitId: string, handoverId: string): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${exitId}/handovers/${handoverId}`, { method: 'DELETE' });
}

// --- Exit documents (Documents Locker tab) ---

export async function uploadExitDocument(
  token: string,
  exitId: string,
  docType: ExitDocumentType,
  file: File,
): Promise<EmployeeExit> {
  const formData = new FormData();
  formData.append('docType', docType);
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/employee-exits/${exitId}/documents`, {
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

export function openExitDocumentFile(token: string, exitId: string, docId: string) {
  return openAuthedFile(token, `/employee-exits/${exitId}/documents/${docId}/file`);
}

export function deleteExitDocument(token: string, exitId: string, docId: string): Promise<EmployeeExit> {
  return authFetch(token, `/employee-exits/${exitId}/documents/${docId}`, { method: 'DELETE' });
}

// --- Recruitment ---

export function getJobOpenings(token: string, status?: string): Promise<JobOpening[]> {
  const qs = status ? `?status=${status}` : '';
  return authFetch(token, `/recruitment/openings${qs}`);
}

export function getJobOpening(token: string, id: string): Promise<JobOpening> {
  return authFetch(token, `/recruitment/openings/${id}`);
}

export function createJobOpening(token: string, data: CreateJobOpeningInput): Promise<JobOpening> {
  return authFetch(token, '/recruitment/openings', { method: 'POST', body: JSON.stringify(data) });
}

export function updateJobOpening(token: string, id: string, data: UpdateJobOpeningInput): Promise<JobOpening> {
  return authFetch(token, `/recruitment/openings/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteJobOpening(token: string, id: string): Promise<void> {
  return authFetch(token, `/recruitment/openings/${id}`, { method: 'DELETE' });
}

export function getCandidates(token: string, jobOpeningId?: string, stage?: string): Promise<Candidate[]> {
  const params = new URLSearchParams();
  if (jobOpeningId) params.set('jobOpeningId', jobOpeningId);
  if (stage) params.set('stage', stage);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return authFetch(token, `/recruitment/candidates${qs}`);
}

export function getCandidate(token: string, id: string): Promise<Candidate> {
  return authFetch(token, `/recruitment/candidates/${id}`);
}

// Multipart create — resume is optional, same bypass-authFetch pattern as
// createClientContract.
export async function createCandidate(
  token: string,
  data: { jobOpeningId: string; fullName: string; email: string; phone?: string; source?: string },
  resume?: File,
): Promise<Candidate> {
  const formData = new FormData();
  formData.append('jobOpeningId', data.jobOpeningId);
  formData.append('fullName', data.fullName);
  formData.append('email', data.email);
  if (data.phone) formData.append('phone', data.phone);
  if (data.source) formData.append('source', data.source);
  if (resume) formData.append('resume', resume);
  const res = await fetch(`${API_BASE}/recruitment/candidates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Candidate could not be saved' }));
    throw new Error(err.message || 'Candidate could not be saved');
  }
  return res.json();
}

export function updateCandidate(token: string, id: string, data: UpdateCandidateInput): Promise<Candidate> {
  return authFetch(token, `/recruitment/candidates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteCandidate(token: string, id: string): Promise<void> {
  return authFetch(token, `/recruitment/candidates/${id}`, { method: 'DELETE' });
}

export function openCandidateResume(token: string, id: string) {
  return openAuthedFile(token, `/recruitment/candidates/${id}/resume`);
}

// For an inline preview (an <iframe> in the candidate drawer) rather than a
// new tab — the resume endpoint is authenticated, so a plain <iframe src>
// can't carry the bearer token; fetch the blob ourselves and hand the
// drawer an object URL to point the iframe at instead.
export async function fetchCandidateResumeBlobUrl(token: string, id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/recruitment/candidates/${id}/resume`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load resume');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function convertCandidateToEmployee(
  token: string,
  id: string,
  data: ConvertCandidateInput,
): Promise<Candidate> {
  return authFetch(token, `/recruitment/candidates/${id}/convert`, { method: 'POST', body: JSON.stringify(data) });
}

// --- Sprint 14: Performance & Goal Management ---------------------------

export function getReviewCycles(token: string): Promise<ReviewCycle[]> {
  return authFetch(token, '/review-cycles');
}
export function getReviewCycle(token: string, id: string): Promise<ReviewCycle> {
  return authFetch(token, `/review-cycles/${id}`);
}
export function createReviewCycle(token: string, data: CreateReviewCycleInput): Promise<ReviewCycle> {
  return authFetch(token, '/review-cycles', { method: 'POST', body: JSON.stringify(data) });
}
export function updateReviewCycle(token: string, id: string, data: UpdateReviewCycleInput): Promise<ReviewCycle> {
  return authFetch(token, `/review-cycles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteReviewCycle(token: string, id: string): Promise<void> {
  return authFetch(token, `/review-cycles/${id}`, { method: 'DELETE' });
}

export function getGoals(
  token: string,
  params?: { employeeId?: string; reviewCycleId?: string; status?: string },
): Promise<Goal[]> {
  const qs = new URLSearchParams();
  if (params?.employeeId) qs.set('employeeId', params.employeeId);
  if (params?.reviewCycleId) qs.set('reviewCycleId', params.reviewCycleId);
  if (params?.status) qs.set('status', params.status);
  const s = qs.toString();
  return authFetch(token, `/goals${s ? `?${s}` : ''}`);
}
export function getGoal(token: string, id: string): Promise<Goal> {
  return authFetch(token, `/goals/${id}`);
}
export function createGoal(token: string, data: CreateGoalInput): Promise<Goal> {
  return authFetch(token, '/goals', { method: 'POST', body: JSON.stringify(data) });
}
export function updateGoal(token: string, id: string, data: UpdateGoalInput): Promise<Goal> {
  return authFetch(token, `/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteGoal(token: string, id: string): Promise<void> {
  return authFetch(token, `/goals/${id}`, { method: 'DELETE' });
}

export function getCheckIns(token: string, params?: { employeeId?: string; goalId?: string }): Promise<CheckIn[]> {
  const qs = new URLSearchParams();
  if (params?.employeeId) qs.set('employeeId', params.employeeId);
  if (params?.goalId) qs.set('goalId', params.goalId);
  const s = qs.toString();
  return authFetch(token, `/check-ins${s ? `?${s}` : ''}`);
}
export function createCheckIn(token: string, data: CreateCheckInInput): Promise<CheckIn> {
  return authFetch(token, '/check-ins', { method: 'POST', body: JSON.stringify(data) });
}
export function deleteCheckIn(token: string, id: string): Promise<void> {
  return authFetch(token, `/check-ins/${id}`, { method: 'DELETE' });
}

export function getPerformanceReviews(
  token: string,
  params?: { employeeId?: string; reviewCycleId?: string },
): Promise<PerformanceReview[]> {
  const qs = new URLSearchParams();
  if (params?.employeeId) qs.set('employeeId', params.employeeId);
  if (params?.reviewCycleId) qs.set('reviewCycleId', params.reviewCycleId);
  const s = qs.toString();
  return authFetch(token, `/performance-reviews${s ? `?${s}` : ''}`);
}
export function getPerformanceReview(token: string, id: string): Promise<PerformanceReview> {
  return authFetch(token, `/performance-reviews/${id}`);
}
export function createPerformanceReview(
  token: string,
  data: { reviewCycleId: string; employeeId: string; expectedPeerReviewers?: number },
): Promise<PerformanceReview> {
  return authFetch(token, '/performance-reviews', { method: 'POST', body: JSON.stringify(data) });
}
export function submitReviewFeedback(
  token: string,
  id: string,
  data: SubmitFeedbackInput,
): Promise<ReviewFeedback> {
  return authFetch(token, `/performance-reviews/${id}/feedback`, { method: 'POST', body: JSON.stringify(data) });
}
export function finalizePerformanceReview(
  token: string,
  id: string,
  data: FinalizeReviewInput,
): Promise<PerformanceReview> {
  return authFetch(token, `/performance-reviews/${id}/finalize`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function acknowledgePerformanceReview(token: string, id: string): Promise<PerformanceReview> {
  return authFetch(token, `/performance-reviews/${id}/acknowledge`, { method: 'PATCH' });
}
export function deletePerformanceReview(token: string, id: string): Promise<void> {
  return authFetch(token, `/performance-reviews/${id}`, { method: 'DELETE' });
}
export function getPerformanceReviewProjectContext(token: string, id: string): Promise<ProjectContextAssignment[]> {
  return authFetch(token, `/performance-reviews/${id}/project-context`);
}

export function createKeyResult(token: string, goalId: string, data: CreateKeyResultInput): Promise<KeyResult> {
  return authFetch(token, `/goals/${goalId}/key-results`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateKeyResult(token: string, id: string, data: UpdateKeyResultInput): Promise<KeyResult> {
  return authFetch(token, `/key-results/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteKeyResult(token: string, id: string): Promise<void> {
  return authFetch(token, `/key-results/${id}`, { method: 'DELETE' });
}

// --- Sprint 15: Employee Engagement & Feedback ---------------------------

export function getRecognitions(
  token: string,
  params?: { toEmployeeId?: string; category?: string; limit?: number },
): Promise<Recognition[]> {
  const qs = new URLSearchParams();
  if (params?.toEmployeeId) qs.set('toEmployeeId', params.toEmployeeId);
  if (params?.category) qs.set('category', params.category);
  if (params?.limit) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return authFetch(token, `/recognitions${s ? `?${s}` : ''}`);
}
export function getRecognitionLeaderboard(token: string, days = 30): Promise<RecognitionLeaderboardEntry[]> {
  return authFetch(token, `/recognitions/leaderboard?days=${days}`);
}
export function createRecognition(token: string, data: CreateRecognitionInput): Promise<Recognition> {
  return authFetch(token, '/recognitions', { method: 'POST', body: JSON.stringify(data) });
}
export function deleteRecognition(token: string, id: string): Promise<void> {
  return authFetch(token, `/recognitions/${id}`, { method: 'DELETE' });
}
export function addRecognitionReaction(token: string, id: string, reactionType: RecognitionReactionType): Promise<void> {
  return authFetch(token, `/recognitions/${id}/reactions`, { method: 'POST', body: JSON.stringify({ reactionType }) });
}
export function removeRecognitionReaction(token: string, id: string, reactionType: RecognitionReactionType): Promise<void> {
  return authFetch(token, `/recognitions/${id}/reactions/${reactionType}`, { method: 'DELETE' });
}
export function getRecognitionComments(token: string, id: string): Promise<RecognitionComment[]> {
  return authFetch(token, `/recognitions/${id}/comments`);
}
export function addRecognitionComment(token: string, id: string, body: string): Promise<RecognitionComment> {
  return authFetch(token, `/recognitions/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}
export function deleteRecognitionComment(token: string, id: string, commentId: string): Promise<void> {
  return authFetch(token, `/recognitions/${id}/comments/${commentId}`, { method: 'DELETE' });
}

export function getPulseSurveys(token: string): Promise<PulseSurvey[]> {
  return authFetch(token, '/pulse-surveys');
}
export function getPulseSurvey(token: string, id: string): Promise<PulseSurveyDetail> {
  return authFetch(token, `/pulse-surveys/${id}`);
}
export function getPulseSurveyResults(token: string, id: string): Promise<PulseSurveyResults> {
  return authFetch(token, `/pulse-surveys/${id}/results`);
}
export function getPulseSurveyInsights(token: string): Promise<PulseSurveyInsights> {
  return authFetch(token, '/pulse-surveys/insights');
}
export function createPulseSurvey(token: string, data: CreatePulseSurveyInput): Promise<PulseSurvey> {
  return authFetch(token, '/pulse-surveys', { method: 'POST', body: JSON.stringify(data) });
}
export function updatePulseSurvey(token: string, id: string, data: UpdatePulseSurveyInput): Promise<PulseSurvey> {
  return authFetch(token, `/pulse-surveys/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deletePulseSurvey(token: string, id: string): Promise<void> {
  return authFetch(token, `/pulse-surveys/${id}`, { method: 'DELETE' });
}
export function submitPulseSurveyResponse(
  token: string,
  id: string,
  answers: PulseAnswerInput[],
): Promise<{ success: boolean; updated: boolean }> {
  return authFetch(token, `/pulse-surveys/${id}/responses`, { method: 'POST', body: JSON.stringify({ answers }) });
}
