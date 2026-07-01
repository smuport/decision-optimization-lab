import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateTeacherAssignmentRequest, StudentAssignmentDetailDto, StudentAssignmentDto,
  TeacherAssignmentDto, UpdateTeacherAssignmentRequest,
} from '@decision-lab/shared';
import type { CurrentUserData } from '../auth/auth.types';
import { SectionAccessService } from '../auth/section-access.service';
import { AdminExercisesService } from '../exercises/admin-exercises.service';
import { PrismaService } from '../prisma/prisma.service';
import { assignmentAvailability } from './assignment-availability';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SectionAccessService,
    private readonly exercises: AdminExercisesService,
  ) {}

  async teacherOverview(user: CurrentUserData, sectionId: string) {
    await this.access.assertSectionAccess(user, sectionId);
    const [section, assignments, exercises] = await Promise.all([
      this.prisma.classSection.findUnique({ where: { id: sectionId }, select: { id: true, name: true } }),
      this.prisma.assignment.findMany({ where: { sectionId }, orderBy: [{ status: 'asc' }, { title: 'asc' }], include: { exercise: { include: { case: true } } } }),
      this.prisma.exercise.findMany({
        where: { status: 'PUBLISHED', case: { sectionReleases: { some: { sectionId, status: 'PUBLISHED' } } } },
        orderBy: [{ case: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        include: { case: true, templates: true, datasets: true, rubrics: true },
      }),
    ]);
    if (!section) throw new NotFoundException('教学班不存在');
    return {
      section,
      availableExercises: await Promise.all(exercises.map(async (exercise) => ({
        id: exercise.id, caseId: exercise.caseId, code: exercise.code, title: exercise.title,
        description: exercise.description ?? undefined, kind: exercise.kind, status: exercise.status,
        assetPath: exercise.assetPath, sortOrder: exercise.sortOrder,
        case: { id: exercise.case.id, code: exercise.case.code, title: exercise.case.title },
        resourceCheck: await this.exercises.resourceCheck(exercise.id),
      }))),
      assignments: assignments.map((item) => this.toTeacherDto(item)),
    };
  }

  async teacherDetail(user: CurrentUserData, id: string) {
    return this.toTeacherDto(await this.findManaged(user, id));
  }

  async create(user: CurrentUserData, sectionId: string, input: CreateTeacherAssignmentRequest) {
    await this.access.assertSectionAccess(user, sectionId);
    await this.assertExerciseReleased(sectionId, input.exerciseId);
    const created = await this.prisma.assignment.create({
      data: {
        sectionId, exerciseId: input.exerciseId, title: input.title, description: input.description,
        opensAt: input.opensAt ? new Date(input.opensAt) : undefined,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        maxAttempts: input.maxAttempts, allowLate: input.allowLate, status: 'DRAFT', createdById: user.id,
      }, include: { exercise: { include: { case: true } } },
    });
    return this.toTeacherDto(created);
  }

  async update(user: CurrentUserData, id: string, input: UpdateTeacherAssignmentRequest) {
    const current = await this.findManaged(user, id);
    if (current.status !== 'DRAFT') throw new ConflictException({ code: 3401, message: '只有草稿作业可以编辑', details: 'ASSIGNMENT_NOT_DRAFT' });
    const opensAt = input.opensAt === undefined ? current.opensAt : input.opensAt ? new Date(input.opensAt) : null;
    const dueAt = input.dueAt === undefined ? current.dueAt : input.dueAt ? new Date(input.dueAt) : null;
    if (opensAt && dueAt && opensAt > dueAt) throw new BadRequestException({ code: 3402, message: '截止时间不能早于开放时间', details: 'ASSIGNMENT_WINDOW_INVALID' });
    const updated = await this.prisma.assignment.update({
      where: { id }, data: {
        title: input.title, description: input.description,
        opensAt: input.opensAt === undefined ? undefined : opensAt,
        dueAt: input.dueAt === undefined ? undefined : dueAt,
        maxAttempts: input.maxAttempts, allowLate: input.allowLate,
      }, include: { exercise: { include: { case: true } } },
    });
    return this.toTeacherDto(updated);
  }

  async publish(user: CurrentUserData, id: string) {
    const current = await this.findManaged(user, id);
    if (current.status !== 'DRAFT') return this.invalidTransition(current.status, 'PUBLISHED');
    await this.assertExerciseReleased(current.sectionId, current.exerciseId, true);
    if (current.opensAt && current.dueAt && current.opensAt > current.dueAt) {
      throw new BadRequestException({ code: 3402, message: '截止时间不能早于开放时间', details: 'ASSIGNMENT_WINDOW_INVALID' });
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const fresh = await transaction.assignment.findUnique({ where: { id }, include: { exercise: { include: { case: true } } } });
      if (!fresh || fresh.status !== 'DRAFT' || fresh.exercise.status !== 'PUBLISHED') {
        throw new ConflictException({ code: 3410, message: '作业或练习状态已变化，请刷新后重试', details: 'ASSIGNMENT_STATUS_TRANSITION_DENIED' });
      }
      const release = await transaction.sectionCaseRelease.count({ where: { sectionId: fresh.sectionId, caseId: fresh.exercise.caseId, status: 'PUBLISHED' } });
      if (!release) throw new BadRequestException({ code: 3408, message: '练习所属案例尚未发布到该教学班', details: 'CASE_NOT_RELEASED_TO_SECTION' });
      return transaction.assignment.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() }, include: { exercise: { include: { case: true } } } });
    });
    return this.toTeacherDto(updated);
  }

  async close(user: CurrentUserData, id: string) {
    const current = await this.findManaged(user, id);
    if (current.status !== 'PUBLISHED') return this.invalidTransition(current.status, 'CLOSED');
    return this.toTeacherDto(await this.prisma.assignment.update({ where: { id }, data: { status: 'CLOSED' }, include: { exercise: { include: { case: true } } } }));
  }

  async archive(user: CurrentUserData, id: string) {
    const current = await this.findManaged(user, id);
    if (current.status !== 'CLOSED') return this.invalidTransition(current.status, 'ARCHIVED');
    return this.toTeacherDto(await this.prisma.assignment.update({ where: { id }, data: { status: 'ARCHIVED' }, include: { exercise: { include: { case: true } } } }));
  }

  async studentList(user: CurrentUserData): Promise<StudentAssignmentDto[]> {
    const assignments = await this.prisma.assignment.findMany({
      where: { status: { in: ['PUBLISHED', 'CLOSED', 'ARCHIVED'] }, section: { enrollments: { some: { userId: user.id, status: 'ACTIVE' } } } },
      orderBy: [{ dueAt: 'asc' }, { title: 'asc' }], include: { exercise: { include: { case: true } }, submissions: { where: { userId: user.id }, select: { id: true } } },
    });
    return assignments.map((item) => this.toStudentDto(item));
  }

  async studentDetail(user: CurrentUserData, id: string): Promise<StudentAssignmentDetailDto> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id }, include: {
        exercise: { include: { case: true, datasets: { where: { visibility: 'PUBLIC' }, orderBy: { sortOrder: 'asc' } }, templates: { where: { isDefault: true }, take: 1 }, rubrics: { where: { isActive: true }, take: 1 } } },
        submissions: { where: { userId: user.id }, select: { id: true } },
      },
    });
    if (!assignment || assignment.status === 'DRAFT') throw new NotFoundException({ code: 3403, message: '作业不存在', details: 'ASSIGNMENT_NOT_FOUND' });
    await this.access.assertSectionAccess(user, assignment.sectionId);
    const exercise = assignment.exercise;
    return {
      ...this.toStudentDto(assignment),
      datasets: exercise.datasets.map((item) => ({ id: item.id, key: item.key, label: item.label, visibility: item.visibility, sortOrder: item.sortOrder })),
      template: exercise.templates[0] ? { id: exercise.templates[0].id, filename: exercise.templates[0].filename, language: exercise.templates[0].language, content: exercise.templates[0].content } : undefined,
      rubric: exercise.rubrics[0] ? { id: exercise.rubrics[0].id, version: exercise.rubrics[0].version, totalScore: exercise.rubrics[0].totalScore, rules: Array.isArray(exercise.rubrics[0].rules) ? exercise.rubrics[0].rules as Record<string, unknown>[] : [] } : undefined,
      outputSchema: this.asRecord(exercise.outputSchema), guide: this.asRecord(exercise.guide),
      resourceDownloadUrl: `/api/v1/assignments/${assignment.id}/resources/download`,
    };
  }

  async startSubmission(user: CurrentUserData, id: string, codeText: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id }, include: { exercise: { include: { case: true } } } });
    if (!assignment) throw new NotFoundException({ code: 3403, message: '作业不存在', details: 'ASSIGNMENT_NOT_FOUND' });
    await this.access.assertSectionAccess(user, assignment.sectionId);
    return this.prisma.$transaction(async (transaction) => {
      const fresh = await transaction.assignment.findUnique({ where: { id }, include: { exercise: { include: { case: true } } } });
      if (!fresh) throw new NotFoundException({ code: 3403, message: '作业不存在', details: 'ASSIGNMENT_NOT_FOUND' });
      const availability = assignmentAvailability(fresh);
      if (availability === 'UPCOMING') throw new ConflictException({ code: 3404, message: '作业尚未开放', details: 'ASSIGNMENT_NOT_OPEN' });
      if (availability === 'CLOSED') throw new ConflictException({ code: 3405, message: '作业已关闭', details: 'ASSIGNMENT_CLOSED' });
      const attemptCount = await transaction.submission.count({ where: { assignmentId: id, userId: user.id } });
      if (fresh.maxAttempts !== null && attemptCount >= fresh.maxAttempts) {
        throw new ConflictException({ code: 3406, message: '已达到最大提交次数', details: 'ASSIGNMENT_ATTEMPT_LIMIT_REACHED' });
      }
      const submission = await transaction.submission.create({ data: { assignmentId: id, userId: user.id, status: 'RUNNING', attemptNumber: attemptCount + 1, isLate: availability === 'LATE', codeText } });
      return { assignment: fresh, submission };
    });
  }

  async assertCanReadResources(user: CurrentUserData, id: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id }, select: { id: true, sectionId: true, exerciseId: true, status: true } });
    if (!assignment || assignment.status === 'DRAFT') throw new NotFoundException('作业不存在');
    await this.access.assertSectionAccess(user, assignment.sectionId);
    return assignment;
  }

  private async assertExerciseReleased(sectionId: string, exerciseId: string, requireResources = false) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId }, include: { case: true, templates: true, datasets: true, rubrics: true } });
    if (!exercise || exercise.status !== 'PUBLISHED') throw new BadRequestException({ code: 3407, message: '只能选择已发布练习', details: 'EXERCISE_NOT_PUBLISHED' });
    const release = await this.prisma.sectionCaseRelease.count({ where: { sectionId, caseId: exercise.caseId, status: 'PUBLISHED' } });
    if (!release) throw new BadRequestException({ code: 3408, message: '练习所属案例尚未发布到该教学班', details: 'CASE_NOT_RELEASED_TO_SECTION' });
    if (requireResources) {
      const check = await this.exercises.resourceCheck(exerciseId);
      if (!check.ready) throw new BadRequestException({ code: 3409, message: '练习资源不完整，无法发布作业', details: 'EXERCISE_RESOURCES_INCOMPLETE' });
    }
    return exercise;
  }

  private async findManaged(user: CurrentUserData, id: string): Promise<any> {
    const item = await this.prisma.assignment.findUnique({ where: { id }, include: { exercise: { include: { case: true } } } });
    if (!item) throw new NotFoundException({ code: 3403, message: '作业不存在', details: 'ASSIGNMENT_NOT_FOUND' });
    await this.access.assertSectionAccess(user, item.sectionId);
    return item;
  }

  private invalidTransition(from: string, to: string): never {
    throw new ConflictException({ code: 3410, message: `作业不能从 ${from} 变更为 ${to}`, details: 'ASSIGNMENT_STATUS_TRANSITION_DENIED' });
  }

  private toTeacherDto(item: any): TeacherAssignmentDto {
    return {
      id: item.id, sectionId: item.sectionId, exerciseId: item.exerciseId, title: item.title,
      description: item.description ?? undefined, status: item.status, availability: assignmentAvailability(item),
      opensAt: item.opensAt?.toISOString(), dueAt: item.dueAt?.toISOString(), maxAttempts: item.maxAttempts ?? undefined,
      allowLate: item.allowLate, publishedAt: item.publishedAt?.toISOString(), createdById: item.createdById,
      exercise: item.exercise ? { id: item.exercise.id, caseId: item.exercise.caseId, code: item.exercise.code, title: item.exercise.title, description: item.exercise.description ?? undefined, kind: item.exercise.kind, status: item.exercise.status, assetPath: item.exercise.assetPath, sortOrder: item.exercise.sortOrder, case: { id: item.exercise.case.id, code: item.exercise.case.code, title: item.exercise.case.title } } : undefined,
    };
  }

  private toStudentDto(item: any): StudentAssignmentDto {
    const availability = assignmentAvailability(item);
    const attemptCount = item.submissions?.length ?? 0;
    const remainingAttempts = item.maxAttempts === null ? undefined : Math.max(item.maxAttempts - attemptCount, 0);
    return {
      id: item.id, title: item.title, description: item.description ?? undefined, status: item.status, availability,
      opensAt: item.opensAt?.toISOString(), dueAt: item.dueAt?.toISOString(), maxAttempts: item.maxAttempts ?? undefined,
      allowLate: item.allowLate, attemptCount, remainingAttempts,
      canSubmit: (availability === 'OPEN' || availability === 'LATE') && (remainingAttempts === undefined || remainingAttempts > 0),
      isLate: availability === 'LATE',
      exercise: { id: item.exercise.id, caseId: item.exercise.caseId, code: item.exercise.code, title: item.exercise.title, description: item.exercise.description ?? undefined, kind: item.exercise.kind, status: item.exercise.status, sortOrder: item.exercise.sortOrder, case: { id: item.exercise.case.id, code: item.exercise.case.code, title: item.exercise.case.title } },
    };
  }

  private asRecord(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
}
