# Phase 8 — Frontend Components (Admin & User)

> **Mục tiêu:** Bổ sung 10 components/patterns nâng cao mà 90% dự án đều cần — xây dựng một lần, tái sử dụng mãi.  
> **Lưu ý kiến trúc:** Task `8.2`, `8.6` và `Phase 10.1` có phụ thuộc chặt với `Phase 2.5` theo kiến trúc upload/media thống nhất, không triển khai độc lập.
> **Thời gian ước tính:** 3–4 ngày  
> **Áp dụng cho:** `apps/admin` và `apps/web` (ghi chú rõ từng task)  
> **Prerequisite:** Phase 3 + Phase 4 hoàn thành.

---

## Thứ tự ưu tiên

| Priority | Task | Áp dụng | Lý do |
|----------|------|---------|-------|
| 🔴 P1 | **8.1** `useConfirm()` hook | Admin + Web | Đang dùng nhiều nơi không nhất quán — fix ngay |
| 🔴 P1 | **8.2** File Upload Component | Admin + Web | Mọi dự án đều upload, cần component chuẩn |
| 🔴 P1 | **8.3** Async Combobox | Admin + Web | Select + search API, lặp lại rất nhiều |
| 🔴 P1 | **8.4** Date / Time Picker | Admin + Web | Form nào cũng có date, cần wrapper chuẩn |
| 🟡 P2 | **8.5** Command Palette (Cmd+K) | Admin | DX cực tốt, một lần setup dùng mãi |
| 🟡 P2 | **8.6** Rich Text Editor (Tiptap) | Admin + Web | Mô tả sản phẩm, bài viết, nội dung động |
| 🟡 P2 | **8.7** Export CSV / Excel | Admin | User luôn yêu cầu "tải về" |
| 🟡 P2 | **8.8** Multi-step Form | Admin + Web | Checkout, onboarding, wizard |
| 🟢 P3 | **8.9** Dynamic Breadcrumb | Admin | UX đúng hơn khi hiển thị tên thật |
| 🟢 P3 | **8.10** Image Component | Admin + Web | Wrapper chuẩn cho next/image |

---

## Task 8.1 — `useConfirm()` Hook 🔴 P1

**Mô tả:**  
Thay thế tất cả `window.confirm()` và các confirm dialog tự phát tán rải rác bằng một hook duy nhất. Gọi `await confirm(...)` ở bất kỳ đâu, dialog đẹp hiện ra, trả về `true/false`. Không cần truyền `isOpen` state, không cần import modal component.

**Áp dụng cho:** `apps/admin`, `apps/web`

**Việc cần làm:**
- Tạo `ConfirmProvider` bọc ở root layout
- Tạo `useConfirm` hook trả về async function
- Component `ConfirmDialog` với các variants: `danger`, `warning`, `info`
- Hỗ trợ custom title, description, confirm button label, loading state

**`hooks/useConfirm.ts`:**
```typescript
// API sử dụng — cực kỳ đơn giản
const confirm = useConfirm();

// Dùng ở bất kỳ đâu trong component
const handleDelete = async (userId: string) => {
  const ok = await confirm({
    title: 'Xóa người dùng?',
    description: 'Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa vĩnh viễn.',
    confirmLabel: 'Xóa',
    variant: 'danger',
  });
  if (!ok) return;
  await deleteUser(userId);
  toast.success('Đã xóa thành công');
};
```

**Implementation — Promise resolver pattern:**
```typescript
type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
};

// Context lưu một Promise resolver
const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(null!);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleConfirm = () => { state?.resolve(true);  setState(null); };
  const handleCancel  = () => { state?.resolve(false); setState(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmDialog
          open={state.open}
          options={state.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
```

**Variants:**
```
danger  → icon Trash, nút đỏ   → dùng cho xóa, hành động không hoàn tác
warning → icon Alert, nút vàng → dùng cho vô hiệu hóa, thay đổi quan trọng
info    → icon Info, nút xanh  → dùng cho xác nhận thông thường
```

**Thêm vào root layout:**
```typescript
// apps/admin/src/app/layout.tsx
<Providers>
  <ConfirmProvider>
    {children}
  </ConfirmProvider>
</Providers>
```

