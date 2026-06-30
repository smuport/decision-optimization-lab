import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BatchCreateSectionCaseReleasesRequest,
  CaseReleaseStatus,
  CreateSectionCaseReleaseRequest,
  StudentCaseDetailDto,
  StudentCaseDto,
  UpdateSectionCaseReleaseRequest,
} from '@decision-lab/shared';
import type { CurrentUserData } from '../auth/auth.types';
import { SectionAccessService } from '../auth/section-access.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CaseReleasesService {
  constructor(private readonly prisma: PrismaService, private readonly access: SectionAccessService) {}

  async overview(user: CurrentUserData, sectionId: string) {
    await this.access.assertSectionAccess(user, sectionId);
    const [section, availableCases, releases] = await Promise.all([
      this.prisma.classSection.findUnique({ where: { id: sectionId }, select: { id: true, name: true } }),
      this.prisma.case.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      }),
      this.prisma.sectionCaseRelease.findMany({
        where: { sectionId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { case: true },
      }),
    ]);
    if (!section) throw new NotFoundException('教学班不存在');
    return {
      section,
      availableCases: availableCases.map((item) => ({
        id: item.id, code: item.code, title: item.title, subtitle: item.subtitle ?? undefined,
        difficulty: item.difficulty, status: item.status, sortOrder: item.sortOrder,
      })),
      releases: releases.map((item) => this.toRelease(item)),
    };
  }

  async students(user: CurrentUserData, sectionId: string) {
    await this.access.assertSectionAccess(user, sectionId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId }, orderBy: [{ status: 'asc' }, { user: { studentNo: 'asc' } }], include: { user: true },
    });
    return enrollments.map((item) => ({
      enrollmentId: item.id, status: item.status,
      student: { id: item.user.id, name: item.user.name, studentNo: item.user.studentNo ?? undefined, email: item.user.email },
    }));
  }

  async create(user: CurrentUserData, sectionId: string, input: CreateSectionCaseReleaseRequest) {
    await this.access.assertSectionAccess(user, sectionId);
    await this.assertPublishedCase(input.caseId);
    if (input.status === 'ARCHIVED') {
      throw new BadRequestException({ code: 3307, message: '不能直接创建已归档发布', details: 'CASE_RELEASE_INVALID_INITIAL_STATUS' });
    }
    try {
      const created = await this.prisma.sectionCaseRelease.create({
        data: {
          sectionId, caseId: input.caseId, status: input.status,
          visibleFrom: input.visibleFrom ? new Date(input.visibleFrom) : undefined,
          visibleUntil: input.visibleUntil ? new Date(input.visibleUntil) : undefined,
          sortOrder: input.sortOrder, publishedAt: input.status === 'PUBLISHED' ? new Date() : undefined,
          createdById: user.id,
        }, include: { case: true },
      });
      return this.toRelease(created);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException({ code: 3302, message: '该案例已加入当前教学班', details: 'CASE_RELEASE_CONFLICT' });
      throw error;
    }
  }

  async batchCreate(user: CurrentUserData, sectionId: string, input: BatchCreateSectionCaseReleasesRequest) {
    await this.access.assertSectionAccess(user, sectionId);
    const caseIds = [...new Set(input.caseIds)];
    const [publishedCount, existingCount] = await Promise.all([
      this.prisma.case.count({ where: { id: { in: caseIds }, status: 'PUBLISHED' } }),
      this.prisma.sectionCaseRelease.count({ where: { sectionId, caseId: { in: caseIds } } }),
    ]);
    if (publishedCount !== caseIds.length) {
      throw new BadRequestException({ code: 3306, message: '所选案例中包含未发布案例', details: 'CASE_NOT_PUBLISHED' });
    }
    if (existingCount > 0) {
      throw new ConflictException({ code: 3302, message: '所选案例已存在于当前教学班', details: 'CASE_RELEASE_CONFLICT' });
    }
    const now = new Date();
    const releases = await this.prisma.$transaction(caseIds.map((caseId, index) =>
      this.prisma.sectionCaseRelease.create({
        data: {
          sectionId, caseId, status: 'PUBLISHED',
          visibleFrom: input.visibleFrom ? new Date(input.visibleFrom) : undefined,
          visibleUntil: input.visibleUntil ? new Date(input.visibleUntil) : undefined,
          sortOrder: input.sortOrder + index, publishedAt: now, createdById: user.id,
        }, include: { case: true },
      })));
    return releases.map((item) => this.toRelease(item));
  }

  async update(user: CurrentUserData, id: string, input: UpdateSectionCaseReleaseRequest) {
    const current = await this.findManaged(user, id);
    if (current.status === 'ARCHIVED') throw new ConflictException({ code: 3303, message: '已归档发布不可编辑', details: 'CASE_RELEASE_ARCHIVED' });
    const effectiveFrom = input.visibleFrom === undefined ? current.visibleFrom : input.visibleFrom ? new Date(input.visibleFrom) : null;
    const effectiveUntil = input.visibleUntil === undefined ? current.visibleUntil : input.visibleUntil ? new Date(input.visibleUntil) : null;
    if (effectiveFrom && effectiveUntil && effectiveFrom > effectiveUntil) {
      throw new BadRequestException({ code: 3308, message: '可见结束时间不能早于开始时间', details: 'CASE_RELEASE_WINDOW_INVALID' });
    }
    const updated = await this.prisma.sectionCaseRelease.update({
      where: { id }, data: {
        visibleFrom: input.visibleFrom === undefined ? undefined : input.visibleFrom ? new Date(input.visibleFrom) : null,
        visibleUntil: input.visibleUntil === undefined ? undefined : input.visibleUntil ? new Date(input.visibleUntil) : null,
        sortOrder: input.sortOrder,
      }, include: { case: true },
    });
    return this.toRelease(updated);
  }

  async updateStatus(user: CurrentUserData, id: string, target: CaseReleaseStatus) {
    const current = await this.findManaged(user, id);
    if (current.status === target) return this.toRelease(current);
    const allowed = (current.status === 'DRAFT' && target === 'PUBLISHED') ||
      ((current.status === 'DRAFT' || current.status === 'PUBLISHED') && target === 'ARCHIVED');
    if (!allowed) throw new ConflictException({ code: 3304, message: `案例发布不能从 ${current.status} 变更为 ${target}`, details: 'CASE_RELEASE_STATUS_DENIED' });
    if (target === 'PUBLISHED') await this.assertPublishedCase(current.caseId);
    const updated = await this.prisma.sectionCaseRelease.update({
      where: { id }, data: { status: target, publishedAt: target === 'PUBLISHED' ? new Date() : current.publishedAt }, include: { case: true },
    });
    return this.toRelease(updated);
  }

  async studentCases(user: CurrentUserData): Promise<StudentCaseDto[]> {
    return (await this.visibleStudentReleases(user)).map((item) => this.toStudentCase(item));
  }

  async studentCase(user: CurrentUserData, caseId: string): Promise<StudentCaseDetailDto> {
    const release = (await this.visibleStudentReleases(user, caseId))[0];
    if (!release) throw new NotFoundException({ code: 3305, message: '案例不存在或当前不可见', details: 'STUDENT_CASE_NOT_VISIBLE' });
    return {
      ...this.toStudentCase(release),
      content: release.case.content && typeof release.case.content === 'object' && !Array.isArray(release.case.content)
        ? release.case.content as Record<string, unknown>
        : undefined,
    };
  }

  private async visibleStudentReleases(user: CurrentUserData, caseId?: string) {
    const now = new Date();
    return this.prisma.sectionCaseRelease.findMany({
      where: {
        ...(caseId ? { OR: [{ caseId }, { case: { code: caseId } }] } : {}),
        status: 'PUBLISHED',
        AND: [{ OR: [{ visibleFrom: null }, { visibleFrom: { lte: now } }] }, { OR: [{ visibleUntil: null }, { visibleUntil: { gte: now } }] }],
        section: { enrollments: { some: { userId: user.id, status: 'ACTIVE' } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { case: { sortOrder: 'asc' } }],
      include: { case: { include: { exercises: { include: { assignments: { where: { status: 'PUBLISHED' } } } } } } },
    });
  }

  private toStudentCase(release: any): StudentCaseDto {
    const assignments = release.case.exercises.flatMap((exercise: any) => exercise.assignments
      .filter((assignment: any) => assignment.sectionId === release.sectionId)
      .map((assignment: any) => ({
        id: assignment.id, title: assignment.title, status: assignment.status,
        availability: this.availability(assignment), opensAt: assignment.opensAt?.toISOString(), dueAt: assignment.dueAt?.toISOString(),
        exercise: { id: exercise.id, code: exercise.code, title: exercise.title, kind: exercise.kind },
      })));
    return {
      id: release.case.id, code: release.case.code, title: release.case.title,
      subtitle: release.case.subtitle ?? undefined, difficulty: release.case.difficulty,
      knowledgePoints: Array.isArray(release.case.knowledgePoints) ? release.case.knowledgePoints : [],
      summary: release.case.summary ?? undefined, sortOrder: release.sortOrder,
      visibleFrom: release.visibleFrom?.toISOString(), visibleUntil: release.visibleUntil?.toISOString(), assignments,
    };
  }

  private availability(assignment: any) {
    const now = Date.now();
    if (assignment.status !== 'PUBLISHED') return 'CLOSED' as const;
    if (assignment.opensAt && now < assignment.opensAt.getTime()) return 'UPCOMING' as const;
    if (assignment.dueAt && now > assignment.dueAt.getTime()) return assignment.allowLate ? 'LATE' as const : 'CLOSED' as const;
    return 'OPEN' as const;
  }

  private async findManaged(user: CurrentUserData, id: string) {
    const item = await this.prisma.sectionCaseRelease.findUnique({ where: { id }, include: { case: true } });
    if (!item) throw new NotFoundException({ code: 3301, message: '案例发布不存在', details: 'CASE_RELEASE_NOT_FOUND' });
    await this.access.assertSectionAccess(user, item.sectionId);
    return item;
  }

  private async assertPublishedCase(caseId: string) {
    const item = await this.prisma.case.findUnique({ where: { id: caseId }, select: { status: true } });
    if (!item || item.status !== 'PUBLISHED') throw new BadRequestException({ code: 3306, message: '只能发布已发布状态的案例', details: 'CASE_NOT_PUBLISHED' });
  }

  private toRelease(item: any) {
    return {
      id: item.id, sectionId: item.sectionId, caseId: item.caseId, status: item.status,
      visibleFrom: item.visibleFrom?.toISOString(), visibleUntil: item.visibleUntil?.toISOString(), sortOrder: item.sortOrder,
      publishedAt: item.publishedAt?.toISOString(), createdById: item.createdById,
      createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(),
      case: item.case ? { id: item.case.id, code: item.case.code, title: item.case.title, status: item.case.status } : undefined,
    };
  }
}
