# Phase 10 — Packages (Plugin System)

> **Mục tiêu:** Đóng gói các tính năng hay dùng thành packages cài được bằng một lệnh — không copy-paste, không setup lại từ đầu, không break app chính khi install/uninstall.  
> **Thời gian ước tính:** 2–4 tuần (toàn bộ) hoặc chọn lọc theo nhu cầu từng dự án  
> **Prerequisite:** Phase 1–5 hoàn thành (core template).

---

## Nguyên tắc thiết kế Package

Trước khi đi vào từng package, cần thống nhất 4 nguyên tắc bất biến:

```
1. SELF-CONTAINED   Mỗi package tự quản lý schema, API, UI — không leak logic ra ngoài
2. ZERO-BREAK       Install/uninstall không làm vỡ app chính, không có side effects
3. ONE-COMMAND      npx @myorg/<name> install — tự động wire mọi thứ, không cần sửa tay
4. REVERSIBLE       npx @myorg/<name> uninstall — gỡ sạch, không để lại rác
```

**Ngoại lệ có chủ đích cho `media-library`:** `MediaFile` là model lõi của template (được tạo từ Phase 2.5) để mọi luồng upload đều có record ngay cả khi chưa cài package. Package `media-library` chỉ mở rộng trên nền đó.

---

## Kiến trúc Package chuẩn

Mọi package đều theo cùng một cấu trúc:

```
packages/
└── @myorg/
    └── <package-name>/
        ├── package.json
        ├── README.md
        ├── CHANGELOG.md
        ├── install.ts           ← CLI installer script
        ├── uninstall.ts         ← CLI uninstaller script
        ├── backend/
        │   ├── prisma/
        │   │   ├── schema.prisma.append   ← append vào schema chính
        │   │   └── migrations/            ← migration files
        │   ├── src/
        │   │   ├── <name>.module.ts
        │   │   ├── <name>.service.ts
        │   │   ├── <name>.controller.ts
        │   │   └── dto/
        │   └── index.ts         ← export module để import vào AppModule
        ├── admin/
        │   ├── pages/           ← copy vào apps/admin/src/app/(dashboard)/
        │   └── components/      ← copy vào apps/admin/src/components/
        ├── web/
        │   ├── pages/           ← copy vào apps/web/src/app/(public)/
        │   └── components/      ← copy vào apps/web/src/components/
        └── types/
            └── index.ts         ← TypeScript types, export từ @repo/types
```

**`install.ts` — CLI installer chuẩn:**
```typescript
#!/usr/bin/env tsx
// npx @myorg/<name> install

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const ROOT = process.cwd();

async function install() {
  console.log(`\n📦 Installing @myorg/${PACKAGE_NAME}...\n`);

  // 1. Append Prisma schema
  appendPrismaSchema();

  // 2. Copy admin pages
  copyAdminPages();

  // 3. Copy web pages
  copyWebPages();

  // 4. Add nav item vào admin
  addNavItem();

  // 5. Import module vào AppModule
  addToAppModule();

  // 6. Run prisma generate
  execSync('cd apps/backend && pnpm prisma generate', { stdio: 'inherit' });

  console.log(`\n✅ @myorg/${PACKAGE_NAME} installed successfully!`);
  console.log(`\n📋 Next steps:`);
  console.log(`   make db-migrate   → apply schema changes`);
  console.log(`   make dev          → restart apps`);
  printUrls();
}

install().catch(console.error);
```

---

## Thứ tự ưu tiên

| # | Package | Thời gian | Tần suất cần | Giá trị |
|---|---------|-----------|-------------|---------|
| 1 | `media-library` | 3 ngày | ⭐⭐⭐⭐⭐ | Mọi dự án có nội dung |
| 2 | `blog` | 3 ngày | ⭐⭐⭐⭐⭐ | Landing page, news, docs |
| 3 | `audit-log-ui` | 1 ngày | ⭐⭐⭐⭐ | Tận dụng data Phase 2 |
| 4 | `payment` | 4 ngày | ⭐⭐⭐⭐⭐ | Mọi dự án thương mại |
| 5 | `subscription` | 3 ngày | ⭐⭐⭐⭐ | SaaS, membership |
| 6 | `reviews-ratings` | 2 ngày | ⭐⭐⭐ | E-commerce, platform |
| 7 | `chat` | 3 ngày | ⭐⭐⭐ | Support, community |
| 8 | `referral` | 2 ngày | ⭐⭐⭐ | Growth hacking |
| 9 | `i18n` | 3 ngày | ⭐⭐ | Đa ngôn ngữ |
| 10 | `search` | 3 ngày | ⭐⭐ | Full-text search |

---

## Package 1 — `@myorg/media-library`

**Mô tả:**  
Thư viện media tập trung: upload, organize, tìm kiếm, tái sử dụng file trên toàn app. Thay vì upload rải rác mỗi form, tất cả file đi qua một chỗ. Tích hợp insert-vào-editor cho Tiptap (Phase 8.6).

**Khi nào cần:** Dự án có blog, sản phẩm, nội dung động — cần quản lý ảnh/file có tổ chức.

### Backend

**Prisma schema append:**
```prisma
// KHÔNG tạo lại MediaFile.
// Chỉ append phần mở rộng vào model MediaFile đã có sẵn trong core:
// - folderId, tags, alt, caption, usageCount
// - relation tới MediaFolder
// - indexes bổ sung cho folderId/tags
//
// Ví dụ (pseudo patch):
// model MediaFile {
//   folderId   String?
//   folder     MediaFolder? @relation(fields: [folderId], references: [id])
//   tags       String[]
//   alt        String?
//   caption    String?
//   usageCount Int @default(0)
//   @@index([folderId])
//   @@index([tags])
// }

model MediaFolder {
  id        String        @id @default(cuid())
  name      String
  parentId  String?
  parent    MediaFolder?  @relation("FolderTree", fields: [parentId], references: [id])
  children  MediaFolder[] @relation("FolderTree")
  files     MediaFile[]
  createdAt DateTime      @default(now())

  @@index([parentId])
}
```

