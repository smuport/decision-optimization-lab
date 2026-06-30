import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  BatchCreateSectionCaseReleasesRequestSchema, CreateSectionCaseReleaseRequestSchema,
  UpdateSectionCaseReleaseRequestSchema, UpdateSectionCaseReleaseStatusRequestSchema,
} from '@decision-lab/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { CurrentUserData } from '../auth/auth.types';
import { ok } from '../common/api-response';
import { parseRequest } from '../common/request-validation';
import { CaseReleasesService } from './case-releases.service';

@Controller('teacher')
@Roles('TEACHER')
export class TeacherCaseReleasesController {
  constructor(private readonly releases: CaseReleasesService) {}

  @Get('sections/:sectionId/students')
  async students(@Param('sectionId') sectionId: string, @CurrentUser() user: CurrentUserData) {
    return ok(await this.releases.students(user, sectionId));
  }

  @Get('sections/:sectionId/case-releases')
  async list(@Param('sectionId') sectionId: string, @CurrentUser() user: CurrentUserData) {
    return ok(await this.releases.overview(user, sectionId));
  }

  @Post('sections/:sectionId/case-releases')
  async create(@Param('sectionId') sectionId: string, @CurrentUser() user: CurrentUserData, @Body() body: unknown) {
    return ok(await this.releases.create(user, sectionId, parseRequest(CreateSectionCaseReleaseRequestSchema, body)), '案例已加入教学班');
  }

  @Post('sections/:sectionId/case-releases/batch')
  async batch(@Param('sectionId') sectionId: string, @CurrentUser() user: CurrentUserData, @Body() body: unknown) {
    return ok(await this.releases.batchCreate(user, sectionId, parseRequest(BatchCreateSectionCaseReleasesRequestSchema, body)), '案例已批量发布');
  }

  @Patch('case-releases/:id')
  async update(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() body: unknown) {
    return ok(await this.releases.update(user, id, parseRequest(UpdateSectionCaseReleaseRequestSchema, body)), '发布设置已保存');
  }

  @Patch('case-releases/:id/status')
  async status(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() body: unknown) {
    const { status } = parseRequest(UpdateSectionCaseReleaseStatusRequestSchema, body);
    return ok(await this.releases.updateStatus(user, id, status), status === 'PUBLISHED' ? '案例已发布' : '案例发布已归档');
  }
}

@Controller('me/cases')
@Roles('STUDENT')
export class StudentCasesController {
  constructor(private readonly releases: CaseReleasesService) {}
  @Get() list(@CurrentUser() user: CurrentUserData) { return this.releases.studentCases(user).then((data) => ok(data)); }
  @Get(':caseId') detail(@Param('caseId') caseId: string, @CurrentUser() user: CurrentUserData) { return this.releases.studentCase(user, caseId).then((data) => ok(data)); }
}
