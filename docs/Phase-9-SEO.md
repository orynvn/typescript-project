# Phase 9 — SEO (Admin Config + User Frontend)

> **Mục tiêu:** Hệ thống SEO hoàn chỉnh — admin chỉnh metadata, robots, sitemap qua UI; user frontend tự động áp dụng đúng cho từng loại trang; structured data cho rich snippets Google.  
> **Thời gian ước tính:** 2–3 ngày  
> **Áp dụng cho:** `apps/backend` (API + DB), `apps/admin` (cấu hình), `apps/web` (áp dụng)  
> **Prerequisite:** Phase 2 (Backend), Phase 3 (Admin), Phase 4 (User Frontend) hoàn thành.

---

## Tổng quan kiến trúc SEO

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin Frontend                         │
│  Settings → SEO                                             │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│  │Site Identity │  Metadata    │  Sitemap     │Analytics │ │
│  │logo, favicon │ title, desc  │  config      │GA, GTM   │ │
│  └──────────────┴──────────────┴──────────────┴──────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ save to DB
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (NestJS)                          │
│   SeoSettingsModule — CRUD + cache Redis (TTL 1h)          │
│   GET /api/seo/settings → public (user frontend fetch)     │
│   GET /sitemap.xml → generate dynamically                  │
│   GET /robots.txt → generate from DB config               │
└──────────────────────────┬──────────────────────────────────┘
                           │ consume
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    User Frontend (Next.js)                  │
│                                                             │
│  useSeoSettings() hook → cache TanStack Query              │
│         ↓                                                   │
│  generateMetadata()  → <head> tags per page                │
│  JSON-LD components  → structured data                     │
│  OG Image routes     → dynamic images via next/og          │
│  Sitemap + Robots    → proxy từ backend                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Thứ tự ưu tiên

| Priority | Task | Mô tả ngắn |
|----------|------|-----------|
| 🔴 P1 | **9.1** SEO Settings — Backend + DB | Nền tảng cho mọi thứ phía sau |
| 🔴 P1 | **9.2** SEO Settings — Admin UI | Form cấu hình đầy đủ cho admin |
| 🔴 P1 | **9.3** Metadata Pipeline — User Frontend | `generateMetadata()` dynamic mọi trang |
| 🟡 P2 | **9.4** Robots.txt + Sitemap động | Crawl đúng trang, index đúng nội dung |
| 🟡 P2 | **9.5** Structured Data (JSON-LD) | Rich snippets trên Google |
| 🟡 P2 | **9.6** OG Image động với `next/og` | Social sharing đẹp tự động |
| 🟢 P3 | **9.7** Analytics Integration | GA4, GTM, Facebook Pixel qua Admin |
| 🟢 P3 | **9.8** SEO Audit Dashboard | Kiểm tra điểm SEO từng trang ngay trong Admin |

---

## Task 9.1 — SEO Settings: Backend + DB 🔴 P1

**Mô tả:**  
Tạo data model và API cho toàn bộ cấu hình SEO. Dùng cấu trúc key-value linh hoạt để không cần migration khi thêm setting mới. Cache Redis để user frontend không query DB mỗi request.

**Việc cần làm:**
- Thêm Prisma model `SeoSettings`
- Tạo `SeoModule` với CRUD endpoints
- Cache settings trong Redis (TTL 1 giờ, invalidate khi admin save)
- Public endpoint `GET /api/seo/settings` — user frontend dùng
- Protected endpoint `PATCH /api/seo/settings` — admin only
- Seed dữ liệu default khi khởi tạo project

**Prisma model:**
```prisma
model SeoSettings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   // JSON string
  group     String   // site | meta | social | robots | analytics
  label     String   // Tên hiển thị trong admin UI
  updatedAt DateTime @updatedAt
  updatedBy String?  // userId

  @@index([group])
}
```

**Cấu trúc settings theo groups:**
```typescript
// Group: site — thông tin cơ bản
export const SITE_SEO_DEFAULTS = {
  'site.name':        { value: 'MyApp', label: 'Tên website' },
  'site.tagline':     { value: 'The best solution', label: 'Tagline' },
  'site.url':         { value: 'https://myapp.com', label: 'URL gốc' },
  'site.language':    { value: 'vi', label: 'Ngôn ngữ chính' },
  'site.favicon':     { value: '', label: 'Favicon URL' },
  'site.logo':        { value: '', label: 'Logo URL' },
};

// Group: meta — metadata mặc định
export const META_SEO_DEFAULTS = {
  'meta.title.template':   { value: '%s | MyApp', label: 'Template title (dùng %s cho tên trang)' },
  'meta.title.default':    { value: 'MyApp — The best solution', label: 'Title mặc định (khi không có %s)' },
  'meta.description':      { value: 'Default description...', label: 'Description mặc định' },
  'meta.keywords':         { value: 'keyword1, keyword2', label: 'Keywords mặc định' },
  'meta.robots.default':   { value: 'index, follow', label: 'Robots mặc định' },
  'meta.canonical.auto':   { value: 'true', label: 'Tự động tạo canonical URL' },
};

// Group: social — Open Graph + Twitter
export const SOCIAL_SEO_DEFAULTS = {
  'og.image.default':      { value: '/images/og-default.png', label: 'OG Image mặc định' },
  'og.image.width':        { value: '1200', label: 'OG Image width' },
  'og.image.height':       { value: '630', label: 'OG Image height' },
  'og.type.default':       { value: 'website', label: 'OG Type mặc định' },
  'og.locale':             { value: 'vi_VN', label: 'OG Locale' },
  'twitter.card':          { value: 'summary_large_image', label: 'Twitter Card type' },
  'twitter.site':          { value: '@myapp', label: 'Twitter @username' },
  'twitter.creator':       { value: '@myapp', label: 'Twitter creator @username' },
};

// Group: robots — crawler config
export const ROBOTS_SEO_DEFAULTS = {
  'robots.txt.custom':     { value: '', label: 'Nội dung robots.txt tùy chỉnh' },
  'robots.sitemap.url':    { value: '/sitemap.xml', label: 'URL sitemap' },
  'robots.disallow':       { value: '/admin/, /api/', label: 'Disallow paths (cách nhau bởi dấu phẩy)' },
};

// Group: analytics — tracking
export const ANALYTICS_SEO_DEFAULTS = {
  'analytics.ga4.id':      { value: '', label: 'Google Analytics 4 Measurement ID (G-XXXXXXXX)' },
  'analytics.gtm.id':      { value: '', label: 'Google Tag Manager ID (GTM-XXXXXXX)' },
  'analytics.fb.pixel':    { value: '', label: 'Facebook Pixel ID' },
};
```

