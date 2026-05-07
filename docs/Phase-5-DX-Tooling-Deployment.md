# Phase 5 — DX, Tooling & Production Deployment

> **Mục tiêu:** Đóng gói template thành sản phẩm thực sự tái sử dụng được — script tạo project mới, CI/CD tự động, Docker production-ready, README rõ ràng.  
> **Thời gian ước tính:** 1–2 ngày  
> **Prerequisite:** Phase 1–4 hoàn thành.

---

## Task 5.1 — Script Khởi tạo Project Mới

**Mô tả:**  
Đây là lý do tồn tại của cả template này. Khi bắt đầu dự án mới, chạy một lệnh duy nhất là xong — không còn copy-paste, không còn quên sửa tên app, không còn bỏ sót `.env`.

**Việc cần làm:**

- Tạo script `scripts/create-project.sh` (hoặc `scripts/create-project.ts` dùng `tsx`)
- Script nhận argument: tên project, tùy chọn bỏ qua module nào
- Tự động thực hiện:
  1. Copy toàn bộ template vào thư mục mới
  2. Rename tất cả `myapp` / `MyApp` / `my-app` trong code → tên project mới
  3. Reset git history (`git init` mới)
  4. Copy `.env.example` → `.env`
  5. Chạy `pnpm install`
  6. In checklist các bước tiếp theo

**`scripts/create-project.sh`:**

```bash
#!/bin/bash
set -e

PROJECT_NAME=${1:-"my-new-project"}
TARGET_DIR=${2:-"../$(echo $PROJECT_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"}

echo "🚀 Creating new project: $PROJECT_NAME"

# 1. Copy template
cp -r . "$TARGET_DIR"
cd "$TARGET_DIR"

# 2. Remove git history
rm -rf .git
git init

# 3. Replace app name everywhere (case-sensitive variants)
TEMPLATE_NAME="myapp"
NEW_NAME=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
NEW_NAME_UPPER=$(echo "$PROJECT_NAME" | tr '[:lower:]' '[:upper:]' | tr ' ' '_')
NEW_NAME_PASCAL=$(echo "$PROJECT_NAME" | sed 's/\b\(.\)/\u\1/g' | tr -d ' ')

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.env*" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -exec sed -i "s/$TEMPLATE_NAME/$NEW_NAME/g; s/MyApp/$NEW_NAME_PASCAL/g" {} +

# 4. Setup env
cp .env.example .env
sed -i "s/APP_NAME=.*/APP_NAME=$NEW_NAME_PASCAL/" .env

# 5. Install
pnpm install

echo ""
echo "✅ Project '$PROJECT_NAME' created at: $TARGET_DIR"
echo ""
echo "📋 Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. Cập nhật .env với credentials thực (DB, JWT secret, SMTP, OAuth)"
echo "  3. make docker-up"
echo "  4. make db-migrate && make db-seed"
echo "  5. make dev"
echo ""
echo "  Đọc README.md để biết thêm chi tiết."
```

**Thêm target vào Makefile:**

```makefile
new-project: ## Tạo project mới từ template: make new-project NAME="my-app"
	@scripts/create-project.sh "$(NAME)"
```

**✅ Test xác nhận:**

```bash
# Từ thư mục template
make new-project NAME="coffee-shop"

# Verify kết quả trong ../coffee-shop/
cd ../coffee-shop

# 1. Không còn chữ "myapp" trong code
grep -r "myapp" . --include="*.ts" --exclude-dir=node_modules
# Không có output

# 2. Tên mới đã được thay đúng chỗ
grep -r "coffee-shop" package.json apps/backend/package.json
# Thấy tên mới

# 3. Git history mới
git log --oneline
# "Initial commit" (không có history từ template)

# 4. .env đã được tạo
cat .env | grep APP_NAME
# APP_NAME=CoffeeShop

# 5. pnpm install không lỗi
# 6. make docker-up + make dev → stack chạy được
```

---

## Task 5.2 — Docker Production Setup

**Mô tả:**  
Cấu hình Docker cho production trên VPS: multi-stage build nhỏ gọn, Nginx TLS termination, health checks, resource limits, tự động restart.

**Việc cần làm:**

