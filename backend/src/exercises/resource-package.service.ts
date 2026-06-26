import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { buildZip } from './zip-builder';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcePackageService {
  private readonly projectRoot = findProjectRoot();

  constructor(private readonly prisma: PrismaService) {}

  async buildExerciseResources(exerciseId: string) {
    const exercise = await this.prisma.exercise.findUniqueOrThrow({
      where: { id: exerciseId },
      include: {
        case: true,
        datasets: {
          where: { visibility: 'PUBLIC' },
          orderBy: { sortOrder: 'asc' },
        },
        templates: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    const template = exercise.templates[0];
    if (!template) {
      throw new NotFoundException('当前实验没有默认模板');
    }

    const readme = this.buildReadme({
      caseCode: exercise.case.code,
      caseTitle: exercise.case.title,
      exerciseTitle: exercise.title,
      templateFilename: template.filename,
      datasets: exercise.datasets.map((dataset) => ({
        key: dataset.key,
        label: dataset.label,
        filename: dataset.path ? basename(dataset.path) : `data_${dataset.key}.json`,
      })),
    });

    const entries = [
      {
        path: 'README.md',
        content: readme,
      },
      {
        path: `template/${template.filename}`,
        content: template.content,
      },
      ...exercise.datasets.map((dataset) => {
        const path = this.resolveDatasetPath(exercise.case.code, dataset.key, dataset.path);
        return {
          path: `datasets/${basename(path)}`,
          content: readFileSync(path),
        };
      }),
    ];

    return {
      filename: `${exercise.case.code}_resources.zip`,
      buffer: buildZip(entries),
    };
  }

  private resolveDatasetPath(caseCode: string, datasetKey: string, storedPath: string | null) {
    const candidates = [
      storedPath ? resolveCaseAssetPath(this.projectRoot, caseCode, storedPath) : null,
      resolve(this.projectRoot, 'course-assets', 'cases', caseCode, 'datasets', `data_${datasetKey}.json`),
    ].filter((path): path is string => Boolean(path));

    const found = candidates.find((path) => existsSync(path));
    if (!found) {
      throw new NotFoundException(`公开数据集文件不存在: ${caseCode}/${datasetKey}`);
    }

    return found;
  }

  private buildReadme(input: {
    caseCode: string;
    caseTitle: string;
    exerciseTitle: string;
    templateFilename: string;
    datasets: Array<{ key: string; label: string; filename: string }>;
  }) {
    const datasetLines = input.datasets
      .map((dataset) => `- datasets/${dataset.filename}: ${dataset.label}公开数据集，标识为 ${dataset.key}。`)
      .join('\n');

    return [
      `# ${input.caseCode} 资源包`,
      '',
      `案例：${input.caseTitle}`,
      `实验：${input.exerciseTitle}`,
      '',
      '## 内容说明',
      '',
      `- template/${input.templateFilename}: Python 提交模板，学生在 solve(data, params=None) 中实现求解逻辑。`,
      datasetLines,
      '',
      '## 使用方式',
      '',
      '1. 先阅读案例页面的题目、模型构建说明和输出结构。',
      `2. 在 template/${input.templateFilename} 中补全 solve(data, params=None)。`,
      '3. 用 datasets/ 目录下的公开数据集在本地调试。',
      '4. 将完成后的代码复制到平台工作区提交评测。',
      '',
    ].join('\n');
  }
}

function resolveCaseAssetPath(projectRoot: string, caseCode: string, path: string) {
  if (path.startsWith('course-assets/')) {
    return resolve(projectRoot, path);
  }

  return resolve(projectRoot, 'course-assets', 'cases', caseCode, path);
}

function findProjectRoot() {
  const candidates = [process.cwd(), resolve(process.cwd(), '..'), resolve(__dirname, '..', '..', '..')];
  const root = candidates.find((candidate) => existsSync(resolve(candidate, 'course-assets')));
  return root ?? resolve(__dirname, '..', '..', '..');
}
