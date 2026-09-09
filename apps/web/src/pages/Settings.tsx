import { useState } from 'react';
import LookupManager from '../components/LookupManager';
import AdminManager from '../components/AdminManager';
import LeaveTypeManager from '../components/LeaveTypeManager';
import HolidayManager from '../components/HolidayManager';
import TechnologyManager from '../components/TechnologyManager';
import TrainingCatalogManager from '../components/TrainingCatalogManager';
import TabBar, { TabBarItem } from '../components/TabBar';
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
type TabKey = 'organization' | 'skills' | 'technologies' | 'training-catalog' | 'leave-policy' | 'admins';

const TABS: TabBarItem<TabKey>[] = [
  { key: 'organization', label: 'Organization', color: 'indigo' },
  { key: 'skills', label: 'Skills', color: 'emerald' },
  { key: 'technologies', label: 'Technologies', color: 'sky' },
  { key: 'training-catalog', label: 'Training Catalog', color: 'fuchsia' },
  { key: 'leave-policy', label: 'Leave Policy', color: 'amber' },
  { key: 'admins', label: 'Admins', color: 'rose' },
];

export default function Settings() {
  const [tab, setTab] = useState<TabKey>('organization');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">Master Data</h1>
      <p className="text-sm text-slate-500 mb-6">
        The reference data that powers dropdowns and lookups across MitraHR.
      </p>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

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

      {tab === 'training-catalog' && <TrainingCatalogManager />}

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
