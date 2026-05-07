# Phase 4 — User Frontend (Next.js)

> **Mục tiêu:** App facing end-user với SEO tốt, auth flow đầy đủ, profile management và notification system — clone về là dùng được ngay.  
> **Thời gian ước tính:** 2–3 ngày  
> **Prerequisite:** Phase 2 hoàn thành. Phase 3 không bắt buộc.

---

## Task 4.1 — Khởi tạo Next.js App + Cấu hình SEO Base

**Mô tả:**  
Bootstrap user-facing app. Khác với admin, app này cần SEO tốt ngay từ đầu — cấu hình metadata chuẩn là thứ hay bị bỏ quên nhưng tốn nhiều công sửa sau.

**Việc cần làm:**

- Tạo Next.js 14 App Router trong `apps/web`
- Cài dependencies giống admin (TanStack Query, Zustand, axios, shadcn, react-hook-form, zod)
- Cấu hình SEO base trong `app/layout.tsx`:
  - Default metadata (title template, description, keywords)
  - Open Graph tags
  - Twitter Card
  - Favicon + icons
  - Canonical URL
- Tạo `generateMetadata` helper cho từng page
- Cấu hình `robots.txt` và `sitemap.ts`
- Setup Google Fonts (Inter) với `next/font`

**Cấu trúc thư mục `apps/web/src/`:**

```
src/
├── app/
│   ├── (public)/              ← no auth required
│   │   ├── page.tsx           ← landing page
│   │   ├── about/page.tsx
│   │   └── layout.tsx
│   ├── (auth)/                ← guest only (redirect nếu đã login)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                 ← require auth
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx         ← app shell: header + sidebar
│   ├── layout.tsx             ← root layout
│   └── not-found.tsx
├── components/
│   ├── ui/                    ← shadcn
│   ├── layout/                ← Header, Footer, MobileNav
│   └── shared/                ← Avatar, NotificationBell, ThemeToggle
├── lib/
├── hooks/
├── stores/
└── types/
```

**`app/layout.tsx` — root metadata:**

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'),
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || 'MyApp',
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME || 'MyApp'}`,
  },
  description: 'Default app description — override per page',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: process.env.NEXT_PUBLIC_APP_NAME,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};
```

**✅ Test xác nhận:**

```bash
cd apps/web && pnpm dev
# Server khởi động tại http://localhost:3002

# Kiểm tra SEO tags
curl http://localhost:3002 | grep -E "(og:|twitter:)"
# Thấy các meta tags OG và Twitter

# Truy cập http://localhost:3002/sitemap.xml
# XML hợp lệ với các URLs

# Truy cập http://localhost:3002/robots.txt
# Nội dung đúng

# Kiểm tra Page title format
# Tab browser hiển thị: "Home | MyApp"
# Trang /profile hiển thị: "Profile | MyApp"
```

---

## Task 4.2 — Auth Pages (Register + Login + Email Verify + Forgot/Reset Password)

**Mô tả:**  
Đầy đủ toàn bộ auth flow từ đăng ký đến verify email đến reset password. Dùng lại `@repo/validators` schema để đồng bộ với backend.

**Việc cần làm:**

- Tạo trang `/register` với form: name, email, password, confirm password
- Tạo trang `/login` với form: email, password + "Remember me" + "Forgot password?"
- Tạo trang `/forgot-password`: nhập email → gửi link reset
- Tạo trang `/reset-password?token=xxx`: form đặt mật khẩu mới
- Tạo trang `/verify-email?token=xxx`: auto verify khi vào trang
- Tạo nút "Continue with Google" trên login và register
- Toast notification cho mọi action (success + error)
- Loading state trên button khi submitting

**Password strength indicator trên register:**

```
Rất yếu  ██░░░░░░  (< 8 ký tự)
Yếu      ████░░░░  (8 ký tự, chỉ chữ thường)
Trung    ██████░░  (có chữ hoa + số)
Mạnh     ████████  (có chữ hoa + số + ký tự đặc biệt)
```

**Error messages thân thiện:**

```typescript
// Backend trả về code → FE map sang message thân thiện
const errorMessages = {
  USER_ALREADY_EXISTS: 'Email này đã được đăng ký.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  EMAIL_NOT_VERIFIED: 'Vui lòng xác thực email trước khi đăng nhập.',
  TOKEN_EXPIRED: 'Link đã hết hạn. Vui lòng yêu cầu link mới.',
};
```

**✅ Test xác nhận:**