**API Endpoints:**
```
GET    /media                     → list files (search, filter, pagination)
GET    /media/:id                 → file detail
PATCH  /media/:id                 → update alt, caption, tags
DELETE /media/:id                 → xóa file (check usageCount > 0 → warn)
DELETE /media/bulk                → xóa nhiều files
GET    /media/status              → { installed: true } cho feature detection frontend

GET    /media/folders             → folder tree
POST   /media/folders             → tạo folder
PATCH  /media/folders/:id         → đổi tên folder
DELETE /media/folders/:id         → xóa folder (phải rỗng)
POST   /media/move                → move files/folders
```

### Admin UI

**Trang `/admin/media`:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Media Library                    [Upload] [Tạo folder] [🔍 Tìm] │
├──────────────┬───────────────────────────────────────────────────┤
│ 📁 Tất cả   │  [Grid ▦] [List ☰]   Sort: [Mới nhất ▾]          │
│ 📁 Images   │                                                    │
│  📁 2025    │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│    📁 Jan   │  │img │ │img │ │img │ │img │ │img │ │img │       │
│    📁 Feb   │  │    │ │    │ │    │ │    │ │    │ │    │       │
│ 📁 Documents│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘       │
│ 📁 Videos   │  [filename]  [filename]  ...                      │
│             │                                                    │
│             │  Selected: 3 files  [Xóa] [Move to] [Download]   │
└──────────────┴───────────────────────────────────────────────────┘
```

**File detail panel (click vào file):**
```
┌───────────────────────────────────┐
│          [preview ảnh]            │
│                                   │
│ Tên file:  product-hero.webp      │
│ Kích thước: 1200 × 630px          │
│ Dung lượng: 45.2 KB               │
│ Upload lúc: 15/01/2025 09:30      │
│                                   │
│ Alt text:  [               ]      │
│ Caption:   [               ]      │
│ Tags:      [tag1] [tag2] [+]      │
│                                   │
│ URL: [https://... ] [Copy ↗]      │
│                                   │
│ Đang dùng ở: 3 nơi               │
│ [Xem nơi đang dùng]               │
│                                   │
│ [Lưu]          [Xóa file]         │
└───────────────────────────────────┘
```

### Web Component

**`MediaPickerModal` — dùng trong form:**
```typescript
// Thay thế FileUpload thông thường khi muốn chọn từ thư viện có sẵn
<MediaPickerModal
  open={open}
  onClose={() => setOpen(false)}
  onSelect={(files) => setValue('images', files)}
  multiple
  accept="image/*"
/>
// Giao diện giống admin media library, thu nhỏ trong modal

// Tích hợp vào Tiptap editor (Phase 8.6)
// Click [🖼] → mở MediaPickerModal thay vì file picker thông thường
// Chọn ảnh từ thư viện → insert vào editor
```

**✅ Test xác nhận:**
```bash
npx @myorg/media-library install

# 1. Trang /admin/media hiển thị
# 2. Upload ảnh từ FileUpload/Tiptap trước khi cài package vẫn thấy lại trong grid (do dùng MediaFile core)
# 3. Tạo folder "Products" → move ảnh vào → folder tree cập nhật
# 4. Search "hero" → chỉ hiện file tên chứa "hero"
# 5. Click file → panel detail, edit alt text → Save → cập nhật
# 6. Xóa file đang dùng → warning "Đang dùng ở 3 nơi. Tiếp tục?"
# 7. MediaPickerModal trong form → chọn ảnh → URL điền vào form
# 8. Tiptap editor: click [🖼] → mở picker → chọn → insert vào editor
```

---

## Package 2 — `@myorg/blog`

**Mô tả:**  
Blog/news hoàn chỉnh: viết bài, phân loại, tag, comment, SEO tự động, RSS feed. Admin quản lý nội dung qua editor đầy đủ. User đọc bài với layout đẹp.

**Khi nào cần:** Landing page với blog, news site, documentation, knowledge base.

### Backend

**Prisma schema append:**
```prisma
model BlogPost {
  id            String      @id @default(cuid())
  title         String
  slug          String      @unique
  excerpt       String?
  content       String      // HTML từ Tiptap
  coverImage    String?
  status        PostStatus  @default(DRAFT)
  featured      Boolean     @default(false)
  authorId      String
  author        User        @relation(fields: [authorId], references: [id])
  categoryId    String?
  category      BlogCategory? @relation(fields: [categoryId], references: [id])
  tags          BlogTag[]   @relation("PostTags")
  comments      BlogComment[]
  views         Int         @default(0)
  readTime      Int?        // phút đọc, auto-calculate

  // SEO fields (per-post override, tích hợp Phase 9)
  seoTitle      String?
  seoDescription String?
  ogImage       String?

  publishedAt   DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  deletedAt     DateTime?

  @@index([slug])
  @@index([status, publishedAt])
  @@index([authorId])
  @@index([categoryId])
}

model BlogCategory {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  description String?
  image       String?
  parentId    String?
  parent      BlogCategory?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    BlogCategory[] @relation("CategoryTree")
  posts       BlogPost[]
  createdAt   DateTime   @default(now())
}

model BlogTag {
  id    String     @id @default(cuid())
  name  String     @unique
  slug  String     @unique
  posts BlogPost[] @relation("PostTags")
}

model BlogComment {
  id        String          @id @default(cuid())
  postId    String
  post      BlogPost        @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String?         // null nếu guest comment
  author    User?           @relation(fields: [authorId], references: [id])
  guestName  String?        // nếu guest
  guestEmail String?
  content   String
  status    CommentStatus   @default(PENDING)  // PENDING | APPROVED | SPAM
  parentId  String?         // nested comments
  parent    BlogComment?    @relation("CommentReplies", fields: [parentId], references: [id])
  replies   BlogComment[]   @relation("CommentReplies")
  createdAt DateTime        @default(now())

  @@index([postId, status])
}

enum PostStatus  { DRAFT PUBLISHED SCHEDULED ARCHIVED }
enum CommentStatus { PENDING APPROVED SPAM }
```

**API Endpoints:**
```
# Public (web frontend)
GET    /blog/posts                     → list (published only, pagination)
GET    /blog/posts/featured            → featured posts
GET    /blog/posts/:slug               → post detail + increment view
GET    /blog/categories                → category tree
GET    /blog/categories/:slug/posts    → posts by category
GET    /blog/tags/:slug/posts          → posts by tag
GET    /blog/rss.xml                   → RSS feed
POST   /blog/posts/:slug/comments      → thêm comment (cần auth hoặc guest info)

# Admin (protected)
GET    /admin/blog/posts               → all posts (kể cả draft)
POST   /admin/blog/posts               → tạo post
PATCH  /admin/blog/posts/:id           → cập nhật
DELETE /admin/blog/posts/:id           → xóa (soft)
POST   /admin/blog/posts/:id/publish   → publish ngay
POST   /admin/blog/posts/:id/schedule  → schedule publish
GET    /admin/blog/comments            → moderation queue
PATCH  /admin/blog/comments/:id/approve
PATCH  /admin/blog/comments/:id/spam
```

**Auto-features:**
```typescript
// Tự động tính readTime từ content
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]+>/g, ''); // strip HTML
  return Math.ceil(text.split(/\s+/).length / wordsPerMinute);
}

