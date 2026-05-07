# Phase 1 — Core Infrastructure

> **Mục tiêu:** Chạy lệnh `make dev` duy nhất là toàn bộ stack (DB, cache, storage, proxy) hoạt động.  
> **Thời gian ước tính:** 3–4 ngày

---

## Task 1.1 — Khởi tạo Monorepo với pnpm + Turborepo

**Mô tả:**  
Tạo skeleton của toàn bộ project. Đây là nền tảng cho mọi thứ phía sau, cần làm đúng ngay từ đầu.

**Việc cần làm:**
- Khởi tạo `package.json` root với `"private": true` và `pnpm workspaces`
- Cài Turborepo (`turbo`) làm dev dependency ở root
- Tạo file `turbo.json` với pipeline: `build`, `dev`, `lint`, `test`
- Tạo cấu trúc thư mục đầy đủ:
  ```
  apps/backend/
  apps/admin/
  apps/web/
  packages/types/
  packages/utils/
  packages/validators/
  packages/constants/
  packages/ui/
  docker/
  .github/workflows/
  ```
- Tạo `package.json` placeholder (name + version) trong từng package và app
- Cấu hình `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```

**Cấu hình `turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

**✅ Test xác nhận:**
```bash
pnpm install
# Không có lỗi dependency
# node_modules được tạo ở root và từng workspace
pnpm turbo run build --dry
# Turborepo liệt kê được các tasks mà không báo lỗi
```

---

## Task 1.2 — TypeScript Base Config

**Mô tả:**  
Tạo `tsconfig` base dùng chung, các app và package chỉ cần extend lại, tránh lặp cấu hình và đảm bảo consistency.

**Việc cần làm:**
- Tạo `tsconfig.base.json` ở root với strict mode đầy đủ
- Tạo `tsconfig.json` riêng trong từng app extend từ base
- Cấu hình path alias `@repo/*` trỏ tới `packages/*`

**`tsconfig.base.json` ở root:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "paths": {
      "@repo/types": ["../../packages/types/src/index.ts"],
      "@repo/utils": ["../../packages/utils/src/index.ts"],
      "@repo/validators": ["../../packages/validators/src/index.ts"],
      "@repo/constants": ["../../packages/constants/src/index.ts"]
    }
  }
}
```

**`tsconfig.json` trong `apps/backend`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**✅ Test xác nhận:**
```bash
# Tạo file packages/types/src/index.ts với một type đơn giản
# Tạo file apps/backend/src/test.ts import từ @repo/types
cd apps/backend
npx tsc --noEmit
# Không có lỗi type-check
```

---

## Task 1.3 — ESLint + Prettier + Husky

**Mô tả:**  
Chuẩn hóa code style toàn monorepo. Mỗi lần commit sẽ tự động lint và format, tránh code style loạn khi dự án lớn lên.

**Việc cần làm:**
- Cài `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`, `prettier`
- Tạo `.eslintrc.base.js` ở root để các app extend
- Tạo `.prettierrc` ở root
- Cài `husky` + `lint-staged`
- Cài `commitlint` với config conventional commits
- Setup pre-commit hook chạy lint-staged
- Setup commit-msg hook chạy commitlint

**`.prettierrc`:**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**`.eslintrc.base.js`:**
```js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

**`lint-staged` config trong `package.json` root:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

**✅ Test xác nhận:**
```bash
# Tạo file có lỗi lint (ví dụ: var thay vì const)
git add .
git commit -m "test"
# Husky chặn commit, hiển thị lỗi lint
# Thử commit với message sai format: "add feature"
# commitlint báo lỗi
# Commit đúng format: "feat: add base config"  
# Commit thành công
```

---

## Task 1.4 — Docker Compose cho Development

**Mô tả:**  
Toàn bộ services infrastructure chạy bằng một lệnh. Dev không cần cài PostgreSQL, Redis hay MinIO trên máy.

**Việc cần làm:**
- Tạo `docker/docker-compose.yml` cho development (có volume mount source code)
- Tạo `docker/docker-compose.prod.yml` cho production (build image, không mount source)
- Tạo `docker/nginx/nginx.conf` làm reverse proxy
- Tạo `.env.example` ở root với tất cả biến cần thiết
- Tạo script `docker/init-db.sh` để khởi tạo DB lần đầu

**`docker/docker-compose.yml`:**
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: app_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-appuser}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-apppassword}
      POSTGRES_DB: ${DB_NAME:-appdb}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER:-appuser}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: app_redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD:-redispassword}
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: app_minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin123}
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 30s
      timeout: 20s
      retries: 3

  maildev:
    image: maildev/maildev:latest
    container_name: app_maildev
    restart: unless-stopped
    ports:
      - '1080:1080'   # Web UI
      - '1025:1025'   # SMTP

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**`docker/nginx/nginx.conf` (dev):**
```nginx
upstream backend {
    server host.docker.internal:3000;
}
upstream admin {
    server host.docker.internal:3001;
}
upstream web {
    server host.docker.internal:3002;
}

server {
    listen 80;
    server_name localhost;

    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /admin/ {
        proxy_pass http://admin/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    location / {
        proxy_pass http://web/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

**`.env.example`:**
```env
# App
NODE_ENV=development
APP_NAME=MyApp
APP_URL=http://localhost

# Backend
BACKEND_PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://appuser:apppassword@localhost:5432/appdb
DB_USER=appuser
DB_PASSWORD=apppassword
DB_NAME=appdb

# Redis
REDIS_URL=redis://:redispassword@localhost:6379
REDIS_PASSWORD=redispassword

# MinIO / S3
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=uploads
MINIO_USE_SSL=false

# Email (dev: maildev / prod: SMTP)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=noreply@myapp.com

# OAuth (Google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Frontend URLs
ADMIN_URL=http://localhost:3001
WEB_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**✅ Test xác nhận:**
```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d

# Kiểm tra tất cả services healthy
docker compose -f docker/docker-compose.yml ps
# postgres: healthy
# redis: healthy
# minio: healthy
# maildev: running

# Test kết nối postgres
psql postgresql://appuser:apppassword@localhost:5432/appdb -c "SELECT 1;"
# Output: 1 row

# Test redis
redis-cli -a redispassword ping
# Output: PONG

# Truy cập MinIO console: http://localhost:9001 → login thành công
# Truy cập Maildev UI: http://localhost:1080 → UI hiển thị
```

---

## Task 1.5 — Makefile

**Mô tả:**  
Interface đơn giản cho mọi thao tác thường dùng. Dev mới vào project chỉ cần đọc Makefile là biết làm gì.

**Việc cần làm:**
- Tạo `Makefile` ở root với đầy đủ targets
- Đảm bảo các target có comment giải thích

**`Makefile`:**
```makefile
.PHONY: help dev build test lint clean \
        db-migrate db-seed db-reset db-studio \
        docker-up docker-down docker-logs \
        install setup

# Default target
help: ## Hiển thị danh sách lệnh
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Lần đầu setup project (install + copy env + docker up + migrate)
	cp -n .env.example .env || true
	pnpm install
	$(MAKE) docker-up
	sleep 5
	$(MAKE) db-migrate
	$(MAKE) db-seed
	@echo "✅ Setup hoàn tất! Chạy 'make dev' để bắt đầu."

install: ## Cài dependencies
	pnpm install

dev: ## Chạy tất cả apps ở development mode
	pnpm turbo run dev

build: ## Build tất cả apps
	pnpm turbo run build

test: ## Chạy tất cả tests
	pnpm turbo run test

lint: ## Lint tất cả code
	pnpm turbo run lint

lint-fix: ## Auto-fix lint errors
	pnpm turbo run lint -- --fix

clean: ## Xóa build artifacts
	pnpm turbo run clean
	find . -name "dist" -type d -not -path "*/node_modules/*" -exec rm -rf {} +
	find . -name ".next" -type d -not -path "*/node_modules/*" -exec rm -rf {} +

docker-up: ## Khởi động Docker services
	docker compose -f docker/docker-compose.yml up -d
	@echo "⏳ Đang chờ services sẵn sàng..."
	@sleep 5

docker-down: ## Dừng Docker services
	docker compose -f docker/docker-compose.yml down

docker-logs: ## Xem logs Docker services
	docker compose -f docker/docker-compose.yml logs -f

docker-reset: ## Xóa toàn bộ Docker data (NGUY HIỂM)
	docker compose -f docker/docker-compose.yml down -v
	@echo "⚠️  Đã xóa toàn bộ volumes!"

db-migrate: ## Chạy Prisma migrations
	cd apps/backend && pnpm prisma migrate dev

db-migrate-prod: ## Chạy migrations trên production
	cd apps/backend && pnpm prisma migrate deploy

db-seed: ## Seed dữ liệu mẫu
	cd apps/backend && pnpm prisma db seed

db-reset: ## Reset database (xóa data, migrate lại, seed)
	cd apps/backend && pnpm prisma migrate reset

db-studio: ## Mở Prisma Studio (GUI quản lý DB)
	cd apps/backend && pnpm prisma studio

db-generate: ## Generate Prisma client
	cd apps/backend && pnpm prisma generate
```

**✅ Test xác nhận:**
```bash
make help
# Hiển thị bảng màu listing tất cả targets + mô tả

make docker-up
# Docker services khởi động thành công

make docker-down
# Docker services dừng lại

# Test target không tồn tại
make nonexistent
# make: *** No rule to make target 'nonexistent'. Stop.
```

---

## Task 1.6 — Shared Packages Skeleton

**Mô tả:**  
Tạo cấu trúc và exports cơ bản cho 4 shared packages. Chưa cần logic phức tạp, chỉ cần đủ để các app import được và TypeScript không báo lỗi.

**Việc cần làm:**
- Setup `package.json` cho từng package với đúng `name`, `main`, `types`
- Tạo `src/index.ts` với exports cơ bản cho từng package
- Đảm bảo các app có thể import `@repo/types`, `@repo/utils`, v.v.

**Cấu trúc `packages/types/`:**
```
packages/types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── common.ts        # ApiResponse, PaginatedResponse, ...
    ├── user.ts          # User, UserRole, ...
    └── auth.ts          # LoginPayload, TokenPayload, ...
```

**`packages/types/src/common.ts`:**
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

**`packages/constants/src/index.ts`:**
```typescript
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
```

**✅ Test xác nhận:**
```bash
# Trong apps/backend/src/test-import.ts
import { ApiResponse, PaginatedResponse } from '@repo/types';
import { USER_ROLES } from '@repo/constants';

const res: ApiResponse<string> = { success: true, data: 'hello' };
console.log(USER_ROLES.ADMIN);

cd apps/backend
npx tsc --noEmit
# Không lỗi — import shared packages hoạt động
```
