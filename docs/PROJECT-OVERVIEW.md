# TypeScript Fullstack Template

> **Clone. Config. Ship.** — Không bao giờ setup từ đầu nữa.

---

## Vấn đề

Mỗi lần bắt đầu một dự án TypeScript mới, bạn lại phải lặp lại đúng những thứ đó:

- Khởi tạo monorepo, cấu hình `tsconfig`, ESLint, Prettier, Husky
- Dựng Docker cho PostgreSQL, Redis, storage
- Viết lại auth: JWT, refresh token, OAuth, forgot password...
- Tạo lại CRUD boilerplate, pagination, error handling
- Setup admin portal với table, form, layout từ đầu
- Cấu hình CI/CD, viết Dockerfile, nginx config

Mỗi việc không khó, nhưng gộp lại tốn 1–2 tuần trước khi viết được một dòng business logic. Và lần dự án sau, lại làm lại y hệt.

---

## Giải pháp

**TypeScript Fullstack Template** là một monorepo production-ready, được thiết kế để tái sử dụng hoàn toàn qua nhiều dự án. Toàn bộ phần infrastructure, auth, CRUD pattern, UI layout đều được viết sẵn và có thể mở rộng — không phải copy-paste, mà là extend và override đúng chỗ cần.

Mục tiêu đơn giản: **bắt đầu dự án mới trong dưới 10 phút, không phải 2 tuần.**

```bash
# Tạo dự án mới từ template
make new-project NAME="coffee-shop"

cd ../coffee-shop
make setup   # install + docker up + migrate + seed

make dev     # 3 apps chạy đồng thời, sẵn sàng code business logic
```

---

## Tech Stack

| Layer | Công nghệ | Lý do chọn |
|-------|-----------|------------|
| **Monorepo** | pnpm workspaces + Turborepo | Build incremental, cache thông minh, quản lý packages nội bộ |
| **Backend** | NestJS + TypeScript | Decorator-based, module hóa tốt, dễ chuẩn hóa pattern |
| **ORM** | Prisma | Type-safe hoàn toàn, DX tốt nhất hiện tại, migration rõ ràng |
| **Admin** | Next.js 14 (App Router) | SSR/SSG linh hoạt, file-based routing, production-ready |
| **User App** | Next.js 14 (App Router) | SEO tốt, performance cao, cùng stack với admin |
| **State** | Zustand + TanStack Query | Zustand cho UI state, TanStack Query cho server state — không overlap |
| **UI** | shadcn/ui + Tailwind CSS | Unstyled components, dễ customize, không bị "lock in" |
| **Database** | PostgreSQL 16 | Reliable, feature-rich, phù hợp hầu hết dự án |
| **Cache / Queue** | Redis 7 | Session, rate limit, Bull queue cho email/jobs |
| **Storage** | MinIO (dev) / S3-compatible (prod) | Interface thống nhất, tự host được trên VPS |
| **Infra** | Docker Compose | Đủ cho VPS cá nhân, không cần Kubernetes |
| **CI/CD** | GitHub Actions | Free cho public/private repo, tích hợp tốt với ghcr.io |

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────┐
│                  Docker Environment                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Shared Packages                 │   │
│  │   types · utils · validators · constants    │   │
│  └─────────────────────────────────────────────┘   │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │         Backend (NestJS :3000)               │  │
│  │  Auth · CRUD Base · Upload · Email · RBAC   │  │
│  └──────────────────────────────────────────────┘  │
│         ↓                          ↓                │
│  ┌─────────────┐          ┌───────────────────┐    │
│  │    Admin    │          │    User App       │    │
│  │ Next.js     │          │    Next.js        │    │
│  │ :3001       │          │    :3002          │    │
│  └─────────────┘          └───────────────────┘    │
│                                                     │
│  PostgreSQL · Redis · MinIO · Nginx · Maildev       │
└─────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục

```
/
├── apps/
│   ├── backend/          # NestJS API
│   ├── admin/            # Next.js — quản trị
│   └── web/              # Next.js — end-user
├── packages/
│   ├── types/            # TypeScript interfaces dùng chung
│   ├── utils/            # Helper functions
│   ├── validators/       # Zod schemas (share FE + BE)
│   ├── constants/        # Enums, config keys
│   └── ui/               # shadcn components tái sử dụng
├── docker/               # Compose files, Nginx config
├── scripts/              # create-project, deploy, backup
├── .github/workflows/    # CI/CD pipelines
└── Makefile              # Interface chính cho mọi thao tác
```

---

## Tính năng có sẵn

### Backend
- **Auth hoàn chỉnh** — Register, Login, Logout, Refresh token rotation, Google OAuth2, Forgot/Reset password, Email verification
- **RBAC** — `SUPER_ADMIN`, `ADMIN`, `USER` roles, decorator `@Roles()` + `@Public()`
- **Generic CRUD Base** — Extend `BaseCrudService` là có pagination, search, sort, soft delete, restore — không viết lại boilerplate
- **File Upload** — Validate type/size, auto resize + convert WebP (Sharp), lưu MinIO/S3
- **Email Queue** — Bull + Redis, template Handlebars, retry tự động, không block request
- **Security** — Rate limiting theo route, Helmet, CORS, global exception filter, request ID
- **Logging** — Winston với log rotation, JSON format production, audit log cho write operations
- **Swagger** — Auto-generate từ decorators, available tại `/api/docs`