**✅ Test xác nhận:**
```bash
# 1. Xóa user trong DataTable → variant "danger"
# → Dialog đẹp xuất hiện, nút Xóa màu đỏ
# → Cancel → không có gì xảy ra
# → Confirm → user bị xóa, toast success

# 2. Loading state
# → Nhấn Confirm → button hiển thị spinner, disabled
# → Không nhấn lại được trong khi đang xử lý

# 3. Escape key → dialog đóng, action không thực thi

# 4. Verify không còn window.confirm() trong codebase
grep -r "window.confirm" apps/admin/src apps/web/src
# Không có output
```

---

## Task 8.2 — File Upload Component 🔴 P1

**Mô tả:**  
Component upload đa năng: drag & drop, click to browse, multi-file, preview, progress bar, validate type/size, tích hợp sẵn với API upload ở Phase 2. Dùng được cho cả ảnh lẫn file tài liệu.

**Áp dụng cho:** `apps/admin`, `apps/web`

**Việc cần làm:**
- Tạo `FileUpload` component với 2 variants: `image` và `file`
- Tạo `AvatarUpload` component (extends FileUpload, thêm crop)
- Tích hợp với `POST /api/upload/image` và `POST /api/upload/file`
- Bắt buộc dùng type `UploadResult` từ `@repo/types` (không tự define local type)
- Thêm prop `useMediaLibrary?: boolean` (default `false`)
- Khi `useMediaLibrary=true`: gọi `GET /api/media/status` để feature-detect, sau đó mở `MediaPickerModal` nếu package đã cài
- Hỗ trợ: drag & drop, multi-file, progress per file, retry khi lỗi
- Validate: MIME type whitelist, max size, max files count
- Preview: ảnh → thumbnail, file → icon + tên + size
- Cài `react-easy-crop` cho avatar crop (tỉ lệ 1:1, output 400×400 WebP)

**API component:**
```typescript
// Image upload với preview
<FileUpload
  variant="image"
  useMediaLibrary
  accept={['image/jpeg', 'image/png', 'image/webp']}
  maxSize={10 * 1024 * 1024}   // 10MB
  maxFiles={5}
  onUpload={(files) => setValue('images', files)}
  // files: UploadResult[]
/>

// File upload (PDF, docs)
<FileUpload
  variant="file"
  accept={['application/pdf', '.docx', '.xlsx']}
  maxSize={50 * 1024 * 1024}
  maxFiles={3}
  onUpload={(files) => setValue('attachments', files)}
/>

// Avatar với crop
<AvatarUpload
  currentAvatar={user.avatar}
  onUpload={(file) => updateAvatar(file.url)}
/>
```

**File states:**
```typescript
type FileStatus = 'idle' | 'uploading' | 'success' | 'error';

type UploadFile = {
  id: string;
  file: File;
  preview?: string;      // object URL cho ảnh
  progress: number;      // 0–100
  status: FileStatus;
  error?: string;
  result?: UploadResult; // sau khi upload thành công
};
```

**UI States:**
```
Idle (drop zone):
┌─────────────────────────────────────┐
│  ☁  Kéo thả file vào đây           │
│     hoặc  [Chọn file]              │
│     PNG, JPG, WebP · Tối đa 10MB   │
└─────────────────────────────────────┘

Uploading:
[thumb]  ████░░  45%     [thumb]  ██████░  78%

Success:
[thumb]  ✓ Xong  [×]

Error:
[thumb]  ✕ Lỗi upload  [Thử lại] [×]
```

**✅ Test xác nhận:**
```bash
# 1. Drag & drop ảnh → preview ngay → progress bar → done → URL trả về
# 2. Multi-file: upload 3 ảnh cùng lúc → progress riêng từng file
# 3. Type không hợp lệ → "Loại file không được phép", drop zone vẫn hoạt động
# 4. File > 10MB → "File quá lớn. Tối đa 10MB"
# 5. Retry: tắt backend → upload → lỗi → [Thử lại] → bật backend → thành công
# 6. AvatarUpload: chọn ảnh → crop modal → zoom/drag → Confirm → preview cập nhật
# 7. React Hook Form: submit → value là mảng UploadResult đúng kiểu
# 8. useMediaLibrary=true + package đã cài → click mở MediaPickerModal (không mở file picker OS)
# 9. useMediaLibrary=true + package chưa cài → fallback upload thường qua Upload API
```

---

## Task 8.3 — Async Combobox 🔴 P1

**Mô tả:**  
Select component với search realtime gọi API. Pattern này xuất hiện ở mọi nơi: chọn user, chọn category, chọn sản phẩm, assign task. Làm đúng một lần để không viết lại cho từng màn hình.

