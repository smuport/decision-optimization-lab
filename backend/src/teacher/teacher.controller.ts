import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { SectionAccessService } from '../auth/section-access.service';
import type { CurrentUserData } from '../auth/auth.types';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';

type ManualGradeBody = {
  scoreDelta?: number;
  comment?: string;
};

@Controller('teacher')
@Roles('TEACHER')
export class TeacherController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SectionAccessService,
  ) {}

  @Get('sections/:id/progress')
  async progress(@Param('id') sectionId: string, @CurrentUser() user: CurrentUserData) {
    await this.access.assertSectionAccess(user, sectionId);
    const section = await this.prisma.classSection.findUniqueOrThrow({
      where: { id: sectionId },
      include: {
        enrollments: true,
        assignments: {
          include: {
            exercise: {
              include: {
                case: true,
              },
            },
            submissions: {
              include: {
                runResult: true,
              },
            },
          },
        },
      },
    });
    const submissionCount = section.assignments.reduce(
      (sum, assignment) => sum + assignment.submissions.length,
      0,
    );
    const successCount = section.assignments.reduce(
      (sum, assignment) =>
        sum + assignment.submissions.filter((submission) => submission.status === 'SUCCESS').length,
      0,
    );
    const scores = section.assignments.flatMap((assignment) =>
      assignment.submissions.flatMap((submission) =>
        submission.runResult?.score === null || submission.runResult?.score === undefined
          ? []
          : [submission.runResult.score],
      ),
    );

    return ok({
      section: {
        id: section.id,
        name: section.name,
      },
      enrollmentCount: section.enrollments.length,
      assignmentCount: section.assignments.length,
      submissionCount,
      successCount,
      passRate: submissionCount > 0 ? successCount / submissionCount : 0,
      averageScore: this.average(scores),
      assignments: section.assignments.map((assignment) => {
        const assignmentScores = assignment.submissions.flatMap((submission) =>
          submission.runResult?.score === null || submission.runResult?.score === undefined
            ? []
            : [submission.runResult.score],
        );

        return {
          id: assignment.id,
          title: assignment.title,
          exerciseTitle: assignment.exercise.title,
          caseCode: assignment.exercise.case.code,
          submissionCount: assignment.submissions.length,
          successCount: assignment.submissions.filter((submission) => submission.status === 'SUCCESS')
            .length,
          averageScore: this.average(assignmentScores),
        };
      }),
    });
  }

  @Get('assignments/:id/submissions')
  async submissions(@Param('id') assignmentId: string, @CurrentUser() user: CurrentUserData) {
    await this.access.assertAssignmentAccess(user, assignmentId);
    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: true,
        runResult: true,
        report: true,
        manualGrades: true,
      },
    });

    return ok(
      submissions.map((submission) => ({
        id: submission.id,
        status: submission.status,
        attemptNumber: submission.attemptNumber,
        submittedAt: submission.submittedAt.toISOString(),
        completedAt: submission.completedAt?.toISOString(),
        student: {
          id: submission.user.id,
          name: submission.user.name,
          studentNo: submission.user.studentNo ?? undefined,
        },
        score: submission.runResult?.score ?? undefined,
        objective: submission.runResult?.objective ?? undefined,
        reportStatus: submission.report?.status ?? 'NOT_STARTED',
        manualGradeCount: submission.manualGrades.length,
      })),
    );
  }

  @Patch('submissions/:id/manual-grade')
  async manualGrade(
    @Param('id') submissionId: string,
    @Body() body: ManualGradeBody & { graderId?: unknown },
    @CurrentUser() user: CurrentUserData,
  ) {
    if (body.graderId !== undefined) {
      throw new BadRequestException({
        code: 1001,
        message: 'graderId 由当前登录用户确定，不允许通过请求体传入',
      });
    }
    await this.access.assertSubmissionAccess(user, submissionId);
    const grade = await this.prisma.manualGrade.create({
      data: {
        submissionId,
        graderId: user.id,
        scoreDelta: body.scoreDelta ?? 0,
        comment: body.comment,
      },
    });

    return ok(
      {
        id: grade.id,
        submissionId: grade.submissionId,
        graderId: grade.graderId,
        scoreDelta: grade.scoreDelta,
        comment: grade.comment ?? undefined,
        createdAt: grade.createdAt.toISOString(),
      },
      '人工评分入口已预留',
    );
  }

  private average(values: number[]) {
    if (values.length === 0) {
      return 0;
    }

    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
  }
}
