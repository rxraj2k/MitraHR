import LookupManager from '../components/LookupManager';
import AdminManager from '../components/AdminManager';
import LeaveTypeManager from '../components/LeaveTypeManager';
import HolidayManager from '../components/HolidayManager';
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

export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Settings</h1>
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
        <LookupManager
          title="Skills"
          getAll={getSkills}
          create={createSkill}
          update={updateSkill}
          remove={deleteSkill}
        />
        <AdminManager />
        <HolidayManager />
        <LeaveTypeManager />
      </div>
    </div>
  );
}
