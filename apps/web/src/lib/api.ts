import { Employee, EmployeeInput } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
