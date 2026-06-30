import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateExerciseRequestSchema,
  UpdateExerciseRequestSchema,
  UpdateExerciseStatusRequestSchema,
} from '@decision-lab/shared';
import { Roles } from '../auth/auth.decorators';
import { ok } from '../common/api-response';
import { parseRequest } from '../common/request-validation';
import { AdminExercisesService } from './admin-exercises.service';

@Roles('ADMIN')
@Controller('admin')
export class AdminExercisesController {
  constructor(private readonly exercises: AdminExercisesService) {}

  @Get('cases/:caseId/exercises')
  async list(@Param('caseId') caseId: string) {
    return ok(await this.exercises.list(caseId));
  }

  @Post('cases/:caseId/exercises')
  async create(@Param('caseId') caseId: string, @Body() body: unknown) {
    return ok(await this.exercises.create(caseId, parseRequest(CreateExerciseRequestSchema, body)), '练习草稿已创建');
  }

  @Get('exercises/:id')
  async detail(@Param('id') id: string) {
    return ok(await this.exercises.detail(id));
  }

  @Patch('exercises/:id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    return ok(await this.exercises.update(id, parseRequest(UpdateExerciseRequestSchema, body)), '练习已保存');
  }

  @Patch('exercises/:id/status')
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const { status } = parseRequest(UpdateExerciseStatusRequestSchema, body);
    return ok(await this.exercises.updateStatus(id, status), status === 'PUBLISHED' ? '练习已发布' : '练习已归档');
  }

  @Get('exercises/:id/resource-check')
  async resourceCheck(@Param('id') id: string) {
    return ok(await this.exercises.resourceCheck(id));
  }
}
