import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminCaseDetailDto,
  AdminCaseListItemDto,
  CreateCaseRequest,
  UpdateCaseRequest,
} from '@decision-lab/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CaseListQuery = {
  page: number;
  pageSize: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  keyword?: string;
};

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CaseListQuery) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' as const } },
              { title: { contains: query.keyword, mode: 'insensitive' as const } },
              { subtitle: { contains: query.keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [cases, total] = await this.prisma.$transaction([
      this.prisma.case.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { exercises: true } } },
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      list: cases.map((item) => this.toListItem(item)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async create(input: CreateCaseRequest): Promise<AdminCaseDetailDto> {
    const course = await this.prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true } });
    if (!course) {
      throw new BadRequestException({ code: 3101, message: '所属课程不存在', details: 'COURSE_NOT_FOUND' });
    }
    const duplicate = await this.prisma.case.findUnique({ where: { code: input.code }, select: { id: true } });
    if (duplicate) {
      throw new ConflictException({ code: 3102, message: '案例编码已存在', details: 'CASE_CODE_CONFLICT' });
    }

    const created = await this.prisma.case.create({
      data: {
        ...input,
        content: input.content as Prisma.InputJsonValue | undefined,
        status: 'DRAFT',
      },
      include: { exercises: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] } },
    });
    return this.toDetail(created);
  }

  async detail(id: string): Promise<AdminCaseDetailDto> {
    const item = await this.prisma.case.findUnique({
      where: { id },
      include: { exercises: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] } },
    });
    if (!item) {
      throw new NotFoundException({ code: 3103, message: '案例不存在', details: 'CASE_NOT_FOUND' });
    }
    return this.toDetail(item);
  }

  async update(id: string, input: UpdateCaseRequest): Promise<AdminCaseDetailDto> {
    const current = await this.findState(id);
    if (current.status === 'ARCHIVED') {
      throw new ConflictException({ code: 3104, message: '已归档案例不可编辑', details: 'CASE_ARCHIVED' });
    }
    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        ...input,
        content: input.content as Prisma.InputJsonValue | undefined,
      },
      include: { exercises: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] } },
    });
    return this.toDetail(updated);
  }

  async updateStatus(id: string, target: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): Promise<AdminCaseDetailDto> {
    const current = await this.findState(id);
    if (current.status === target) return this.detail(id);

    const allowed =
      (current.status === 'DRAFT' && target === 'PUBLISHED') ||
      (current.status === 'PUBLISHED' && target === 'ARCHIVED');
    if (!allowed) {
      throw new ConflictException({
        code: 3105,
        message: `案例不能从 ${current.status} 变更为 ${target}`,
        details: 'CASE_STATUS_TRANSITION_DENIED',
      });
    }
    if (target === 'PUBLISHED' && (!current.title.trim() || !current.category || !current.difficulty)) {
      throw new BadRequestException({ code: 3106, message: '案例必填信息不完整，无法发布', details: 'CASE_NOT_READY' });
    }

    const updated = await this.prisma.case.update({
      where: { id },
      data: { status: target },
      include: { exercises: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] } },
    });
    return this.toDetail(updated);
  }

  private async findState(id: string) {
    const item = await this.prisma.case.findUnique({
      where: { id },
      select: { id: true, title: true, category: true, difficulty: true, status: true },
    });
    if (!item) {
      throw new NotFoundException({ code: 3103, message: '案例不存在', details: 'CASE_NOT_FOUND' });
    }
    return item;
  }

  private toListItem(item: any): AdminCaseListItemDto {
    return {
      id: item.id,
      courseId: item.courseId,
      code: item.code,
      title: item.title,
      subtitle: item.subtitle ?? undefined,
      category: item.category,
      difficulty: item.difficulty,
      status: item.status,
      knowledgePoints: Array.isArray(item.knowledgePoints) ? item.knowledgePoints : [],
      summary: item.summary ?? undefined,
      sortOrder: item.sortOrder,
      exerciseCount: item._count?.exercises ?? item.exercises?.length ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toDetail(item: any): AdminCaseDetailDto {
    return {
      ...this.toListItem(item),
      content: item.content ?? undefined,
      exercises: item.exercises.map((exercise: any) => ({
        id: exercise.id,
        caseId: exercise.caseId,
        code: exercise.code,
        title: exercise.title,
        description: exercise.description ?? undefined,
        kind: exercise.kind,
        status: exercise.status,
        assetPath: exercise.assetPath,
        sortOrder: exercise.sortOrder,
      })),
    };
  }
}
