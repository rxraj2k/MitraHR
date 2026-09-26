import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TRACK_LABELS, LearningTrack } from '../training/track-categories';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string | null;
  photoUrl?: string | null;
  link: string;
}

export interface SearchResultGroup {
  category: string;
  results: SearchResultItem[];
}

const RESULTS_PER_CATEGORY = 5;
const MIN_QUERY_LENGTH = 2;
const MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

// A query is worth also checking against dates of birth only when it looks
// like it's naming a date at all (digits, or a month name/abbreviation) --
// otherwise every plain-text employee search would pay for scanning and
// formatting every DOB for nothing.
function looksLikeDateQuery(q: string): boolean {
  const lower = q.toLowerCase();
  return /\d/.test(q) || MONTH_NAMES.some((m) => lower.includes(m));
}

// Same "fetch a lean candidate set, then filter/score in JS" approach every
// other search box in this app already uses (EmployeeList, ClientsPage,
// Settings' master-data search, ...) rather than SQL `contains`, which on
// SQLite is case-sensitive and would make global search feel worse than
// every per-page search box it's supposed to complement. At this company's
// scale (designed for 300+ employees, everything else smaller) fetching a
// whole lean-selected table per category is cheap.
function matches(haystacks: Array<string | null | undefined>, needle: string): boolean {
  return haystacks.some((h) => !!h && h.toLowerCase().includes(needle));
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  // EMPLOYEE (OTP) sessions only ever see Talent Directory, Org Chart,
  // their own Leave/Learning/Performance, and Engagement in the sidebar --
  // none of which is "browse everyone's clients/projects/assets". Global
  // search mirrors that: an EMPLOYEE session only gets Employees results,
  // never the staff-only modules, so search can't become a side-door into
  // pages the nav (and route guards) never expose to them.
  async search(rawQuery: string, sessionUser: { kind: 'STAFF' | 'EMPLOYEE' }): Promise<SearchResultGroup[]> {
    const q = rawQuery.trim();
    if (q.length < MIN_QUERY_LENGTH) return [];
    const needle = q.toLowerCase();
    const isStaff = sessionUser.kind === 'STAFF';

    const groups: SearchResultGroup[] = [];
    const employees = await this.searchEmployees(q, needle);
    if (employees.length) groups.push({ category: 'Employees', results: employees });

    if (isStaff) {
      const [clients, projects, courses, assessments, assets, candidates, documents] = await Promise.all([
        this.searchClients(needle),
        this.searchProjects(needle),
        this.searchCourses(needle),
        this.searchAssessments(needle),
        this.searchAssets(needle),
        this.searchCandidates(needle),
        this.searchDocuments(needle),
      ]);
      if (clients.length) groups.push({ category: 'Clients', results: clients });
      if (projects.length) groups.push({ category: 'Projects', results: projects });
      if (courses.length) groups.push({ category: 'Learning Center Courses', results: courses });
      if (assessments.length) groups.push({ category: 'Assessments', results: assessments });
      if (assets.length) groups.push({ category: 'Assets', results: assets });
      if (candidates.length) groups.push({ category: 'Recruitment', results: candidates });
      if (documents.length) groups.push({ category: 'Company Documents', results: documents });
    }

    return groups;
  }

  private async searchEmployees(q: string, needle: string): Promise<SearchResultItem[]> {
    const all = await this.prisma.employee.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeCode: true,
        photoUrl: true,
        dateOfBirth: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    });

    const byText = all.filter((e) => matches([e.fullName, e.email, e.employeeCode], needle));
    const byTextIds = new Set(byText.map((e) => e.id));

    let byDob: typeof all = [];
    if (byText.length < RESULTS_PER_CATEGORY && looksLikeDateQuery(q)) {
      byDob = all
        .filter((e) => !byTextIds.has(e.id) && e.dateOfBirth)
        .filter((e) => {
          const dob = e.dateOfBirth as unknown as Date;
          const iso = dob.toISOString().slice(0, 10);
          const human = dob.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
          return iso.includes(needle) || human.includes(needle);
        });
    }

    return [...byText, ...byDob].slice(0, RESULTS_PER_CATEGORY).map((e) => ({
      id: e.id,
      title: e.fullName,
      subtitle: [e.designation?.name, e.department?.name].filter(Boolean).join(' · ') || e.email,
      photoUrl: e.photoUrl,
      link: `/employees/${e.id}`,
    }));
  }

  private async searchClients(needle: string): Promise<SearchResultItem[]> {
    const all = await this.prisma.client.findMany({
      select: { id: true, name: true, industry: true, status: true },
    });
    return all
      .filter((c) => matches([c.name, c.industry], needle))
      .slice(0, RESULTS_PER_CATEGORY)
      .map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: [c.industry, c.status].filter(Boolean).join(' · ') || null,
        link: '/clients',
      }));
  }

  private async searchProjects(needle: string): Promise<SearchResultItem[]> {
    const all = await this.prisma.project.findMany({
      select: { id: true, name: true, status: true, client: { select: { name: true } } },
    });
    return all
      .filter((p) => matches([p.name, p.client?.name], needle))
      .slice(0, RESULTS_PER_CATEGORY)
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: [p.client?.name, p.status].filter(Boolean).join(' · ') || null,
        link: `/projects/${p.id}`,
      }));
  }

  private async searchCourses(needle: string): Promise<SearchResultItem[]> {
    const all = await this.prisma.trainingCourse.findMany({
      select: { id: true, title: true, category: true, active: true },
    });
    return all
      .filter((c) => matches([c.title, c.category], needle))
      .slice(0, RESULTS_PER_CATEGORY)
      .map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: [c.category, c.active ? null : 'Inactive'].filter(Boolean).join(' · ') || null,
        link: '/training',
      }));
  }

  private async searchAssessments(needle: string): Promise<SearchResultItem[]> {
    const all = await this.prisma.quiz.findMany({
      select: { id: true, track: true, courseId: true, course: { select: { title: true, category: true } } },
    });
    const withTitle = all.map((quiz) => ({
      quiz,
      title: quiz.courseId ? quiz.course?.title || 'Course Assessment' : TRACK_LABELS[quiz.track as LearningTrack] || quiz.track || 'Assessment',
    }));
    return withTitle
      .filter(({ title, quiz }) => matches([title, quiz.course?.category], needle))
      .slice(0, RESULTS_PER_CATEGORY)
      .map(({ quiz, title }) => ({
        id: quiz.id,
        title,
        subtitle: quiz.course?.category || (quiz.track ? 'Mandatory Training' : null),
        link: '/training',
      }));
  }

  private async searchAssets(needle: string): Promise<SearchResultItem[]> {
    const all = await this.prisma.asset.findMany({
      select: { id: true, assetTag: true, name: true, category: true, status: true },
    });
    return all
      .filter((a) => matches([a.assetTag, a.name, a.category], needle))
      .slice(0, RESULTS_PER_CATEGORY)
      .map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: [a.assetTag, a.status].filter(Boolean).join(' · ') || null,
        link: '/assets',
      }));
  }

  private async searchCandidates(needle: string): Promise<SearchResultItem[]> {
    const [candidates, jobOpenings] = await Promise.all([
      this.prisma.candidate.findMany({
        select: { id: true, fullName: true, email: true, stage: true, jobOpening: { select: { title: true } } },
      }),
      this.prisma.jobOpening.findMany({
        select: { id: true, title: true, refCode: true, status: true },
      }),
    ]);
    const candidateResults = candidates
      .filter((c) => matches([c.fullName, c.email, c.jobOpening?.title], needle))
      .map((c) => ({
        id: c.id,
        title: c.fullName,
        subtitle: [c.jobOpening?.title, c.stage].filter(Boolean).join(' · ') || null,
        link: '/recruitment',
      }));
    const jobResults = jobOpenings
      .filter((j) => matches([j.title, j.refCode], needle))
      .map((j) => ({
        id: j.id,
        title: j.title,
        subtitle: [j.refCode, j.status].filter(Boolean).join(' · ') || null,
        link: '/recruitment',
      }));
    return [...jobResults, ...candidateResults].slice(0, RESULTS_PER_CATEGORY);
  }

  private async searchDocuments(needle: string): Promise<SearchResultItem[]> {
    const all = await this.prisma.companyDocument.findMany({
      select: { id: true, title: true, category: true },
    });
    return all
      .filter((d) => matches([d.title, d.category], needle))
      .slice(0, RESULTS_PER_CATEGORY)
      .map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: d.category,
        link: '/documents',
      }));
  }
}
