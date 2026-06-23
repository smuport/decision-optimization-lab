# 部署指南 (Deployment Guide)

> 实验平台的生产环境部署指南，包括 Docker Compose 部署、SSL 配置、备份恢复和监控。

---

## 0. 部署策略修订结论

不要在第一版就按完整生产集群部署。建议按课程使用风险分三步：

| 阶段 | 部署方式 | 目标 | 不建议立即引入 |
|------|----------|------|----------------|
| D1 原型 | 本机或单服务器静态站 + 本地评测脚本 | 验证课程资产、评测接口、3 个案例闭环 | MinIO、BullMQ、监控、HTTPS 自动证书 |
| D2 小班试点 | 单服务器 Docker Compose，PostgreSQL + 后端 + 前端 + 本地 runner | 支持 20-50 人低并发提交 | 多机、排行榜快照、复杂对象存储 |
| D3 正式运行 | 完整 Compose 或独立评测机，HTTPS、备份、日志、限流 | 支持全班正式教学和多学期复用 | 无计划扩容前不做 Kubernetes |

### 0.1 MVP 部署建议

MVP 阶段推荐只部署：

```text
nginx/frontend
backend
postgres
local-storage
evaluator-runner
```

提交文件、运行日志、公开数据集可先放在服务器目录：

```text
storage/
├── datasets/
├── submissions/
├── results/
└── logs/
```

当出现以下任一情况，再迁移到 Redis/BullMQ/MinIO：

- 同时提交人数超过单机同步评测承载能力。
- 评测任务需要排队、重试、取消、优先级。
- 部署成多台后端或多台评测机。
- 需要对象存储生命周期管理和跨机共享文件。

### 0.2 生产安全底线

正式给学生使用前，必须完成：

- HTTPS。
- 数据库每日备份和恢复演练。
- 上传代码、运行结果、日志目录备份。
- 管理员、教师、学生角色权限检查。
- 禁止普通注册接口指定角色。
- 评测任务限时、限内存、禁网、非 root 用户。
- 隐藏数据集不暴露下载路径。
- Docker socket 不直接暴露给 Web 后端；若使用 Docker runner，应隔离在独立评测服务或评测机。
- 课堂规模压测：至少模拟 50 人同时提交。

## 一、环境要求

### 1.1 服务器配置

| 环境 | CPU | 内存 | 磁盘 | 说明 |
|------|-----|------|------|------|
| 开发环境 | 4核 | 8GB | 50GB | 本地开发 |
| 测试环境 | 4核 | 8GB | 100GB | 功能测试 |
| 生产环境 | 8核+ | 16GB+ | 200GB+ | SSD 存储，评测并发需更多 CPU |

### 1.2 软件依赖

- Docker 24.0+
- Docker Compose 2.20+
- 可选: docker-compose-plugin (`docker compose` 命令)

---

## 二、快速部署

### 2.1 单服务器部署（推荐）

```bash
# 1. 克隆项目
git clone <repo-url> decision-optimization-lab
cd decision-optimization-lab

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，修改数据库密码、JWT密钥等敏感配置

# 3. 启动所有服务
docker compose -f docker-compose.yml up -d

# 4. 检查服务状态
docker compose ps

# 5. 初始化数据库（首次部署）
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node scripts/seed-cases.ts

# 6. 访问服务
# 前端: http://localhost
# API: http://localhost/api
# Swagger: http://localhost/api/docs
# MinIO Console: http://localhost:9001
```

### 2.2 环境变量配置

```bash
# .env 文件示例

# ===== 数据库 =====
DATABASE_URL=postgresql://postgres:StrongPass123@db:5432/decision_opt_lab?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=StrongPass123
POSTGRES_DB=decision_opt_lab

# ===== Redis =====
REDIS_URL=redis://redis:6379

# ===== MinIO =====
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=MinioPass123
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=decision-opt-lab
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=MinioPass123

# ===== JWT =====
JWT_SECRET=your-256-bit-secret-key-here-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ===== 后端 =====
NODE_ENV=production
PORT=3000
API_BASE_URL=/api/v1

# ===== 评测服务 =====
EVALUATOR_URL=http://evaluator:8000
EVALUATION_TIMEOUT=60
EVALUATION_MEMORY_LIMIT=512
EVALUATION_CONCURRENCY=4

# ===== 前端 =====
FRONTEND_API_URL=/api/v1
FRONTEND_WS_URL=ws://localhost/ws
```

