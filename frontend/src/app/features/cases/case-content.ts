export type CaseTabKey = 'intro' | 'modeling' | 'pulp' | 'submission';

export interface CaseDatasetRow {
  product: string;
  resource1: string;
  resource2: string;
  profit: string;
}

export interface CaseSummaryContent {
  code: string;
  title: string;
  subtitle: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  knowledgePoints: string[];
  summary: string;
}

export interface Case01Content extends CaseSummaryContent {
  scenario: string;
  datasetRows: CaseDatasetRow[];
  resourcePackage: {
    description: string;
    items: Array<{ name: string; description: string }>;
    usage: string[];
  };
  decisionVariables: string[];
  objective: string;
  constraints: string[];
  modelingNotes: string[];
  pulpCode: string;
  pulpNotes: string[];
  submissionChecklist: string[];
  expectedOutput: Array<{ field: string; meaning: string }>;
  scoringNotes: string[];
}

export const CASE_SUMMARIES: Record<string, CaseSummaryContent> = {
  case_04: {
    code: 'case_04',
    title: '分配问题',
    subtitle: '从二分匹配建模到匈牙利算法',
    difficulty: 'MEDIUM',
    knowledgePoints: ['0-1 规划', '分配问题', '全单模性', '匈牙利算法', 'PuLP 求解'],
    summary:
      '本案例后续用于讲解任务与人员的一对一匹配建模。Week2 仅展示基础元数据，完整教学内容在 case01 样板稳定后扩展。',
  },
  case_16: {
    code: 'case_16',
    title: '模拟退火算法求解 TSP',
    subtitle: '用 2-opt 邻域和 Metropolis 准则求解旅行商问题',
    difficulty: 'HARD',
    knowledgePoints: ['TSP', '模拟退火', '2-opt', 'Metropolis 准则', '收敛曲线'],
    summary:
      '本案例后续用于启发式算法实验。Week2 仅展示基础元数据，不在 Day5 扩展为完整样板。',
  },
};

export const CASE_01_CONTENT: Case01Content = {
  code: 'case_01',
  title: '生产分配问题',
  subtitle: '从线性规划入门到影子价格理解',
  difficulty: 'EASY',
  knowledgePoints: ['线性规划建模', 'PuLP 求解', '资源约束', '影子价格', '对偶问题'],
  summary:
    '某工厂生产产品A和产品B。两种产品消耗两种关键资源，并产生不同单位利润。目标是在资源有限条件下选择生产数量，使总利润最大。',
  scenario:
    '这个案例是课程平台的第一个精确建模样板。学生需要把业务描述翻译为决策变量、目标函数和资源约束，再用 PuLP 或等价方法求解，并提交结构化结果。',
  datasetRows: [
    { product: '产品A', resource1: '2', resource2: '1', profit: '4' },
    { product: '产品B', resource1: '1', resource2: '2', profit: '3' },
    { product: '资源上限', resource1: '20', resource2: '20', profit: '-' },
  ],
  resourcePackage: {
    description:
      '资源包用于本地调试和课后练习，包含本案例的 Python 提交模板、公开数据集和一份文件说明。',
    items: [
      { name: 'README.md', description: '说明资源包内每个文件的用途和基本使用步骤。' },
      { name: 'template/template.py', description: '学生提交模板，在 solve(data, params=None) 中补全求解逻辑。' },
      { name: 'datasets/data_small.json', description: '小规模公开数据集，与页面中的生产 A/B 产品示例一致。' },
      { name: 'datasets/data_medium.json', description: '中规模公开数据集，用于检查代码对更多产品和资源的适配能力。' },
      { name: 'datasets/data_large.json', description: '大规模公开数据集，用于进一步测试模型构建和结果输出是否稳定。' },
    ],
    usage: [
      '先阅读页面中的问题介绍、模型构建和输出结构。',
      '下载并解压资源包后，在 template.py 中实现 solve 函数。',
      '用 datasets 目录下的公开数据集进行本地调试。',
      '调试通过后，将代码复制到平台工作区提交评测。',
    ],
  },
  decisionVariables: ['x_A >= 0：产品A的生产数量', 'x_B >= 0：产品B的生产数量'],
  objective: 'max Z = 4x_A + 3x_B',
  constraints: ['2x_A + x_B <= 20', 'x_A + 2x_B <= 20', 'x_A >= 0, x_B >= 0'],
  modelingNotes: [
    '决策变量对应真正需要做出的生产数量决策，而不是资源消耗量或利润本身。',
    '目标函数由每种产品的单位利润乘以生产数量后求和得到。',
    '资源约束来自数据表：每种产品对资源的消耗量乘以生产数量，不能超过资源上限。',
    '非负约束表示生产数量不能为负，是生产计划问题的基本可行性要求。',
    '最优解解释“应该生产多少”，影子价格解释“资源增加一单位时目标值可能改善多少”。',
  ],
  pulpCode: [
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
  pulpNotes: [
    'LpProblem 用于创建优化模型，并通过 LpMaximize 指定最大化方向。',
    'LpVariable 用于声明决策变量，lowBound=0 对应非负约束。',
    'model += 第一次通常添加目标函数，后续添加约束。',
    'model.solve() 调用底层求解器完成优化。',
    'value(model.objective) 读取目标函数值，x_A.value() 和 x_B.value() 读取变量最优值。',
    '约束的影子价格可以用于解释资源边际价值；不同求解器暴露方式略有差异，提交时可先保证 objective 和 solution 正确。',
  ],
  submissionChecklist: [
    '阅读 small 数据集，确认 products、resources、profits、limits、consumption 的含义。',
    '在模板的 solve(data, params=None) 中返回 objective、solution 和 metrics。',
    'solution 的 key 使用数据中的产品名称，例如 产品A、产品B。',
    'metrics.resource_usage 建议返回每种资源的实际使用量，便于评测反馈解释。',
    '先在本地或工作区用公开数据调试，再提交平台评测。',
  ],
  expectedOutput: [
    { field: 'objective', meaning: '最大利润，number' },
    { field: 'solution', meaning: '产品到生产数量的映射，dict: product -> quantity' },
    { field: 'metrics.shadow_prices', meaning: '资源影子价格，可先返回空对象' },
    { field: 'metrics.resource_usage', meaning: '资源实际使用量，dict: resource -> number' },
  ],
  scoringNotes: [
    '评测会检查解是否满足资源约束和非负约束。',
    'objective 需要与 solution 对应的利润一致。',
    '最优目标值和标准答案越接近，得分越高。',
    '结构化 metrics 可以帮助教师和学生解释结果，但 Week2 先以 objective 和 solution 为核心。',
  ],
};

export const CASE_TABS: Array<{ key: CaseTabKey; label: string }> = [
  { key: 'intro', label: '问题介绍' },
  { key: 'modeling', label: '模型构建' },
  { key: 'pulp', label: 'PuLP 求解' },
  { key: 'submission', label: '提交实验' },
];
