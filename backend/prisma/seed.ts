import { PrismaClient, type Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const databaseUrl =
  process.env.DECISION_LAB_DATABASE_URL ??
  'postgresql://decision_lab:decision_lab_dev@127.0.0.1:55432/decision_lab?schema=public';
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const rootDir = resolve(__dirname, '..', '..');

type CaseManifest = {
  case_id: string;
  title: string;
  subtitle?: string;
  type: 'EXACT_MODELING' | 'HEURISTIC';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  knowledge_points: string[];
  datasets: Array<{
    id: string;
    label: string;
    visibility: 'PUBLIC' | 'HIDDEN';
    path: string;
  }>;
  template: string;
  entrypoint: string;
  expected_output: Record<string, unknown>;
};

type RubricFile = {
  version: number;
  total: number;
  items: Array<Record<string, unknown>>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(rootDir, path), 'utf8')) as T;
}

function readText(path: string): string {
  return readFileSync(resolve(rootDir, path), 'utf8');
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function exerciseKind(type: CaseManifest['type']) {
  return type === 'HEURISTIC' ? 'HEURISTIC' : 'EXACT_MODELING';
}

function caseCategory(caseId: string, type: CaseManifest['type']) {
  if (caseId === 'case_16') {
    return 'META_HEURISTIC';
  }

  return type === 'HEURISTIC' ? 'HEURISTIC' : 'LINEAR_PROGRAMMING';
}

function case01Guide(): Prisma.InputJsonObject {
  return {
    tabs: [
      {
        key: 'intro',
        title: '问题介绍',
        sections: [
          {
            title: '生产 A/B 产品场景',
            body:
              '某工厂生产产品A和产品B。产品A单位利润为4，产品B单位利润为3。两类产品消耗两种关键资源，目标是在资源有限的条件下最大化总利润。',
          },
          {
            title: '资源约束表',
            table: {
              columns: ['产品', '资源1消耗', '资源2消耗', '单位利润'],
              rows: [
                ['产品A', 2, 1, 4],
                ['产品B', 1, 2, 3],
                ['资源上限', 20, 20, ''],
              ],
            },
          },
        ],
      },
      {
        key: 'modeling',
        title: '模型构建',
        sections: [
          {
            title: '决策变量',
            body: '令 x_A >= 0 表示产品A的生产数量，x_B >= 0 表示产品B的生产数量。',
          },
          {
            title: '目标函数',
            formula: 'max Z = 4x_A + 3x_B',
          },
          {
            title: '资源约束',
            formulas: ['2x_A + x_B <= 20', 'x_A + 2x_B <= 20'],
          },
          {
            title: '教学要点',
            bullets: [
              '决策变量对应需要决定的生产数量。',
              '目标函数由单位利润和生产数量相乘后求和得到。',
              '资源约束来自每种产品的资源消耗和资源总量上限。',
              '非负约束表示生产数量不能为负。',
              '最优解和影子价格可用于解释资源边际价值。',
            ],
          },
        ],
      },
      {
        key: 'pulp',
        title: 'PuLP 求解',
        code: [
          'from pulp import LpMaximize, LpProblem, LpVariable, value',
          '',
          'model = LpProblem("production_planning", LpMaximize)',
          'x_A = LpVariable("x_A", lowBound=0)',
          'x_B = LpVariable("x_B", lowBound=0)',
          '',
          'model += 4 * x_A + 3 * x_B',
          'model += 2 * x_A + x_B <= 20',
          'model += x_A + 2 * x_B <= 20',
          '',
          'model.solve()',
          '',
          'print(value(model.objective))',
          'print(x_A.value(), x_B.value())',
        ].join('\n'),
        bullets: [
          'LpProblem 用于定义优化模型和优化方向。',
          'LpVariable 用于声明决策变量及其上下界。',
          'model += 可用于添加目标函数和约束。',
          'model.solve() 调用求解器。',
          'value(model.objective) 读取目标函数值。',
          '变量值和约束影子价格可用于解释最优生产方案。',
        ],
      },
      {
        key: 'submission',
        title: '提交实验',
        bullets: [
          '阅读 small 数据集并理解输入输出结构。',
          '在模板的 solve(data, params=None) 中返回 objective、solution 和 metrics。',
          '先用公开数据调试，再提交到平台评测。',
          '提交详情页会展示结构化评测反馈，并预留实验报告入口。',
        ],
      },
    ],
  };
}

async function seedCase(
  courseId: string,
  caseDir: 'case_01' | 'case_04' | 'case_16',
  sortOrder: number,
) {
  const manifest = readJson<CaseManifest>(`course-assets/cases/${caseDir}/case_manifest.json`);

  return prisma.case.upsert({
    where: { code: manifest.case_id },
    update: {
      title: manifest.title,
      subtitle: manifest.subtitle,
      category: caseCategory(manifest.case_id, manifest.type),
      difficulty: manifest.difficulty,
      knowledgePoints: manifest.knowledge_points,
      summary: manifest.subtitle,
      sortOrder,
    },
    create: {
      courseId,
      code: manifest.case_id,
      title: manifest.title,
      subtitle: manifest.subtitle,
      category: caseCategory(manifest.case_id, manifest.type),
      difficulty: manifest.difficulty,
      knowledgePoints: manifest.knowledge_points,
      summary: manifest.subtitle,
      sortOrder,
    },
  });
}

async function main() {
  const course = await prisma.course.upsert({
    where: { code: 'ENGINEERING_DECISION_OPTIMIZATION' },
    update: {},
    create: {
      code: 'ENGINEERING_DECISION_OPTIMIZATION',
      name: '工程系统决策与优化',
      description: '研究生课程在线实验平台 MVP 课程数据。',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher.demo@decision-lab.local' },
    update: { name: 'Demo Teacher', role: 'TEACHER' },
    create: {
      email: 'teacher.demo@decision-lab.local',
      name: 'Demo Teacher',
      role: 'TEACHER',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student.demo@decision-lab.local' },
    update: { name: 'Demo Student', role: 'STUDENT', studentNo: 'S2026001' },
    create: {
      email: 'student.demo@decision-lab.local',
      studentNo: 'S2026001',
      name: 'Demo Student',
      role: 'STUDENT',
    },
  });

  const term = await prisma.term.upsert({
    where: {
      id: 'term-2026-spring-demo',
    },
    update: {
      name: '2025-2026 第二学期',
      courseId: course.id,
    },
    create: {
      id: 'term-2026-spring-demo',
      courseId: course.id,
      name: '2025-2026 第二学期',
      startsAt: new Date('2026-02-24T00:00:00+08:00'),
      endsAt: new Date('2026-07-10T23:59:59+08:00'),
    },
  });

  const section = await prisma.classSection.upsert({
    where: {
      id: 'section-2026-graduate-demo',
    },
    update: {
      name: '研究生课程演示班',
      teacherId: teacher.id,
      termId: term.id,
    },
    create: {
      id: 'section-2026-graduate-demo',
      termId: term.id,
      name: '研究生课程演示班',
      teacherId: teacher.id,
    },
  });

  await prisma.enrollment.upsert({
    where: {
      sectionId_userId: {
        sectionId: section.id,
        userId: student.id,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      sectionId: section.id,
      userId: student.id,
      status: 'ACTIVE',
    },
  });

  const case01 = await seedCase(course.id, 'case_01', 1);
  await seedCase(course.id, 'case_04', 4);
  await seedCase(course.id, 'case_16', 16);

  const manifest = readJson<CaseManifest>('course-assets/cases/case_01/case_manifest.json');
  const rubric = readJson<RubricFile>('course-assets/cases/case_01/rubric.json');
  const template = readText('course-assets/cases/case_01/template.py');

  const exercise = await prisma.exercise.upsert({
    where: { id: 'exercise-case01-production-planning' },
    update: {
      caseId: case01.id,
      title: 'case_01 生产分配线性规划实验',
      kind: exerciseKind(manifest.type),
      entrypoint: manifest.entrypoint,
      outputSchema: jsonValue(manifest.expected_output),
      guide: case01Guide(),
      sortOrder: 1,
    },
    create: {
      id: 'exercise-case01-production-planning',
      caseId: case01.id,
      title: 'case_01 生产分配线性规划实验',
      kind: exerciseKind(manifest.type),
      entrypoint: manifest.entrypoint,
      outputSchema: jsonValue(manifest.expected_output),
      guide: case01Guide(),
      sortOrder: 1,
    },
  });

  for (const [index, dataset] of manifest.datasets.entries()) {
    await prisma.dataset.upsert({
      where: {
        exerciseId_key: {
          exerciseId: exercise.id,
          key: dataset.id,
        },
      },
      update: {
        label: dataset.label,
        visibility: dataset.visibility,
        path: dataset.path,
        sortOrder: index + 1,
      },
      create: {
        exerciseId: exercise.id,
        key: dataset.id,
        label: dataset.label,
        visibility: dataset.visibility,
        path: dataset.path,
        sortOrder: index + 1,
      },
    });
  }

  await prisma.template.deleteMany({
    where: { exerciseId: exercise.id },
  });
  await prisma.template.create({
    data: {
      exerciseId: exercise.id,
      language: 'python',
      filename: manifest.template,
      content: template,
      path: `course-assets/cases/case_01/${manifest.template}`,
      isDefault: true,
    },
  });

  await prisma.rubric.upsert({
    where: {
      exerciseId_version: {
        exerciseId: exercise.id,
        version: rubric.version,
      },
    },
    update: {
      totalScore: rubric.total,
      rules: jsonValue(rubric.items),
      isActive: true,
    },
    create: {
      exerciseId: exercise.id,
      version: rubric.version,
      totalScore: rubric.total,
      rules: jsonValue(rubric.items),
      isActive: true,
    },
  });

  await prisma.assignment.upsert({
    where: {
      sectionId_exerciseId: {
        sectionId: section.id,
        exerciseId: exercise.id,
      },
    },
    update: {
      title: 'Week2 case_01 生产分配实验',
      opensAt: new Date('2026-06-24T08:00:00+08:00'),
      dueAt: new Date('2026-07-01T23:59:59+08:00'),
      maxAttempts: 10,
      allowLate: false,
    },
    create: {
      sectionId: section.id,
      exerciseId: exercise.id,
      title: 'Week2 case_01 生产分配实验',
      opensAt: new Date('2026-06-24T08:00:00+08:00'),
      dueAt: new Date('2026-07-01T23:59:59+08:00'),
      maxAttempts: 10,
      allowLate: false,
    },
  });

  console.info('Seed completed:', {
    course: course.code,
    term: term.name,
    section: section.name,
    teacher: teacher.email,
    student: student.email,
    cases: ['case_01', 'case_04', 'case_16'],
    exercise: exercise.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