// Tự động generate slug từ title
function generateSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    // ... normalize tiếng Việt
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Scheduled publish: Bull job kiểm tra mỗi phút
@Cron('* * * * *')
async publishScheduledPosts() {
  const due = await this.prisma.blogPost.findMany({
    where: { status: 'SCHEDULED', publishedAt: { lte: new Date() } },
  });
  for (const post of due) {
    await this.prisma.blogPost.update({
      where: { id: post.id }, data: { status: 'PUBLISHED' },
    });
  }
}
```

### Admin UI

**Trang `/admin/blog`:**
```
/admin/blog/posts → DataTable (Phase 3.4) với columns:
  Title | Category | Status (badge) | Views | Published At | Actions

/admin/blog/posts/new → Full editor page:
  ┌────────────────────────────────────┬──────────────────────┐
  │                                    │ Publish              │
  │  Tiêu đề bài viết                  │ Status: [Draft    ▾] │
  │  ─────────────────────────────     │ [Publish ngay]       │
  │                                    │ [Schedule...]        │
  │  [RichTextEditor - Phase 8.6]      ├──────────────────────┤
  │                                    │ Category             │
  │                                    │ [AsyncCombobox]      │
  │                                    ├──────────────────────┤
  │                                    │ Tags                 │
  │                                    │ [tag1][tag2][+]      │
  │                                    ├──────────────────────┤
  │                                    │ Cover Image          │
  │                                    │ [MediaPicker]        │
  │                                    ├──────────────────────┤
  │                                    │ SEO (collapsible)    │
  │                                    │ Title override: []   │
  │                                    │ Description: []      │
  │                                    │ [SERP Preview]       │
  └────────────────────────────────────┴──────────────────────┘

/admin/blog/comments → Moderation queue:
  Filter: [Chờ duyệt ▾]
  [Approve] [Spam] cho từng comment
```

### Web Pages

```typescript
// app/(public)/blog/page.tsx
// → Grid bài viết, filter category/tag, search

// app/(public)/blog/[slug]/page.tsx
// → Bài viết đầy đủ với:
//   - Cover image (next/image)
//   - Author info + avatar
//   - Read time + published date
//   - Category + tags (clickable)
//   - Table of contents (auto-generate từ headings)
//   - Related posts (cùng category)
//   - Comment section
//   - Social share buttons