```bash
# 1. Đăng ký
# - Submit form trống → validation errors hiển thị đúng field
# - Password < 8 ký tự → indicator đỏ + thông báo
# - Password mạnh → indicator xanh
# - Email đã tồn tại → toast error "Email này đã được đăng ký"
# - Đăng ký thành công → redirect /verify-email (pending)

# 2. Verify email
# - Truy cập link từ Maildev
# - /verify-email?token=xxx → "Email verified!" → redirect /login

# 3. Login
# - Sai password → toast error
# - Đúng credentials → redirect /dashboard
# - Click "Continue with Google" → redirect Google OAuth → về /dashboard

# 4. Forgot password
# - Nhập email → "Kiểm tra hộp thư của bạn" → email gửi đến Maildev

# 5. Reset password
# - Truy cập link từ email → form đặt mật khẩu mới
# - Submit → "Đổi mật khẩu thành công" → redirect /login
# - Dùng mật khẩu mới login → thành công
```

---

## Task 4.3 — App Header + Navigation

**Mô tả:**  
Header responsive dùng cho toàn bộ phần app (sau khi đăng nhập). Bao gồm navigation, notification bell và user menu.

**Việc cần làm:**

- Tạo `AppHeader` component:
  - Logo/brand name (từ config)
  - Navigation links (config-driven như admin)
  - `NotificationBell` component với badge count
  - `UserMenu` dropdown: Profile, Settings, Logout
  - `ThemeToggle` (dark/light)
- Mobile: hamburger menu → drawer navigation
- Active link highlight
- Sticky header với backdrop blur khi scroll

**`NotificationBell` component:**

```typescript
// Poll /api/notifications/unread-count mỗi 30 giây
// Hiển thị badge đỏ nếu count > 0
// Click → dropdown list 5 notifications gần nhất
// "Mark all as read" button
// "View all" link
```

**✅ Test xác nhận:**

```bash
# 1. Header hiển thị sau khi login
# 2. Navigation link active state đúng khi navigate
# 3. User menu: click avatar → dropdown với tên + email + role
# 4. Logout từ dropdown → về /login
# 5. Dark mode toggle hoạt động, persist sau refresh (localStorage)

# 6. Mobile test (DevTools device mode, 375px):
# - Nav links ẩn đi
# - Hamburger button hiện
# - Click → drawer navigation mở từ trái
# - Click link trong drawer → navigate + drawer đóng

# 7. Notification bell:
# - Badge số đỏ hiển thị khi có unread
# - Click → dropdown list notifications
# - "Mark all read" → badge biến mất
```

---

## Task 4.4 — Profile + Settings Page

**Mô tả:**  
Trang quản lý thông tin cá nhân. Pattern chuẩn cho mọi app: avatar upload, đổi thông tin, đổi mật khẩu.

**Việc cần làm:**

- Tạo trang `/profile`:
  - Hiển thị thông tin user (name, email, avatar, ngày tham gia)
  - Form edit: name, bio (nếu có)
  - Avatar upload + crop + preview trước khi save (`useMediaLibrary=false` để ưu tiên flow nhanh)
  - Optimistic update (UI cập nhật ngay, rollback nếu lỗi)
- Tạo trang `/settings` với tabs:
  - **Account**: đổi email (require verify email mới), đổi password
  - **Notifications**: toggle email notifications
  - **Security**: active sessions, revoke session
  - **Danger Zone**: xóa tài khoản (require nhập password confirm)

**Avatar upload flow:**

```
User chọn file → validate (image, <5MB)
              → Hiển thị crop tool (react-easy-crop, tỉ lệ 1:1)
              → User confirm crop → canvas → Blob
              → Upload lên /api/upload/image
              → Update user.avatar → Preview ngay lập tức
```

**✅ Test xác nhận:**

```bash
# Profile page
# 1. Thông tin user hiển thị đúng
# 2. Upload avatar → crop tool xuất hiện → confirm → preview ngay → save → persist sau refresh
# 3. Upload file không phải ảnh → "Chỉ chấp nhận file ảnh"
# 4. Sửa tên → Save → toast success → tên cập nhật ngay trên header (optimistic)
# 5. Mạng chậm: UI cập nhật ngay (optimistic), nếu lỗi → rollback về tên cũ

# Settings - Account tab
# 6. Đổi password: nhập sai password hiện tại → error
#    Nhập đúng + new password đủ mạnh → success → phải login lại

# Settings - Danger Zone
# 7. Click "Delete Account" → confirm modal → nhập "DELETE" → confirm
#    → Account bị soft delete → logout → về /login
#    → Login lại với credentials cũ → "Tài khoản không tồn tại"
```

---

## Task 4.5 — Landing Page Template

**Mô tả:**  
Landing page đẹp, SEO tốt, responsive — clone về đổi nội dung là xong. Không cần design từ đầu cho mỗi dự án.

**Việc cần làm:**