**Áp dụng cho:** `apps/admin`, `apps/web`

**Việc cần làm:**
- Tạo `AsyncCombobox<T>` component generic
- Debounce search 300ms, cache kết quả bằng TanStack Query
- Hỗ trợ: single select, multi-select, creatable (tạo option mới)
- Keyboard navigation đầy đủ (arrow, enter, escape, backspace)
- Loading skeleton, empty state, error state
- Tích hợp với react-hook-form qua `Controller`

**API component:**
```typescript
// Single select — chọn user
<AsyncCombobox<User>
  placeholder="Tìm người dùng..."
  queryFn={(search) => api.get('/users', { params: { search } })}
  getOptionLabel={(user) => user.name}
  getOptionValue={(user) => user.id}
  renderOption={(user) => (
    <div className="flex items-center gap-2">
      <Avatar src={user.avatar} name={user.name} size="sm" />
      <div>
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )}
  onChange={(user) => setValue('assignedTo', user?.id)}
/>

// Multi-select creatable — chọn tags
<AsyncCombobox<Tag>
  multiple
  creatable
  placeholder="Thêm tags..."
  queryFn={(search) => api.get('/tags', { params: { search } })}
  getOptionLabel={(tag) => tag.name}
  getOptionValue={(tag) => tag.id}
  onCreateOption={(name) => createTag(name)}
  onChange={(tags) => setValue('tags', tags.map(t => t.id))}
/>
```

**UI States:**
```
Closed:   [Tìm người dùng...              ▼]

Loading:  [john                           ×]
          ┌─────────────────────────────────┐
          │  ░░░░░░░░░░░░  đang tìm...      │
          └─────────────────────────────────┘

Results:  [john                           ×]
          ┌─────────────────────────────────┐
          │ ▶ [av] John Doe                 │  ← highlighted
          │        john@example.com         │
          │   [av] John Smith               │
          └─────────────────────────────────┘

Multi:    [John Doe ×] [Jane ×] [        ▼]

Creatable (no match):
          ┌─────────────────────────────────┐
          │   + Tạo "New Tag"               │
          └─────────────────────────────────┘
```

**✅ Test xác nhận:**
```bash
# 1. Gõ 3 ký tự → debounce 300ms → 1 API call (không spam)
# 2. Arrow down/up + Enter để chọn option
# 3. Escape → đóng dropdown
# 4. Multi: Backspace khi input trống → xóa chip cuối
# 5. Creatable: gõ text không có trong kết quả → xuất hiện "+ Tạo ..."
# 6. Cache: gõ "john" → xóa → gõ lại "john" → từ cache, không fetch lại
# 7. React Hook Form: validate required → error hiển thị dưới combobox
```

---

## Task 8.4 — Date / Time Picker 🔴 P1

**Mô tả:**  
Wrapper chuẩn cho `react-day-picker` với đầy đủ variants: date only, time only, datetime, date range. Timezone aware, localization tiếng Việt, tích hợp react-hook-form.

**Áp dụng cho:** `apps/admin`, `apps/web`

**Việc cần làm:**
- Tạo `DatePicker`, `TimePicker`, `DateTimePicker`, `DateRangePicker`
- Locale tiếng Việt (`vi` từ `date-fns/locale`)
- Timezone: hiển thị theo `Asia/Ho_Chi_Minh`, lưu UTC về DB
- Preset ranges: Hôm nay, 7 ngày qua, 30 ngày qua, Tháng này, Năm nay
- Min/max date constraint, keyboard input (gõ ngày trực tiếp)
- Tích hợp react-hook-form qua `Controller`

**API component:**
```typescript
// Date only
<DatePicker
  value={date}
  onChange={(date) => setValue('publishAt', date)}
  minDate={new Date()}
  placeholder="Chọn ngày..."
/>

// DateTime với timezone
<DateTimePicker
  value={datetime}
  onChange={(dt) => setValue('scheduledAt', dt)}
  timezone="Asia/Ho_Chi_Minh"
  // Lưu UTC, hiển thị: "15/01/2025 09:30"
/>

// Date range với presets
<DateRangePicker
  value={{ from: startDate, to: endDate }}
  onChange={({ from, to }) => setDateRange({ from, to })}
  presets={[
    { label: 'Hôm nay',     getValue: () => ({ from: today, to: today }) },
    { label: '7 ngày qua',  getValue: () => ({ from: sub(today,{days:7}), to: today }) },
    { label: '30 ngày qua', getValue: () => ({ from: sub(today,{days:30}), to: today }) },
    { label: 'Tháng này',   getValue: () => ({ from: startOfMonth(today), to: today }) },
  ]}
/>
```

