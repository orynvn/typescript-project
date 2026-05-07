# Phase 3 — Admin Frontend (Next.js)

> **Mục tiêu:** Portal quản trị hoàn chỉnh với layout chuẩn, generic CRUD table, và auth flow — dùng được ngay cho mọi dự án không cần thiết kế lại.  
> **Thời gian ước tính:** 3–4 ngày  
> **Prerequisite:** Phase 2 hoàn thành, backend đang chạy tại `:3000`.

---

## Task 3.1 — Khởi tạo Next.js App + Dependencies

**Mô tả:**  
Bootstrap admin app với đầy đủ dependencies và cấu hình chuẩn. Quan trọng là thiết lập đúng từ đầu để tránh refactor sau.

**Việc cần làm:**
- Tạo Next.js 14 App Router trong `apps/admin`
- Cài dependencies:
  ```
  @tanstack/react-query @tanstack/react-query-devtools
  zustand
  axios
  shadcn/ui (CLI init)
  recharts
  react-hook-form @hookform/resolvers zod
  next-themes
  lucide-react
  date-fns
  ```
- Cấu hình `next.config.js` với rewrites proxy tới backend
- Cấu hình path alias `@/*` trỏ tới `src/*`
- Setup TanStack Query provider (với devtools trong dev mode)
- Setup Zustand store structure

**Cấu trúc thư mục `apps/admin/src/`:**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   ├── users/[id]/page.tsx
│   │   └── layout.tsx         ← sidebar + header
│   └── layout.tsx             ← root: providers, theme
├── components/
│   ├── ui/                    ← shadcn components
│   ├── layout/                ← Sidebar, Header, Breadcrumb
│   ├── data-table/            ← Generic CRUD table
│   └── forms/                 ← Reusable form components
├── lib/
│   ├── api.ts                 ← axios instance + interceptors
│   ├── query-client.ts        ← TanStack Query config
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   └── usePagination.ts
├── stores/
│   └── auth.store.ts          ← Zustand auth store
└── types/
    └── index.ts               ← re-export từ @repo/types
```

**✅ Test xác nhận:**
```bash
cd apps/admin && pnpm dev
# Server khởi động tại http://localhost:3001

# Truy cập http://localhost:3001
# Redirect sang /login (chưa có token)

# Test proxy tới backend
curl http://localhost:3001/api/health
# Nhận response từ backend (thông qua Next.js rewrite)
```

---

## Task 3.2 — Auth Flow + Route Protection

**Mô tả:**  
Auth flow hoàn chỉnh: login → lưu token → redirect dashboard → auto refresh khi hết hạn → logout. Route guard tự động redirect nếu chưa đăng nhập hoặc không đủ quyền.

**Việc cần làm:**
- Tạo `AuthStore` (Zustand) lưu user info + token state
- Tạo `axios instance` với interceptors:
  - Request: đính kèm `Authorization: Bearer <token>`
  - Response: 401 → auto call refresh → retry request gốc → nếu refresh fail → logout
- Tạo `AuthProvider` component kiểm tra session khi app load
- Tạo middleware Next.js bảo vệ routes
- Tạo trang `/login` với form (react-hook-form + zod)
- Lưu `accessToken` trong memory (Zustand), `refreshToken` trong httpOnly cookie (set bởi backend)

**`stores/auth.store.ts`:**
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setUser: (user: User) => void;
}
```

**`middleware.ts` — route protection:**
```typescript
// Public routes: /login
// Protected routes: mọi thứ còn lại
// Admin-only routes: /users, /settings → check role từ token
export function middleware(request: NextRequest) {
  // Verify token (JWT decode, không cần gọi API)
  // Redirect về /login nếu không có token
  // Redirect về /dashboard nếu đã login mà vào /login
  // Redirect về /403 nếu không đủ role
}
```

**✅ Test xác nhận:**
```bash
# 1. Truy cập http://localhost:3001/dashboard khi chưa login
# → Redirect tự động về /login

# 2. Login với admin credentials
# → Redirect về /dashboard
# → Header hiển thị tên user

# 3. Refresh trang → vẫn còn logged in (token được restore)

# 4. Mở DevTools → Application → Cookies
# → refreshToken cookie: HttpOnly = true, Secure = false (dev)
# → Không thấy accessToken trong localStorage hay cookies (lưu trong memory)

# 5. Đợi access token hết hạn (hoặc xóa thủ công trong Zustand)
# → Gọi bất kỳ API nào
# → Tự động refresh và gọi lại thành công, user không thấy gì

# 6. Logout
# → Token bị revoke ở backend
# → Redirect về /login
# → Truy cập /dashboard → redirect /login (không thể dùng token cũ)
```

---

## Task 3.3 — Admin Layout (Sidebar + Header + Breadcrumb)

**Mô tả:**  
Layout chuẩn cho toàn bộ admin portal. Chỉ cần config `navItems` là sidebar tự render đúng theo cấu trúc menu của từng dự án.

**Việc cần làm:**
- Tạo `AdminLayout` component bao gồm Sidebar + Header + main content area
- Sidebar: collapsible, highlight active route, group items có thể config
- Header: breadcrumb tự động, user dropdown (profile + logout), notification bell
- Responsive: sidebar collapse thành icon trên mobile
- Dark mode toggle (next-themes)
- Breadcrumb tự động generate từ current path

**`nav-items.config.ts` — cách config menu:**
```typescript
export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'User Management',
    icon: Users,
    children: [
      { title: 'All Users', href: '/users' },
      { title: 'Roles', href: '/roles' },
    ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: [UserRole.SUPER_ADMIN], // chỉ hiện với role này
  },
];
// Chỉ cần sửa file này cho từng dự án
```