### Admin Frontend
- **Auth flow** — Login, auto refresh token, route protection theo role
- **Layout** — Sidebar config-driven, breadcrumb tự động, dark mode, responsive
- **Generic DataTable** — Truyền vào column definition là có table với search, sort, pagination, bulk action, row actions
- **User Management** — Danh sách, tạo, sửa, xóa, upload avatar, phân role
- **Dashboard** — Stat cards, AreaChart, BarChart, PieChart với recharts

### User Frontend
- **SEO base** — Metadata template, Open Graph, Twitter Card, sitemap, robots.txt
- **Auth pages** — Register (password strength indicator), Login, Forgot/Reset password, Email verify
- **Google OAuth** — Nút "Continue with Google" sẵn sàng
- **Profile & Settings** — Edit info, avatar upload + crop, đổi password, quản lý sessions, xóa tài khoản
- **Landing page** — Config-driven: Hero, Features, How it works, Pricing, FAQ, Footer
- **Error handling** — Error boundaries, skeleton loading, empty states, offline banner, toast system

### Infrastructure & DX
- **`make setup`** — Từ zero đến stack chạy trong < 5 phút
- **`make new-project NAME="..."`** — Tạo dự án mới, tự động rename toàn bộ, reset git
- **Docker multi-stage** — Image production nhỏ gọn (< 300MB/app)
- **GitHub Actions** — CI (lint, type-check, test) + CD (build, push, deploy, health check)
- **DB Backup** — Script backup PostgreSQL tự động qua cron

---

## Mục tiêu thiết kế

### 1. Reusability trên hết
Mọi quyết định kỹ thuật đều được đánh giá qua câu hỏi: *"Cái này có dùng được cho 90% dự án không?"* Nếu có → build sẵn. Nếu quá specific → để trống, ghi chú trong docs.

### 2. Extend, không replace
Pattern xuyên suốt là inheritance và composition. `BaseCrudService` được extend, không rewrite. Layout admin được config qua `nav-items.config.ts`, không sửa vào component. Shared validators được dùng ở cả FE và BE, không duplicate.

### 3. Đủ đơn giản để hiểu trong một ngày
Template không dùng những thứ "clever" hay over-engineered. Ai quen NestJS + Next.js đều đọc được code ngay. Không có magic ẩn, không có abstraction thừa.

### 4. Production-ready từ ngày đầu
Không có kiểu "chạy local được, production tính sau". Docker multi-stage, health checks, log rotation, DB migrations, CI/CD — tất cả đều có sẵn và đã được test.

### 5. VPS-first
Target deployment là một VPS đơn giản chạy Docker Compose. Không phụ thuộc vào cloud-specific services (không Vercel, không RDS, không SQS). Tự host hoàn toàn, chi phí thấp, kiểm soát toàn bộ.

---

## Kế hoạch triển khai

| Phase | Nội dung | Thời gian |
|-------|----------|-----------|
| [Phase 1](./Phase-1-Infrastructure.md) | Monorepo, Docker, Makefile, Shared packages | 3–4 ngày |
| [Phase 2](./Phase-2-Backend.md) | NestJS, Prisma, Auth, CRUD, Upload + MediaFile core, Email | 4–5 ngày |
| [Phase 3](./Phase-3-Admin-Frontend.md) | Admin layout, DataTable, User management | 3–4 ngày |
| [Phase 4](./Phase-4-User-Frontend.md) | User app, Auth pages, Profile, Landing page | 2–3 ngày |
| [Phase 5](./Phase-5-DX-Tooling-Deployment.md) | create-project script, CI/CD, Production Docker, Docs | 1–2 ngày |
| **Tổng** | | **~2–3 tuần** |

### Dependency quan trọng cần giữ đúng thứ tự

- `Phase 2.5` phải tạo `MediaFile` record và chuẩn `UploadResult` dùng chung.
- `Phase 8.2` và `Phase 8.6` chỉ gọi Upload API, không bypass storage trực tiếp.
- `Phase 10.1 (media-library)` mở rộng từ `MediaFile` core, không định nghĩa lại model này.

---

## Cách dùng cho dự án mới

```bash
# 1. Clone template
git clone https://github.com/you/ts-fullstack-template

# 2. Tạo project mới (tự động rename, reset git, install)
cd ts-fullstack-template
make new-project NAME="my-startup"

# 3. Vào project, cấu hình .env
cd ../my-startup
# Cập nhật: JWT_SECRET, DB_PASSWORD, GOOGLE_CLIENT_ID, MAIL_*, ...

# 4. Chạy
make setup   # docker up + migrate + seed
make dev     # 3 apps hot-reload

# 5. Bắt đầu viết business logic ngay
# Backend: thêm Prisma model → extend BaseCrudService → xong
# Admin:   thêm columns config → dùng DataTable → xong
# Web:     thêm page → layout tự động → xong
```

---

## Điều template này không làm

Để giữ sự đơn giản và tính tái sử dụng, một số thứ **không** được build sẵn:

- **Business logic** — tất nhiên, đây là phần của từng dự án
- **Payment integration** — Stripe, PayOS, v.v. quá specific
- **Real-time** (WebSocket / SSE) — có thể thêm vào sau nếu cần
- **Mobile app** — React Native là một template riêng
- **Multi-tenancy** — phức tạp hóa schema quá nhiều cho use case chung
- **Kubernetes / cloud-managed services** — out of scope, VPS-first

---

*Dự án cá nhân. Xây dựng để dùng đi dùng lại, không phải để viết lại từ đầu.*