// app/(public)/blog/category/[slug]/page.tsx
// app/(public)/blog/tag/[slug]/page.tsx
// app/(public)/rss.xml/route.ts  → RSS feed
```

**RSS Feed:**
```typescript
// GET /rss.xml → RSS 2.0 XML
export async function GET() {
  const posts = await api.getPublishedPosts({ limit: 20 });
  const settings = await getSeoSettings();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${settings['site.name']}</title>
    <link>${settings['site.url']}/blog</link>
    <description>${settings['meta.description']}</description>
    ${posts.map(post => `
    <item>
      <title>${post.title}</title>
      <link>${settings['site.url']}/blog/${post.slug}</link>
      <description>${post.excerpt}</description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <guid>${settings['site.url']}/blog/${post.slug}</guid>
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(rss, { headers: { 'Content-Type': 'application/rss+xml' } });
}
```

**✅ Test xác nhận:**
```bash
npx @myorg/blog install

# 1. Tạo bài viết → status DRAFT → Preview → Publish
# 2. Scheduled publish: set publishAt = now + 2 phút → sau 2 phút tự chuyển PUBLISHED
# 3. /blog hiển thị danh sách bài published, không hiện draft
# 4. /blog/[slug] → đúng title, SEO meta, read time, cover image
# 5. Comment: submit comment → status PENDING → Admin approve → xuất hiện
# 6. /rss.xml → valid RSS, validate tại https://validator.w3.org/feed/
# 7. Category filter: click category → chỉ hiện bài của category đó
# 8. SEO: Lighthouse SEO trang blog ≥ 95
# 9. Auto slug: title "Hướng dẫn sử dụng" → slug "huong-dan-su-dung"
```

---

## Package 3 — `@myorg/audit-log-ui`

**Mô tả:**  
UI hoàn chỉnh cho AuditLog đã có từ Phase 2. Không cần backend mới — chỉ cần trang admin hiển thị, filter, export. Nhanh nhất để install (1 ngày), value cao.

**Khi nào cần:** Mọi dự án enterprise, dự án có nhiều admins cần track ai làm gì.

### Backend (bổ sung nhỏ)

```typescript
// Thêm endpoint chưa có trong Phase 2
GET    /admin/audit-logs                    → list với filter đầy đủ
GET    /admin/audit-logs/stats              → summary: top actions, top users
GET    /admin/audit-logs/export             → CSV export
GET    /admin/audit-logs/:id                → detail (full metadata)

// Query params:
// ?userId=xxx&action=DELETE&resource=User&from=2025-01-01&to=2025-01-31&page=1
```

### Admin UI

**Trang `/admin/audit-logs`:**
```
Audit Logs

Filters: [User ▾] [Action ▾] [Resource ▾] [Date Range] [🔍 Search] [↓ Export]

Timeline view:
┌──────────────────────────────────────────────────────────────────┐
│ 15/01/2025 09:30                                                 │
│  [av] admin@example.com   DELETE   User   john@test.com          │
│        IP: 1.2.3.4 · Chrome 120 · 2ms         [Xem chi tiết]   │
├──────────────────────────────────────────────────────────────────┤
│ 15/01/2025 09:25                                                 │
│  [av] admin@example.com   UPDATE   Post   "Hello World"          │
│        IP: 1.2.3.4 · Chrome 120 · 5ms         [Xem chi tiết]   │
└──────────────────────────────────────────────────────────────────┘

Stats cards (top):
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Tổng logs    │ Users active │ Top action   │ Top resource │
│ 1,234        │ 5            │ UPDATE (45%) │ Post (60%)   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Detail modal (click "Xem chi tiết"):**
```
┌──────────────────────────────────────────┐
│ Action: DELETE User                      │
│ Time:   15/01/2025 09:30:12              │
│ User:   admin@example.com                │
│ IP:     1.2.3.4                          │
│                                          │
│ Before:                                  │
│ {                                        │
│   "name": "John Doe",                    │
│   "email": "john@test.com",              │
│   "status": "ACTIVE"                     │
│ }                                        │
│                                          │
│ After: null (deleted)                    │
└──────────────────────────────────────────┘
```

**Cập nhật AuditLogInterceptor (Phase 2.7) để lưu before/after:**
```typescript
// Lưu snapshot trước và sau khi thay đổi
// Để hiển thị diff trong detail modal
async intercept(context: ExecutionContext, next: CallHandler) {
  const before = await this.getResourceSnapshot(context);
  const result = await lastValueFrom(next.handle());
  const after = await this.getResourceSnapshot(context);

  await this.prisma.auditLog.create({
    data: {
      ...baseData,
      metadata: { before, after },  // lưu diff
    },
  });
  return result;
}
```

**✅ Test xác nhận:**
```bash
npx @myorg/audit-log-ui install

# 1. /admin/audit-logs hiển thị timeline
# 2. Filter theo user → chỉ hiện logs của user đó
# 3. Filter action=DELETE → chỉ hiện delete actions
# 4. Date range filter → đúng khoảng thời gian
# 5. Click "Xem chi tiết" → modal với before/after data
# 6. Export CSV → file chứa đúng data đã filter
# 7. Stats cards hiển thị đúng số liệu
```

---

## Package 4 — `@myorg/payment`

**Mô tả:**  
Hệ thống thanh toán với provider interface thống nhất: Stripe (quốc tế) + PayOS (Việt Nam). Checkout flow, order management, invoice PDF, refund. Swap provider không cần sửa business logic.

**Khi nào cần:** Mọi dự án có thu tiền — e-commerce, SaaS one-time payment, booking.

### Backend

**Prisma schema append:**
```prisma
model Order {
  id            String        @id @default(cuid())
  code          String        @unique  // ORD-2025-001
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  status        OrderStatus   @default(PENDING)
  items         OrderItem[]
  subtotal      Int           // VND, không dùng float
  discount      Int           @default(0)
  tax           Int           @default(0)
  total         Int
  currency      String        @default("VND")
  notes         String?
  transactions  Transaction[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId, status])
  @@index([code])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id])
  name        String  // snapshot tên sản phẩm tại thời điểm mua
  sku         String?
  quantity    Int
  unitPrice   Int
  total       Int
  metadata    Json?   // extra info (size, color, etc.)
}

model Transaction {
  id              String            @id @default(cuid())
  orderId         String
  order           Order             @relation(fields: [orderId], references: [id])
  provider        PaymentProvider   // STRIPE | PAYOS | MOMO | BANK_TRANSFER
  providerTxId    String?           // ID từ payment provider
  amount          Int
  currency        String            @default("VND")
  status          TransactionStatus @default(PENDING)
  paymentMethod   String?           // card, bank_transfer, momo_wallet
  metadata        Json?             // raw response từ provider
  paidAt          DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([orderId])
  @@index([providerTxId])
}

enum OrderStatus       { PENDING CONFIRMED PROCESSING COMPLETED CANCELLED REFUNDED }
enum TransactionStatus { PENDING PAID FAILED REFUNDED DISPUTED }
enum PaymentProvider   { STRIPE PAYOS MOMO BANK_TRANSFER }
```

**Provider Interface:**
```typescript
// Tất cả providers implement interface này
interface IPaymentProvider {
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    orderId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent>;

  confirmPayment(intentId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount?: number): Promise<RefundResult>;
  handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent>;
}

// Chọn provider qua config
// PAYMENT_PROVIDER=stripe | payos
```

**PayOS Implementation (Việt Nam):**
```typescript
@Injectable()
export class PayOSProvider implements IPaymentProvider {
  async createPaymentIntent(params) {
    const { data } = await payOS.createPaymentLink({
      orderCode: Number(params.orderId.replace(/\D/g, '')),
      amount: params.amount,
      description: `Thanh toán ${params.orderId}`,
      returnUrl: `${process.env.WEB_URL}/payment/success`,
      cancelUrl:  `${process.env.WEB_URL}/payment/cancel`,
    });
    return { id: data.paymentLinkId, checkoutUrl: data.checkoutUrl };
  }
}
```

**Webhook Handler:**
```typescript
// POST /webhooks/payment → Stripe hoặc PayOS gửi về
// Verify signature → update transaction status → update order status
// Emit notification cho user (tích hợp Phase 7.1)
// Trigger fulfillment (hook để app chính xử lý)

@Post('webhooks/payment')
@Public()
async handleWebhook(@Req() req: Request, @Headers() headers: Record<string, string>) {
  const event = await this.paymentService.processWebhook(req.rawBody, headers);

  if (event.type === 'payment.success') {
    await this.orderService.markPaid(event.orderId);

    // Notify user
    await this.notificationsService.send({
      userId: event.userId,
      type: 'SUCCESS',
      title: 'Thanh toán thành công',
      body: `Đơn hàng #${event.orderCode} đã được xác nhận.`,
      actionUrl: `/orders/${event.orderId}`,
    });

    // Hook để app chính xử lý (gửi email, fulfill order, ...)
    await this.hooksService.emit('order.paid', event);
  }
}
```

### Admin UI

```
/admin/orders → DataTable với filter status, date range
  Columns: Code | User | Total | Status | Payment method | Created | Actions

