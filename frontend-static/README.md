# Static Portal

Day 5 交付的静态课程门户。

入口文件：

```text
frontend-static/index.html
```

设计边界：

- 不依赖后端。
- 不依赖前端框架。
- 可直接通过浏览器打开 HTML。
- 数据来自 `portal-data.js`，由当前课程 manifest 和 runner 输出摘要手工汇总。

当前展示内容：

- 课程名称与本周目标。
- 首批 3 个案例卡片。
- 案例详情面板。
- 6 个 runner 结果摘要。
- Day 6 最小提交流入口提示。

验证命令：

```bash
node --check frontend-static/app.js
node --check frontend-static/portal-data.js
```
