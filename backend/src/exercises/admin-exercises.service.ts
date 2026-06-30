import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminExerciseDetailDto,
  AdminExerciseListItemDto,
  CreateExerciseRequest,
  ExerciseStatus,
  UpdateExerciseRequest,
} from '@decision-lab/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExerciseAssetsService } from './exercise-assets.service';

@Injectable()
export class AdminExercisesService {
  constructor(private readonly prisma: PrismaService, private readonly assets: ExerciseAssetsService) {}

  async list(caseId: string): Promise<AdminExerciseListItemDto[]> {
    await this.assertCase(caseId);
    const exercises = await this.prisma.exercise.findMany({
      where: { caseId },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return exercises.map((exercise) => this.toListItem(exercise));
  }

  async create(caseId: string, input: CreateExerciseRequest): Promise<AdminExerciseDetailDto> {
    const parent = await this.assertCase(caseId);
    if (parent.status === 'ARCHIVED') {
      throw new ConflictException({ code: 3201, message: '已归档案例不能新增练习', details: 'CASE_ARCHIVED' });
    }
    const duplicate = await this.prisma.exercise.findUnique({
      where: { caseId_code: { caseId, code: input.code } },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException({ code: 3202, message: '该案例下练习编码已存在', details: 'EXERCISE_CODE_CONFLICT' });
    }
    const exercise = await this.prisma.exercise.create({
      data: {
        caseId,
        ...input,
        outputSchema: input.outputSchema as Prisma.InputJsonValue | undefined,
        guide: input.guide as Prisma.InputJsonValue | undefined,
        status: 'DRAFT',
      },
      include: this.detailInclude(),
    });
    return this.toDetail(exercise);
  }

  async detail(id: string): Promise<AdminExerciseDetailDto> {
    const exercise = await this.findDetail(id);
    return this.toDetail(exercise);
  }

  async update(id: string, input: UpdateExerciseRequest): Promise<AdminExerciseDetailDto> {
    const current = await this.findState(id);
    if (current.status === 'ARCHIVED') {
      throw new ConflictException({ code: 3203, message: '已归档练习不可编辑', details: 'EXERCISE_ARCHIVED' });
    }
    const exercise = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.exercise.update({
        where: { id },
        data: {
          ...input,
          outputSchema: input.outputSchema as Prisma.InputJsonValue | undefined,
          guide: input.guide as Prisma.InputJsonValue | undefined,
        },
        include: this.detailInclude(),
      });
      if (current.status === 'PUBLISHED') {
        const resourceCheck = this.assets.inspect(updated);
        if (!resourceCheck.ready) {
          throw new BadRequestException({
            code: 3205,
            message: '已发布练习必须保持资源完整',
            details: resourceCheck.messages.join('; '),
          });
        }
      }
      return updated;
    });
    return this.toDetail(exercise);
  }

  async updateStatus(id: string, target: ExerciseStatus): Promise<AdminExerciseDetailDto> {
    const current = await this.findDetail(id);
    if (current.status === target) return this.toDetail(current);
    const allowed =
      (current.status === 'DRAFT' && target === 'PUBLISHED') ||
      (current.status === 'PUBLISHED' && target === 'ARCHIVED');
    if (!allowed) {
      throw new ConflictException({
        code: 3204,
        message: `练习不能从 ${current.status} 变更为 ${target}`,
        details: 'EXERCISE_STATUS_TRANSITION_DENIED',
      });
    }
    if (target === 'PUBLISHED') {
      if (current.case.status === 'ARCHIVED') {
        throw new ConflictException({ code: 3207, message: '已归档案例下的练习不能发布', details: 'CASE_ARCHIVED' });
      }
      const resourceCheck = this.assets.inspect(current);
      if (!resourceCheck.ready) {
        throw new BadRequestException({
          code: 3205,
          message: '练习资源不完整，无法发布',
          details: resourceCheck.messages.join('; '),
        });
      }
    }
    const exercise = await this.prisma.exercise.update({
      where: { id },
      data: { status: target },
      include: this.detailInclude(),
    });
    return this.toDetail(exercise);
  }

  async resourceCheck(id: string) {
    return this.assets.inspect(await this.findDetail(id));
  }

  private async assertCase(id: string) {
    const item = await this.prisma.case.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!item) throw new NotFoundException({ code: 3103, message: '案例不存在', details: 'CASE_NOT_FOUND' });
    return item;
  }

  private async findState(id: string) {
    const item = await this.prisma.exercise.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!item) throw new NotFoundException({ code: 3206, message: '练习不存在', details: 'EXERCISE_NOT_FOUND' });
    return item;
  }

  private async findDetail(id: string): Promise<any> {
    const item = await this.prisma.exercise.findUnique({ where: { id }, include: this.detailInclude() });
    if (!item) throw new NotFoundException({ code: 3206, message: '练习不存在', details: 'EXERCISE_NOT_FOUND' });
    return item;
  }

  private detailInclude() {
    return {
      case: true,
      templates: true,
      datasets: true,
      rubrics: true,
    } as const;
  }

  private toListItem(exercise: any): AdminExerciseListItemDto {
    return {
      id: exercise.id,
      caseId: exercise.caseId,
      code: exercise.code,
      title: exercise.title,
      description: exercise.description ?? undefined,
      kind: exercise.kind,
      status: exercise.status,
      assetPath: exercise.assetPath,
      sortOrder: exercise.sortOrder,
    };
  }

  private toDetail(exercise: any): AdminExerciseDetailDto {
    return {
      ...this.toListItem(exercise),
      entrypoint: exercise.entrypoint ?? undefined,
      outputSchema: exercise.outputSchema ?? undefined,
      guide: exercise.guide ?? undefined,
      case: {
        id: exercise.case.id,
        code: exercise.case.code,
        title: exercise.case.title,
        status: exercise.case.status,
      },
      resourceCheck: this.assets.inspect(exercise),
    };
  }
}
