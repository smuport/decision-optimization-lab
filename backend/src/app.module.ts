import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { CasesModule } from './cases/cases.module';
import { CaseReleasesModule } from './case-releases/case-releases.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ExercisesModule } from './exercises/exercises.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { TeacherModule } from './teacher/teacher.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AssignmentsModule,
    CasesModule,
    CaseReleasesModule,
    CoursesModule,
    EnrollmentsModule,
    ExercisesModule,
    SubmissionsModule,
    ReportsModule,
    TeacherModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
