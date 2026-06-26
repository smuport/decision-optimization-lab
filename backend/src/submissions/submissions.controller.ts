import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { SubmissionStatus } from '@decision-lab/shared';
import type { Prisma } from '@prisma/client';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';
import { RunnerAdapterService } from '../runner-adapter/runner-adapter.service';

type CreateSubmissionBody = {
  code?: string;
  datasetKey?: string;
  userId?: string;
};

@Controller()
export class SubmissionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: RunnerAdapterService,
  ) {}

  @Post('assignments/:id/submissions')
  async create(@Param('id') assignmentId: string, @Body() body: CreateSubmissionBody) {
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
    const user = body.userId
      ? await this.prisma.user.findUniqueOrThrow({ where: { id: body.userId } })
      : await this.prisma.user.findFirstOrThrow({
          where: { email: 'student.demo@decision-lab.local' },
        });
    const attemptNumber =
      (await this.prisma.submission.count({
        where: {
          assignmentId,
          userId: user.id,
        },
      })) + 1;
    const code = body.code ?? (await this.defaultTemplate(assignment.exerciseId));

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

  @Get('submissions/:id')
  async detail(@Param('id') id: string) {
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

  @Get('submissions/:id/results')
  async result(@Param('id') id: string) {
    const runResult = await this.prisma.runResult.findUniqueOrThrow({
      where: { submissionId: id },
    });

    return ok(this.toRunResultDto(runResult));
  }

  private async defaultTemplate(exerciseId: string): Promise<string> {
    const template = await this.prisma.template.findFirstOrThrow({
      where: {
        exerciseId,
        isDefault: true,
      },
    });
    return template.content;
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
