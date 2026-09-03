import { Employee, EmployeeInput, LookupItem } from '../types';

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
