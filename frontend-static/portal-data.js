window.PORTAL_DATA = {
  course: {
    code: "engineering-decision-optimization",
    name: "工程系统决策与优化",
    audience: "研究生",
    version: "1.0-week1"
  },
  weekGoal: "跑通首批 3 类案例的标准化资产与最小本地评测闭环",
  cases: [
    {
      id: "case_01",
      title: "生产分配问题",
      subtitle: "从线性规划入门到影子价格理解",
      type: "EXACT_MODELING",
      difficulty: "EASY",
      knowledgePoints: ["线性规划建模", "PuLP 求解", "资源约束", "影子价格", "对偶问题"],
      datasets: ["小规模", "中规模", "大规模"],
      entrypoint: "solve(data, params=None)",
      templatePath: "../course-assets/cases/case_01/template.py",
      manifestPath: "../course-assets/cases/case_01/case_manifest.json"
    },
    {
      id: "case_04",
      title: "分配问题",
      subtitle: "从二分匹配建模到匈牙利算法",
      type: "EXACT_MODELING",
      difficulty: "MEDIUM",
      knowledgePoints: ["0-1 规划", "分配问题", "全单模性", "匈牙利算法", "PuLP 求解"],
      datasets: ["小规模", "中规模", "大规模"],
      entrypoint: "solve(data, params=None)",
      templatePath: "../course-assets/cases/case_04/template.py",
      manifestPath: "../course-assets/cases/case_04/case_manifest.json"
    },
    {
      id: "case_16",
      title: "模拟退火算法求解 TSP",
      subtitle: "用 2-opt 邻域和 Metropolis 准则求解旅行商问题",
      type: "HEURISTIC",
      difficulty: "HARD",
      knowledgePoints: ["TSP", "模拟退火", "2-opt", "Metropolis 准则", "收敛曲线"],
      datasets: ["小规模", "中规模", "大规模"],
      entrypoint: "solve(data, params=None)",
      templatePath: "../course-assets/cases/case_16/template.py",
      manifestPath: "../course-assets/cases/case_16/case_manifest.json"
    }
  ],
  results: [
    { sample: "case_01_demo", caseId: "case_01", status: "SUCCESS", feasible: true, objective: 46.6667, gap: 0, score: 95 },
    { sample: "case_01_bad", caseId: "case_01", status: "FAILED", feasible: false, objective: 6993, gap: null, score: 0 },
    { sample: "case_04_demo", caseId: "case_04", status: "SUCCESS", feasible: true, objective: 13, gap: 0, score: 90 },
    { sample: "case_04_bad", caseId: "case_04", status: "FAILED", feasible: false, objective: 18, gap: null, score: 15 },
    { sample: "case_16_demo", caseId: "case_16", status: "SUCCESS", feasible: true, objective: 479.8342, gap: 0, score: 85 },
    { sample: "case_16_bad", caseId: "case_16", status: "FAILED", feasible: false, objective: null, gap: null, score: 0 }
  ]
};
