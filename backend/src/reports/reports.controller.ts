import { Body, Controller, Param, Post } from '@nestjs/common';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';

type ReportBody = {
  content?: string;
  authorId?: string;
};

@Controller('submissions')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':id/report')
  async createOrUpdate(@Param('id') submissionId: string, @Body() body: ReportBody) {
    const submission = await this.prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
    });
    const authorId = body.authorId ?? submission.userId;
    const report = await this.prisma.report.upsert({
      where: { submissionId },
      update: {
        content: body.content ?? '',
        status: 'DRAFT',
      },
      create: {
        submissionId,
        authorId,
        content: body.content ?? '',
        status: 'DRAFT',
      },
    });

    return ok(
      {
        id: report.id,
        submissionId: report.submissionId,
        authorId: report.authorId,
        status: report.status,
        content: report.content ?? undefined,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
      '报告入口已预留',
    );
  }
}

