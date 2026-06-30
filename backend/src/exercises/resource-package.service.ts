import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { buildZip } from './zip-builder';
import { PrismaService } from '../prisma/prisma.service';
import { ExerciseAssetsService } from './exercise-assets.service';

@Injectable()
export class ResourcePackageService {
  constructor(private readonly prisma: PrismaService, private readonly assets: ExerciseAssetsService) {}

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

    const { directory, manifest } = this.assets.loadManifest(exercise.assetPath);
    const manifestTemplate = manifest.template;
    const publicDatasets = exercise.datasets.filter((dataset) => dataset.visibility === 'PUBLIC').map((dataset) => {
      const manifestDataset = manifest.datasets.find(
        (item) => item.key === dataset.key && item.visibility === 'PUBLIC',
      );
      if (!manifestDataset) {
        throw new NotFoundException(`公开数据集未在练习 manifest 中声明: ${dataset.key}`);
      }
      return { dataset, manifestDataset };
    });
    const readme = this.buildReadme({
      caseCode: exercise.case.code,
      caseTitle: exercise.case.title,
      exerciseCode: exercise.code,
      exerciseTitle: exercise.title,
      templateFilename: manifestTemplate.filename,
      datasets: publicDatasets.map(({ dataset, manifestDataset }) => ({
        key: dataset.key,
        label: dataset.label,
        filename: basename(manifestDataset.path),
      })),
    });

    const entries = [
      {
        path: 'README.md',
        content: readme,
      },
      {
        path: `template/${manifestTemplate.filename}`,
        content: readFileSync(this.assets.resolveInside(directory, manifestTemplate.path)),
      },
      {
        path: 'output-schema.json',
        content: `${JSON.stringify(exercise.outputSchema ?? manifest.output_schema, null, 2)}\n`,
      },
      ...publicDatasets.map(({ manifestDataset }) => {
        const path = this.assets.resolveInside(directory, manifestDataset.path);
        return {
          path: `datasets/${basename(path)}`,
          content: readFileSync(path),
        };
      }),
    ];

    return {
      filename: `${exercise.case.code}_${exercise.code}_resources.zip`,
      buffer: buildZip(entries),
    };
  }

  private buildReadme(input: {
    caseCode: string;
    caseTitle: string;
    exerciseCode: string;
    exerciseTitle: string;
    templateFilename: string;
    datasets: Array<{ key: string; label: string; filename: string }>;
  }) {
    const datasetLines = input.datasets
      .map((dataset) => `- datasets/${dataset.filename}: ${dataset.label}公开数据集，标识为 ${dataset.key}。`)
      .join('\n');

    return [
      `# ${input.exerciseTitle} 练习资源包`,
      '',
      `案例：${input.caseTitle}`,
      `案例编码：${input.caseCode}`,
      `练习编码：${input.exerciseCode}`,
      '',
      '## 内容说明',
      '',
      `- template/${input.templateFilename}: Python 提交模板，学生在 solve(data, params=None) 中实现求解逻辑。`,
      datasetLines,
      '- output-schema.json: 练习要求的公开输出结构。',
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