---

## 三、Docker Compose 配置详解

### 3.1 生产环境编排

参见 `docker-compose.yml` 文件，包含以下服务：

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| nginx | nginx:alpine | 80, 443 | 反向代理 + 静态文件 |
| frontend | 自构建 | — | Angular 构建产物（由 nginx 代理） |
| backend | 自构建 | 3000 | NestJS API 服务 |
| evaluator | 自构建 | 8000 | Python 评测服务 |
| db | postgres:16-alpine | 5432 | PostgreSQL 数据库 |
| redis | redis:7-alpine | 6379 | 缓存 + 任务队列 |
| minio | minio/minio | 9000, 9001 | 对象存储 |

### 3.2 服务依赖关系

```
nginx ──→ frontend (静态文件)
      ──→ backend (API)
backend ──→ db (PostgreSQL)
        ──→ redis (缓存/队列)
        ──→ minio (文件存储)
        ──→ evaluator (评测)
evaluator ──→ docker.sock (宿主机 Docker)
```

---

## 四、SSL / HTTPS 配置

### 4.1 使用 Let's Encrypt 自动证书

```yaml
# docker-compose.yml 中添加 certbot 服务
services:
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h; done'"
```

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name lab.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lab.example.com;

    ssl_certificate /etc/letsencrypt/live/lab.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lab.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # 前端 SPA
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://backend:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 代理
    location /ws/ {
        proxy_pass http://backend:3000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # MinIO 代理
    location /minio/ {
        proxy_pass http://minio:9000/;
    }
}
```

### 4.2 手动证书

```bash
# 将证书和私钥放入目录
mkdir -p nginx/ssl
cp your-cert.crt nginx/ssl/
cp your-key.key nginx/ssl/

# 修改 nginx.conf 中证书路径
ssl_certificate /etc/nginx/ssl/your-cert.crt;
ssl_certificate_key /etc/nginx/ssl/your-key.key;
```

---

## 五、数据库管理

### 5.1 备份

```bash
# 手动备份
docker compose exec -T db pg_dump -U postgres decision_opt_lab > backup_$(date +%Y%m%d_%H%M%S).sql

# 自动备份脚本（每天凌晨 2 点）
# 添加到 crontab
0 2 * * * cd /path/to/decision-optimization-lab && docker compose exec -T db pg_dump -U postgres decision_opt_lab > backups/backup_$(date +\%Y\%m\%d).sql 2>&1

# 保留最近 30 天备份
find backups/ -name "backup_*.sql" -mtime +30 -delete
```

### 5.2 恢复

```bash
# 停止应用
docker compose stop backend

# 恢复数据库
docker compose exec -T db psql -U postgres -d decision_opt_lab < backup_20240620_120000.sql

# 重启应用
docker compose start backend
```

### 5.3 数据库迁移

```bash
# 开发环境生成迁移
docker compose exec backend npx prisma migrate dev --name add_new_feature

# 生产环境应用迁移
docker compose exec backend npx prisma migrate deploy

# 查看数据库状态
docker compose exec backend npx prisma studio
```

---

## 六、日志管理

### 6.1 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看指定服务日志
docker compose logs -f backend
docker compose logs -f evaluator

# 查看最近 100 行
docker compose logs --tail=100 backend
```

### 6.2 日志轮转

```yaml
# docker-compose.yml 中为各服务添加日志配置
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"
```

### 6.3 集中式日志（可选）

集成 ELK Stack 或 Loki + Grafana：

```yaml
services:
  loki:
    image: grafana/loki:2.9
    volumes:
      - ./loki/config.yml:/etc/loki/config.yml
    ports:
      - "3100:3100"
```

---

## 七、监控与告警

### 7.1 Docker 监控

```bash
# 查看容器资源使用
docker stats

# 查看容器详情
docker inspect <container_id>
```

### 7.2 健康检查

```bash
# 系统健康检查
make health
# 或
curl http://localhost/api/health

# 各组件健康检查
curl http://localhost/api/health/db
curl http://localhost/api/health/redis
curl http://localhost/api/health/minio
```