**`SeoService` interface:**
```typescript
@Injectable()
export class SeoService {
  // Lấy tất cả settings (từ Redis cache, fallback DB)
  async getAll(): Promise<Record<string, string>>;

  // Lấy settings theo group
  async getByGroup(group: string): Promise<Record<string, string>>;

  // Lấy một setting
  async get(key: string): Promise<string | null>;

  // Update nhiều settings cùng lúc (admin save form)
  async updateBulk(
    updates: Record<string, string>,
    userId: string,
  ): Promise<void>;

  // Invalidate cache (tự động gọi sau updateBulk)
  async invalidateCache(): Promise<void>;
}
```

**Cache strategy:**
```typescript
// Cache key: seo:settings:all
// TTL: 3600s (1 giờ)
// Invalidate ngay khi admin update

async getAll(): Promise<Record<string, string>> {
  const cached = await this.redis.get('seo:settings:all');
  if (cached) return JSON.parse(cached);

  const settings = await this.prisma.seoSettings.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  await this.redis.setex('seo:settings:all', 3600, JSON.stringify(map));
  return map;
}
```

**Endpoints:**
```
GET  /api/seo/settings           → public, tất cả settings (từ cache)
GET  /api/seo/settings/:group    → public, settings theo group
PATCH /api/seo/settings          → ADMIN only, bulk update
POST  /api/seo/settings/reset    → SUPER_ADMIN only, reset về default
```

**✅ Test xác nhận:**
```bash
# 1. Seed chạy → DB có đủ tất cả default settings
make db-seed
curl http://localhost:3000/api/seo/settings | jq '.data | keys | length'
# → số lượng keys ≥ 20

# 2. Public endpoint không cần auth
curl http://localhost:3000/api/seo/settings
# 200 OK với tất cả settings

# 3. Update settings
curl -X PATCH http://localhost:3000/api/seo/settings \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"site.name": "CoffeeShop", "meta.title.template": "%s | CoffeeShop"}'
# 200 OK

# 4. Verify cache invalidate
curl http://localhost:3000/api/seo/settings | jq '."site.name"'
# "CoffeeShop" (fresh data, không phải cache cũ)

# 5. Performance: cache hit
# Gọi GET /seo/settings 10 lần → tất cả < 10ms (từ Redis)
# Lần đầu (cache miss) có thể ~50ms (từ DB)
```

---

## Task 9.2 — SEO Settings: Admin UI 🔴 P1

**Mô tả:**  
Trang cấu hình SEO trong admin với form đầy đủ, preview live, và per-page override. Admin không cần biết code để tối ưu SEO cho từng trang.

**Việc cần làm:**
- Tạo trang `/admin/settings/seo` với tabs theo group
- Live preview SERP (Google search result) khi gõ title/description
- Live preview OG Card (Facebook/LinkedIn share) khi chỉnh OG image
- Per-page SEO override: table danh sách routes + edit từng route
- Robots.txt editor với syntax highlight
- Sitemap config: chọn routes include/exclude, frequency, priority
- Nút "Preview trang người dùng" mở tab mới đến web frontend

**Layout trang `/admin/settings/seo`:**
```
/admin/settings/seo

┌─────────────────────────────────────────────────────────┐
│  SEO Settings                              [Lưu thay đổi]│
├─────────────────────────────────────────────────────────┤
│  [Site]  [Metadata]  [Social]  [Per-page]  [Robots]     │
│  [Sitemap]  [Analytics]                                  │
├─────────────────────────────────────────────────────────┤
│  (content của tab đang active)                          │
└─────────────────────────────────────────────────────────┘
```

**Tab 1: Site Identity**
```typescript
// Fields:
// - Tên website (text)
// - Tagline (text)
// - URL gốc (url input + validate format)
// - Ngôn ngữ chính (select: vi/en/...)
// - Logo (FileUpload component từ Phase 8.2, khuyến nghị useMediaLibrary=true để tái sử dụng asset)
// - Favicon (FileUpload, chỉ nhận .ico/.png/.svg, max 512x512, useMediaLibrary=true)
```

**Tab 2: Metadata + SERP Preview**
```
Fields:                          │  Google Preview
─────────────────────────────    │  ─────────────────────────────
Title template:                  │  myapp.com
[%s | MyApp              ]       │  ┌──────────────────────────┐
                                 │  │ Tên trang | MyApp        │
Default title:                   │  │ myapp.com › trang        │
[MyApp — The best solution]      │  │ Description mặc định của │
                                 │  │ website xuất hiện ở đây  │
Description (max 160 ký tự):    │  └──────────────────────────┘
[Default description...    ]     │  Còn lại: 43 ký tự
[████████████░░░░ 117/160  ]     │

Keywords: [keyword1, keyword2  ]
Robots:   [index, follow    ▼ ]
```

**Tab 3: Social (OG + Twitter) + OG Preview**
```
Fields:                          │  Facebook Preview
─────────────────────────────    │  ─────────────────────────────
OG Image mặc định:              │  ┌──────────────────────────┐
[FileUpload 1200×630px    ]      │  │                          │
                                 │  │    [OG Image Preview]    │
OG Image URL fallback:           │  │                          │
[https://...             ]       │  ├──────────────────────────┤
                                 │  │ MYAPP.COM                │
Twitter Card:                    │  │ MyApp — The best solution│
[summary_large_image    ▼]       │  │ Default description...   │
                                 │  └──────────────────────────┘
Twitter @username:
[@myapp                  ]
```

**Tab 4: Per-page SEO Override**
```
Cho phép admin ghi đè SEO cho từng route cụ thể.

┌──────────────────┬─────────────────┬───────────┬──────────┐
│ Route            │ Title           │ Robots    │ Actions  │
├──────────────────┼─────────────────┼───────────┼──────────┤
│ /                │ Trang chủ       │ index     │ [Sửa]    │
│ /about           │ Về chúng tôi    │ index     │ [Sửa]    │
│ /login           │ (dùng default)  │ noindex   │ [Sửa]    │
└──────────────────┴─────────────────┴───────────┴──────────┘
[+ Thêm route]

Modal "Sửa route /about":
  Route:        /about  (readonly)
  Title:        [Về chúng tôi | MyApp        ]
  Description:  [Tìm hiểu về đội ngũ...      ]
  OG Image:     [FileUpload                  ]
  Robots:       [index, follow             ▼ ]
  Canonical:    [https://myapp.com/about    ]
```