/admin/orders/:id → Order detail:
  - Order info + items table
  - Transaction history timeline
  - [Refund] button → modal nhập amount
  - [Download Invoice PDF] → tích hợp Phase pdf skill

/admin/transactions → Transaction list với filter provider, status
```

### Web Pages

```typescript
// app/(app)/checkout/page.tsx
// → Multi-step form (Phase 8.8):
//   Step 1: Order review
//   Step 2: Payment method (Stripe Card / PayOS / Bank transfer)
//   Step 3: Confirm

// app/(app)/payment/success/page.tsx
// app/(app)/payment/cancel/page.tsx
// app/(app)/orders/page.tsx → Order history
// app/(app)/orders/[id]/page.tsx → Order detail + invoice download
```

**✅ Test xác nhận:**
```bash
npx @myorg/payment install

# Setup: thêm STRIPE_SECRET_KEY hoặc PAYOS_CLIENT_ID vào .env

# 1. Tạo order → redirect checkout → thanh toán (Stripe test card: 4242...)
# → Webhook nhận → order status COMPLETED
# → User nhận notification "Thanh toán thành công"

# 2. PayOS: tạo payment link → QR code hiển thị → simulate payment
# → Webhook → order COMPLETED

# 3. Refund từ admin: /admin/orders/:id → Refund → nhập amount
# → Transaction status REFUNDED, order status REFUNDED

# 4. Invoice PDF: download → PDF đẹp với logo, items, total

# 5. Order history: /orders → danh sách orders của user
# 6. Stripe webhook: sai signature → 401 Unauthorized
# 7. Idempotency: cùng webhook event gửi 2 lần → chỉ process 1 lần
```

---

## Package 5 — `@myorg/subscription`

**Mô tả:**  
Subscription billing cho SaaS: plans, billing cycles, trial, upgrade/downgrade, usage limits. Tích hợp Stripe Billing. Admin quản lý subscribers và revenue.

**Khi nào cần:** SaaS, membership site, premium content platform.

### Backend

**Prisma schema append:**
```prisma
model SubscriptionPlan {
  id            String         @id @default(cuid())
  name          String         // Free, Pro, Enterprise
  slug          String         @unique
  description   String?
  price         Int            // 0 = free
  currency      String         @default("VND")
  interval      BillingInterval // MONTHLY | YEARLY
  trialDays     Int            @default(0)
  isActive      Boolean        @default(true)
  isPopular     Boolean        @default(false)  // highlight trên pricing page
  features      Json           // { "feature_key": true/false/"10" }
  stripePriceId String?        // Stripe Price ID
  sortOrder     Int            @default(0)
  subscriptions Subscription[]
  createdAt     DateTime       @default(now())
}

model Subscription {
  id                String             @id @default(cuid())
  userId            String             @unique
  user              User               @relation(fields: [userId], references: [id])
  planId            String
  plan              SubscriptionPlan   @relation(fields: [planId], references: [id])
  status            SubscriptionStatus @default(TRIALING)
  currentPeriodStart DateTime
  currentPeriodEnd  DateTime
  cancelAtPeriodEnd Boolean            @default(false)
  cancelledAt       DateTime?
  stripeSubId       String?            // Stripe Subscription ID
  trialEndsAt       DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  @@index([userId])
  @@index([status])
}

enum BillingInterval   { MONTHLY YEARLY }
enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELLED EXPIRED }
```

**Feature gate — kiểm tra quyền truy cập:**
```typescript
// Dùng trong bất kỳ service nào cần check subscription
@Injectable()
export class SubscriptionGuardService {
  async canAccess(userId: string, feature: string): Promise<boolean> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return false;
    const features = sub.plan.features as Record<string, unknown>;
    return !!features[feature];
  }

  async getLimit(userId: string, feature: string): Promise<number> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return 0;
    const features = sub.plan.features as Record<string, unknown>;
    const limit = features[feature];
    return typeof limit === 'number' ? limit : (limit ? Infinity : 0);
  }
}

// Dùng trong controller
@Get('export')
async exportData(@CurrentUser() user: User) {
  const canExport = await this.subGuard.canAccess(user.id, 'csv_export');
  if (!canExport) throw new ForbiddenException('Nâng cấp Pro để xuất dữ liệu');
  // ...
}
```

**Upgrade/Downgrade logic:**
```typescript
async changePlan(userId: string, newPlanId: string) {
  const current = await this.getCurrentSubscription(userId);
  const newPlan = await this.getPlan(newPlanId);

  if (newPlan.price > current.plan.price) {
    // Upgrade: có hiệu lực ngay, charge prorated amount
    await this.stripe.subscriptions.update(current.stripeSubId, {
      items: [{ id: current.stripeItemId, price: newPlan.stripePriceId }],
      proration_behavior: 'create_prorations',
    });
  } else {
    // Downgrade: có hiệu lực vào cuối billing period
    await this.stripe.subscriptions.update(current.stripeSubId, {
      items: [{ id: current.stripeItemId, price: newPlan.stripePriceId }],
      proration_behavior: 'none',
      billing_cycle_anchor: 'unchanged',
    });
  }
}
```

### Admin UI

```
/admin/subscriptions:
  Stats: MRR | ARR | Active subs | Churn rate | Trial conversions

  Subscriber table: User | Plan | Status | Billing | Next charge | Actions
  Actions: [View] [Change plan] [Cancel] [Extend trial]

/admin/plans: Quản lý pricing plans
  - Tạo/sửa plan, features, price
  - Preview pricing page
```

### Web Pages

```typescript
// app/(public)/pricing/page.tsx
// → Pricing table với plan comparison
// → Toggle Monthly/Yearly (yearly discount)
// → [Get Started] → checkout flow

// app/(app)/settings/billing/page.tsx
// → Current plan + usage
// → [Upgrade/Downgrade] → plan comparison modal
// → Billing history
// → [Cancel subscription] → cancellation flow với retention offer
// → Invoice history + download
```

**✅ Test xác nhận:**
```bash
npx @myorg/subscription install