**UI DateRangePicker với presets:**
```
┌──────────────────────────────────────────────────────┐
│  Presets          │    Tháng 1 2025  │  Tháng 2 2025 │
│  ─────────────    │  T2 T3 T4 T5 T6  │  T2 T3 T4 T5  │
│  Hôm nay          │   1  2  3  4  5  │               │
│  7 ngày qua    ●  │   6  7  8  9 10  │               │
│  30 ngày qua      │  [13 14 15 16 17]│               │
│  Tháng này        │  [20 21 22 23 24]│               │
│                   │  [27 28 29 30 31]│               │
└──────────────────────────────────────────────────────┘
                    [Hủy]  [Áp dụng: 13/01 – 19/01]
```

**✅ Test xác nhận:**
```bash
# 1. DatePicker: click → calendar → chọn ngày → value cập nhật, popup đóng
# 2. Gõ trực tiếp: "15/01/2025" → parse đúng
# 3. DateRangePicker: preset "7 ngày qua" → from/to đúng → Áp dụng
# 4. DateTimePicker: value là ISO UTC, hiển thị GMT+7
# 5. minDate: ngày trước hôm nay mờ, không click được
# 6. Locale: "Tháng 1", "Th 2", "Th 3"... "CN"
# 7. Form validation: required chưa chọn → "Vui lòng chọn ngày"
```

---

## Task 8.5 — Command Palette (Cmd+K) 🟡 P2

**Mô tả:**  
Tìm kiếm nhanh, navigate, thực hiện actions bằng bàn phím. Đây là tính năng phân biệt admin tool chuyên nghiệp. Gõ `Cmd+K` → tìm bất kỳ trang, user, action nào trong tích tắc.

**Áp dụng cho:** `apps/admin`

**Việc cần làm:**
- Cài `cmdk` library
- Global shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- Groups: Điều hướng, Hành động, Người dùng (API), Truy cập gần đây
- Search static commands + dynamic API search (merge kết quả)
- Keyboard: arrow navigation, Enter execute, Escape close
- Recent searches lưu localStorage (tối đa 5 items)

**`commands.config.ts`:**
```typescript
export const staticCommands: Command[] = [
  // Navigation
  { id: 'nav-dashboard', group: 'Điều hướng', label: 'Dashboard',
    icon: LayoutDashboard, shortcut: ['G','D'],
    action: (router) => router.push('/dashboard') },
  { id: 'nav-users', group: 'Điều hướng', label: 'Quản lý người dùng',
    icon: Users, action: (router) => router.push('/users') },

  // Quick Actions
  { id: 'create-user', group: 'Hành động', label: 'Tạo người dùng mới',
    icon: UserPlus, shortcut: ['C','U'],
    action: () => openCreateUserModal() },
  { id: 'toggle-theme', group: 'Hành động', label: 'Đổi giao diện tối/sáng',
    icon: Moon, action: () => toggleTheme() },
  { id: 'logout', group: 'Tài khoản', label: 'Đăng xuất',
    icon: LogOut, action: () => logout() },
];
```

**Dynamic search (static + API):**
```typescript
// Gõ ≥ 2 ký tự → search API đồng thời filter static commands
const { data: userResults } = useQuery({
  queryKey: ['cmd-search', query],
  queryFn: () => api.get('/users', { params: { search: query, limit: 5 } }),
  enabled: query.length >= 2,
  staleTime: 30_000,
});
// Map user results thành Command objects với action navigate /users/:id
```

**UI:**
```
┌──────────────────────────────────────────────────┐
│ 🔍  Tìm kiếm...                                  │
├──────────────────────────────────────────────────┤
│ ĐIỀU HƯỚNG                                       │
│  ▶ 🏠 Dashboard                        G D       │
│    👥 Quản lý người dùng                        │
├──────────────────────────────────────────────────┤
│ HÀNH ĐỘNG                                        │
│    ➕ Tạo người dùng mới               C U       │
│    🌙 Đổi giao diện tối/sáng                    │
├──────────────────────────────────────────────────┤
│ TRUY CẬP GẦN ĐÂY                                │
│    📄 /users/John Doe                           │
└──────────────────────────────────────────────────┘
         ↑↓ điều hướng   ↵ mở   esc đóng
```