- Tạo `/` landing page với các sections chuẩn:
  - **Hero**: headline + subtext + CTA buttons + hero image/illustration placeholder
  - **Features**: 3-6 feature cards với icon
  - **How it works**: 3 bước với số + icon
  - **Pricing**: 3 tiers (Free/Pro/Enterprise) — placeholder
  - **FAQ**: accordion component
  - **CTA**: banner kêu gọi đăng ký
  - **Footer**: links + copyright
- Mobile responsive toàn bộ sections
- Smooth scroll to section khi click nav links
- Animations: fade-in khi scroll vào viewport (Intersection Observer, no library)

**Cấu trúc config-driven:**

```typescript
// landing.config.ts — chỉ sửa file này cho mỗi dự án
export const landingConfig = {
  hero: {
    headline: 'Your Awesome Product',
    subtext: 'The best solution for your needs',
    ctaPrimary: { text: 'Get Started Free', href: '/register' },
    ctaSecondary: { text: 'Learn More', href: '#features' },
  },
  features: [
    { icon: Zap, title: 'Fast', description: '...' },
    // ...
  ],
  pricing: [
    /* ... */
  ],
  faq: [
    /* ... */
  ],
};
```

**✅ Test xác nhận:**

```bash
# 1. Truy cập http://localhost:3002
# 2. Tất cả sections hiển thị đúng
# 3. Click nav "Features" → smooth scroll xuống section Features
# 4. Mobile (375px): layout stack, không overflow ngang, text đọc được
# 5. Lighthouse score (DevTools):
#    - Performance: ≥ 85
#    - SEO: ≥ 95
#    - Accessibility: ≥ 90
# 6. View page source → thấy content trong HTML (SSR, không phải client-only)
# 7. Animations: scroll xuống → elements fade-in (không giật trên mobile)
# 8. Pricing section: hover card → highlight effect
# 9. FAQ: click câu hỏi → accordion mở đóng smooth
```

---

## Task 4.6 — Global Error Handling + Loading States

**Mô tả:**  
UX không thể thiếu: loading skeletons, error boundaries, empty states, offline detection. Làm một lần cho cả app.

**Việc cần làm:**

- Tạo `ErrorBoundary` component cho từng route segment
- Tạo global `error.tsx` và `not-found.tsx` với UI đẹp
- Tạo `loading.tsx` template cho từng route segment (Next.js Suspense)
- Tạo `Skeleton` components: `CardSkeleton`, `TableSkeleton`, `ProfileSkeleton`
- Tạo `EmptyState` component (reusable, pass icon + title + description + action)
- Toast system (dùng shadcn Sonner) — setup global, dùng ở mọi nơi
- Offline detection banner: "Mất kết nối. Một số tính năng có thể không hoạt động."

**`EmptyState` component:**

```typescript
<EmptyState
  icon={Users}
  title="No users found"
  description="Try adjusting your search or filter"
  action={{ label: 'Clear filters', onClick: clearFilters }}
/>
```

**✅ Test xác nhận:**

```bash
# 1. Tắt backend, truy cập /dashboard
# - Sau timeout: error state hiển thị "Không thể kết nối đến server"
# - Nút "Thử lại" → spinner → thử kết nối lại

# 2. Truy cập URL không tồn tại: /nonexistent
# - not-found.tsx hiển thị 404 đẹp + nút "Về trang chủ"

# 3. Loading states:
# - Chuyển route → loading.tsx hiển thị skeleton đúng layout
# - Skeleton phải giống shape của content thật (không chỉ là spinner giữa màn)

# 4. Tắt internet (DevTools → Network → Offline)
# - Banner "Mất kết nối" xuất hiện ở top
# - Bật lại internet → banner tự ẩn

# 5. Toast notifications:
# - Mọi action thành công → toast xanh bottom-right
# - Mọi lỗi → toast đỏ
# - Multiple toasts stack đúng cách, không overlap
```

---

## Checklist cập nhật (2026-05-07)

- [x] Task 4.1 Web app scaffold theo App Router + SEO metadata base + `robots.ts` + `sitemap.ts`.
- [x] Task 4.2 Auth pages scaffold (`login`, `register`, `forgot-password`, `reset-password`, `verify-email`).
- [x] Task 4.3 App shell/navigation scaffold (`(app)` layout + nav links).
- [x] Task 4.4 Profile/settings pages scaffold (bao gồm ghi chú `useMediaLibrary=false` cho avatar flow).
- [x] Task 4.5 Landing page scaffold (`hero`, `features`, CTA basic).
- [x] Test đã chạy:
  - [x] `pnpm lint` pass.
  - [x] `pnpm typecheck` pass.
- [ ] Theo chỉ đạo hiện tại: bỏ qua `pnpm install` chi tiết cho phase này; sẽ chạy một lần tổng sau Phase 9.