**Tab 5: Robots.txt Editor**
```typescript
// Textarea với monospace font
// Hiển thị nội dung hiện tại của robots.txt
// Validate cú pháp cơ bản khi save
// Preview URL: https://myapp.com/robots.txt [Mở ↗]

const defaultRobotsTxt = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /register

Sitemap: https://myapp.com/sitemap.xml
`;
```

**Tab 6: Sitemap Config**
```
Auto-generate sitemap từ routes đã đăng ký.

Tần suất cập nhật mặc định:  [weekly    ▼]
Priority mặc định:           [0.5       ▼]

Routes trong sitemap:
┌─────────────────┬───────────────┬──────────┬──────────────┐
│ Route pattern   │ Frequency     │ Priority │ Include      │
├─────────────────┼───────────────┼──────────┼──────────────┤
│ /               │ daily         │ 1.0      │ ☑            │
│ /about          │ monthly       │ 0.8      │ ☑            │
│ /blog           │ daily         │ 0.9      │ ☑            │
│ /blog/:slug     │ weekly        │ 0.7      │ ☑            │
│ /login          │ —             │ —        │ ☐ (excluded) │
│ /register       │ —             │ —        │ ☐ (excluded) │
└─────────────────┴───────────────┴──────────┴──────────────┘
[+ Thêm route tĩnh]     [Xem sitemap hiện tại ↗]
```

**Tab 7: Analytics**
```typescript
// Simple form với input fields + hướng dẫn
// GA4:
//   Measurement ID: [G-XXXXXXXXXX    ]
//   [Hướng dẫn lấy ID ↗]
//   Status: ● Đang hoạt động (nếu ID hợp lệ)

// GTM:
//   Container ID: [GTM-XXXXXXX     ]
//   [Hướng dẫn tạo container ↗]

// Facebook Pixel:
//   Pixel ID: [123456789012345 ]
//   [Hướng dẫn ↗]

// Note: "Thay đổi sẽ có hiệu lực sau tối đa 1 giờ (cache)"
```

**DB model cho Per-page overrides:**
```prisma
model SeoPageOverride {
  id          String   @id @default(cuid())
  route       String   @unique  // "/about", "/blog/:slug"
  title       String?
  description String?
  ogImage     String?
  robots      String?  // "index,follow" | "noindex,nofollow"
  canonical   String?
  isActive    Boolean  @default(true)
  updatedAt   DateTime @updatedAt
  updatedBy   String?

  @@index([route])
}
```

**✅ Test xác nhận:**
```bash
# 1. Truy cập /admin/settings/seo
# → 7 tabs hiển thị đúng

# 2. Tab Metadata: gõ title → SERP preview cập nhật realtime
# → Gõ description > 160 ký tự → counter đỏ + cảnh báo

# 3. Tab Social: upload OG image → Facebook preview cập nhật
# → OG image phải đúng tỉ lệ 1200x630 → nếu sai → warning

# 4. Lưu thay đổi → toast "Đã lưu" → cache invalidate
# → GET /api/seo/settings → trả về giá trị mới

# 5. Per-page override: thêm route /about với title tùy chỉnh
# → User frontend /about → <title> dùng title đã override

# 6. Robots.txt editor: sửa nội dung → Save
# → GET /robots.txt → nội dung mới

# 7. Sitemap: uncheck route /login → Save
# → GET /sitemap.xml → không có URL /login
```

---

## Task 9.3 — Metadata Pipeline: User Frontend 🔴 P1

**Mô tả:**  
Hệ thống `generateMetadata()` thông minh cho mọi trang: fetch settings từ backend, merge với per-page data, áp dụng đúng thứ tự ưu tiên. Trang nào cũng có metadata đầy đủ mà không cần viết lại từ đầu.

**Việc cần làm:**
- Tạo `seo.config.ts` — helper functions cho metadata
- Tạo `useSeoSettings()` hook — fetch và cache settings (TanStack Query, staleTime 1h)
- Implement `generateMetadata()` cho từng loại trang
- Thứ tự ưu tiên metadata (ưu tiên cao → thấp):
  1. Per-page override từ DB
  2. Dynamic data của trang (tên sản phẩm, tiêu đề bài viết)
  3. Default settings từ DB
  4. Hardcode fallback trong code

**`lib/seo.config.ts` — helper functions:**
```typescript
import type { Metadata } from 'next';

// Fetch settings từ backend (dùng trong server component)
export async function getSeoSettings(): Promise<SeoSettings> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/seo/settings`, {
    next: { revalidate: 3600 }, // Next.js cache 1 giờ, ISR tự revalidate
  });
  return res.json().then(r => r.data);
}

// Fetch per-page override
export async function getPageOverride(route: string): Promise<SeoPageOverride | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/seo/page-override?route=${route}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;
  return res.json().then(r => r.data);
}

// Build metadata object với đúng thứ tự ưu tiên
export function buildMetadata(params: {
  settings: SeoSettings;
  override?: SeoPageOverride | null;
  page?: {
    title?: string;
    description?: string;
    image?: string;
    type?: 'website' | 'article' | 'product';
    noindex?: boolean;
    canonical?: string;
  };
}): Metadata {
  const { settings, override, page } = params;

  // Thứ tự ưu tiên: override > page > settings > fallback
  const title       = override?.title       || page?.title       || settings['meta.title.default']       || 'MyApp';
  const description = override?.description || page?.description || settings['meta.description']         || '';
  const ogImage     = override?.ogImage     || page?.image       || settings['og.image.default']         || '';
  const robots      = override?.robots      || (page?.noindex ? 'noindex,nofollow' : null)
                      || settings['meta.robots.default']     || 'index,follow';
  const canonical   = override?.canonical   || page?.canonical;

  const titleTemplate = settings['meta.title.template'] || '%s | MyApp';
  const siteName      = settings['site.name']           || 'MyApp';
  const ogLocale      = settings['og.locale']           || 'vi_VN';
  const twitterSite   = settings['twitter.site']        || '';
  const twitterCard   = settings['twitter.card']        || 'summary_large_image';

  return {
    title: {
      default:  title,
      template: titleTemplate,
    },
    description,
    robots,
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      title,
      description,
      siteName,
      locale: ogLocale,
      type: page?.type || 'website',
      ...(ogImage && {
        images: [{
          url: ogImage,
          width:  Number(settings['og.image.width'])  || 1200,
          height: Number(settings['og.image.height']) || 630,
          alt: title,
        }],
      }),
    },
    twitter: {
      card: twitterCard as 'summary' | 'summary_large_image',
      site: twitterSite,
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}
```