# 1. Pricing page: 3 plans hiển thị, toggle monthly/yearly
# 2. Free plan: signup → auto tạo subscription FREE
# 3. Upgrade Free → Pro:
#    → Stripe checkout → thanh toán → subscription ACTIVE
#    → Feature gate: giờ có thể access Pro features
# 4. Trial: plan có trialDays=14 → subscription TRIALING
#    → Email reminder 3 ngày trước khi hết trial
# 5. Downgrade: có hiệu lực cuối tháng, không mất tiền đã trả
# 6. Cancel: cancelAtPeriodEnd=true → vẫn dùng được đến cuối tháng
# 7. MRR dashboard đúng với subscriptions thực tế
# 8. Feature gate: user FREE gọi endpoint Pro → 403 + upgrade prompt
```

---

## Package 6 — `@myorg/reviews-ratings`

**Mô tả:**  
Review và rating cho bất kỳ resource nào (product, service, post). Moderation queue, verified purchase badge, helpful votes, reply từ owner.

**Khi nào cần:** E-commerce, marketplace, app store, service platform.

### Backend

**Prisma schema append:**
```prisma
model Review {
  id           String       @id @default(cuid())
  resourceType String       // "product" | "service" | bất kỳ
  resourceId   String       // ID của resource
  userId       String
  user         User         @relation(fields: [userId], references: [id])
  rating       Int          // 1–5
  title        String?
  content      String?
  images       String[]     // URLs ảnh review
  status       ReviewStatus @default(PENDING)
  isVerified   Boolean      @default(false)  // verified purchase
  helpfulCount Int          @default(0)
  replyContent String?      // reply từ owner
  repliedAt    DateTime?
  repliedBy    String?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  votes        ReviewVote[]

  @@unique([resourceType, resourceId, userId])  // 1 user 1 review per resource
  @@index([resourceType, resourceId, status])
}

model ReviewVote {
  id        String   @id @default(cuid())
  reviewId  String
  review    Review   @relation(fields: [reviewId], references: [id])
  userId    String
  helpful   Boolean  // true = helpful, false = not helpful
  createdAt DateTime @default(now())

  @@unique([reviewId, userId])
}

enum ReviewStatus { PENDING APPROVED REJECTED HIDDEN }
```

**API:**
```
# Public
GET    /reviews/:type/:resourceId      → list approved reviews + stats
POST   /reviews/:type/:resourceId      → submit review (auth required)
POST   /reviews/:id/helpful            → vote helpful/not helpful

