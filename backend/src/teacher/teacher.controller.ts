import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';

type ManualGradeBody = {
  graderId?: string;
  scoreDelta?: number;
  comment?: string;
};

@Controller('teacher')
export class TeacherController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('sections/:id/progress')
  async progress(@Param('id') sectionId: string) {
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
      assignments: section.assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        exerciseTitle: assignment.exercise.title,
        caseCode: assignment.exercise.case.code,
        submissionCount: assignment.submissions.length,
        successCount: assignment.submissions.filter((submission) => submission.status === 'SUCCESS')
          .length,
      })),
    });
  }

  @Get('assignments/:id/submissions')
  async submissions(@Param('id') assignmentId: string) {
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
  async manualGrade(@Param('id') submissionId: string, @Body() body: ManualGradeBody) {
    const teacher =
      body.graderId !== undefined
        ? await this.prisma.user.findUniqueOrThrow({ where: { id: body.graderId } })
        : await this.prisma.user.findFirstOrThrow({
            where: { email: 'teacher.demo@decision-lab.local' },
          });
    const grade = await this.prisma.manualGrade.create({
      data: {
        submissionId,
        graderId: teacher.id,
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
}