### 7.3 Prometheus + Grafana（可选）

```yaml
# 在 docker-compose.yml 中添加
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3001:3000"
```

---

## 八、升级维护

### 8.1 零停机升级

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 构建新版本镜像
docker compose build

# 3. 滚动更新（逐个服务重启）
docker compose up -d --no-deps --build backend
docker compose up -d --no-deps --build evaluator
docker compose up -d --no-deps --build frontend

# 4. 应用数据库迁移
docker compose exec backend npx prisma migrate deploy

# 5. 验证
curl http://localhost/api/health
```

### 8.2 回滚

```bash
# 回滚到上一个版本
git log --oneline -5
git checkout <previous-commit>
docker compose build
docker compose up -d
```

---

## 九、故障排查

### 9.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 服务无法启动 | 端口冲突 | 检查 `.env` 中端口配置，修改冲突端口 |
| 数据库连接失败 | 数据库未初始化 | 执行 `docker compose exec backend npx prisma migrate deploy` |
| 评测任务失败 | Docker 沙箱权限不足 | 检查 evaluator 是否有 `/var/run/docker.sock` 挂载 |
| 文件上传失败 | MinIO 桶不存在 | 初始化 MinIO 桶：`docker compose exec minio mc mb local/decision-opt-lab` |
| 前端空白页 | API 地址配置错误 | 检查 `.env` 中 `FRONTEND_API_URL` 是否匹配实际部署地址 |
| 评测队列堆积 | Evaluator 并发不足 | 增加 `EVALUATION_CONCURRENCY` 或部署多个 Evaluator 实例 |

### 9.2 调试命令

```bash
# 进入容器内部调试
docker compose exec backend sh
docker compose exec db psql -U postgres -d decision_opt_lab

# 检查网络连通性
docker compose exec backend ping db
docker compose exec backend ping redis

# 检查数据库连接
docker compose exec backend npx prisma validate

# 查看 Redis 状态
docker compose exec redis redis-cli info

# 查看 MinIO 状态
docker compose exec minio mc alias set local http://localhost:9000 minioadmin MinioPass123
docker compose exec minio mc ls local/
```

---

## 十、多服务器部署（高可用）

### 10.1 架构

```
                   ┌─────────────┐
                   │  Nginx LB   │  (负载均衡)
                   │  (主/备)    │
                   └──────┬──────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────┴────┐     ┌────┴────┐     ┌────┴────┐
    │  App 1  │     │  App 2  │     │  App 3  │  (NestJS 多实例)
    │         │     │         │     │         │
    └────┬────┘     └────┬────┘     └────┬────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
                   ┌──────┴──────┐
                   │  PostgreSQL  │  (主从复制)
                   │  + PgPool   │
                   └─────────────┘
```

### 10.2 Kubernetes 部署（可选）

```yaml
# k8s/ 目录包含 Kubernetes 部署配置
# - namespace.yaml
# - configmap.yaml
# - secret.yaml
# - postgres-deployment.yaml
# - redis-deployment.yaml
# - backend-deployment.yaml
# - evaluator-deployment.yaml
# - frontend-deployment.yaml
# - ingress.yaml

# 部署命令
kubectl apply -f k8s/
```

---

## 十一、安全加固

### 11.1 生产环境检查清单

- [ ] 修改所有默认密码（数据库、Redis、MinIO、JWT）
- [ ] 启用 HTTPS（SSL 证书）
- [ ] 配置防火墙，仅开放 80/443 端口
- [ ] 禁用 Docker 容器的 root 用户运行
- [ ] 限制沙箱容器的资源（CPU/内存/网络）
- [ ] 配置数据库备份
- [ ] 启用审计日志
- [ ] 配置 API 限流（rate limiting）
- [ ] 定期更新 Docker 镜像和基础依赖
- [ ] 配置 fail2ban 防止暴力破解

### 11.2 环境隔离

```bash
# 使用 Docker 网络隔离
docker network create --driver bridge lab-network

# 生产环境禁用开发端口暴露
# .env
COMPOSE_PROFILES=production
```

---

> 部署完成后，访问 `http://your-domain` 即可使用实验平台。