**Root layout — base metadata:**
```typescript
// apps/web/src/app/layout.tsx
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings();
  const override = await getPageOverride('/');

  return {
    metadataBase: new URL(settings['site.url'] || 'http://localhost:3002'),
    ...buildMetadata({ settings, override }),
    // Verification tags (Google Search Console, Bing)
    verification: {
      google: settings['verification.google'] || undefined,
    },
  };
}
```

**Landing page `/` — static:**
```typescript
// app/(public)/page.tsx
export async function generateMetadata(): Promise<Metadata> {
  const [settings, override] = await Promise.all([
    getSeoSettings(),
    getPageOverride('/'),
  ]);
  return buildMetadata({ settings, override });
  // Title: dùng meta.title.default (không có %s)
}
```

**Blog post `/blog/[slug]` — dynamic:**
```typescript
// app/(public)/blog/[slug]/page.tsx
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const [settings, post] = await Promise.all([
    getSeoSettings(),
    api.getPost(params.slug),   // fetch post data
  ]);

  if (!post) return { title: 'Bài viết không tồn tại' };

  return buildMetadata({
    settings,
    page: {
      title:       post.seoTitle       || post.title,
      description: post.seoDescription || post.excerpt,
      image:       post.ogImage        || post.thumbnail,
      type:        'article',
      canonical:   `${settings['site.url']}/blog/${params.slug}`,
    },
  });
  // Title sẽ là: "Tên bài viết | MyApp" (từ template)
}
```

**Trang product `/products/[slug]`:**
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const [settings, product] = await Promise.all([
    getSeoSettings(),
    api.getProduct(params.slug),
  ]);

  return buildMetadata({
    settings,
    page: {
      title:       product.name,
      description: product.shortDescription,
      image:       product.images[0]?.url,
      type:        'product',
      noindex:     product.status === 'DRAFT', // draft → noindex
    },
  });
}
```

**Trang auth — noindex:**
```typescript
// app/(auth)/login/page.tsx
export const metadata: Metadata = {
  title: 'Đăng nhập',
  robots: { index: false, follow: false },
};
// Auth pages không cần fetch settings — noindex cứng là đúng
```

**Trang danh sách với pagination `/blog?page=2`:**
```typescript
export async function generateMetadata({ searchParams }): Promise<Metadata> {
  const settings = await getSeoSettings();
  const page = Number(searchParams.page) || 1;

  return {
    ...buildMetadata({ settings, page: { title: 'Blog' } }),
    // Page 2+ → noindex để tránh duplicate content
    ...(page > 1 && { robots: 'noindex, follow' }),
    // Canonical luôn trỏ về trang 1
    alternates: {
      canonical: `${settings['site.url']}/blog`,
    },
  };
}
```

**✅ Test xác nhận:**
```bash
# 1. Kiểm tra <head> trang chủ
curl http://localhost:3002 | grep -E '(og:|twitter:|<title|<meta name="desc)'
# → Đầy đủ OG tags, title, description từ DB settings

# 2. Thay đổi site.name trong Admin → sau 1h (hoặc force revalidate)
# → <title> trang user frontend cập nhật

# 3. Blog post /blog/hello-world
curl http://localhost:3002/blog/hello-world | grep '<title'
# <title>Tiêu đề bài viết | MyApp</title>

# 4. Trang /login
curl http://localhost:3002/login | grep 'robots'
# <meta name="robots" content="noindex, nofollow">

# 5. Blog trang 2: /blog?page=2
curl "http://localhost:3002/blog?page=2" | grep -E '(robots|canonical)'
# robots: noindex, follow
# canonical: https://myapp.com/blog  (trỏ về trang 1)

# 6. Per-page override từ Admin
# Admin: thêm override /about với title "Về Chúng Tôi - Custom"
# → curl http://localhost:3002/about | grep '<title'
# → <title>Về Chúng Tôi - Custom</title>

