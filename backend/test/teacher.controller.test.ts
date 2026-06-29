import assert from 'node:assert/strict';
import test from 'node:test';
import { TeacherController } from '../src/teacher/teacher.controller';

const teacher = {
  id: 'teacher-1',
  email: 'teacher@example.com',
  name: '测试教师',
  role: 'TEACHER' as const,
  status: 'ACTIVE' as const,
};
const access = { assertSectionAccess: async () => undefined };

test('teacher progress averages only submissions with scores', async () => {
  const section = {
    id: 'section-1',
    name: '测试班',
    enrollments: [{ id: 'enrollment-1' }, { id: 'enrollment-2' }],
    assignments: [
      {
        id: 'assignment-1',
        title: '生产分配实验',
        exercise: {
          title: 'case01 实验',
          case: { code: 'case_01' },
        },
        submissions: [
          { status: 'SUCCESS', runResult: { score: 95 } },
          { status: 'FAILED', runResult: { score: 85 } },
          { status: 'RUNNING', runResult: null },
        ],
      },
    ],
  };
  const prisma = {
    classSection: {
      findUniqueOrThrow: async () => section,
    },
  };

  const response = await new TeacherController(prisma as never, access as never).progress(
    section.id,
    teacher,
  );

  assert.equal(response.data.enrollmentCount, 2);
  assert.equal(response.data.submissionCount, 3);
  assert.equal(response.data.successCount, 1);
  assert.equal(response.data.passRate, 1 / 3);
  assert.equal(response.data.averageScore, 90);
  assert.equal(response.data.assignments[0]?.averageScore, 90);
});

test('teacher progress returns zero when no submission has a score', async () => {
  const section = {
    id: 'section-2',
    name: '空班级',
    enrollments: [],
    assignments: [
      {
        id: 'assignment-2',
        title: '待开始作业',
        exercise: {
          title: '待开始实验',
          case: { code: 'case_01' },
        },
        submissions: [],
      },
    ],
  };
  const prisma = {
    classSection: {
      findUniqueOrThrow: async () => section,
    },
  };

  const response = await new TeacherController(prisma as never, access as never).progress(
    section.id,
    teacher,
  );

  assert.equal(response.data.passRate, 0);
  assert.equal(response.data.averageScore, 0);
  assert.equal(response.data.assignments[0]?.averageScore, 0);
});
