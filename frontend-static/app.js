const data = window.PORTAL_DATA;
let selectedCaseId = data.cases[0].id;
let activeFilter = "ALL";

const courseTitle = document.querySelector("#course-title");
const weekGoal = document.querySelector("#week-goal");
const summaryGrid = document.querySelector("#summary-grid");
const caseList = document.querySelector("#case-list");
const caseDetail = document.querySelector("#case-detail");
const resultTable = document.querySelector("#result-table");
const statusCanvas = document.querySelector("#status-canvas");

courseTitle.textContent = data.course.name;
weekGoal.textContent = data.weekGoal;

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    renderCases();
  });
});

renderSummary();
renderCases();
renderDetail();
renderResults();
drawStatusCanvas();

function renderSummary() {
  const successCount = data.results.filter((item) => item.status === "SUCCESS").length;
  const averageScore = data.results.reduce((sum, item) => sum + item.score, 0) / data.results.length;
  const cards = [
    ["案例数", data.cases.length],
    ["评测样例", data.results.length],
    ["通过样例", successCount],
    ["平均分", averageScore.toFixed(1)]
  ];
  summaryGrid.innerHTML = cards.map(([label, value]) => `
    <div class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderCases() {
  const filtered = activeFilter === "ALL"
    ? data.cases
    : data.cases.filter((item) => item.type === activeFilter);
  caseList.innerHTML = filtered.map((item) => {
    const passCount = data.results.filter((result) => result.caseId === item.id && result.status === "SUCCESS").length;
    const totalCount = data.results.filter((result) => result.caseId === item.id).length;
    return `
      <article class="case-card">
        <p class="eyebrow">${item.id}</p>
        <h3>${item.title}</h3>
        <div class="case-meta">
          <span class="pill">${typeLabel(item.type)}</span>
          <span class="pill">${difficultyLabel(item.difficulty)}</span>
          <span class="pill ${passCount > 0 ? "good" : "bad"}">${passCount}/${totalCount} 通过</span>
        </div>
        <p>${item.subtitle}</p>
        <div class="case-meta">${item.knowledgePoints.slice(0, 4).map((point) => `<span class="pill">${point}</span>`).join("")}</div>
        <button class="case-action" type="button" data-case="${item.id}">查看详情</button>
      </article>
    `;
  }).join("");
  caseList.querySelectorAll("[data-case]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCaseId = button.dataset.case;
      renderDetail();
      document.querySelector("#case-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderDetail() {
  const item = data.cases.find((candidate) => candidate.id === selectedCaseId);
  const relatedResults = data.results.filter((result) => result.caseId === item.id);
  const best = relatedResults.reduce((current, result) => result.score > current.score ? result : current, { score: -1 });
  caseDetail.innerHTML = `
    <p class="eyebrow">${item.id} · ${typeLabel(item.type)}</p>
    <h2>${item.title}</h2>
    <p class="muted">${item.subtitle}</p>
    <ul>
      <li>入口函数：${item.entrypoint}</li>
      <li>数据集：${item.datasets.join("、")}</li>
      <li>最高样例分：${best.score}</li>
      <li>模板：${item.templatePath}</li>
      <li>Manifest：${item.manifestPath}</li>
    </ul>
  `;
}

function renderResults() {
  resultTable.innerHTML = data.results.map((result) => `
    <tr>
      <td>${result.sample}</td>
      <td>${result.caseId}</td>
      <td><span class="pill ${result.status === "SUCCESS" ? "good" : "bad"}">${result.status}</span></td>
      <td>${result.feasible ? "是" : "否"}</td>
      <td>${formatNumber(result.objective)}</td>
      <td>${result.gap === null ? "未计算" : `${formatNumber(result.gap)}%`}</td>
      <td>${formatNumber(result.score)}</td>
    </tr>
  `).join("");
}

function drawStatusCanvas() {
  const ctx = statusCanvas.getContext("2d");
  const width = statusCanvas.width;
  const height = statusCanvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const success = data.results.filter((item) => item.status === "SUCCESS").length;
  const failed = data.results.length - success;
  const total = data.results.length;
  const bars = [
    { label: "SUCCESS", value: success, color: "#15803d" },
    { label: "FAILED", value: failed, color: "#b91c1c" }
  ];

  ctx.fillStyle = "#18212f";
  ctx.font = "700 20px Arial";
  ctx.fillText("Runner 状态分布", 26, 36);
  ctx.font = "13px Arial";
  ctx.fillStyle = "#607086";
  ctx.fillText(`共 ${total} 个样例，覆盖 3 类实验案例`, 26, 60);

  bars.forEach((bar, index) => {
    const y = 100 + index * 62;
    const barWidth = Math.round((bar.value / total) * 300);
    ctx.fillStyle = "#e8eef7";
    roundRect(ctx, 26, y, 300, 28, 6);
    ctx.fill();
    ctx.fillStyle = bar.color;
    roundRect(ctx, 26, y, barWidth, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#18212f";
    ctx.font = "700 14px Arial";
    ctx.fillText(`${bar.label}: ${bar.value}`, 340, y + 19);
  });

  ctx.strokeStyle = "#d9e1ea";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(26, 230);
  ctx.lineTo(394, 230);
  ctx.stroke();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function typeLabel(type) {
  return {
    EXACT_MODELING: "精确建模",
    HEURISTIC: "启发式"
  }[type] || type;
}

function difficultyLabel(difficulty) {
  return {
    EASY: "基础",
    MEDIUM: "进阶",
    HARD: "挑战"
  }[difficulty] || difficulty;
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "未计算";
  }
  if (Math.abs(value) >= 1000) {
    return Number(value).toFixed(1);
  }
  return Number(value).toFixed(4).replace(/\.?0+$/, "");
}
