import { Body, Controller, Param, Post } from '@nestjs/common';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';

type ImportEnrollmentBody = {
  students?: Array<{
    email: string;
    name: string;
    studentNo?: string;
  }>;
};

@Controller('admin/sections')
export class EnrollmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':id/enrollments/import')
  async importEnrollments(@Param('id') sectionId: string, @Body() body: ImportEnrollmentBody) {
    const students = body.students ?? [];
    let imported = 0;

    for (const student of students) {
      const user = await this.prisma.user.upsert({
        where: { email: student.email },
        update: {
          name: student.name,
          studentNo: student.studentNo,
          role: 'STUDENT',
        },
        create: {
          email: student.email,
          name: student.name,
          studentNo: student.studentNo,
          role: 'STUDENT',
        },
      });

      await this.prisma.enrollment.upsert({
        where: {
          sectionId_userId: {
            sectionId,
            userId: user.id,
          },
        },
        update: { status: 'ACTIVE' },
        create: {
          sectionId,
          userId: user.id,
          status: 'ACTIVE',
        },
      });
      imported += 1;
    }

    return ok({ imported }, '学生名单导入完成');
  }
}