# 7. Lighthouse SEO score
# → http://localhost:3002 → Lighthouse → SEO ≥ 95
```

---

## Task 9.4 — Robots.txt + Sitemap Động 🟡 P2

**Mô tả:**  
`robots.txt` và `sitemap.xml` được generate từ DB config (do admin cấu hình ở Task 9.2). Sitemap bao gồm cả static routes và dynamic URLs (blog posts, products) từ DB.

**Việc cần làm:**
- `GET /robots.txt` → proxy từ backend, generate từ DB config
- `GET /sitemap.xml` → Next.js `sitemap.ts`, merge static + dynamic URLs
- `GET /sitemap-index.xml` → chia nhỏ nếu > 5000 URLs (sitemap index)
- Tự động ping Google/Bing khi sitemap cập nhật
- Cache sitemap 24h, invalidate khi có content mới

**`apps/web/src/app/robots.ts`:**
```typescript
import type { MetadataRoute } from 'next';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSeoSettings();
  const siteUrl = settings['site.url'] || 'http://localhost:3002';

  // Parse disallow paths từ settings
  const disallowPaths = (settings['robots.disallow'] || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: disallowPaths.length > 0 ? disallowPaths : ['/admin/', '/api/'],
      },
      // Tắt AI crawlers nếu muốn
      {
        userAgent: ['GPTBot', 'Google-Extended', 'CCBot'],
        disallow: '/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    // Custom content từ admin (nếu có)
    ...(settings['robots.txt.custom'] && {
      // Append custom content vào cuối
    }),
  };
}
```

**`apps/web/src/app/sitemap.ts`:**
```typescript
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, sitemapConfig, dynamicUrls] = await Promise.all([
    getSeoSettings(),
    getSitemapConfig(),    // fetch config từ admin (routes include/exclude)
    getDynamicUrls(),      // fetch từ DB: posts, products, categories...
  ]);

  const siteUrl = settings['site.url'] || 'http://localhost:3002';
  const now = new Date();

  // Static routes từ sitemap config (admin đã cấu hình)
  const staticUrls: MetadataRoute.Sitemap = sitemapConfig
    .filter(route => route.isIncluded)
    .map(route => ({
      url: `${siteUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.frequency as any,
      priority: route.priority,
    }));

  // Dynamic URLs từ DB
  const blogUrls: MetadataRoute.Sitemap = dynamicUrls.posts.map(post => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productUrls: MetadataRoute.Sitemap = dynamicUrls.products
    .filter(p => p.status === 'PUBLISHED')
    .map(product => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  return [...staticUrls, ...blogUrls, ...productUrls];
}

// Fetch dynamic URLs từ backend
async function getDynamicUrls() {
  const [posts, products] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts?sitemap=true&limit=10000`,
      { next: { revalidate: 3600 } }).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products?sitemap=true&limit=10000`,
      { next: { revalidate: 3600 } }).then(r => r.json()),
  ]);
  return { posts: posts.data || [], products: products.data || [] };
}
```

**Backend: Ping search engines khi sitemap update:**
```typescript
// Trong SeoService.invalidateCache() — gọi sau khi admin update settings
async notifySearchEngines(siteUrl: string): Promise<void> {
  const sitemapUrl = encodeURIComponent(`${siteUrl}/sitemap.xml`);
  const endpoints = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ];
  // Fire and forget — không block response
  endpoints.forEach(url =>
    fetch(url).catch(() => {}) // silently fail
  );
}
```

**✅ Test xác nhận:**
```bash
# 1. Robots.txt
curl http://localhost:3002/robots.txt
# User-agent: *
# Allow: /
# Disallow: /admin/
# Disallow: /api/
# Sitemap: https://myapp.com/sitemap.xml

# 2. Sitemap.xml
curl http://localhost:3002/sitemap.xml
# XML hợp lệ với các URLs
# → Validate bằng: https://www.xml-sitemaps.com/validate-xml-sitemap.html

# 3. Dynamic URLs trong sitemap
# Tạo blog post mới → sau 1h revalidate
# → /sitemap.xml chứa URL bài viết mới

# 4. Admin thay đổi disallow → robots.txt cập nhật
# Admin → Settings → SEO → Robots.txt
# Thêm "/private/" vào disallow → Save
# → curl /robots.txt → thấy "Disallow: /private/"

# 5. Admin uncheck route /about trong sitemap config
# → /sitemap.xml không còn URL /about

# 6. Validate sitemap format
curl http://localhost:3002/sitemap.xml | xmllint --noout -
# Không có lỗi XML

# 7. Trang bị noindex không có trong sitemap
# /login → noindex → không xuất hiện trong sitemap.xml
```

---

## Task 9.5 — Structured Data (JSON-LD) 🟡 P2

**Mô tả:**  
JSON-LD giúp Google hiểu nội dung trang và hiển thị rich snippets: breadcrumb, FAQ accordion, product rating, article date trong kết quả tìm kiếm. Implement một lần, lợi ích lâu dài.

**Việc cần làm:**
- Tạo `JsonLd` component generic (inject `<script type="application/ld+json">`)
- Tạo các schema components: `OrganizationSchema`, `WebSiteSchema`, `ArticleSchema`, `ProductSchema`, `BreadcrumbSchema`, `FAQSchema`
- Thêm vào đúng trang tương ứng
- Validate schema với Google Rich Results Test

**`components/seo/JsonLd.tsx`:**
```typescript
// Component inject JSON-LD vào <head> an toàn
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0),
      }}
    />
  );
}
```

**`OrganizationSchema` — trang chủ:**
```typescript
export function OrganizationSchema({ settings }: { settings: SeoSettings }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name:    settings['site.name'],
      url:     settings['site.url'],
      logo: {
        '@type': 'ImageObject',
        url: settings['site.logo'],
      },
      sameAs: [
        settings['social.facebook'],
        settings['social.twitter'],
        settings['social.linkedin'],
      ].filter(Boolean),
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: settings['contact.email'],
      },
    }} />
  );
}
```

**`ArticleSchema` — trang blog post:**
```typescript
export function ArticleSchema({ post, settings }: { post: Post; settings: SeoSettings }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline:       post.title,
      description:    post.excerpt,
      image:          post.thumbnail,
      datePublished:  post.publishedAt,
      dateModified:   post.updatedAt,
      author: {
        '@type': 'Person',
        name:  post.author.name,
        url:   `${settings['site.url']}/authors/${post.author.slug}`,
      },
      publisher: {
        '@type': 'Organization',
        name:  settings['site.name'],
        logo: {
          '@type': 'ImageObject',
          url: settings['site.logo'],
        },
      },
      mainEntityOfPage: {
        '@type': '@id',
        '@id':   `${settings['site.url']}/blog/${post.slug}`,
      },
    }} />
  );
}
```

**`ProductSchema` — trang product:**
```typescript
export function ProductSchema({ product, settings }: { product: Product; settings: SeoSettings }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type':    'Product',
      name:        product.name,
      description: product.description,
      image:       product.images.map(img => img.url),
      sku:         product.sku,
      brand: {
        '@type': 'Brand',
        name:    product.brand || settings['site.name'],
      },
      offers: {
        '@type':         'Offer',
        price:           product.price,
        priceCurrency:   'VND',
        availability:    product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url:             `${settings['site.url']}/products/${product.slug}`,
      },
      // Rating nếu có
      ...(product.rating && {
        aggregateRating: {
          '@type':       'AggregateRating',
          ratingValue:   product.rating.average,
          reviewCount:   product.rating.count,
          bestRating:    5,
          worstRating:   1,
        },
      }),
    }} />
  );
}
```

**`BreadcrumbSchema` — mọi trang:**
```typescript
// Dùng cùng data với Dynamic Breadcrumb ở Phase 8.9
export function BreadcrumbSchema({ items, siteUrl }: {
  items: Array<{ label: string; href: string }>;
  siteUrl: string;
}) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type':    'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type':   'ListItem',
        position:  index + 1,
        name:      item.label,
        item:      `${siteUrl}${item.href}`,
      })),
    }} />
  );
}
// Kết quả Google: MyApp › Blog › Tên bài viết
```

**`FAQSchema` — trang FAQ:**
```typescript
export function FAQSchema({ items }: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type':    'FAQPage',
      mainEntity: items.map(item => ({
        '@type':         'Question',
        name:            item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text:    item.answer,
        },
      })),
    }} />
  );
}
// Google hiển thị FAQ accordion trực tiếp trong SERP
```

**`WebSiteSchema` — search action (sitelinks searchbox):**
```typescript
export function WebSiteSchema({ settings }: { settings: SeoSettings }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type':    'WebSite',
      name:       settings['site.name'],
      url:        settings['site.url'],
      potentialAction: {
        '@type':       'SearchAction',
        target:        `${settings['site.url']}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    }} />
  );
}
// Google hiển thị search box trực tiếp dưới sitelink
```

**Áp dụng vào các trang:**
```typescript
// app/(public)/page.tsx — trang chủ
export default async function HomePage() {
  const settings = await getSeoSettings();
  return (
    <>
      <OrganizationSchema settings={settings} />
      <WebSiteSchema settings={settings} />
      <BreadcrumbSchema items={[{ label: 'Trang chủ', href: '/' }]} siteUrl={settings['site.url']} />
      {/* ... page content ... */}
    </>
  );
}

