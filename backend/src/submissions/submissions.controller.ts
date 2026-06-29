import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubmissionCreateRequestSchema, type SubmissionStatus } from '@decision-lab/shared';
import type { Prisma } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { SectionAccessService } from '../auth/section-access.service';
import type { CurrentUserData } from '../auth/auth.types';
import { ok } from '../common/api-response';
import { parseRequest } from '../common/request-validation';
import { PrismaService } from '../prisma/prisma.service';
import { RunnerAdapterService } from '../runner-adapter/runner-adapter.service';

@Controller()
export class SubmissionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: RunnerAdapterService,
    private readonly access: SectionAccessService,
  ) {}

  @Roles('STUDENT')
  @Post('assignments/:id/submissions')
  async create(
    @Param('id') assignmentId: string,
    @Body() rawBody: unknown,
    @CurrentUser() user: CurrentUserData,
  ) {
    const body = parseRequest(SubmissionCreateRequestSchema, rawBody);
    await this.access.assertAssignmentAccess(user, assignmentId);
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        exercise: {
          include: {
            case: true,
          },
        },
      },
    });
    const attemptNumber =
      (await this.prisma.submission.count({
        where: {
          assignmentId,
          userId: user.id,
        },
      })) + 1;
    const code = body.code;

    const submission = await this.prisma.submission.create({
      data: {
        assignmentId,
        userId: user.id,
        status: 'RUNNING',
        attemptNumber,
        isLate: assignment.dueAt ? new Date() > assignment.dueAt : false,
        codeText: code,
      },
    });

    const result = await this.runner.evaluate({
      caseCode: assignment.exercise.case.code,
      datasetKey: body.datasetKey ?? 'small',
      code,
    });
    const status = this.toSubmissionStatus(result.status);

    const updated = await this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status,
        completedAt: new Date(),
        errorMessage: status === 'SUCCESS' ? null : result.messages?.join('\n'),
        runResult: {
          create: {
            status,
            isFeasible: result.isFeasible,
            objective: result.objective,
            optimalObjective: result.optimalObjective,
            gap: result.gap,
            score: result.score,
            runtimeMs: Math.round(result.runtimeMs ?? 0),
            metrics: this.jsonValue(result.metrics ?? {}),
            messages: result.messages ?? [],
            artifacts: this.jsonValue({
              ...(result.artifacts ?? {}),
              visualization: result.visualization ?? {},
            }),
          },
        },
      },
      include: {
        runResult: true,
      },
    });

    return ok(
      {
        submissionId: updated.id,
        status: updated.status,
        statusUrl: `/api/v1/submissions/${updated.id}`,
        resultUrl: `/api/v1/submissions/${updated.id}/results`,
      },
      '提交已创建',
    );
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get('submissions/:id')
  async detail(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    await this.access.assertSubmissionAccess(user, id);
    const submission = await this.prisma.submission.findUniqueOrThrow({
      where: { id },
      include: {
        assignment: {
          include: {
            exercise: {
              include: {
                case: true,
              },
            },
          },
        },
        user: true,
        runResult: true,
        report: true,
        manualGrades: true,
      },
    });

    return ok({
      id: submission.id,
      assignmentId: submission.assignmentId,
      userId: submission.userId,
      status: submission.status,
      attemptNumber: submission.attemptNumber,
      isLate: submission.isLate,
      submittedAt: submission.submittedAt.toISOString(),
      completedAt: submission.completedAt?.toISOString(),
      errorMessage: submission.errorMessage ?? undefined,
      codeText: submission.codeText ?? undefined,
      exercise: {
        id: submission.assignment.exercise.id,
        title: submission.assignment.exercise.title,
        caseCode: submission.assignment.exercise.case.code,
        caseTitle: submission.assignment.exercise.case.title,
      },
      user: {
        id: submission.user.id,
        name: submission.user.name,
        studentNo: submission.user.studentNo ?? undefined,
      },
      result: submission.runResult ? this.toRunResultDto(submission.runResult) : undefined,
      reportEntry: {
        enabled: true,
        status: submission.report?.status ?? 'NOT_STARTED',
      },
      manualGradeEntry: {
        enabled: true,
        count: submission.manualGrades.length,
      },
    });
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get('submissions/:id/results')
  async result(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    await this.access.assertSubmissionAccess(user, id);
    const runResult = await this.prisma.runResult.findUniqueOrThrow({
      where: { submissionId: id },
    });

    return ok(this.toRunResultDto(runResult));
  }

  private toSubmissionStatus(status: string): SubmissionStatus {
    if (status === 'SUCCESS') {
      return 'SUCCESS';
    }
    if (status === 'RUNTIME_ERROR') {
      return 'RUNTIME_ERROR';
    }
    if (status === 'INVALID_OUTPUT' || status === 'WRONG_ANSWER') {
      return 'INVALID_OUTPUT';
    }
    return 'FAILED';
  }

  private toRunResultDto(runResult: {
    status: SubmissionStatus;
    isFeasible: boolean;
    objective: number | null;
    optimalObjective: number | null;
    gap: number | null;
    score: number | null;
    metrics: unknown;
    messages: unknown;
    artifacts: unknown;
  }) {
    return {
      status: runResult.status,
      isFeasible: runResult.isFeasible,
      objective: runResult.objective ?? undefined,
      optimalObjective: runResult.optimalObjective ?? undefined,
      gap: runResult.gap ?? undefined,
      score: runResult.score ?? undefined,
      metrics: this.asRecord(runResult.metrics),
      messages: Array.isArray(runResult.messages) ? runResult.messages.map(String) : [],
      artifacts: this.asRecord(runResult.artifacts),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private jsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
