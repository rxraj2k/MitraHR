// Talent Directory (Sprint 19) — the redesigned Employees page. Vocabulary,
// labels, and small derivation helpers live here so EmployeeList.tsx,
// EmployeeForm.tsx, and TalentProfileDrawer.tsx all read from one place.
import { DeploymentStatus, Employee, EXPERIENCE_LEVELS, ExperienceLevel, MyProjectAssignment } from '../types';

// Reuses the existing EXPERIENCE_LEVELS/ExperienceLevel from recruitment
// (types.ts) — see this file's top-of-module comment.
export { EXPERIENCE_LEVELS };
export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  ENTRY: 'Entry',
  MID: 'Mid',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};

// Billable/Shadow/Bench/Onboarding/Internal — set by staff on the employee
// record itself (see schema.prisma's comment on Employee.deploymentStatus
// for why this isn't derived from ProjectAssignment).
export const DEPLOYMENT_STATUSES: DeploymentStatus[] = ['BILLABLE', 'SHADOW', 'BENCH', 'ONBOARDING', 'INTERNAL'];
export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  BILLABLE: 'Billable',
  SHADOW: 'Shadow',
  BENCH: 'Bench',
  ONBOARDING: 'Onboarding',
  INTERNAL: 'Internal Ops',
};
// Spec calls for green/Billable, amber/Bench, blue/Internal; Shadow and
// Onboarding get their own colors from the same badge palette used
// elsewhere in the app (AssetStatus, ExpiryStatus, etc).
export const DEPLOYMENT_STATUS_BADGE: Record<DeploymentStatus, string> = {
  BILLABLE: 'bg-emerald-100 text-emerald-700',
  SHADOW: 'bg-indigo-100 text-indigo-700',
  BENCH: 'bg-amber-100 text-amber-700',
  ONBOARDING: 'bg-sky-100 text-sky-700',
  INTERNAL: 'bg-blue-100 text-blue-700',
};

// Company is a Pune-based consultancy — everyone works IST. No per-employee
// timezone field exists (or is needed) beyond this static label, shown in
// the Talent Profile drawer's overview.
export const COMPANY_TIMEZONE_LABEL = 'Asia/Kolkata (IST)';

/**
 * The Client Allocation tag shown in the table/cards and the drawer.
 * Prefers the real, currently-open ProjectAssignment (if any) over the
 * manually-set deploymentStatus flag, since the assignment is the fact the
 * schema actually knows for certain; deploymentStatus is only a fallback
 * label for employees who currently have no open assignment at all.
 */
export function getClientAllocation(employee: Employee): { label: string; clientId?: string } {
  const open = employee.projectAssignments?.[0];
  if (open) {
    const client = open.project.client;
    return { label: client.name, clientId: client.id };
  }
  switch (employee.deploymentStatus) {
    case 'BENCH':
      return { label: 'Bench' };
    case 'INTERNAL':
      return { label: 'Internal Ops' };
    case 'ONBOARDING':
      return { label: 'Onboarding' };
    default:
      // BILLABLE/SHADOW with no open assignment on file — a data gap, not
      // a fabricated client name.
      return { label: 'Unassigned' };
  }
}

/** Top skills by years of experience, for the table/card tech-stack chips. */
export function getTopSkills(employee: Employee, limit = 4): { name: string; years: number }[] {
  const skills = employee.skills || [];
  return [...skills]
    .sort((a, b) => b.yearsExperience - a.yearsExperience)
    .slice(0, limit)
    .map((s) => ({ name: s.skill.name, years: s.yearsExperience }));
}

/** Whether a project assignment (from getMyProjects) is currently open. */
export function isCurrentAssignment(a: MyProjectAssignment): boolean {
  return !a.endDate;
}
