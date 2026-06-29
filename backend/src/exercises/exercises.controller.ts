import { Controller, Get, Param, Res } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { SectionAccessService } from '../auth/section-access.service';
import type { CurrentUserData } from '../auth/auth.types';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';
import { ResourcePackageService } from './resource-package.service';

type DownloadResponse = {
  setHeader(name: string, value: string | number): void;
  send(body: Buffer): void;
};

@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resourcePackage: ResourcePackageService,
    private readonly access: SectionAccessService,
  ) {}

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get()
  async list(@CurrentUser() user: CurrentUserData) {
    const exercises = await this.prisma.exercise.findMany({
      where: this.accessibleWhere(user),
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        case: true,
        assignments: { where: this.accessibleAssignmentsWhere(user) },
        datasets: {
          where: { visibility: 'PUBLIC' },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return ok(
      exercises.map((exercise) => ({
        id: exercise.id,
        title: exercise.title,
        kind: exercise.kind,
        entrypoint: exercise.entrypoint ?? undefined,
        case: {
          id: exercise.case.id,
          code: exercise.case.code,
          title: exercise.case.title,
          subtitle: exercise.case.subtitle ?? undefined,
          difficulty: exercise.case.difficulty,
          knowledgePoints: exercise.case.knowledgePoints,
        },
        assignment: exercise.assignments[0]
          ? {
              id: exercise.assignments[0].id,
              title: exercise.assignments[0].title,
              dueAt: exercise.assignments[0].dueAt?.toISOString(),
            }
          : undefined,
        datasets: exercise.datasets.map((dataset) => ({
          id: dataset.id,
          key: dataset.key,
          label: dataset.label,
          visibility: dataset.visibility,
        })),
      })),
    );
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get(':id')
  async detail(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    await this.access.assertExerciseAccess(user, id);
    const exercise = await this.prisma.exercise.findUniqueOrThrow({
      where: { id },
      include: {
        case: true,
        datasets: {
          where: { visibility: 'PUBLIC' },
          orderBy: { sortOrder: 'asc' },
        },
        templates: {
          where: { isDefault: true },
          take: 1,
        },
        rubrics: {
          where: { isActive: true },
          take: 1,
        },
        assignments: { where: this.accessibleAssignmentsWhere(user) },
      },
    });

    return ok({
      id: exercise.id,
      title: exercise.title,
      kind: exercise.kind,
      entrypoint: exercise.entrypoint ?? undefined,
      outputSchema: exercise.outputSchema,
      guide: exercise.guide,
      case: {
        id: exercise.case.id,
        code: exercise.case.code,
        title: exercise.case.title,
        subtitle: exercise.case.subtitle ?? undefined,
        summary: exercise.case.summary ?? undefined,
        difficulty: exercise.case.difficulty,
        knowledgePoints: exercise.case.knowledgePoints,
      },
      assignment: exercise.assignments[0]
        ? {
            id: exercise.assignments[0].id,
            title: exercise.assignments[0].title,
            dueAt: exercise.assignments[0].dueAt?.toISOString(),
            maxAttempts: exercise.assignments[0].maxAttempts ?? undefined,
          }
        : undefined,
      datasets: exercise.datasets.map((dataset) => ({
        id: dataset.id,
        key: dataset.key,
        label: dataset.label,
        visibility: dataset.visibility,
        sortOrder: dataset.sortOrder,
      })),
      template: exercise.templates[0]
        ? {
            id: exercise.templates[0].id,
            filename: exercise.templates[0].filename,
            language: exercise.templates[0].language,
          }
        : undefined,
      rubric: exercise.rubrics[0]
        ? {
            id: exercise.rubrics[0].id,
            version: exercise.rubrics[0].version,
            totalScore: exercise.rubrics[0].totalScore,
            rules: exercise.rubrics[0].rules,
          }
        : undefined,
    });
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get(':id/datasets')
  async datasets(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    await this.access.assertExerciseAccess(user, id);
    const datasets = await this.prisma.dataset.findMany({
      where: {
        exerciseId: id,
        visibility: 'PUBLIC',
      },
      orderBy: { sortOrder: 'asc' },
    });

    return ok(
      datasets.map((dataset) => ({
        id: dataset.id,
        key: dataset.key,
        label: dataset.label,
        visibility: dataset.visibility,
        path: dataset.path ?? undefined,
      })),
    );
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get(':id/template')
  async template(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    await this.access.assertExerciseAccess(user, id);
    const template = await this.prisma.template.findFirstOrThrow({
      where: {
        exerciseId: id,
        isDefault: true,
      },
    });

    return ok({
      id: template.id,
      exerciseId: template.exerciseId,
      language: template.language,
      filename: template.filename,
      content: template.content,
      isDefault: template.isDefault,
    });
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get(':id/resources/download')
  async downloadResources(
    @Param('id') id: string,
    @Res() response: DownloadResponse,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.access.assertExerciseAccess(user, id);
    const resources = await this.resourcePackage.buildExerciseResources(id);

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${resources.filename}"`);
    response.setHeader('Content-Length', resources.buffer.length);
    response.send(resources.buffer);
  }

  private accessibleWhere(user: CurrentUserData) {
    if (user.role === 'ADMIN') return {};
    if (user.role === 'TEACHER') {
      return {
        case: {
          sectionReleases: {
            some: { status: 'PUBLISHED' as const, section: { teacherId: user.id } },
          },
        },
      };
    }
    return {
      assignments: {
        some: {
          status: 'PUBLISHED' as const,
          section: { enrollments: { some: { userId: user.id, status: 'ACTIVE' as const } } },
        },
      },
    };
  }

  private accessibleAssignmentsWhere(user: CurrentUserData) {
    if (user.role === 'ADMIN') return {};
    if (user.role === 'TEACHER') return { section: { teacherId: user.id } };
    return {
      status: 'PUBLISHED' as const,
      section: { enrollments: { some: { userId: user.id, status: 'ACTIVE' as const } } },
    };
  }
}
