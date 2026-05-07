# Storage — Upload — Tiptap — Media Library: Phân tích mối quan hệ

> **Mục đích file này:** Ghi chú và thống nhất thiết kế trước khi code để tránh implement trùng lặp, không nhất quán, hoặc phải refactor sau.  
> **Liên quan đến:** Phase 2.5 (Upload API), Phase 8.2 (FileUpload Component), Phase 8.6 (Tiptap), Phase 10 Package 1 (Media Library)

---

## Vấn đề nếu không thống nhất

Nếu để mỗi phần tự implement riêng, sẽ xảy ra 4 vấn đề thực tế:

**1. Duplicate upload logic**
```
FileUpload Component  → tự gọi API upload → lưu MinIO
Tiptap image plugin   → tự gọi API upload → lưu MinIO  ← code trùng lặp
Media Library         → tự gọi API upload → lưu MinIO  ← code trùng lặp
```
Ba chỗ gọi cùng một API với cùng logic retry, error handling, progress — nhưng viết 3 lần khác nhau.

**2. Orphaned files**
FileUpload và Tiptap upload trực tiếp lên MinIO mà không lưu record vào DB. Media Library không biết những file này tồn tại → không quản lý được, không track usage, không xóa được.

**3. UI không nhất quán**
- Trang Profile: upload avatar qua `<input type="file">` thông thường
- Trang tạo Post: upload ảnh qua Tiptap → file picker trình duyệt
- Trang Product: upload ảnh qua FileUpload component
- Ba UX khác nhau cho cùng hành động "chọn ảnh"

**4. Không tái sử dụng được**
Ảnh đã upload ở form A không dùng lại được ở form B vì không có nơi tập trung quản lý.

---

## Thiết kế thống nhất

### Nguyên tắc cốt lõi

```
Mọi file đều đi qua một con đường duy nhất:

User action → Upload API → MinIO (lưu file) 
                        → DB (lưu MediaFile record)
                        → Trả về { url, key, id }

Không có đường tắt nào bypass luồng này.
```

### Kiến trúc 4 lớp