**✅ Test xác nhận:**
```bash
# 1. Cmd+K → palette mở, focus vào input
# 2. Gõ "user" → filter đúng commands
# 3. Gõ "jo" → sau 300ms → user "John Doe" xuất hiện từ API
# 4. Arrow + Enter → execute action → palette đóng
# 5. Shortcut "G" rồi "D" (trong 1s) → navigate /dashboard
# 6. Escape → đóng, focus về vị trí trước
# 7. Recent: vào /users/123 → mở palette → thấy trong "Gần đây"
# 8. Click ngoài → đóng palette
```

---

## Task 8.6 — Rich Text Editor (Tiptap) 🟡 P2

**Mô tả:**  
Editor WYSIWYG cho nội dung dài: mô tả sản phẩm, bài viết, email template. Tiptap headless, TypeScript native, extensible. Output HTML lưu DB và render an toàn qua DOMPurify.

**Áp dụng cho:** `apps/admin`, `apps/web`

**Việc cần làm:**
- Cài Tiptap + extensions cần thiết
- Tạo `RichTextEditor` với toolbar đầy đủ
- Tạo `RichTextDisplay` sanitize HTML trước khi render (chống XSS)
- Drag/Paste ảnh vào editor → auto upload qua Upload API (không mở modal)
- Click nút `[🖼]` trên toolbar → mở `MediaPickerModal` (nếu có), fallback file picker nếu package chưa cài
- Lưu `mediaId` từ `UploadResult.id` vào attribute ảnh để phục vụ usage tracking
- Character count, max length
- Dark mode compatible, tích hợp react-hook-form

**Dependencies:**
```bash
pnpm add @tiptap/react @tiptap/starter-kit \
  @tiptap/extension-image @tiptap/extension-link \
  @tiptap/extension-placeholder @tiptap/extension-character-count \
  @tiptap/extension-color @tiptap/extension-text-style \
  @tiptap/extension-underline @tiptap/extension-table \
  @tiptap/extension-code-block-lowlight lowlight \
  dompurify @types/dompurify
```

**API component:**
```typescript
// Full editor (bài viết, mô tả)
<RichTextEditor
  value={content}
  onChange={(html) => setValue('description', html)}
  placeholder="Nhập mô tả..."
  maxLength={10000}
  showCharCount
/>

// Compact (comment, ghi chú — toolbar ẩn, hiện khi focus)
<RichTextEditor
  variant="compact"
  value={note}
  onChange={setNote}
  placeholder="Ghi chú..."
/>
```

**Toolbar:**
```
[B] [I] [U] [~~] | [H1] [H2] [H3] | [• ] [1.] [❝] [<>] |
[🔗] [🖼] [⊞] | [↩] [↪]              Ký tự: 245 / 10000
```

**Upload ảnh trong editor:**
```typescript
// Drag & drop ảnh vào editor → upload MinIO → insert <img src="...">
// Paste từ clipboard → tương tự
// Click [🖼] button → MediaPickerModal (browse + upload) → insert
// Hiển thị placeholder "Đang tải..." trong khi upload
```