// app/(public)/blog/[slug]/page.tsx
export default async function BlogPostPage({ params }) {
  const [post, settings] = await Promise.all([api.getPost(params.slug), getSeoSettings()]);
  return (
    <>
      <ArticleSchema post={post} settings={settings} />
      <BreadcrumbSchema
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: post.title, href: `/blog/${post.slug}` },
        ]}
        siteUrl={settings['site.url']}
      />
      {/* ... post content ... */}
    </>
  );
}
```

**✅ Test xác nhận:**
```bash
# 1. Kiểm tra JSON-LD trong HTML
curl http://localhost:3002 | grep -A 50 'application/ld+json'
# → Thấy Organization + WebSite schema

# 2. Validate với Google Rich Results Test
# https://search.google.com/test/rich-results
# Nhập URL http://localhost:3002 (hoặc dùng ngrok để expose local)
# → "Organization: Valid"
# → "Website with Sitelinks Searchbox: Valid"

# 3. Blog post schema
# https://search.google.com/test/rich-results?url=localhost:3002/blog/test-post
# → "Article: Valid" với đầy đủ headline, datePublished, author

# 4. Product schema với rating
# → "Product: Valid" + AggregateRating detected
# → Google có thể hiển thị star rating trong SERP

# 5. FAQ schema
# → "FAQPage: Valid"
# → Preview hiển thị FAQ accordion trong SERP

# 6. Breadcrumb schema
# → "BreadcrumbList: Valid"
# → Preview: MyApp › Blog › Tên bài viết

# 7. Validate JSON syntax
curl http://localhost:3002/blog/test | \
  grep -o 'application/ld+json.*</script>' | \
  python3 -m json.tool
# Valid JSON, không lỗi
```

---

## Task 9.6 — OG Image Động với `next/og` 🟡 P2

**Mô tả:**  
Thay vì dùng một ảnh OG tĩnh cho tất cả, generate ảnh động theo nội dung: blog post tự sinh ảnh với title + thumbnail, product tự sinh với tên + giá. Social sharing trông chuyên nghiệp hơn hẳn.

**Việc cần làm:**
- Tạo `app/og/route.tsx` — API route generate OG image
- 3 templates: `default`, `article`, `product`
- Nhận params qua query string, fetch data nếu cần
- Cache ảnh (CDN headers) để không generate lại mỗi lần
- Dùng font chữ tiếng Việt (tránh lỗi ký tự)

**`app/og/route.tsx`:**
```typescript
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template') || 'default';
  const title    = searchParams.get('title')    || 'MyApp';
  const desc     = searchParams.get('desc')     || '';
  const image    = searchParams.get('image')    || '';
  const tag      = searchParams.get('tag')      || '';

  // Font tiếng Việt — load từ Google Fonts
  const fontData = await fetch(
    'https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTA3j6zbXWjgeg.woff2'
  ).then(res => res.arrayBuffer());

  const response = new ImageResponse(
    <OGTemplate
      template={template}
      title={title}
      description={desc}
      image={image}
      tag={tag}
    />,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Nunito', data: fontData, weight: 700 }],
    }
  );

  // Cache 24h
  response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
  return response;
}
```

**OG Templates:**
```typescript
// Template: default (trang chủ, trang không có nội dung cụ thể)
function DefaultTemplate({ title, description, siteName, logo }) {
  return (
    <div style={{
      display: 'flex', width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      alignItems: 'center', justifyContent: 'center', padding: 60,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', color: 'white' }}>
        {logo && <img src={logo} width={80} height={80} style={{ borderRadius: 16 }} />}
        <h1 style={{ fontSize: 72, fontWeight: 700, margin: '20px 0 12px' }}>{title}</h1>
        <p style={{ fontSize: 32, opacity: 0.85 }}>{description}</p>
        <span style={{ marginTop: 32, fontSize: 24, opacity: 0.6 }}>{siteName}</span>
      </div>
    </div>
  );
}

// Template: article (blog post)
function ArticleTemplate({ title, description, image, tag, authorName, authorAvatar }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0f172a' }}>
      {/* Ảnh thumbnail bên phải */}
      {image && (
        <img src={image} style={{
          position: 'absolute', right: 0, top: 0,
          width: '45%', height: '100%', objectFit: 'cover', opacity: 0.4,
        }} />
      )}
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, #0f172a 55%, transparent)',
      }} />
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: 60, zIndex: 1, width: '60%' }}>
        {tag && (
          <span style={{
            background: '#3b82f6', color: 'white', padding: '6px 16px',
            borderRadius: 20, fontSize: 20, width: 'fit-content',
          }}>{tag}</span>
        )}
        <h1 style={{ color: 'white', fontSize: 52, fontWeight: 700, margin: '20px 0', lineHeight: 1.2 }}>
          {title.length > 60 ? title.slice(0, 57) + '...' : title}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 26 }}>
          {description?.slice(0, 100)}
        </p>
      </div>
    </div>
  );
}

