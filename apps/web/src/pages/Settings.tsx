import { useState } from 'react';
import LookupManager from '../components/LookupManager';
import AdminManager from '../components/AdminManager';
import LeaveTypeManager from '../components/LeaveTypeManager';
import HolidayManager from '../components/HolidayManager';
import TechnologyManager from '../components/TechnologyManager';
import TrainingCatalogManager from '../components/TrainingCatalogManager';
import MasterDataAssessmentsManager from '../components/MasterDataAssessmentsManager';
import AssetCategoryManager from '../components/AssetCategoryManager';
import Tabs3D, { Tab3DItem } from '../components/Tabs3D';
import {
  AwardIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarCheckIcon,
  DatabaseIcon,
  FolderIcon,
  GraduationCapIcon,
  MapPinIcon,
  SearchIcon,
  ShieldIcon,
  TagIcon,
} from '../components/icons';
import {
  createDepartment,
  createDesignation,
  createSkill,
  createAssetVendor,
  createDocumentType,
  createWorkLocation,
  createContractType,
  createCandidateSource,
  deleteDepartment,
  deleteDesignation,
  deleteSkill,
  deleteAssetVendor,
  deleteDocumentType,
  deleteWorkLocation,
  deleteContractType,
  deleteCandidateSource,
  getDepartments,
  getDesignations,
  getSkills,
  getAssetVendors,
  getDocumentTypes,
  getWorkLocations,
  getContractTypes,
  getCandidateSources,
  updateDepartment,
  updateDesignation,
  updateSkill,
  updateAssetVendor,
  updateDocumentType,
  updateWorkLocation,
  updateContractType,
  updateCandidateSource,
} from '../lib/api';

// Each tab owns one logical group of reference data. Skills and
// Technologies get their own tabs because those two lists are by far the
// longest — everything else is small enough to share a tab comfortably.
type TabKey =
  | 'organization'
  | 'skills'
  | 'technologies'
  | 'training-catalog'
  | 'assessments'
  | 'clients-hiring'
  | 'leave-policy'
  | 'admins'
  | 'assets-docs'
  | 'locations';

const TABS: Tab3DItem<TabKey>[] = [
  { key: 'organization', label: 'Organization', color: 'indigo', icon: BuildingIcon },
  { key: 'skills', label: 'Skills', color: 'emerald', icon: TagIcon },
  { key: 'technologies', label: 'Technologies', color: 'sky', icon: DatabaseIcon },
  { key: 'training-catalog', label: 'Training Catalog', color: 'fuchsia', icon: GraduationCapIcon },
  { key: 'assessments', label: 'Assessments', color: 'cyan', icon: AwardIcon },
  { key: 'clients-hiring', label: 'Clients & Hiring', color: 'lime', icon: BriefcaseIcon },
  { key: 'leave-policy', label: 'Leave Policy', color: 'amber', icon: CalendarCheckIcon },
  { key: 'admins', label: 'Admins', color: 'rose', icon: ShieldIcon },
  { key: 'assets-docs', label: 'Assets & Docs', color: 'violet', icon: FolderIcon },
  { key: 'locations', label: 'Locations', color: 'slate', icon: MapPinIcon },
];

// Document types are one lookup table shared by two forms (Employee Docs /
// Company Docs), split here into fixed appliesTo columns via small closures
// around the shared create/update calls — see DocumentType's schema note.
function createEmployeeDocType(token: string, name: string) {
  return createDocumentType(token, { name, appliesTo: 'EMPLOYEE' });
}
function updateEmployeeDocType(token: string, id: string, name: string) {
  return updateDocumentType(token, id, { name, appliesTo: 'EMPLOYEE' });
}
function createCompanyDocType(token: string, name: string) {
  return createDocumentType(token, { name, appliesTo: 'COMPANY' });
}
function updateCompanyDocType(token: string, id: string, name: string) {
  return updateDocumentType(token, id, { name, appliesTo: 'COMPANY' });
}
function createVendor(token: string, name: string) {
  return createAssetVendor(token, { name });
}
function updateVendor(token: string, id: string, name: string) {
  return updateAssetVendor(token, id, { name });
}
function createLocation(token: string, name: string) {
  return createWorkLocation(token, { name });
}
function updateLocation(token: string, id: string, name: string) {
  return updateWorkLocation(token, id, { name });
}
function createContractTypeLookup(token: string, name: string) {
  return createContractType(token, { name });
}
function updateContractTypeLookup(token: string, id: string, name: string) {
  return updateContractType(token, id, { name });
}
function createCandidateSourceLookup(token: string, name: string) {
  return createCandidateSource(token, { name });
}
function updateCandidateSourceLookup(token: string, id: string, name: string) {
  return updateCandidateSource(token, id, { name });
}