# Admin
GET    /admin/reviews                  → moderation queue
PATCH  /admin/reviews/:id/approve
PATCH  /admin/reviews/:id/reject
POST   /admin/reviews/:id/reply        → owner reply
```

**Rating stats auto-calculate:**
```typescript
// Khi approve review → cập nhật rating aggregate của resource
async updateRatingStats(resourceType: string, resourceId: string) {
  const stats = await this.prisma.review.aggregate({
    where: { resourceType, resourceId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { id: true },
  });
  // Lưu vào cache Redis, hoặc denormalize vào resource table
  // Dùng cho ProductSchema JSON-LD (Phase 9.5)
}
```

### Web Components

```typescript
// <StarRating /> — hiển thị + input
// <ReviewCard /> — single review với vote buttons
// <ReviewList /> — list reviews với sort (newest/helpful/rating)
// <ReviewForm /> — submit review với star picker + image upload
// <RatingSummary /> — histogram 5★ 4★ 3★ 2★ 1★
```

**✅ Test xác nhận:**
```bash
npx @myorg/reviews-ratings install

# Cấu hình resource type: "product"

# 1. Submit review cho product
# → Login → /products/abc → [Viết đánh giá] → form
# → Submit → status PENDING

# 2. Admin approve → review xuất hiện trên trang
# 3. 1 user chỉ review được 1 lần (unique constraint)
# 4. Helpful vote → helpfulCount tăng
# 5. RatingSummary: histogram đúng tỉ lệ từng sao
# 6. JSON-LD Product: aggregateRating cập nhật sau approve
# 7. Admin reply → hiển thị "Phản hồi từ cửa hàng" dưới review
```

---

## Package 7 — `@myorg/chat`

**Mô tả:**  
Live chat support: user chat với agent, floating widget trên web, agent interface trong admin. Tái sử dụng WebSocket layer từ Phase 7.3.

**Khi nào cần:** Support, community, consultation platform.

### Backend

**Prisma schema append:**
```prisma
model ChatConversation {
  id         String             @id @default(cuid())
  userId     String?            // null nếu guest
  user       User?              @relation(fields: [userId], references: [id])
  guestName  String?
  guestEmail String?
  agentId    String?
  agent      User?              @relation("AgentConversations", fields: [agentId], references: [id])
  status     ConversationStatus @default(WAITING)
  subject    String?
  messages   ChatMessage[]
  tags       String[]
  rating     Int?               // user rate cuộc trò chuyện 1-5
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt
  closedAt   DateTime?

  @@index([userId, status])
  @@index([agentId, status])
}

model ChatMessage {
  id             String           @id @default(cuid())
  conversationId String
  conversation   ChatConversation @relation(fields: [conversationId], references: [id])
  senderId       String?          // null = system message
  senderType     SenderType       // USER | AGENT | BOT | SYSTEM
  content        String
  type           MessageType      @default(TEXT)  // TEXT | IMAGE | FILE
  attachments    Json?
  isRead         Boolean          @default(false)
  createdAt      DateTime         @default(now())

  @@index([conversationId, createdAt])
}

enum ConversationStatus { WAITING ACTIVE RESOLVED CLOSED }
enum SenderType         { USER AGENT BOT SYSTEM }
enum MessageType        { TEXT IMAGE FILE }
```

**WebSocket events (mở rộng Phase 7.3):**
```typescript
// Thêm vào SERVER_EVENTS
CHAT_MESSAGE_NEW:      'chat:message',       // tin nhắn mới
CHAT_CONVERSATION_NEW: 'chat:conversation',  // conversation mới (cho agent)
CHAT_AGENT_JOINED:     'chat:agent_joined',  // agent tham gia
CHAT_TYPING:           'chat:typing',        // đang gõ...
CHAT_RESOLVED:         'chat:resolved',      // conversation kết thúc

// Rooms:
// user:{userId}      → nhận tin nhắn
// agent:{agentId}    → nhận conversation mới
// conv:{convId}      → tất cả members trong conversation
```

**Auto-assign và Bot:**
```typescript
// Khi user bắt đầu chat → assign cho agent available
// Nếu không có agent → Bot trả lời tự động với quick replies

const quickReplies = [
  'Tôi muốn hỏi về đơn hàng',
  'Tôi cần hỗ trợ kỹ thuật',
  'Tôi muốn báo lỗi',
  'Khác',
];
```

### Admin UI

```
/admin/chat → Agent dashboard:

┌──────────────────┬───────────────────────────────────────────┐
│ Conversations    │                                           │
│ ──────────────   │  John Doe                                 │
│ ⏳ Waiting (3)   │  ─────────────────────────────────────    │
│  • John Doe      │  [09:30] Xin chào, tôi cần hỗ trợ...    │
│  • Guest #1234   │  [09:31] Agent: Xin chào! Tôi có thể... │
│  • Jane Smith    │  [09:32] Đang gõ...                      │
│                  │  ─────────────────────────────────────    │
│ 💬 Active (2)   │  [Nhập tin nhắn...              ] [Gửi]  │
│  • Alice         │                                           │
│  • Bob           │  Quick replies: [Tôi sẽ kiểm tra]       │
│                  │               [Vui lòng chờ 1 phút]     │
│ ✅ Resolved      │  [Resolve] [Transfer] [Add note]         │
│ [Xem lịch sử]   │                                           │
└──────────────────┴───────────────────────────────────────────┘
```

### Web Widget

```typescript
// Floating chat button ở góc phải dưới
<ChatWidget
  position="bottom-right"
  primaryColor="#3b82f6"
  greeting="Xin chào! Chúng tôi có thể giúp gì cho bạn?"
  offlineMessage="Chúng tôi không online lúc này. Hãy để lại tin nhắn!"
/>
// Tự inject vào layout, không cần sửa code
```

**✅ Test xác nhận:**
```bash
npx @myorg/chat install

# 1. Chat widget xuất hiện ở góc dưới web
# 2. User gõ tin → agent nhận ngay (WebSocket)
# 3. Agent gõ "đang gõ..." → user thấy indicator
# 4. File attachment: gửi ảnh → upload → hiển thị trong chat
# 5. Resolve conversation → user thấy "Cuộc trò chuyện đã kết thúc"
# 6. Rating: user rate 5 sao sau khi resolved
# 7. Offline mode: agent không online → message được lưu, email notify
# 8. Guest chat: không cần login, nhập tên + email là được
```

---

## Package 8 — `@myorg/referral`

**Mô tả:**  
Referral program: mỗi user có link giới thiệu, track conversion, tính reward. Đơn giản nhưng hiệu quả cho growth.

**Khi nào cần:** SaaS, e-commerce muốn viral growth, loyalty program.

### Backend

**Prisma schema append:**
```prisma
model ReferralCode {
  id          String       @id @default(cuid())
  code        String       @unique  // JOHN2025
  userId      String       @unique
  user        User         @relation(fields: [userId], references: [id])
  clicks      Int          @default(0)
  conversions Int          @default(0)
  referrals   Referral[]
  createdAt   DateTime     @default(now())
}

model Referral {
  id           String         @id @default(cuid())
  codeId       String
  code         ReferralCode   @relation(fields: [codeId], references: [id])
  referrerId   String         // người giới thiệu
  referrer     User           @relation("ReferrerUser", fields: [referrerId], references: [id])
  referredId   String         // người được giới thiệu
  referred     User           @relation("ReferredUser", fields: [referredId], references: [id])
  status       ReferralStatus @default(PENDING)
  rewardType   String?        // credit | discount | cash
  rewardAmount Int?
  rewardPaidAt DateTime?
  convertedAt  DateTime?
  createdAt    DateTime       @default(now())

  @@unique([codeId, referredId])
}

enum ReferralStatus { PENDING CONVERTED REWARDED EXPIRED }
```

**Referral tracking:**
```typescript
// 1. User share link: https://myapp.com?ref=JOHN2025
// 2. Visitor click → lưu code vào cookie (30 ngày)
// 3. Visitor register → check cookie → tạo Referral record
// 4. Trigger event (purchase, subscription, ...) → mark CONVERTED
// 5. Payout reward (credit, discount code, ...)
```

### Web Pages

```typescript
// app/(app)/referral/page.tsx
// → Referral code + share link + copy button
// → Social share: Facebook, Zalo, copy link
// → Stats: clicks, conversions, rewards earned
// → History: danh sách người đã giới thiệu thành công
```

**✅ Test xác nhận:**
```bash
npx @myorg/referral install

# 1. User A có referral code tự động
# 2. User A share link → User B click → cookie lưu ref code
# 3. User B register → Referral record tạo
# 4. User B hoàn thành action (purchase) → status CONVERTED
# 5. User A nhận reward notification
# 6. Click tracking: clicks count tăng đúng
# 7. Duplicate prevention: User B dùng 2 codes khác nhau → chỉ tính code đầu tiên
```

---

## Package 9 — `@myorg/i18n`

**Mô tả:**  
Đa ngôn ngữ cho toàn bộ app: dịch UI strings, content động từ DB. Admin quản lý translations qua UI, không cần sửa code.

**Khi nào cần:** App có user đa quốc gia, sản phẩm xuất khẩu.

### Backend

```prisma
model Translation {
  id        String   @id @default(cuid())
  namespace String   // "common" | "blog" | "product"
  key       String   // "button.submit" | "nav.home"
  locale    String   // "vi" | "en" | "ja"
  value     String
  updatedAt DateTime @updatedAt

  @@unique([namespace, key, locale])
  @@index([locale, namespace])
}
```

**API:**
```
GET    /i18n/:locale                      → all translations for locale
GET    /i18n/:locale/:namespace           → namespace translations
POST   /admin/i18n/sync                   → sync keys từ code vào DB
PATCH  /admin/i18n/:namespace/:key        → update translation
GET    /admin/i18n/missing                → keys chưa có bản dịch
```

### Admin UI

```
/admin/settings/translations

Locale: [Tiếng Việt ▾] [English ▾]    [+ Thêm ngôn ngữ]

Namespace: [common ▾]

Key                    | Tiếng Việt        | English         | Thiếu
button.submit          | Gửi               | Submit          | ✅
button.cancel          | Hủy               | Cancel          | ✅
nav.home               |                   | Home            | ⚠️ vi
error.required         | Trường bắt buộc   |                 | ⚠️ en

[Sync từ code] → tự động phát hiện keys mới chưa có trong DB
```

### Web Integration

```typescript
// next-intl wrapper với DB as source
// Cache translations trong Redis (TTL 1h)
// Fallback: key → default locale → key string

const t = useTranslations('common');
return <button>{t('button.submit')}</button>;
```

**✅ Test xác nhận:**
```bash
npx @myorg/i18n install

# 1. Default: app chạy tiếng Việt
# 2. /en → chuyển sang English, persist qua cookie
# 3. Admin sửa "button.submit" = "Gửi ngay" → cache invalidate → UI cập nhật
# 4. Sync: thêm key mới trong code → Admin → Sync → key xuất hiện với status Missing
# 5. Missing translations: export CSV để giao cho translator
```

---

## Package 10 — `@myorg/search`

**Mô tả:**  
Full-text search với Meilisearch (self-hosted, nhanh, dễ dùng hơn Elasticsearch). Index tự động khi có data thay đổi, search với typo tolerance, highlight kết quả.

**Khi nào cần:** App có nhiều nội dung (blog, products, docs), cần tìm kiếm thông minh.

### Backend

**Thêm Meilisearch vào Docker Compose:**
```yaml
# docker/docker-compose.yml
meilisearch:
  image: getmeili/meilisearch:latest
  container_name: app_meilisearch
  ports:
    - '7700:7700'
  environment:
    MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}
  volumes:
    - meilisearch_data:/meili_data