// Template: product
function ProductTemplate({ title, price, image, tag, rating }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#fff' }}>
      {image && (
        <img src={image} style={{
          width: '50%', height: '100%', objectFit: 'cover',
        }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', padding: 60, flex: 1, justifyContent: 'center' }}>
        {tag && <span style={{ color: '#3b82f6', fontSize: 22 }}>{tag}</span>}
        <h1 style={{ fontSize: 48, fontWeight: 700, color: '#0f172a', margin: '12px 0' }}>
          {title.length > 40 ? title.slice(0, 37) + '...' : title}
        </h1>
        {price && (
          <p style={{ fontSize: 40, color: '#ef4444', fontWeight: 700 }}>
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}
          </p>
        )}
        {rating && (
          <p style={{ fontSize: 24, color: '#f59e0b' }}>
            {'★'.repeat(Math.round(rating))} {rating}/5
          </p>
        )}
      </div>
    </div>
  );
}
```

**Áp dụng OG Image động vào metadata:**
```typescript
// Blog post — OG image với title + thumbnail
export async function generateMetadata({ params }) {
  const post = await api.getPost(params.slug);
  const ogImageUrl = `/og?template=article&title=${encodeURIComponent(post.title)}&desc=${encodeURIComponent(post.excerpt)}&image=${encodeURIComponent(post.thumbnail)}&tag=${encodeURIComponent(post.category)}`;

  return {
    openGraph: {
      images: [{
        url: ogImageUrl,
        width: 1200, height: 630,
        alt: post.title,
      }],
    },
  };
}

// Product — OG image với tên + giá
export async function generateMetadata({ params }) {
  const product = await api.getProduct(params.slug);
  const ogImageUrl = `/og?template=product&title=${encodeURIComponent(product.name)}&price=${product.price}&image=${encodeURIComponent(product.images[0]?.url)}`;

  return { openGraph: { images: [{ url: ogImageUrl, width: 1200, height: 630 }] } };
}
```

**✅ Test xác nhận:**
```bash
# 1. Truy cập OG image endpoint trực tiếp
open "http://localhost:3002/og?template=default&title=Test Title&desc=Description here"
# → Ảnh 1200x630px render đúng template

open "http://localhost:3002/og?template=article&title=Bài viết tiếng Việt&tag=Công nghệ"
# → Ảnh article template, tiếng Việt hiển thị đúng (không bị lỗi font)

open "http://localhost:3002/og?template=product&title=iPhone 15&price=25990000"
# → Ảnh product template với giá định dạng VND

# 2. Kiểm tra OG image URL trong metadata
curl http://localhost:3002/blog/test-post | grep 'og:image'
# <meta property="og:image" content="http://localhost:3002/og?template=article&title=...">

# 3. Test với Facebook Sharing Debugger
# https://developers.facebook.com/tools/debug/
# Nhập URL → "Fetch new scrape information"
# → OG image hiển thị đúng trong preview

# 4. Cache headers
curl -I "http://localhost:3002/og?template=default&title=Test"
# Cache-Control: public, max-age=86400, stale-while-revalidate=3600

# 5. Performance: generate lần đầu ≤ 500ms, cached ≤ 50ms
```

---

## Task 9.7 — Analytics Integration 🟢 P3

**Mô tả:**  
Inject GA4, GTM, Facebook Pixel từ cấu hình DB (admin bật/tắt mà không cần deploy). Dùng Partytown để chạy analytics trong web worker — không block main thread, không ảnh hưởng performance score.

**Việc cần làm:**
- Tạo `AnalyticsProvider` component nhận settings từ DB
- GA4: inject `gtag.js` + `dataLayer`
- GTM: inject `<noscript>` + script
- Facebook Pixel: inject `fbq` init
- Dùng `@builder.io/partytown` để offload vào web worker
- Cookie consent: không track trước khi user accept (GDPR)
- `useAnalytics()` hook để track custom events

**`components/analytics/AnalyticsProvider.tsx`:**
```typescript
'use client';

export function AnalyticsProvider({ settings }: { settings: SeoSettings }) {
  const ga4Id  = settings['analytics.ga4.id'];
  const gtmId  = settings['analytics.gtm.id'];
  const fbPixelId = settings['analytics.fb.pixel'];
  const { hasConsent } = useCookieConsent(); // từ Task 9.7

  if (!hasConsent) return null; // không track khi chưa có consent

  return (
    <>
      {ga4Id && <GoogleAnalytics id={ga4Id} />}
      {gtmId && <GoogleTagManager id={gtmId} />}
      {fbPixelId && <FacebookPixel id={fbPixelId} />}
    </>
  );
}
```

**`useAnalytics()` hook — track custom events:**
```typescript
export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    // GA4
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
    // Facebook Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, params);
    }
  }, []);

  const trackPageView = useCallback((url: string) => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', process.env.NEXT_PUBLIC_GA4_ID, { page_path: url });
    }
  }, []);

  return { trackEvent, trackPageView };
}

// Dùng trong components:
const { trackEvent } = useAnalytics();

// Click nút mua hàng
trackEvent('purchase', { currency: 'VND', value: product.price, items: [{ item_id: product.id }] });

// Submit form liên hệ
trackEvent('generate_lead', { form_name: 'contact' });
```

**Cookie Consent Banner:**
```typescript
// Hiển thị lần đầu nếu chưa có consent
// Lưu vào localStorage: { analytics: true/false, marketing: true/false }
// Chỉ inject tracking scripts sau khi user chấp nhận
<CookieConsentBanner
  onAccept={() => { localStorage.setItem('cookie-consent', 'true'); }}
  onDecline={() => { localStorage.setItem('cookie-consent', 'false'); }}
/>
```

**✅ Test xác nhận:**
```bash
# 1. Admin điền GA4 ID → Save → user frontend reload
# → <script> GA4 xuất hiện trong source
# → Chrome DevTools → Network → thấy request đến google-analytics.com

# 2. GA4 tracking
# → GA4 Realtime report → thấy user online khi có người truy cập

# 3. Cookie consent
# → Lần đầu vào site → banner xuất hiện
# → Decline → không có GA4/Pixel request trong Network tab
# → Accept → GA4 script inject + event fired

# 4. Custom event tracking
# → Click button có trackEvent() → GA4 DebugView thấy event
# → Facebook Pixel Helper extension → event detected

