import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { DesignationsModule } from './designations/designations.module';
import { SkillsModule } from './skills/skills.module';
import { MailModule } from './mail/mail.module';
import { LeaveModule } from './leave/leave.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CompOffModule } from './comp-off/comp-off.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { TechnologiesModule } from './technologies/technologies.module';
import { UtilizationModule } from './utilization/utilization.module';
import { TrainingModule } from './training/training.module';
import { AssetsModule } from './assets/assets.module';
import { CompanyDocumentsModule } from './company-documents/company-documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { StaffingSandboxModule } from './staffing-sandbox/staffing-sandbox.module';
import { LearningResourcesModule } from './learning-resources/learning-resources.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ClientContractsModule } from './client-contracts/client-contracts.module';
import { EmployeeExitsModule } from './employee-exits/employee-exits.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { PerformanceModule } from './performance/performance.module';
import { EngagementModule } from './engagement/engagement.module';
import { WorkLocationsModule } from './work-locations/work-locations.module';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { AssetVendorsModule } from './asset-vendors/asset-vendors.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { ContractTypesModule } from './contract-types/contract-types.module';
import { CandidateSourcesModule } from './candidate-sources/candidate-sources.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    EmployeesModule,
    DepartmentsModule,
    DesignationsModule,
    SkillsModule,
    MailModule,
    LeaveModule,
    AttendanceModule,
    CompOffModule,
    ClientsModule,
    ProjectsModule,
    TechnologiesModule,
    UtilizationModule,
    TrainingModule,
    AssetsModule,
    CompanyDocumentsModule,
    ReportsModule,
    StaffingSandboxModule,
    LearningResourcesModule,
    AnnouncementsModule,
    FavoritesModule,
    ClientContractsModule,
    EmployeeExitsModule,
    RecruitmentModule,
    PerformanceModule,
    EngagementModule,
    WorkLocationsModule,
    AssetCategoriesModule,
    AssetVendorsModule,
    DocumentTypesModule,
    QuizzesModule,
    ContractTypesModule,
    CandidateSourcesModule,
  ],
})
export class AppModule {}
