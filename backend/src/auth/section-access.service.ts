import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { forbidden } from './auth.exceptions';
import type { CurrentUserData } from './auth.types';

@Injectable()
export class SectionAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertSectionAccess(user: CurrentUserData, sectionId: string): Promise<void> {
    if (user.role === 'ADMIN') return;

    const allowed =
      user.role === 'TEACHER'
        ? await this.prisma.classSection.count({ where: { id: sectionId, teacherId: user.id } })
        : user.role === 'STUDENT'
          ? await this.prisma.enrollment.count({
              where: { sectionId, userId: user.id, status: 'ACTIVE' },
            })
          : 0;
    if (!allowed) {
      throw forbidden('无权访问该教学班', 'SECTION_ACCESS_DENIED');
    }
  }

  async assertAssignmentAccess(user: CurrentUserData, assignmentId: string): Promise<void> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { sectionId: true },
    });
    if (!assignment) throw new NotFoundException('作业不存在');
    await this.assertSectionAccess(user, assignment.sectionId);
  }

  async assertSubmissionAccess(user: CurrentUserData, submissionId: string): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { userId: true, assignment: { select: { sectionId: true } } },
    });
    if (!submission) throw new NotFoundException('提交不存在');
    if (user.role === 'STUDENT') {
      if (submission.userId !== user.id) {
        throw forbidden('无权访问其他学生的提交', 'STUDENT_ACCESS_DENIED');
      }
      return;
    }
    await this.assertSectionAccess(user, submission.assignment.sectionId);
  }

  async assertExerciseAccess(user: CurrentUserData, exerciseId: string): Promise<void> {
    if (user.role === 'ADMIN') return;

    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { caseId: true },
    });
    if (!exercise) throw new NotFoundException('练习不存在');

    const allowed =
      user.role === 'TEACHER'
        ? await this.prisma.sectionCaseRelease.count({
            where: {
              caseId: exercise.caseId,
              status: 'PUBLISHED',
              section: { teacherId: user.id },
            },
          })
        : user.role === 'STUDENT'
          ? await this.prisma.assignment.count({
              where: {
                exerciseId,
                status: 'PUBLISHED',
                section: {
                  enrollments: { some: { userId: user.id, status: 'ACTIVE' } },
                },
              },
            })
          : 0;
    if (!allowed) {
      throw forbidden('练习未向当前用户所在教学班发布', 'SECTION_ACCESS_DENIED');
    }
  }
}