# 5. Performance impact
# → Lighthouse Performance với Partytown ≥ 85
# → Không có analytics script trong main thread blocking
```

---

## Task 9.8 — SEO Audit Dashboard 🟢 P3

**Mô tả:**  
Admin kiểm tra điểm SEO từng trang ngay trong dashboard mà không cần mở Lighthouse thủ công. Gọi Lighthouse API (hoặc PageSpeed Insights API) và hiển thị kết quả trực quan.

**Việc cần làm:**
- Tạo trang `/admin/settings/seo/audit` 
- Tích hợp Google PageSpeed Insights API (free, không cần key cho 25k req/ngày)
- Hiển thị scores: Performance, SEO, Accessibility, Best Practices
- Checklist chi tiết các vấn đề cần fix
- Lưu lịch sử audit để so sánh trend
- Có thể audit nhiều URLs cùng lúc

**`/admin/settings/seo/audit` — UI:**
```
SEO Audit

URL cần kiểm tra:   [https://myapp.com/blog/post-1    ] [Kiểm tra]

Hoặc audit nhiều URL:
┌─────────────────────────────────┬───────────┐
│ https://myapp.com               │ [Kiểm tra]│
│ https://myapp.com/blog          │ [Kiểm tra]│
│ https://myapp.com/products      │ [Kiểm tra]│
└─────────────────────────────────┴───────────┘
                              [Kiểm tra tất cả]

Kết quả: https://myapp.com

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Performance  │     SEO      │Accessibility │Best Practices│
│     92       │     98       │     95       │     92       │
│   🟢 Tốt    │   🟢 Tốt    │   🟢 Tốt    │   🟢 Tốt    │
└──────────────┴──────────────┴──────────────┴──────────────┘

Vấn đề cần cải thiện:
⚠️  Images do not have explicit width and height  [Xem chi tiết]
⚠️  Links do not have a discernible name         [Xem chi tiết]
ℹ️  Serve images in next-gen formats             [Xem chi tiết]
```

**API call PageSpeed Insights:**
```typescript
// Backend endpoint để proxy (tránh expose API key ở frontend)
// GET /api/admin/seo/audit?url=https://myapp.com

async function auditUrl(url: string): Promise<AuditResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY; // optional
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
    + `?url=${encodeURIComponent(url)}&strategy=mobile`
    + (apiKey ? `&key=${apiKey}` : '');

  const res = await fetch(endpoint);
  const data = await res.json();

  return {
    url,
    scores: {
      performance:    Math.round(data.lighthouseResult.categories.performance.score * 100),
      seo:            Math.round(data.lighthouseResult.categories.seo.score * 100),
      accessibility:  Math.round(data.lighthouseResult.categories.accessibility.score * 100),
      bestPractices:  Math.round(data.lighthouseResult.categories['best-practices'].score * 100),
    },
    audits: Object.entries(data.lighthouseResult.audits)
      .filter(([_, audit]: any) => audit.score !== null && audit.score < 1)
      .map(([key, audit]: any) => ({
        id: key, title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue,
      }))
      .sort((a, b) => a.score - b.score),
    auditedAt: new Date().toISOString(),
  };
}
```

**Lưu lịch sử audit:**
```prisma
model SeoAuditLog {
  id          String   @id @default(cuid())
  url         String
  performance Int
  seo         Int
  accessibility Int
  bestPractices Int
  auditData   Json     // full audit result
  createdAt   DateTime @default(now())
  createdBy   String?

  @@index([url, createdAt])
}
```

**Trend chart:**
```typescript
// Mỗi URL có thể xem lịch sử điểm theo thời gian
// Line chart: Performance / SEO / Accessibility / Best Practices
// Thấy rõ điểm tăng/giảm sau mỗi lần deploy
```

**✅ Test xác nhận:**
```bash
# 1. Audit trang chủ
# Admin → SEO → Audit → nhập https://myapp.com → Kiểm tra
# → Sau 5-10s: 4 scores hiển thị
# → Danh sách issues với mức độ ưu tiên

# 2. SEO score ≥ 90 sau khi hoàn thành Phase 9
# → Performance, SEO, Accessibility đều ≥ 85

# 3. Lịch sử audit
# → Audit lần 2 → lần 1 vẫn còn trong history
# → Chart hiển thị trend 2 điểm

# 4. Audit nhiều URL
# → Chọn 3 URLs → "Kiểm tra tất cả"
# → 3 tabs kết quả hiển thị song song

# 5. Issues actionable
# → Click "Xem chi tiết" → mở tab Lighthouse documentation
```

---

## Checklist Hoàn thành Phase 9

```
P1 — Core SEO Pipeline
☑ GET /api/seo/settings → trả về đầy đủ settings từ cache Redis
☑ Admin save settings → cache invalidate → user frontend nhận giá trị mới
☑ Admin UI: 7 tabs đầy đủ, SERP preview + OG preview realtime
☑ Per-page override: thêm override /about → user frontend áp dụng đúng
☑ generateMetadata() đúng thứ tự ưu tiên: override > page data > settings > fallback
☑ Trang auth (/login, /register): robots noindex cứng
☑ Trang pagination (page>1): robots noindex + canonical về trang 1
☑ Lighthouse SEO score trang chủ ≥ 95

P2 — Technical SEO
☑ /robots.txt: generate từ DB config, disallow đúng paths
☑ /sitemap.xml: valid XML, bao gồm static + dynamic URLs
☑ Dynamic URLs: tạo post mới → xuất hiện trong sitemap sau revalidate
☑ JSON-LD Organization + WebSite: Google Rich Results Test → Valid
☑ JSON-LD Article trên trang blog: Valid
☑ JSON-LD Product với AggregateRating: Valid
☑ JSON-LD BreadcrumbList trên mọi trang: Valid
☑ OG Image động: 3 templates render đúng, tiếng Việt hiển thị đúng font
☑ OG Image cache headers: Cache-Control 24h

P3 — Analytics & Audit
☑ GA4: admin nhập ID → script inject → Realtime report thấy user
☑ Cookie consent: decline → không có tracking scripts
☑ SEO Audit: nhập URL → 4 Lighthouse scores hiển thị
☑ Audit history: lưu được, chart trend hiển thị

Cross-cutting
☑ Settings cache Redis: GET /seo/settings < 10ms (cache hit)
☑ generateMetadata() sử dụng Next.js ISR revalidate (không fetch mỗi request)
☑ Không có hardcode strings (site name, URL) — tất cả từ DB
☑ Khi DB down: fallback về hardcode defaults, app vẫn chạy
```
