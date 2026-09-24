import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarCheckIcon,
  GlobeIcon,
  IdCardIcon,
  MailIcon,
  PhoneIcon,
  StarIcon,
  UsersIcon,
  XIcon,
} from '../../components/icons';
import profileBannerImage from '../../assets/profile-banner.jpg';
import { API_BASE } from '../../lib/api';
import { Employee, FavoriteColleague, LookupItem } from '../../types';
import { Avatar, initials } from '../../components/Avatar';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  INTERN: 'Intern',
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contractor',
};

const UNASSIGNED_LOCATION = 'Unspecified location';
const UNASSIGNED_DESIGNATION = 'Unspecified designation';

function ContactInfoTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: (props: { className?: string }) => JSX.Element;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 font-medium truncate">{value}</p>
    </>
  );
  return (
    <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 min-w-0">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        {href ? (
          <a href={href} className="hover:text-mitra-accentFrom">
            {body}
          </a>
        ) : (
          body
        )}
      </div>
    </div>
  );
}

type ModalTab = 'profile' | 'department';

// Full-window profile card modeled on the Zoho People "employee card" the
// user shared: a banner behind the photo, then Profile / Department tabs.
// Opened from Department Directory; clicking anyone inside the Department
// tab re-targets the same modal to that person rather than closing it, so
// browsing the org from here never needs a page navigation.
export default function EmployeeProfileModal({
  employees,
  departments,
  employeeId,
  favorites,
  onToggleFavorite,
  onClose,
  onSelectEmployee,
}: {
  employees: Employee[];
  departments: LookupItem[];
  employeeId: string;
  favorites: FavoriteColleague[];
  onToggleFavorite: (employeeId: string, isFavorite: boolean) => void;
  onClose: () => void;
  onSelectEmployee: (employeeId: string) => void;
}) {
  const [tab, setTab] = useState<ModalTab>('profile');
  const employee = employees.find((e) => e.id === employeeId);
  const isFavorite = favorites.some((f) => f.favoriteEmployee.id === employeeId);

  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div
          className="relative h-32 sm:h-40 overflow-hidden bg-center bg-cover"
          style={{ backgroundImage: `url(${profileBannerImage})` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 px-5 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
            <div className="rounded-2xl ring-4 ring-white shadow-md flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 overflow-hidden bg-slate-200 flex items-center justify-center">
              {employee.photoUrl ? (
                <img
                  src={`${API_BASE}${employee.photoUrl}`}
                  alt={employee.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-slate-500 text-2xl font-semibold">{initials(employee.fullName)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {employee.employeeCode ? `${employee.employeeCode} - ` : ''}
                    {employee.fullName}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {employee.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{employee.designation?.name || '—'}</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(employee.id, isFavorite)}
                className={`flex-shrink-0 mt-1 ${isFavorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <StarIcon className="w-5 h-5" filled={isFavorite} />
              </button>
            </div>
          </div>

          <div className="flex gap-6 border-b border-slate-200 mt-6 mb-5">
            {(
              [
                ['profile', 'Profile'],
                ['department', 'Department'],
              ] as [ModalTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`text-sm font-medium pb-2.5 -mb-px border-b-2 transition-colors ${
                  tab === key
                    ? 'border-mitra-accentFrom text-mitra-accentFrom'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'profile' ? (
            <ProfileTabContent employee={employee} />
          ) : (
            <DepartmentTabContent
              employees={employees}
              departments={departments}
              employee={employee}
              onSelectEmployee={onSelectEmployee}
            />
          )}

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to={`/employees/${employee.id}`}
              className="text-xs text-slate-400 hover:text-mitra-accentFrom"
              onClick={onClose}
            >
              Open full employee record →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileTabContent({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ContactInfoTile icon={BuildingIcon} label="Department" value={employee.department?.name || '—'} />
        <ContactInfoTile icon={GlobeIcon} label="Work location" value={employee.workLocation || '—'} />
        <ContactInfoTile icon={MailIcon} label="Email address" value={employee.email} href={`mailto:${employee.email}`} />
        <ContactInfoTile
          icon={PhoneIcon}
          label="Phone number"
          value={employee.phone || '—'}
          href={employee.phone ? `tel:${employee.phone}` : undefined}
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Basic information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ContactInfoTile icon={IdCardIcon} label="Employee type" value={EMPLOYMENT_TYPE_LABELS[employee.employmentType] || employee.employmentType} />
          <ContactInfoTile
            icon={CalendarCheckIcon}
            label="Date of joining"
            value={employee.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : '—'}
          />
          <ContactInfoTile icon={BriefcaseIcon} label="Team" value={employee.team || '—'} />
          <ContactInfoTile
            icon={UsersIcon}
            label="Reporting manager"
            value={employee.reportingManager ? employee.reportingManager.fullName : '—'}
          />
        </div>
      </div>

      {employee.skills && employee.skills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Skills</p>
          <div className="flex flex-wrap gap-2">
            {employee.skills.map((s) => (
              <span key={s.id} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {s.skill.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentTabContent({
  employees,
  departments,
  employee,
  onSelectEmployee,
}: {
  employees: Employee[];
  departments: LookupItem[];
  employee: Employee;
  onSelectEmployee: (employeeId: string) => void;
}) {
  const [deptId, setDeptId] = useState<string>(employee.departmentId || departments[0]?.id || '');
  const [location, setLocation] = useState<string>('ALL');

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'ACTIVE'), [employees]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    activeEmployees
      .filter((e) => e.departmentId === deptId)
      .forEach((e) => set.add(e.workLocation || UNASSIGNED_LOCATION));
    return Array.from(set).sort();
  }, [activeEmployees, deptId]);

  const members = useMemo(
    () =>
      activeEmployees.filter(
        (e) =>
          e.departmentId === deptId &&
          (location === 'ALL' || (e.workLocation || UNASSIGNED_LOCATION) === location)
      ),
    [activeEmployees, deptId, location]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>();
    members.forEach((e) => {
      const key = e.designation?.name || UNASSIGNED_DESIGNATION;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [members]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={deptId}
          onChange={(e) => {
            setDeptId(e.target.value);
            setLocation('ALL');
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
        >
          <option value="ALL">All locations</option>
          {locationOptions.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-400">
          {members.length} Member{members.length === 1 ? '' : 's'}
        </span>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-slate-400">No employees found for this filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grouped.map(([designation, members]) => (
            <div key={designation} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <p className="text-xs font-semibold text-slate-600 truncate">{designation}</p>
                <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium px-1">
                  {members.length}
                </span>
              </div>
              <div className="space-y-1">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectEmployee(m.id)}
                    className={`w-full flex items-center gap-2 text-left px-1.5 py-1.5 rounded-lg hover:bg-white transition-colors ${
                      m.id === employee.id ? 'bg-white ring-1 ring-mitra-accentFrom/30' : ''
                    }`}
                  >
                    <Avatar name={m.fullName} photoUrl={m.photoUrl} size="sm" />
                    <span className="text-xs text-slate-700 truncate">
                      {m.employeeCode ? `${m.employeeCode} - ` : ''}
                      {m.fullName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