**`RichTextDisplay` — render an toàn:**
```typescript
import DOMPurify from 'dompurify';

export function RichTextDisplay({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p','br','strong','em','u','s','h1','h2','h3',
                   'ul','ol','li','blockquote','code','pre','a',
                   'img','table','thead','tbody','tr','th','td'],
    ALLOWED_ATTR: ['href','src','alt','class','target'],
  });
  return (
    <div
      className="prose dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

**✅ Test xác nhận:**
```bash
# 1. Toolbar hiển thị đúng, click Bold → text in đậm
# 2. Link: chọn text → [🔗] → nhập URL → Enter → hyperlink tạo thành công
# 3. Image upload: drag ảnh vào → spinner → ảnh xuất hiện trong editor
# 4. Paste ảnh từ clipboard → tự upload → insert
# 5. maxLength 10000: đến giới hạn → không gõ thêm được
# 6. Dark mode: toggle → editor đổi theme đúng
# 6.1 Click [🖼] toolbar khi media-library đã cài → mở MediaPickerModal
# 6.2 Drag/paste không bao giờ mở modal, luôn auto-upload
# 7. XSS test: lưu content chứa <script>alert('xss')</script>
#    → RichTextDisplay render → không có alert (bị DOMPurify strip)
# 8. React Hook Form: submit → value là HTML string đầy đủ
```

---

## Task 8.7 — Export CSV / Excel 🟡 P2

**Mô tả:**  
Tính năng "Tải về" mà user nào cũng sẽ yêu cầu. Export toàn bộ data (không chỉ trang hiện tại) hoặc export rows đã select. Excel có style header, format cột đúng kiểu.

**Áp dụng cho:** `apps/admin`

**Việc cần làm:**
- Cài `xlsx` (SheetJS)
- Tạo `useExport` hook nhận column definitions + async data fetcher
- Tích hợp vào `DataTable` — thêm button `[↓ Export]` trên toolbar
- 2 formats: CSV (plain) và Excel (.xlsx có style)
- Export all: fetch toàn bộ pages trước khi export
- Export selection: chỉ export rows đã chọn
- Progress indicator khi > 500 rows
- Tên file tự động: `users-export-2025-01-15.xlsx`

**Tích hợp vào DataTable:**
```typescript
<DataTable
  columns={columns}
  queryFn={fetchUsers}
  exportConfig={{
    filename: 'users',
    columns: [
      { key: 'name',      label: 'Họ tên' },
      { key: 'email',     label: 'Email' },
      { key: 'role',      label: 'Vai trò' },
      { key: 'status',    label: 'Trạng thái' },
      { key: 'createdAt', label: 'Ngày tạo',
        format: (v) => format(new Date(v), 'dd/MM/yyyy') },
    ],
  }}
