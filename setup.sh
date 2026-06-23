#!/bin/bash
# =============================================================================
# 决策与优化实验平台 - 一键初始化脚本
# =============================================================================
# 用法: ./setup.sh [dev|prod]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_TYPE="${1:-dev}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# 工具函数
# =============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 已安装 ($2)"
        return 0
    else
        log_error "$1 未安装，请先安装"
        return 1
    fi
}

# =============================================================================
# 检查环境依赖
# =============================================================================

check_prerequisites() {
    log_info "检查环境依赖..."
    
    check_command docker "https://docs.docker.com/get-docker/"
    check_command docker-compose "https://docs.docker.com/compose/install/"
    
    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
    
    log_success "环境依赖检查通过"
}

# =============================================================================
# 创建目录结构
# =============================================================================

create_directory_structure() {
    log_info "创建项目目录结构..."
    
    cd "$SCRIPT_DIR"
    
    # 后端目录
    mkdir -p backend/src/{config,common/{decorators,filters,guards,interceptors,pipes,utils},auth,users,cases,datasets,templates,submissions,evaluation/{services,processors},leaderboard,storage,websocket,health}
    mkdir -p backend/prisma/migrations
    mkdir -p backend/test/{unit,e2e}
    
    # 前端目录
    mkdir -p frontend/src/app/{core/{services,guards,interceptors},shared/{components,directives,pipes},features/{auth,dashboard,cases,submissions,leaderboard,admin}}
    mkdir -p frontend/src/assets/{datasets,templates,docs}
    mkdir -p frontend/src/environments
    
    # 评测服务目录
    mkdir -p evaluator/src/{cases,templates,utils}
    
    # 基础设施目录
    mkdir -p nginx/ssl
    mkdir -p scripts
    
    log_success "目录结构创建完成"
}

# =============================================================================
# 创建环境配置文件
# =============================================================================

create_env_files() {
    log_info "创建环境配置文件..."
    
    cd "$SCRIPT_DIR"
    
    # 根目录 .env
    if [ ! -f .env ]; then
        cat > .env << 'EOF'
# ===== 数据库 =====
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=decision_opt_lab
DB_PORT=5432

# ===== Redis =====
REDIS_PORT=6379

# ===== MinIO =====
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=decision-opt-lab

# ===== JWT =====
JWT_SECRET=your-development-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ===== 后端 =====
NODE_ENV=development
BACKEND_PORT=3000
API_BASE_URL=/api/v1

# ===== 评测服务 =====
EVALUATOR_PORT=8000
EVALUATION_TIMEOUT=60
EVALUATION_MEMORY_LIMIT=512
EVALUATION_CONCURRENCY=4

# ===== 前端 =====
FRONTEND_API_URL=http://localhost:3000/api/v1
FRONTEND_WS_URL=ws://localhost:3000/ws

# ===== Nginx =====
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# ===== Docker Compose Profile =====
COMPOSE_PROFILES=dev
EOF
        log_success ".env 文件已创建（请修改默认密码）"
    else
        log_warn ".env 文件已存在，跳过创建"
    fi
    
    # 后端 .env
    if [ ! -f backend/.env ]; then
        cat > backend/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres123@db:5432/decision_opt_lab?schema=public
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=localhost:9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=decision-opt-lab
JWT_SECRET=your-development-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EVALUATOR_URL=http://localhost:8000
EOF
        log_success "backend/.env 文件已创建"
    fi
}

# =============================================================================
# 创建基础配置文件
# =============================================================================

