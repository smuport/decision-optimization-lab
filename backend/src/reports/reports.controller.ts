import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { SectionAccessService } from '../auth/section-access.service';
import type { CurrentUserData } from '../auth/auth.types';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';

type ReportBody = {
  content?: string;
};

@Controller('submissions')
@Roles('STUDENT')
export class ReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SectionAccessService,
  ) {}

  @Post(':id/report')
  async createOrUpdate(
    @Param('id') submissionId: string,
    @Body() body: ReportBody,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.access.assertSubmissionAccess(user, submissionId);
    const report = await this.prisma.report.upsert({
      where: { submissionId },
      update: {
        content: body.content ?? '',
        status: 'DRAFT',
      },
      create: {
        submissionId,
        authorId: user.id,
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
