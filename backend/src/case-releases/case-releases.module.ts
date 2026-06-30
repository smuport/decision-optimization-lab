import { Module } from '@nestjs/common';
import { CaseReleasesService } from './case-releases.service';
import { StudentCasesController, TeacherCaseReleasesController } from './case-releases.controller';

@Module({ controllers: [TeacherCaseReleasesController, StudentCasesController], providers: [CaseReleasesService] })
export class CaseReleasesModule {}