create_config_files() {
    log_info "创建基础配置文件..."
    
    cd "$SCRIPT_DIR"
    
    # nginx.conf
    cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    upstream evaluator {
        server evaluator:8000;
    }

    server {
        listen 80;
        server_name localhost;

        # 前端 SPA
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # API 代理
        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # WebSocket 代理
        location /ws/ {
            proxy_pass http://backend/ws/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400;
        }

        # MinIO API 代理（可选）
        location /minio/ {
            proxy_pass http://minio:9000/;
            proxy_set_header Host $host;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
    log_success "nginx/nginx.conf 已创建"
    
    # Makefile
    cat > Makefile << 'EOF'
.PHONY: help start stop restart build logs status clean migrate seed shell

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

start: ## 启动所有服务
	docker compose up -d

stop: ## 停止所有服务
	docker compose down

restart: ## 重启所有服务
	docker compose restart

build: ## 构建所有镜像
	docker compose build

logs: ## 查看所有日志
	docker compose logs -f

logs-backend: ## 查看后端日志
	docker compose logs -f backend

logs-evaluator: ## 查看评测日志
	docker compose logs -f evaluator

status: ## 查看服务状态
	docker compose ps

clean: ## 清理所有数据（危险！）
	docker compose down -v
	docker system prune -f

migrate: ## 执行数据库迁移
	docker compose exec backend npx prisma migrate deploy

migrate-dev: ## 开发环境生成迁移
	docker compose exec backend npx prisma migrate dev

seed: ## 初始化案例数据
	docker compose exec backend npx ts-node scripts/seed-cases.ts

studio: ## 打开 Prisma Studio
	docker compose exec backend npx prisma studio

shell-backend: ## 进入后端容器
	docker compose exec backend sh

shell-db: ## 进入数据库
	docker compose exec db psql -U postgres -d decision_opt_lab

shell-evaluator: ## 进入评测容器
	docker compose exec evaluator sh

backup-db: ## 备份数据库
	@mkdir -p backups
	@docker compose exec -T db pg_dump -U postgres decision_opt_lab > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "数据库已备份到 backups/"

update-images: ## 更新所有镜像
	docker compose pull
	docker compose up -d
EOF
    log_success "Makefile 已创建"
    
    # .gitignore
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Build
/dist
/build
/.angular

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# Database
backups/

# MinIO
minio_data/

# Docker
postgres_data/
redis_data/

# Prisma
prisma/migrations/*/
!prisma/migrations/migration_lock.toml
EOF
    log_success ".gitignore 已创建"
}

# =============================================================================
# 创建 Docker 文件模板
# =============================================================================

create_docker_files() {
    log_info "创建 Docker 文件模板..."
    
    # 后端 Dockerfile
    cat > backend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npx prisma generate
RUN npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 安装 Prisma 运行所需的 OpenSSL
RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# 生成 Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
EOF
    
    # 前端 Dockerfile
    cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# 生产镜像（Nginx 服务静态文件）
FROM nginx:alpine

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF
    
    # 评测服务 Dockerfile
    cat > evaluator/Dockerfile << 'EOF'
FROM python:3.11-alpine

WORKDIR /app

# 安装依赖
RUN apk add --no-cache gcc musl-dev linux-headers curl

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
    
    # 评测沙箱 Dockerfile
    cat > evaluator/Dockerfile.sandbox << 'EOF'
FROM python:3.11-alpine

# 安装基础工具
RUN apk add --no-cache gcc musl-dev linux-headers

# 创建非 root 用户
RUN adduser -D -s /bin/sh evaluator

WORKDIR /app

# 安装允许的依赖（白名单）
RUN pip install --no-cache-dir numpy==1.26.0 matplotlib==3.8.0

# 禁止其他 pip 安装
RUN chmod -R 755 /usr/local/lib/python3.11/site-packages

USER evaluator

CMD ["python", "/app/solution.py"]
EOF
    
    # 评测服务 requirements.txt
    cat > evaluator/requirements.txt << 'EOF'
fastapi==0.111.0
uvicorn==0.30.0
pydantic==2.7.0
python-multipart==0.0.9
docker==7.1.0
boto3==1.34.0
requests==2.32.0
EOF
    
    log_success "Docker 文件模板已创建"
}

# =============================================================================
# 创建后端基础文件
# =============================================================================

create_backend_files() {
    log_info "创建后端基础文件..."
    
    # package.json
    cat > backend/package.json << 'EOF'
{
  "name": "do-lab-backend",
  "version": "1.0.0",
  "description": "Decision & Optimization Lab Backend",
  "author": "",
  "private": true,
  "license": "MIT",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/platform-ws": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/bullmq": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "bullmq": "^5.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "bcryptjs": "^2.4.3",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "winston": "^3.11.0",
    "nestjs-pino": "^4.0.0",
    "minio": "^7.1.0",
    "ioredis": "^5.3.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.5.0",
    "prisma": "^5.0.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
EOF
    
    # tsconfig.json
    cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  }
}
EOF
    
    # nest-cli.json
    cat > backend/nest-cli.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
EOF
    
    # main.ts
    cat > backend/src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });
  
  // 全局管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // API 前缀
  app.setGlobalPrefix('api/v1');
  
  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('Decision & Optimization Lab API')
    .setDescription('工程系统决策与优化实验平台 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
EOF
    
    # app.module.ts
    cat > backend/src/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CasesModule } from './cases/cases.module';
import { DatasetsModule } from './datasets/datasets.module';
import { TemplatesModule } from './templates/templates.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { StorageModule } from './storage/storage.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CasesModule,
    DatasetsModule,
    TemplatesModule,
    SubmissionsModule,
    EvaluationModule,
    LeaderboardModule,
    StorageModule,
    WebsocketModule,
    HealthModule,
  ],
})
export class AppModule {}
EOF
    
    log_success "后端基础文件已创建"
}

# =============================================================================
# 创建前端基础文件
# =============================================================================

create_frontend_files() {
    log_info "创建前端基础文件..."
    
    # package.json
    cat > frontend/package.json << 'EOF'
{
  "name": "do-lab-frontend",
  "version": "1.0.0",
  "description": "Decision & Optimization Lab Frontend",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "dependencies": {
    "@angular/animations": "^18.0.0",
    "@angular/cdk": "^18.0.0",
    "@angular/common": "^18.0.0",
    "@angular/compiler": "^18.0.0",
    "@angular/core": "^18.0.0",
    "@angular/forms": "^18.0.0",
    "@angular/material": "^18.0.0",
    "@angular/platform-browser": "^18.0.0",
    "@angular/platform-browser-dynamic": "^18.0.0",
    "@angular/router": "^18.0.0",
    "@ngx-translate/core": "^15.0.0",
    "echarts": "^5.5.0",
    "ngx-echarts": "^18.0.0",
    "ngx-markdown": "^18.0.0",
    "monaco-editor": "^0.47.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^18.0.0",
    "@angular/cli": "^18.0.0",
    "@angular/compiler-cli": "^18.0.0",
    "@types/jasmine": "~5.1.0",
    "@types/node": "^20.0.0",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "karma-chrome-headless": "~3.1.0",
    "typescript": "~5.4.0"
  }
}
EOF
    
    # angular.json（简化版）
    cat > frontend/angular.json << 'EOF'
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "frontend": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "scss"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/frontend",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": [
              "zone.js"
            ],
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "@angular/material/prebuilt-themes/indigo-pink.css",
              "src/styles.scss"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "2kb",
                  "maximumError": "4kb"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "frontend:build:production"
            },
            "development": {
              "buildTarget": "frontend:build:development"
            }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}
EOF
    
    # tsconfig.json
    cat > frontend/tsconfig.json << 'EOF'
{
  "compileOnSave": false,
  "compilerOptions": {
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": [
      "ES2022",
      "dom"
    ]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
EOF
    
    log_success "前端基础文件已创建"
}

# =============================================================================
# 创建评测服务基础文件
# =============================================================================

create_evaluator_files() {
    log_info "创建评测服务基础文件..."
    
    # main.py
    cat > evaluator/src/main.py << 'EOF'
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Decision & Optimization Lab Evaluator")

class EvaluateRequest(BaseModel):
    submission_id: str
    case_id: str
    code_url: str
    size: str
    timeout: int = 60
    memory_limit: int = 512

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/evaluate")
async def evaluate(req: EvaluateRequest):
    """
    提交评测任务。
    """
    return {
        "submission_id": req.submission_id,
        "status": "accepted",
        "message": "评测任务已接受"
    }

@app.get("/status/{submission_id}")
async def get_status(submission_id: str):
    """
    查询评测状态。
    """
    return {
        "submission_id": submission_id,
        "status": "completed",
        "progress": 100
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
EOF
    
    log_success "评测服务基础文件已创建"
}

# =============================================================================
# 打印完成信息
# =============================================================================

print_completion() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}  决策与优化实验平台初始化完成！${NC}"
    echo "============================================================"
    echo ""
    echo "项目结构:"
    echo "  decision-optimization-lab/"
    echo "  ├── backend/          ← NestJS 后端"
    echo "  ├── frontend/         ← Angular 前端"
    echo "  ├── evaluator/        ← Python 评测服务"
    echo "  ├── nginx/            ← Nginx 配置"
    echo "  ├── docker-compose.yml  ← Docker 编排"
    echo "  ├── Makefile          ← 常用命令"
    echo "  └── .env              ← 环境配置（请修改默认密码）"
    echo ""
    echo "下一步:"
    echo "  1. 编辑 .env 文件，修改默认密码和密钥"
    echo "  2. 运行: make start     ← 启动所有服务"
    echo "  3. 运行: make migrate   ← 初始化数据库"
    echo "  4. 运行: make seed      ← 导入案例数据"
    echo "  5. 访问: http://localhost"
    echo ""
    echo "常用命令:"
    echo "  make help     ← 查看所有命令"
    echo "  make status   ← 查看服务状态"
    echo "  make logs     ← 查看日志"
    echo "  make stop     ← 停止服务"
    echo ""
    echo "============================================================"
}

# =============================================================================
# 主流程
# =============================================================================

main() {
    echo "============================================================"
    echo "  决策与优化实验平台 - 初始化脚本"
    echo "  环境类型: $ENV_TYPE"
    echo "============================================================"
    echo ""
    
    check_prerequisites
    create_directory_structure
    create_env_files
    create_config_files
    create_docker_files
    create_backend_files
    create_frontend_files
    create_evaluator_files
    print_completion
}

main "$@"