/>
// → Xuất hiện [↓ Export ▾] button trên toolbar DataTable
// → Dropdown: "Tải CSV" | "Tải Excel" | "Xuất trang này" | "Xuất tất cả"
```

**`useExport` hook:**
```typescript
const { exportCsv, exportExcel, isExporting, progress } = useExport({
  filename: 'users',
  fetchAll: () => api.get('/users', { params: { limit: 10000 } }),
  columns: exportColumns,
});
```

**Excel output style:**
```
Row 1 (header): background xanh đậm (#1e40af), chữ trắng, in đậm
Row 2+ (data):  xen kẽ trắng / xám nhạt (#f8fafc)
Cột ngày:       format "dd/MM/yyyy"
Cột số tiền:    number format "1,234,567"
Column width:   auto-fit theo nội dung (min 10, max 40 chars)
Freeze row 1:   header cố định khi cuộn
```

**✅ Test xác nhận:**
```bash
# 1. Click [↓ Export] → dropdown 4 options
# 2. "Tải CSV" → file .csv download, mở bằng Excel → data đúng, headers đúng
# 3. "Tải Excel" → .xlsx với header màu xanh, rows xen kẽ, cột ngày format đúng
# 4. "Xuất trang này" → chỉ N rows đang hiển thị
# 5. "Xuất tất cả" (150 records, đang xem page 1):
#    → Progress "Đang tải dữ liệu... 45%" → file có đủ 150 rows
# 6. Select 3 rows → Export → dropdown thêm option "Xuất X đã chọn"
#    → File chỉ có 3 rows
# 7. Button disabled + spinner khi đang export
```

---

## Task 8.8 — Multi-step Form 🟡 P2

**Mô tả:**  
Pattern form nhiều bước tái sử dụng: checkout, onboarding user mới, wizard setup. Validate từng bước, lưu draft localStorage, back/forward không mất data, progress indicator, review step cuối.

**Áp dụng cho:** `apps/admin`, `apps/web`

**Việc cần làm:**
- Tạo `MultiStepForm` component wrapper
- Tạo `useMultiStepForm` hook quản lý state, navigation, draft
- Step indicator (circle + line) + progress bar
- Validate chỉ fields của step hiện tại trước khi Next
- Auto-save draft vào localStorage (optional, tắt được)
- Animated transition (slide) giữa các steps
- Review step tự động render summary + nút "Sửa" từng section

**`useMultiStepForm` hook:**
```typescript
const {
  currentStep,  // index hiện tại (0-based)
  totalSteps,
  isFirstStep,
  isLastStep,
  next,         // async: trigger validation → next nếu pass
  back,
  goTo,         // jump đến step đã completed
  progress,     // 0–100
  stepStatus,   // Record<number, 'pending'|'completed'|'error'>
} = useMultiStepForm({ steps, form, draftKey: 'onboarding-draft' });
```

**Step definition:**
```typescript
const steps: Step[] = [
  {
    id: 'personal',
    title: 'Thông tin cá nhân',
    icon: User,
    fields: ['name', 'birthday', 'phone'],  // fields cần validate ở bước này
    component: <PersonalInfoStep />,
  },
  {
    id: 'company',
    title: 'Thông tin công ty',
    icon: Building,
    fields: ['companyName', 'address'],
    component: <CompanyInfoStep />,
  },
  {
    id: 'review',
    title: 'Xác nhận',
    icon: CheckCircle,
    component: <ReviewStep />,  // tự động nhận values + goTo function
  },
];
```

**Step indicator UI:**
```
●─────────●─────────○
①         ②         ③
Hoàn thành Active   Chờ

Progress bar: ██████████░░░░░░  66%
```

**Review step tự động:**
```typescript
// Step cuối render summary từ form values
// Mỗi section có nút "Sửa" → goTo(stepIndex)
<ReviewSection title="Thông tin cá nhân" onEdit={() => goTo(0)}>
  <ReviewField label="Họ tên"    value={values.name} />
  <ReviewField label="Ngày sinh" value={format(values.birthday, 'dd/MM/yyyy')} />
  <ReviewField label="SĐT"       value={values.phone} />
</ReviewSection>
```

**✅ Test xác nhận:**
```bash
# 1. Step indicator: ●─○─○ (step 1 active), progress: 33%
# 2. Next khi chưa điền → validation errors đúng fields, không sang step 2
# 3. Điền đúng step 1 → Next → animate slide sang step 2 → indicator ●─●─○
# 4. Back → data step 2 giữ nguyên
# 5. Reload trang giữa chừng → restore draft từ localStorage
#    → Toast "Tiếp tục từ bản nhánh trước" + nút [Bắt đầu lại]
# 6. Review step: hiển thị tất cả data → click "Sửa" → jump đúng step
# 7. Submit ở step cuối → loading → success state / redirect
```

---

## Task 8.9 — Dynamic Breadcrumb 🟢 P3

**Mô tả:**  
Breadcrumb hiện tại generate từ URL path nên hiển thị ID thô (`/users/abc123`). Task này resolve tên thật từ API để hiển thị: `Users / John Doe`. Cache kết quả, skeleton khi đang resolve.

**Áp dụng cho:** `apps/admin`

**Việc cần làm:**
- Tạo `BreadcrumbResolver` registry — map route pattern → fetch function
- Tạo `useDynamicBreadcrumb` hook tự resolve các dynamic segments
- Cache bằng TanStack Query (staleTime: 5 phút)
- Skeleton loading cho segment đang fetch
- Fallback: hiển thị ID nếu fetch lỗi

**`breadcrumb.config.ts`:**
```typescript
// Đăng ký resolver cho từng resource — chỉ sửa file này khi thêm resource mới
export const breadcrumbResolvers: BreadcrumbResolvers = {
  '/users/:id':   (id) => api.get(`/users/${id}`).then(r => r.data.data.name),
  '/posts/:id':   (id) => api.get(`/posts/${id}`).then(r => r.data.data.title),
  '/orders/:id':  (id) => api.get(`/orders/${id}`).then(r => r.data.data.code),
};

// Static label overrides (không cần fetch)
export const breadcrumbLabels: Record<string, string> = {
  users:     'Người dùng',
  posts:     'Bài viết',
  orders:    'Đơn hàng',
  settings:  'Cài đặt',
  dashboard: 'Dashboard',
};
```

**Output:**
```
URL: /users/abc123/orders/xyz789

Loading:  Dashboard  >  Người dùng  >  ░░░░░░░░  >  Đơn hàng  >  ░░░░░░░
Resolved: Dashboard  >  Người dùng  >  John Doe  >  Đơn hàng  >  #ORD-001

Mỗi segment là link clickable (trừ segment cuối)
```

**✅ Test xác nhận:**
```bash
# 1. Truy cập /users/abc123
# → Skeleton ngắn → "Dashboard > Người dùng > John Doe"

# 2. Segment không có resolver → hiển thị capitalize slug
# → /settings/security → "Dashboard > Cài đặt > Security"

# 3. Fetch lỗi → fallback hiển thị ID gốc ("abc123")

# 4. Cache: navigate về /users → quay lại /users/abc123
# → "John Doe" hiển thị ngay (không thấy skeleton lần 2)

# 5. Breadcrumb links clickable
# → Click "Người dùng" → navigate /users
```

---

## Task 8.10 — Image Component 🟢 P3

**Mô tả:**  
Wrapper chuẩn cho `next/image` với fallback xử lý ảnh lỗi, blur placeholder, lazy load. `Avatar` component với initials fallback màu deterministic. Không còn broken image icon hay code xử lý lỗi ảnh rải rác.

**Áp dụng cho:** `apps/admin`, `apps/web`

**Việc cần làm:**
- Tạo `AppImage` — wrapper `next/image` với error fallback và blur placeholder
- Tạo `Avatar` — circular/square, src hoặc initials fallback, 6 sizes
- Màu avatar deterministic từ tên (hash) — cùng tên luôn cùng màu
- Tạo `ProductImage` — aspect ratio cố định, skeleton loading

**`Avatar` component:**
```typescript
<Avatar
  src={user.avatar}          // nếu null/undefined/lỗi → dùng initials
  name={user.name}           // "John Doe" → "JD"
  size="md"                  // xs(24) sm(32) md(40) lg(56) xl(80) 2xl(112)
  shape="circle"             // circle | square (rounded-lg)
  className="ring-2 ring-white"
/>
```

**Deterministic color từ tên:**
```typescript
const AVATAR_COLORS = [
  { bg: '#EEF2FF', text: '#3730A3' }, // indigo
  { bg: '#F0FDF4', text: '#166534' }, // green
  { bg: '#FFF7ED', text: '#9A3412' }, // orange
  { bg: '#FDF4FF', text: '#7E22CE' }, // purple
  { bg: '#FFF1F2', text: '#9F1239' }, // rose
  { bg: '#F0F9FF', text: '#0369A1' }, // sky
];

// Hash từ name → index ổn định
function getAvatarColor(name: string) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
// "John Doe" → luôn indigo, mọi nơi trong app
```

**`AppImage` component:**
```typescript
<AppImage
  src={product.thumbnail}
  alt={product.name}
  width={400}
  height={300}
  fallback="/images/placeholder.png"  // hiện khi src lỗi
  className="rounded-lg object-cover"
  // Auto: blur placeholder (base64), lazy load, error handling
/>
```

**Avatar group (xếp chồng):**
```typescript
// Dùng cho "assigned to" hiển thị nhiều user
<AvatarGroup
  users={[user1, user2, user3, user4, user5]}
  max={3}
  size="sm"
/>
// → [av1][av2][av3][+2]  (overlap với ring trắng)
```

**✅ Test xác nhận:**
```bash
# 1. Avatar với src hợp lệ → hiển thị ảnh
# 2. Avatar không có src → initials "JD" với màu background
# 3. Avatar src lỗi 404 → onError → fallback sang initials (không broken icon)
# 4. Deterministic: "John Doe" luôn indigo ở mọi component, mọi trang
# 5. AppImage lazy load:
#    → Network tab → scroll xuống → ảnh mới load khi vào viewport
# 6. AppImage src lỗi → hiển thị fallback image đẹp
# 7. Blur placeholder: ảnh mờ trước khi load, rõ sau (smooth transition)
# 8. AvatarGroup 5 users, max=3 → [av][av][av][+2]
```

---

## Checklist Hoàn thành Phase 8

```
P1 — Foundations
☑ useConfirm(): không còn window.confirm() nào trong codebase
☑ FileUpload: drag & drop + multi-file + progress + retry hoạt động
☑ AvatarUpload: crop + upload + preview đúng
☑ AsyncCombobox: debounce + cache + multi-select + creatable hoạt động
☑ DatePicker: locale vi + timezone + date range + preset hoạt động

P2 — Power Features
☑ Command Palette: Cmd+K → search → navigate / execute action
☑ RichTextEditor: format text + upload ảnh trong editor
☑ RichTextDisplay: DOMPurify sanitize → không XSS
☑ Export: CSV + Excel (có style) + export all pages + export selection
☑ MultiStepForm: validate per step + draft restore + review step

P3 — Polish
☑ Breadcrumb: hiển thị tên thật thay vì ID, skeleton khi loading
☑ Avatar: initials fallback + deterministic color + AvatarGroup
☑ AppImage: lazy load + blur placeholder + error fallback

Integration (tất cả components)
☑ Tích hợp được với react-hook-form (Controller)
☑ Hỗ trợ dark mode
☑ Responsive trên mobile 375px
☑ Không throw unhandled error khi props bị thiếu/sai kiểu
☑ Có TypeScript types đầy đủ, không dùng any
```
