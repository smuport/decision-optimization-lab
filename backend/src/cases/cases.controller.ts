import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  AdminCaseListQuerySchema,
  CreateCaseRequestSchema,
  UpdateCaseRequestSchema,
  UpdateCaseStatusRequestSchema,
} from '@decision-lab/shared';
import { Roles } from '../auth/auth.decorators';
import { ok } from '../common/api-response';
import { parseRequest } from '../common/request-validation';
import { CasesService } from './cases.service';

@Roles('ADMIN')
@Controller('admin/cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  async list(@Query() query: unknown) {
    return ok(await this.cases.list(parseRequest(AdminCaseListQuerySchema, query)));
  }

  @Post()
  async create(@Body() body: unknown) {
    return ok(await this.cases.create(parseRequest(CreateCaseRequestSchema, body)), '案例草稿已创建');
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return ok(await this.cases.detail(id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    return ok(await this.cases.update(id, parseRequest(UpdateCaseRequestSchema, body)), '案例已保存');
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const { status } = parseRequest(UpdateCaseStatusRequestSchema, body);
    return ok(await this.cases.updateStatus(id, status), status === 'PUBLISHED' ? '案例已发布' : '案例已归档');
  }
}
