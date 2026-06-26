import { Controller, Get } from '@nestjs/common';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class CoursesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('courses/current')
  async currentCourse() {
    const course = await this.prisma.course.findFirstOrThrow({
      where: { code: 'ENGINEERING_DECISION_OPTIMIZATION' },
      include: {
        terms: {
          orderBy: { startsAt: 'desc' },
          take: 1,
          include: {
            sections: {
              include: {
                assignments: {
                  include: {
                    exercise: {
                      include: {
                        case: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return ok({
      id: course.id,
      code: course.code,
      name: course.name,
      description: course.description ?? undefined,
      currentTerm: course.terms[0]
        ? {
            id: course.terms[0].id,
            name: course.terms[0].name,
            startsAt: course.terms[0].startsAt?.toISOString(),
            endsAt: course.terms[0].endsAt?.toISOString(),
            sections: course.terms[0].sections.map((section) => ({
              id: section.id,
              name: section.name,
              assignments: section.assignments.map((assignment) => ({
                id: assignment.id,
                title: assignment.title,
                dueAt: assignment.dueAt?.toISOString(),
                exercise: {
                  id: assignment.exercise.id,
                  title: assignment.exercise.title,
                  caseCode: assignment.exercise.case.code,
                  caseTitle: assignment.exercise.case.title,
                },
              })),
            })),
          }
        : undefined,
    });
  }

  @Get('terms/current/sections')
  async currentSections() {
    const term = await this.prisma.term.findFirstOrThrow({
      orderBy: { startsAt: 'desc' },
      include: {
        sections: {
          include: {
            teacher: true,
            enrollments: true,
          },
        },
      },
    });

    return ok({
      term: {
        id: term.id,
        name: term.name,
      },
      sections: term.sections.map((section) => ({
        id: section.id,
        name: section.name,
        teacher: section.teacher
          ? {
              id: section.teacher.id,
              name: section.teacher.name,
              email: section.teacher.email,
            }
          : undefined,
        enrollmentCount: section.enrollments.length,
      })),
    });
  }
}