export default function Settings() {
  const [tab, setTab] = useState<TabKey>('organization');
  const [query, setQuery] = useState('');

  // A single search box that filters whichever tab is currently open —
  // "quickly locate any technology, skill, department, or admin" without a
  // separate index/lookup UI to maintain. Switch tabs and the same text
  // keeps filtering the new list.
  // Always a string (never undefined) once passed down — this is what lets
  // each manager tell "a parent search box controls me" (hide my own local
  // search input) apart from "no parent search at all" (show it), even
  // while the shared box is empty.
  const q = query.trim();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">Master Data</h1>
          <p className="text-sm text-slate-500">The reference data that powers dropdowns and lookups across MitraHR.</p>
        </div>
        <div className="relative w-full md:w-72">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search master data..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="mb-6">
        <Tabs3D tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'organization' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LookupManager
            title="Departments"
            getAll={getDepartments}
            create={createDepartment}
            update={updateDepartment}
            remove={deleteDepartment}
            searchQuery={q}
          />
          <LookupManager
            title="Designations"
            getAll={getDesignations}
            create={createDesignation}
            update={updateDesignation}
            remove={deleteDesignation}
            searchQuery={q}
          />
        </div>
      )}

      {tab === 'skills' && (
        <div className="max-w-2xl">
          <LookupManager
            title="Skills"
            variant="chips"
            getAll={getSkills}
            create={createSkill}
            update={updateSkill}
            remove={deleteSkill}
            searchQuery={q}
          />
        </div>
      )}

      {tab === 'technologies' && <TechnologyManager searchQuery={q} />}

      {tab === 'training-catalog' && <TrainingCatalogManager searchQuery={q} />}

      {tab === 'assessments' && <MasterDataAssessmentsManager searchQuery={q} />}

      {tab === 'clients-hiring' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LookupManager
            title="Contract Types"
            getAll={getContractTypes}
            create={createContractTypeLookup}
            update={updateContractTypeLookup}
            remove={deleteContractType}
            searchQuery={q}
            addPlaceholder="e.g. MSA, SOW, NDA"
          />
          <LookupManager
            title="Candidate Sources"
            getAll={getCandidateSources}
            create={createCandidateSourceLookup}
            update={updateCandidateSourceLookup}
            remove={deleteCandidateSource}
            searchQuery={q}
            addPlaceholder="e.g. LinkedIn, Referral, Agency"
          />
        </div>
      )}

      {tab === 'leave-policy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HolidayManager />
          <LeaveTypeManager />
        </div>
      )}

      {tab === 'admins' && (
        <div className="max-w-3xl">
          <AdminManager searchQuery={q} />
        </div>
      )}

      {tab === 'assets-docs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssetCategoryManager searchQuery={q} />
          <LookupManager
            title="Asset Vendors"
            getAll={getAssetVendors}
            create={createVendor}
            update={updateVendor}
            remove={deleteAssetVendor}
            searchQuery={q}
            addPlaceholder="Add a preferred vendor"
          />
          <LookupManager
            title="Employee Document Types"
            getAll={(token) => getDocumentTypes(token, 'EMPLOYEE')}
            create={createEmployeeDocType}
            update={updateEmployeeDocType}
            remove={deleteDocumentType}
            searchQuery={q}
            addPlaceholder="e.g. Compliance, Medical Certificate"
          />
          <LookupManager
            title="Company Document Types"
            getAll={(token) => getDocumentTypes(token, 'COMPANY')}
            create={createCompanyDocType}
            update={updateCompanyDocType}
            remove={deleteDocumentType}
            searchQuery={q}
            addPlaceholder="e.g. Tax Form, NDA"
          />
        </div>
      )}

      {tab === 'locations' && (
        <div className="max-w-2xl">
          <LookupManager
            title="Work Locations"
            getAll={getWorkLocations}
            create={createLocation}
            update={updateLocation}
            remove={deleteWorkLocation}
            searchQuery={q}
            addPlaceholder="e.g. US East, India HQ, Remote"
          />
        </div>
      )}
    </div>
  );
}