```
┌─────────────────────────────────────────────────────────────┐
│                    MediaPickerModal                         │
│           (UI dùng chung cho tất cả consumers)              │
│    Browse thư viện có sẵn  |  Upload file mới               │
├──────────────┬──────────────┬──────────────────────────────┤
│  FileUpload  │    Tiptap    │      Media Library            │
│  Component   │    Editor    │       Package                 │
│  (Phase 8.2) │  (Phase 8.6) │      (Phase 10.1)            │
├──────────────┴──────────────┴──────────────────────────────┤
│                    Upload API                               │
│        POST /api/upload/image | /api/upload/file            │
│        → validate → resize → MinIO → lưu MediaFile DB      │
├─────────────────────────────────────────────────────────────┤
│                 MinIO / S3 Storage                          │
│              Object storage · CDN URL                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Quyết định thiết kế

### QĐ 1 — Upload API là single entry point

**Quyết định:** Tất cả upload đều qua `POST /api/upload/image` hoặc `POST /api/upload/file`. Không component nào được gọi trực tiếp MinIO SDK từ frontend.

**Lý do:** Centralize validation, resize, virus scan (nếu cần sau này), và quan trọng nhất là tạo `MediaFile` record trong DB để Media Library có thể quản lý.

**Upload API response — chuẩn hóa:**
```typescript
interface UploadResult {
  id:        string;   // MediaFile.id trong DB
  url:       string;   // public URL (MinIO hoặc CDN)
  key:        string;   // MinIO object key (để delete sau này)
  name:       string;   // original filename
  size:       number;   // bytes
  mimeType:   string;
  width?:     number;   // ảnh
  height?:    number;   // ảnh
}
// Tất cả consumers đều nhận và lưu type này — không tự define riêng
```

**Quan trọng:** Export type `UploadResult` từ `packages/types` để tất cả apps dùng chung, không ai tự định nghĩa lại.

---

### QĐ 2 — MediaFile record luôn được tạo

**Quyết định:** Upload API LUÔN tạo `MediaFile` record trong DB, kể cả khi Media Library Package chưa được cài.

**Lý do:** Nếu sau này install Media Library Package, nó cần thấy tất cả files đã upload từ trước — không phải chỉ files upload sau khi install.

**Schema Media File (minimal, trong core template):**
```prisma
// Đặt trong core schema (apps/backend/prisma/schema.prisma)
// KHÔNG đặt trong media-library package schema
model MediaFile {
  id           String    @id @default(cuid())
  name         String
  originalName String
  mimeType     String
  size         Int
  url          String
  key          String
  width        Int?
  height       Int?
  uploadedBy   String
  uploader     User      @relation(fields: [uploadedBy], references: [id])
  
  // Fields sau được media-library package sử dụng thêm
  // nhưng optional để core không phụ thuộc vào package
  folderId     String?
  tags         String[]
  alt          String?
  caption      String?
  usageCount   Int       @default(0)
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

**Lý do để MediaFile trong core:** FileUpload và Tiptap cần tạo record ngay, không chờ package install.

---

### QĐ 3 — MediaPickerModal là shared UI component

**Quyết định:** Tạo `MediaPickerModal` là một component dùng chung, không thuộc riêng Media Library Package.

**Đặt tại:** `apps/admin/src/components/media/MediaPickerModal.tsx` và `apps/web/src/components/media/MediaPickerModal.tsx`

**Hai chế độ hoạt động:**
```typescript
// Chế độ 1: Chỉ upload (khi Media Library Package chưa cài)
// → Hiển thị FileUpload component đơn giản, upload xong trả về URL

// Chế độ 2: Upload + Browse (khi Media Library Package đã cài)
// → Có thêm tab "Thư viện" để browse và chọn file có sẵn

<MediaPickerModal
  mode="image"                // "image" | "file" | "any"
  multiple={false}
  onSelect={(files: UploadResult[]) => { ... }}
  onClose={() => setOpen(false)}
/>
```

**Feature detection — tự động switch mode:**
```typescript
// MediaPickerModal tự detect bằng cách gọi API
// GET /api/media/status → { installed: true/false }
// Nếu 404 → chỉ show upload UI
// Nếu 200 → show upload + browse UI
// Không cần config manual, không cần feature flag
```

---

### QĐ 4 — Tiptap Image Extension dùng MediaPickerModal

**Quyết định:** Override ImageUploadExtension của Tiptap để mở `MediaPickerModal` thay vì dùng `<input type="file">` thông thường.

**Trường hợp cần handle:**

| Action | Trước khi có Media Library | Sau khi có Media Library |
|--------|---------------------------|-------------------------|
| Click nút [🖼] toolbar | File picker OS → upload | MediaPickerModal (browse + upload) |
| Drag ảnh vào editor | Auto upload → insert URL | Auto upload → tạo MediaFile → insert URL |
| Paste ảnh từ clipboard | Auto upload → insert URL | Auto upload → tạo MediaFile → insert URL |

**Drag và Paste KHÔNG mở modal** — auto upload ngay để giữ UX nhanh. Chỉ click nút toolbar mới mở modal.

```typescript
// Tiptap Image Upload Extension
const ImageUploadExtension = Extension.create({
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        // Drag: auto upload, không mở modal
        handleDrop: (view, event) => {
          const file = getImageFromDrop(event);
          if (!file) return false;
          uploadAndInsert(file, view); // trực tiếp, không modal
          return true;
        },
        // Paste: auto upload, không mở modal
        handlePaste: (view, event) => {
          const file = getImageFromPaste(event);
          if (!file) return false;
          uploadAndInsert(file, view);
          return true;
        },
      },
    })];
  },
  addCommands() {
    return {
      // Click toolbar: mở modal
      insertImage: () => ({ editor }) => {
        openMediaPickerModal({
          mode: 'image',
          onSelect: (files) => {
            files.forEach(f => {
              editor.chain().focus().setImage({ src: f.url, alt: f.name }).run();
            });
          },
        });
        return true;
      },
    };
  },
});
```

---

### QĐ 5 — FileUpload Component có thể chuyển sang MediaPickerModal

**Quyết định:** FileUpload Component có prop `useMediaLibrary` để tùy chọn mở MediaPickerModal thay vì upload mới.

```typescript
<FileUpload
  variant="image"
  useMediaLibrary={true}   // mở MediaPickerModal khi click
                           // fallback: file picker OS nếu Media Library chưa install
  onUpload={(files) => setValue('images', files)}
/>

// Khi useMediaLibrary=false (default):
// → Click → file picker OS → upload → trả về UploadResult[]

// Khi useMediaLibrary=true:
// → Click → MediaPickerModal → chọn từ thư viện hoặc upload mới → trả về UploadResult[]
```

**Quy tắc khi nào dùng `useMediaLibrary=true`:**
- Form tạo/sửa Post → dùng `true` (cần chọn ảnh từ thư viện)
- Form tạo Product → dùng `true`
- Upload avatar Profile → dùng `false` (upload nhanh, không cần browse)
- Upload attachment trong Email template → dùng `false`

---

### QĐ 6 — Usage tracking

**Quyết định:** `MediaFile.usageCount` được tự động cập nhật mỗi khi URL được lưu vào một record khác.

**Cơ chế:** Prisma middleware trong backend theo dõi các model có chứa URL của MediaFile.

```typescript
// Khi một Post được create/update với coverImage URL
// → tìm MediaFile có url = coverImage
// → tăng usageCount

// Khi Post bị delete
// → giảm usageCount của MediaFile tương ứng

// Admin muốn xóa MediaFile
// → usageCount > 0 → warning "Đang dùng ở N nơi"
// → usageCount = 0 → cho xóa ngay
```

**Middleware pattern:**
```typescript
prisma.$use(async (params, next) => {
  const result = await next(params);

  if (['create', 'update'].includes(params.action)) {
    const mediaUrls = extractMediaUrls(params.args.data);
    if (mediaUrls.length > 0) {
      await updateUsageCounts(mediaUrls, +1);
    }
  }

  if (params.action === 'delete') {
    const record = await getRecordBefore(params);
    const mediaUrls = extractMediaUrls(record);
    if (mediaUrls.length > 0) {
      await updateUsageCounts(mediaUrls, -1);
    }
  }

  return result;
});
```

---

## Checklist implement theo thứ tự

Đây là thứ tự BẮT BUỘC — implement sai thứ tự sẽ phải refactor:

```
Bước 1 — Phase 2.5: Upload API (Backend)
  ☐ POST /api/upload/image — validate, resize, MinIO, tạo MediaFile record
  ☐ POST /api/upload/file  — validate, MinIO, tạo MediaFile record
  ☐ DELETE /api/upload/:key — xóa khỏi MinIO + xóa MediaFile record
  ☐ Export type UploadResult vào packages/types
  ☐ MediaFile model trong core schema (không trong package)

Bước 2 — Phase 8.2: FileUpload Component
  ☐ Dùng UploadResult type từ @repo/types (không tự define)
  ☐ Implement prop useMediaLibrary (default: false)
  ☐ Khi useMediaLibrary=true: check /api/media/status để detect
  ☐ Progress tracking dùng axios onUploadProgress

Bước 3 — Phase 8.6: Tiptap Image Extension
  ☐ Drag/Paste: gọi Upload API trực tiếp (không modal)
  ☐ Toolbar click: gọi openMediaPickerModal() (modal)
  ☐ Đảm bảo lưu MediaFile.id vào img attribute để track usage

Bước 4 — MediaPickerModal (shared component)
  ☐ Tab "Upload": wrap FileUpload component
  ☐ Tab "Thư viện": call GET /api/media (chỉ hoạt động khi package install)
  ☐ Feature detection: tự check /api/media/status
  ☐ Expose openMediaPickerModal() global function cho Tiptap dùng

Bước 5 — Phase 10.1: Media Library Package
  ☐ KHÔNG tạo lại MediaFile model (đã có trong core)
  ☐ Thêm các fields còn thiếu: folderId, tags, alt, caption, usageCount
  ☐ Thêm MediaFolder model (chỉ trong package schema)
  ☐ Admin pages: /admin/media
  ☐ API: folder CRUD, search, bulk operations
  ☐ usageCount middleware
```

---

## Những thứ KHÔNG được làm

```
❌ KHÔNG gọi MinIO SDK trực tiếp từ frontend
   → Luôn qua Upload API

❌ KHÔNG tự define UploadResult type trong component
   → Dùng từ @repo/types

❌ KHÔNG để FileUpload hoặc Tiptap bypass việc tạo MediaFile record
   → Upload API phải luôn tạo record

❌ KHÔNG để Media Library Package định nghĩa lại MediaFile model
   → MediaFile thuộc core schema

❌ KHÔNG hardcode logic "nếu có media library thì..."
   → Dùng feature detection qua API call

❌ KHÔNG mở MediaPickerModal khi user drag/paste vào Tiptap
   → Drag/paste là auto-upload, chỉ toolbar click mới mở modal

❌ KHÔNG xóa file khỏi MinIO mà không xóa MediaFile record
   → Luôn xóa cả hai qua DELETE /api/upload/:key
```

---

## Interface boundaries rõ ràng

```
Backend biết:         Frontend KHÔNG biết:
────────────────────  ──────────────────────────────
MinIO credentials     MinIO endpoint
S3 bucket name        S3 bucket name
Sharp resize logic    Image processing logic
MediaFile DB record   DB schema của MediaFile


Frontend biết:        Backend KHÔNG biết:
────────────────────  ──────────────────────────────
UploadResult shape    Tiptap editor
URL của file          React components
MediaFile.id          UI state (modal open/close)
```

---

## Config tập trung

Tất cả config liên quan đến upload/storage đặt trong `.env` và đọc qua `ConfigService`:

```env
# Storage
STORAGE_PROVIDER=minio          # minio | s3 | local (dev only)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=uploads
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=http://localhost:9000  # URL public cho frontend dùng

# Upload limits
UPLOAD_IMAGE_MAX_SIZE=10485760  # 10MB in bytes
UPLOAD_FILE_MAX_SIZE=52428800   # 50MB in bytes
UPLOAD_IMAGE_MAX_WIDTH=1920     # resize nếu lớn hơn
UPLOAD_IMAGE_QUALITY=85         # WebP quality

# Allowed types
UPLOAD_IMAGE_ALLOWED_TYPES=image/jpeg,image/png,image/webp,image/gif
UPLOAD_FILE_ALLOWED_TYPES=application/pdf,.docx,.xlsx,.pptx
```

**Một nơi thay đổi, tất cả nơi cập nhật.**

---

## Tóm tắt một dòng

> `FileUpload Component` và `Tiptap Image Extension` đều gọi **Upload API** → API tạo file trên **MinIO** và record trong **DB** → `Media Library Package` đọc DB để hiển thị và quản lý → `MediaPickerModal` là bridge UI giữa ba thứ còn lại.