```

**Search Service:**
```typescript
@Injectable()
export class SearchService {
  private client: MeiliSearch;

  // Index document khi create/update
  async indexDocument(indexName: string, document: Record<string, unknown>) {
    await this.client.index(indexName).addDocuments([document]);
  }

  // Remove khi delete
  async removeDocument(indexName: string, id: string) {
    await this.client.index(indexName).deleteDocument(id);
  }

  // Search với highlight + facets
  async search(indexName: string, query: string, options: SearchOptions) {
    return this.client.index(indexName).search(query, {
      attributesToHighlight: ['title', 'content'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      facets: options.facets,
      limit: options.limit || 20,
      offset: (options.page - 1) * (options.limit || 20),
    });
  }
}

// Hook vào Prisma middleware để auto-index
this.prisma.$use(async (params, next) => {
  const result = await next(params);
  if (['create', 'update'].includes(params.action) && INDEXED_MODELS.includes(params.model)) {
    await this.searchService.indexDocument(params.model.toLowerCase(), result);
  }
  return result;
});
```

### Web Pages

```typescript
// app/(public)/search/page.tsx
// → Search input với instant results (debounce 200ms)
// → Filter theo type (Post, Product, ...)
// → Highlighted matches trong kết quả
// → Faceted search (category, price range, ...)
// → "Không tìm thấy kết quả" + suggestions
```

**✅ Test xác nhận:**
```bash
npx @myorg/search install

# 1. Tạo blog post → auto index trong Meilisearch
# 2. Search "hello" → kết quả ngay với highlight <mark>hello</mark>
# 3. Typo tolerance: search "helllo" → vẫn tìm thấy "hello"
# 4. Search tiếng Việt có dấu: "sản phẩm" → tìm đúng
# 5. Filter: search "laptop" + category="electronics" → filter đúng
# 6. Delete post → removed khỏi search index
# 7. Performance: search response < 50ms (Meilisearch rất nhanh)
```

---

## Tổng hợp: Install All Packages

```bash
# Cài tất cả packages (dự án cần đầy đủ)
npx @myorg/media-library install
npx @myorg/blog install
npx @myorg/audit-log-ui install
npx @myorg/payment install
npx @myorg/subscription install
npx @myorg/reviews-ratings install
npx @myorg/chat install
npx @myorg/referral install
npx @myorg/i18n install
npx @myorg/search install

make db-migrate
make dev
```

---

## Checklist Hoàn thành Phase 10

```
Package Infrastructure
☑ Cấu trúc thư mục chuẩn cho tất cả packages
☑ install.ts: chạy không lỗi, tự động wire đúng
☑ uninstall.ts: gỡ sạch không để lại rác
☑ README.md cho từng package với ví dụ sử dụng

Package 1: media-library
☑ Upload, folder, search hoạt động
☑ MediaPickerModal tích hợp vào form và Tiptap editor
☑ usageCount tracking đúng

Package 2: blog
☑ CRUD posts, scheduled publish hoạt động
☑ Comment moderation flow đúng
☑ RSS feed valid
☑ SEO tự động (Article JSON-LD, sitemap)
☑ Slug tự động normalize tiếng Việt

Package 3: audit-log-ui
☑ Timeline, filter, export CSV hoạt động
☑ Before/after diff hiển thị đúng

Package 4: payment
☑ Stripe + PayOS checkout flow end-to-end
☑ Webhook idempotency (không process 2 lần)
☑ Refund flow hoạt động
☑ Invoice PDF download đúng

Package 5: subscription
☑ Trial → Paid conversion flow
☑ Upgrade/Downgrade proration đúng
☑ Feature gate hoạt động
☑ MRR dashboard đúng số liệu

Package 6: reviews-ratings
☑ 1 user 1 review per resource (unique constraint)
☑ Moderation + reply hoạt động
☑ Rating stats đúng → JSON-LD cập nhật

Package 7: chat
☑ Real-time messaging (WebSocket) hoạt động
☑ Agent dashboard nhận conversation mới
☑ Offline message lưu + email notify

Package 8: referral
☑ Cookie tracking → register → conversion đúng
☑ Duplicate prevention hoạt động
☑ Reward notification gửi đúng

Package 9: i18n
☑ Chuyển ngôn ngữ, persist qua cookie
☑ Admin edit translation → cache invalidate → UI cập nhật
☑ Missing translations report đúng

Package 10: search
☑ Auto-index khi create/update/delete
☑ Typo tolerance hoạt động
☑ Search response < 50ms
```