**✅ Test xác nhận:**
```bash
# Truy cập http://localhost:3001/dashboard sau khi login

# 1. Sidebar hiển thị đúng các menu items
# 2. Click menu item → active state highlight đúng
# 3. Breadcrumb hiển thị đúng: Dashboard > Users > [Name]
# 4. Click collapse button → sidebar thu nhỏ thành icons
# 5. Toggle dark mode → toàn bộ UI đổi theme ngay lập tức
# 6. User dropdown → hiển thị tên + email + role
# 7. Logout từ dropdown → redirect /login

# Resize browser xuống mobile width (< 768px)
# Sidebar tự động collapse, có button để mở
```

---

## Task 3.4 — Generic Data Table Component

**Mô tả:**  
Component table mạnh nhất của toàn bộ template. Truyền vào columns config + API endpoint là có ngay table với filter, sort, pagination, bulk action. Đây là thứ tiết kiệm nhiều giờ nhất mỗi dự án.

**Việc cần làm:**
- Tạo `DataTable<T>` component generic với TanStack Table
- Hỗ trợ:
  - Column definition với type-safe header + cell renderer
  - Search/filter real-time (debounce 300ms)
  - Sort theo column (click header)
  - Pagination (page size: 10/20/50/100)
  - Bulk select + bulk actions
  - Row actions: Edit, Delete (dropdown)
  - Loading skeleton, empty state
  - Export CSV (optional)
- Tạo `useDataTable` hook kết nối với TanStack Query

**Cách sử dụng:**
```typescript
// Mỗi resource mới chỉ cần định nghĩa columns
const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

// Dùng trong page
<DataTable
  columns={columns}
  queryKey={['users']}
  queryFn={(params) => api.get('/users', { params })}
  onEdit={(row) => router.push(`/users/${row.id}`)}
  onDelete={(row) => deleteUser(row.id)}
  bulkActions={[{ label: 'Deactivate', action: bulkDeactivate }]}
/>
```

**✅ Test xác nhận:**
```bash
# Trang /users hiển thị DataTable với dữ liệu từ backend

# 1. Pagination hoạt động → click page 2 → URL thay đổi → data reload
# 2. Search: gõ "admin" → debounce 300ms → kết quả filter
# 3. Sort: click "Name" header → data sort ASC → click lại → DESC
# 4. Thay đổi page size (10→50) → reload data đúng số lượng
# 5. Select 3 rows → bulk action "Deactivate" → confirm dialog → thực thi
# 6. Row action "Edit" → navigate đúng route
# 7. Row action "Delete" → confirm dialog → xóa → table refresh
# 8. Loading state: skeleton rows hiển thị khi đang fetch
# 9. Empty state: hiển thị "No data found" khi search không có kết quả
```

---

## Task 3.5 — User Management Pages

**Mô tả:**  
Module quản lý user hoàn chỉnh làm ví dụ chuẩn. Đây vừa là tính năng thực dùng, vừa là template để copy khi cần thêm module mới.

**Việc cần làm:**
- Tạo trang `/users` (danh sách với DataTable)
- Tạo trang `/users/[id]` (detail + edit form)
- Tạo modal "Create User"
- Filter theo role, status
- Form validation với zod schema (share với `@repo/validators`)
- Hiển thị avatar (hoặc initials nếu không có ảnh)
- Upload avatar trực tiếp từ form (dùng `FileUpload`/`AvatarUpload` với `useMediaLibrary=false`)

**Form validation chia sẻ giữa FE và BE:**
```typescript
// packages/validators/src/user.ts
export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])/),
  role: z.nativeEnum(UserRole),
});
// Dùng cùng schema ở cả backend (class-validator) và frontend (react-hook-form)
```

**✅ Test xác nhận:**
```bash
# 1. Trang /users hiển thị danh sách users từ DB
# 2. Filter "Role: ADMIN" → chỉ hiện admins
# 3. Click "Create User" → modal mở
#    - Submit form thiếu field → validation error hiển thị
#    - Submit đúng → user được tạo → modal đóng → table refresh → user mới xuất hiện
# 4. Click Edit user → trang /users/[id]
#    - Form pre-filled với data hiện tại
#    - Sửa tên → Save → toast "Updated successfully"
#    - Upload avatar → preview ngay lập tức → Save → avatar được lưu
# 5. Delete user → confirm dialog
#    - Confirm → user biến mất khỏi table (soft deleted)
# 6. Test permission: login với ADMIN role → không thấy menu quản lý SUPER_ADMIN
```

---

## Task 3.6 — Dashboard với Charts

**Mô tả:**  
Dashboard tổng quan làm template. Mọi dự án đều cần dashboard, cần có sẵn layout và chart components để chỉ việc thay data.

**Việc cần làm:**
- Tạo stat cards: Total Users, Active Users, New This Month, Revenue (placeholder)
- Tạo `AreaChart` users over time (recharts)
- Tạo `BarChart` activity by day
- Tạo `PieChart` users by role
- Tạo recent activity table
- Data được fetch từ `/api/admin/stats` endpoint (tạo endpoint này ở backend)
- Loading skeleton cho từng chart
- Refresh button + auto refresh mỗi 5 phút

**✅ Test xác nhận:**
```bash
# Truy cập /dashboard sau login

# 1. Stat cards hiển thị số liệu thật từ DB
# 2. Charts render đúng với data
# 3. Hover trên chart → tooltip hiển thị giá trị
# 4. Click "Refresh" → spinner → data reload
# 5. Loading state: skeleton hiển thị khi fetch lần đầu
# 6. Responsive: trên màn hình 768px → cards stack 2 cột → chart full width
```
