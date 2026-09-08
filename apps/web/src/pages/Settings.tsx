import { useState } from 'react';
import LookupManager from '../components/LookupManager';
import AdminManager from '../components/AdminManager';
import LeaveTypeManager from '../components/LeaveTypeManager';
import HolidayManager from '../components/HolidayManager';
import TechnologyManager from '../components/TechnologyManager';
import {
  createDepartment,
  createDesignation,
  createSkill,
  deleteDepartment,
  deleteDesignation,
  deleteSkill,
  getDepartments,
  getDesignations,
  getSkills,
  updateDepartment,
  updateDesignation,
  updateSkill,
} from '../lib/api';

// Each tab owns one logical group of reference data. Skills and
// Technologies get their own tabs because those two lists are by far the
// longest — everything else is small enough to share a tab comfortably.
type TabKey = 'organization' | 'skills' | 'technologies' | 'leave-policy' | 'admins';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'organization', label: 'Organization' },
  { key: 'skills', label: 'Skills' },
  { key: 'technologies', label: 'Technologies' },
  { key: 'leave-policy', label: 'Leave Policy' },
  { key: 'admins', label: 'Admins' },
];

function tabButtonClass(active: boolean) {
  return [
    'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
    active
      ? 'border-mitra-accentTo text-slate-800'
      : 'border-transparent text-slate-500 hover:text-slate-700',
  ].join(' ');
}

export default function Settings() {
  const [tab, setTab] = useState<TabKey>('organization');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">Master Data</h1>
      <p className="text-sm text-slate-500 mb-6">
        The reference data that powers dropdowns and lookups across MitraHR.
      </p>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={tabButtonClass(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'organization' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LookupManager
            title="Departments"
            getAll={getDepartments}
            create={createDepartment}
            update={updateDepartment}
            remove={deleteDepartment}
          />
          <LookupManager
            title="Designations"
            getAll={getDesignations}
            create={createDesignation}
            update={updateDesignation}
            remove={deleteDesignation}
          />
        </div>
      )}

      {tab === 'skills' && (
        <div className="max-w-2xl">
          <LookupManager
            title="Skills"
            getAll={getSkills}
            create={createSkill}
            update={updateSkill}
            remove={deleteSkill}
          />
        </div>
      )}

      {tab === 'technologies' && <TechnologyManager />}

      {tab === 'leave-policy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HolidayManager />
          <LeaveTypeManager />
        </div>
      )}

      {tab === 'admins' && (
        <div className="max-w-2xl">
          <AdminManager />
        </div>
      )}
    </div>
  );
}
