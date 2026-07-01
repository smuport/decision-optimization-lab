import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { CreateTeacherAssignmentRequestSchema, UpdateTeacherAssignmentRequestSchema } from '@decision-lab/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { CurrentUserData } from '../auth/auth.types';
import { ok } from '../common/api-response';
import { parseRequest } from '../common/request-validation';
import { ResourcePackageService } from '../exercises/resource-package.service';
import { AssignmentsService } from './assignments.service';

type DownloadResponse = { setHeader(name: string, value: string | number): void; send(body: Buffer): void };

@Controller('teacher')
@Roles('TEACHER')
export class TeacherAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}
  @Get('sections/:sectionId/assignments') list(@Param('sectionId') sectionId: string, @CurrentUser() user: CurrentUserData) { return this.assignments.teacherOverview(user, sectionId).then((data) => ok(data)); }
  @Post('sections/:sectionId/assignments') create(@Param('sectionId') sectionId: string, @CurrentUser() user: CurrentUserData, @Body() body: unknown) { return this.assignments.create(user, sectionId, parseRequest(CreateTeacherAssignmentRequestSchema, body)).then((data) => ok(data, '作业草稿已创建')); }
  @Get('assignments/:id') detail(@Param('id') id: string, @CurrentUser() user: CurrentUserData) { return this.assignments.teacherDetail(user, id).then((data) => ok(data)); }
  @Patch('assignments/:id') update(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() body: unknown) { return this.assignments.update(user, id, parseRequest(UpdateTeacherAssignmentRequestSchema, body)).then((data) => ok(data, '作业草稿已保存')); }
  @Post('assignments/:id/publish') publish(@Param('id') id: string, @CurrentUser() user: CurrentUserData) { return this.assignments.publish(user, id).then((data) => ok(data, '作业已发布')); }
  @Post('assignments/:id/close') close(@Param('id') id: string, @CurrentUser() user: CurrentUserData) { return this.assignments.close(user, id).then((data) => ok(data, '作业已关闭')); }
  @Post('assignments/:id/archive') archive(@Param('id') id: string, @CurrentUser() user: CurrentUserData) { return this.assignments.archive(user, id).then((data) => ok(data, '作业已归档')); }
}

@Controller()
export class StudentAssignmentsController {
  constructor(private readonly assignments: AssignmentsService, private readonly resources: ResourcePackageService) {}
  @Roles('STUDENT')
  @Get('me/assignments') list(@CurrentUser() user: CurrentUserData) { return this.assignments.studentList(user).then((data) => ok(data)); }
  @Roles('STUDENT')
  @Get('me/assignments/:id') detail(@Param('id') id: string, @CurrentUser() user: CurrentUserData) { return this.assignments.studentDetail(user, id).then((data) => ok(data)); }
  @Roles('STUDENT')
  @Get('assignments/:id/resources/download')
  async download(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Res() response: DownloadResponse) {
    const assignment = await this.assignments.assertCanReadResources(user, id);
    const resource = await this.resources.buildExerciseResources(assignment.exerciseId);
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${resource.filename}"`);
    response.setHeader('Content-Length', resource.buffer.length);
    response.send(resource.buffer);
  }
}