- Tạo `Dockerfile` multi-stage cho từng app (backend, admin, web)
- Tạo `docker/docker-compose.prod.yml` kết hợp tất cả services
- Cấu hình Nginx production với HTTPS (Let's Encrypt / Certbot)
- Thêm resource limits (memory, CPU) cho mỗi container
- Tạo `docker/.dockerignore` đúng
- Tạo `scripts/deploy.sh` cho VPS
- Tạo `scripts/backup-db.sh` backup PostgreSQL tự động

**`apps/backend/Dockerfile` (multi-stage):**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter=backend build

# Stage 3: Runner (image nhỏ nhất)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
```

**`docker/docker-compose.prod.yml` (excerpt):**

```yaml
version: '3.9'

services:
  backend:
    build:
      context: ..
      dockerfile: apps/backend/Dockerfile
    restart: always
    env_file: ../.env
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    networks: [app_network]

  admin:
    build:
      context: ..
      dockerfile: apps/admin/Dockerfile
    restart: always
    env_file: ../.env
    networks: [app_network]

  web:
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
    restart: always
    env_file: ../.env
    networks: [app_network]

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot
    depends_on: [backend, admin, web]
    networks: [app_network]

  postgres:
    image: postgres:16-alpine
    restart: always
    env_file: ../.env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks: [app_network]
    deploy:
      resources:
        limits:
          memory: 256M

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks: [app_network]

volumes:
  postgres_data:
  redis_data:
  minio_data:
  certbot_www:

networks:
  app_network:
    driver: bridge
```

**`scripts/deploy.sh` (chạy trên VPS):**

```bash
#!/bin/bash
set -e

echo "🚀 Deploying..."

# Pull latest code
git pull origin main

# Build và restart containers (zero-downtime với rolling update)
docker compose -f docker/docker-compose.prod.yml build --no-cache
docker compose -f docker/docker-compose.prod.yml up -d --remove-orphans

# Chạy migrations
docker compose -f docker/docker-compose.prod.yml exec backend \
  npx prisma migrate deploy

echo "✅ Deploy thành công!"
docker compose -f docker/docker-compose.prod.yml ps
```

**`scripts/backup-db.sh`:**

```bash
#!/bin/bash
# Chạy qua cron: 0 2 * * * /path/to/backup-db.sh
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec app_postgres pg_dump -U $DB_USER $DB_NAME | \
  gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Xóa backup cũ hơn 30 ngày
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup: $BACKUP_DIR/backup_$DATE.sql.gz"
```

**✅ Test xác nhận:**

```bash
# Build production images locally
docker compose -f docker/docker-compose.prod.yml build

# Verify image sizes nhỏ gọn
docker images | grep -E "backend|admin|web"
# backend: < 300MB
# admin:   < 200MB
# web:     < 200MB

# Chạy production stack locally
docker compose -f docker/docker-compose.prod.yml up -d
curl http://localhost/api/health
# { "success": true, "data": { "status": "ok" } }

curl http://localhost/api/docs
# Swagger UI (hoặc 404 nếu NODE_ENV=production đã disable docs)

# Kiểm tra health checks
docker compose -f docker/docker-compose.prod.yml ps
# Tất cả status: "healthy" hoặc "running"

# Test backup script
bash scripts/backup-db.sh
ls /var/backups/postgres/ | grep .sql.gz
# File backup được tạo
```

---

## Task 5.3 — GitHub Actions CI/CD

**Mô tả:**  
Pipeline tự động: push code → lint/test → build Docker images → deploy lên VPS. Không còn deploy thủ công, không còn "works on my machine".

**Việc cần làm:**

- Tạo `.github/workflows/ci.yml` — chạy khi push/PR:
  - Lint toàn bộ code
  - Type-check
  - Unit tests
  - Build check
- Tạo `.github/workflows/deploy.yml` — chạy khi push lên `main`:
  - Build Docker images
  - Push lên GitHub Container Registry (ghcr.io)
  - SSH vào VPS, pull images mới, restart services
  - Run migrations
  - Health check sau deploy
- Setup GitHub Secrets cần thiết

**`.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint
      - run: pnpm turbo run type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    env:
      DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
      JWT_SECRET: test-secret-key
      JWT_REFRESH_SECRET: test-refresh-key
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: cd apps/backend && pnpm prisma migrate deploy
      - run: pnpm turbo run test
```

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker images
        run: |
          echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker compose -f docker/docker-compose.prod.yml build
          docker compose -f docker/docker-compose.prod.yml push

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /app
            git pull origin main
            docker compose -f docker/docker-compose.prod.yml pull
            docker compose -f docker/docker-compose.prod.yml up -d --remove-orphans
            docker compose -f docker/docker-compose.prod.yml exec -T backend \
              npx prisma migrate deploy

            # Health check
            sleep 10
            curl -f http://localhost/api/health || exit 1
            echo "✅ Deploy successful!"
```

**GitHub Secrets cần setup:**

```
GHCR_TOKEN         → GitHub Personal Access Token (write:packages)
VPS_HOST           → IP hoặc domain VPS
VPS_USER           → SSH username (thường: ubuntu / deploy)
VPS_SSH_KEY        → Private SSH key
```

**✅ Test xác nhận:**

```bash
# 1. Push code có lỗi lint lên branch develop
# → CI workflow chạy → job "lint-and-type-check" fail
# → PR không thể merge

# 2. Fix lỗi lint → push lại
# → CI pass ✅

# 3. Tạo PR vào main → CI chạy đầy đủ
# → Tất cả jobs pass → PR có thể merge

# 4. Merge vào main
# → Deploy workflow tự động trigger
# → GitHub Actions logs: "Deploy successful!"
# → Truy cập domain VPS → app đang chạy phiên bản mới

# 5. Kiểm tra GitHub Actions tab
# → CI: ✅ xanh
# → Deploy: ✅ xanh + thời gian deploy
```

---

## Task 5.4 — Unit Tests + Integration Tests Template

**Mô tả:**  
Setup cấu trúc test cơ bản đủ để CI chạy được và làm gương cho các test sau. Không cần đạt 100% coverage ngay, nhưng cần có pattern chuẩn.

**Việc cần làm:**

- Backend: setup Jest + `@nestjs/testing`
  - Unit test: `AuthService`, `UserService`, `BaseCrudService`
  - Integration test: auth endpoints (dùng test DB)
- Frontend: setup Vitest + React Testing Library
  - Test `DataTable` component
  - Test `useAuth` hook
- Cấu hình coverage threshold: lines ≥ 60%
- Tạo `test/setup.ts` cho từng app

**Backend unit test mẫu:**

```typescript
// apps/backend/src/auth/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // ...
    });
    it('should throw UnauthorizedException for wrong password', async () => {
      // ...
    });
  });
});
```

**✅ Test xác nhận:**

```bash
# Chạy tất cả tests
make test
# hoặc
pnpm turbo run test

# Output mong đợi:
# ✓ apps/backend: 15 tests passed
# ✓ apps/admin: 8 tests passed
# ✓ apps/web: 6 tests passed

# Coverage report
cd apps/backend && pnpm test:cov
# Lines: 65%+ ✅

# CI: push code failing test → workflow fail ❌
# Fix test → workflow pass ✅
```

---

## Task 5.5 — README + Documentation

**Mô tả:**  
README là mặt tiền của template. Người dùng mới (kể cả bản thân 6 tháng sau) phải đọc 10 phút là biết làm gì. Không có gì tệ hơn một template không có hướng dẫn.

**Việc cần làm:**

- Viết `README.md` đầy đủ ở root
- Viết `SETUP.md` — hướng dẫn deploy lên VPS từng bước
- Tạo `docs/` folder:
  - `docs/architecture.md` — giải thích cấu trúc thư mục và design decisions
  - `docs/adding-a-module.md` — hướng dẫn thêm module mới (step-by-step)
  - `docs/environment-variables.md` — giải thích từng biến môi trường
- Cập nhật mỗi `apps/*/README.md` với hướng dẫn riêng

**Cấu trúc `README.md`:**

```markdown
# TypeScript Fullstack Template

> Clone. Config. Ship. ⚡

## ✨ Features

[danh sách feature nổi bật]

## 🏗️ Tech Stack

[bảng: Backend / Frontend / Infrastructure]

## 🚀 Quick Start (5 phút)

[5 lệnh từ zero đến chạy được]

## 📁 Project Structure

[cây thư mục có giải thích]

## 🔧 Configuration

[link tới docs/environment-variables.md]

## 📖 Documentation

[links tới từng doc]

## 🤝 Creating a New Project

[hướng dẫn dùng create-project script]

## 📦 Adding a New Module

[link tới docs/adding-a-module.md]

## 🚢 Deployment

[link tới SETUP.md]
```

**`docs/adding-a-module.md` — ví dụ thêm module "Posts":**

```markdown
## Thêm module mới trong 15 phút

### 1. Backend (5 phút)

- Thêm model vào prisma/schema.prisma
- Chạy: make db-migrate
- Tạo module: nest g module posts
- Extend BaseCrudService và BaseCrudController
- Thêm vào AppModule

### 2. Admin Frontend (5 phút)

- Copy apps/admin/src/app/(dashboard)/users/
- Rename thành posts/
- Cập nhật columns definition
- Thêm vào nav-items.config.ts

### 3. Types (2 phút)

- Thêm Post interface vào packages/types/src/
- Export từ index.ts
```

**✅ Test xác nhận:**

```bash
# Nhờ người khác (hoặc giả vờ là người mới) làm theo README

# Checklist:
# ☑ Clone repo → đọc README → biết làm gì ngay
# ☑ Quick Start 5 bước → stack chạy được không cần giải thích thêm
# ☑ "Adding a Module" guide → tạo được module mới theo hướng dẫn
# ☑ SETUP.md → deploy lên VPS mới chưa có gì → thành công
# ☑ Mọi link trong README đều hoạt động
# ☑ Không có "TODO" hay placeholder chưa được điền

# Kiểm tra spelling và format
npx markdownlint README.md docs/*.md
# Không có lỗi
```

---

## Checklist Hoàn thành Template

Sau khi hoàn thành cả 5 phases, verify toàn bộ:

```
Infrastructure
☑ make setup → stack chạy từ zero trong < 5 phút
☑ make dev → tất cả 3 apps chạy đồng thời, hot-reload hoạt động
☑ make db-studio → Prisma Studio mở được, thấy dữ liệu seed

Backend
☑ POST /api/auth/register → nhận email welcome (Maildev)
☑ POST /api/auth/login → nhận access + refresh token
☑ GET /api/auth/me với Bearer token → user info
☑ CRUD bất kỳ endpoint → pagination + filter + sort hoạt động
☑ Upload ảnh → file xuất hiện trong MinIO console
☑ Rate limit: 11 request liên tiếp → request 11 bị 429

Admin Frontend
☑ Login với admin@example.com → vào được dashboard
☑ /users → DataTable với pagination, search, sort
☑ Tạo user mới → xuất hiện trong table
☑ Dark mode toggle → UI đổi theme ngay lập tức

User Frontend
☑ Landing page: Lighthouse SEO ≥ 95
☑ Register → verify email (Maildev) → login → dashboard
☑ Upload avatar → crop → save → persist sau refresh
☑ Forgot password → reset → login với mật khẩu mới

CI/CD
☑ Push code lỗi lint → CI fail ❌
☑ Fix lint → CI pass ✅
☑ Merge vào main → auto deploy → health check pass

Tái sử dụng
☑ make new-project NAME="test-app" → project mới tạo được
☑ Không còn chữ "myapp" trong project mới
☑ make dev trong project mới → chạy được không cần sửa gì thêm
```

---

## Checklist cập nhật (2026-05-07)

- [x] Task 5.1 Script khởi tạo project mới:
  - [x] `scripts/create-project.sh`
  - [x] `Makefile` target `new-project`
- [x] Task 5.2 Production Docker scaffold:
  - [x] `apps/backend/Dockerfile`
  - [x] `apps/admin/Dockerfile`
  - [x] `apps/web/Dockerfile`
  - [x] `docker/nginx/nginx.prod.conf`
  - [x] `docker/.dockerignore`
  - [x] `scripts/deploy.sh`
  - [x] `scripts/backup-db.sh`
- [x] Task 5.3 GitHub Actions CI/CD scaffold:
  - [x] `ci.yml` (đã có từ phase trước, pass)
  - [x] `deploy.yml` (build + deploy placeholder)
- [x] Test đã chạy:
  - [x] `pnpm lint` pass.
  - [x] `pnpm typecheck` pass.
- [ ] Theo chỉ đạo hiện tại: không chạy `pnpm install` full ở phase này; sẽ chạy một lần sau Phase 9.
