# Phase 2 — Backend Foundation (NestJS + Prisma)

> **Mục tiêu:** API backend hoàn chỉnh với auth, CRUD generic, upload, email — sẵn sàng cho 90% dự án mà không cần viết lại từ đầu.  
> **Thời gian ước tính:** 4–5 ngày  
> **Prerequisite:** Phase 1 hoàn thành, `make docker-up` đang chạy.

---

## Task 2.1 — Khởi tạo NestJS App

**Mô tả:**  
Bootstrap NestJS với cấu hình chuẩn. Thiết lập toàn bộ global middleware, pipes, filters, interceptors ngay từ đầu để mọi module phía sau tự động được bảo vệ và chuẩn hóa.

**Việc cần làm:**
- Tạo NestJS app trong `apps/backend` bằng `@nestjs/cli`
- Cài đặt dependencies core:
  ```
  @nestjs/config @nestjs/swagger @nestjs/throttler
  class-validator class-transformer
  helmet compression
  winston nest-winston
  ```
- Cấu hình `main.ts` với đầy đủ global setup
- Tạo `GlobalExceptionFilter` chuẩn hóa tất cả error response
- Tạo `ResponseInterceptor` bọc tất cả response trong `ApiResponse<T>`
- Cấu hình `ConfigModule` với validation schema (Joi)
- Cấu hình Swagger tại `/api/docs`

**`apps/backend/src/main.ts`:**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.WEB_URL?.split(',') || '*',
    credentials: true,
  });

  // API versioning
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(process.env.APP_NAME || 'API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.BACKEND_PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
```

**`GlobalExceptionFilter` — response lỗi chuẩn:**
```typescript
// Mọi lỗi đều trả về format nhất quán:
// { success: false, message: "...", error: "BadRequestException", statusCode: 400 }
```

**`ResponseInterceptor` — response thành công chuẩn:**
```typescript
// Mọi response đều được bọc:
// { success: true, data: <original response>, message: "OK" }
```

**✅ Test xác nhận:**
```bash
cd apps/backend && pnpm dev
# Server khởi động tại http://localhost:3000

curl http://localhost:3000/api/health
# { "success": true, "data": { "status": "ok", "timestamp": "..." } }

curl http://localhost:3000/api/nonexistent
# { "success": false, "message": "Cannot GET /api/nonexistent", "statusCode": 404 }

# Truy cập http://localhost:3000/api/docs
# Swagger UI hiển thị đầy đủ
```

---

## Task 2.2 — Prisma Setup + Schema

**Mô tả:**  
Thiết lập Prisma với schema cơ bản cho User, Role, Permission. Đây là model dùng chung, mọi dự án đều cần.

**Việc cần làm:**
- Cài `prisma` và `@prisma/client`
- Khởi tạo Prisma với `prisma init`
- Viết schema cơ bản: `User`, `RefreshToken`, `AuditLog`
- Tạo `PrismaModule` (global) và `PrismaService`
- Tạo migration đầu tiên
- Tạo `prisma/seed.ts` với dữ liệu admin mặc định

**`prisma/schema.prisma`:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  USER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  BANNED
}

model User {
  id            String     @id @default(cuid())
  email         String     @unique
  password      String?
  name          String
  avatar        String?
  role          UserRole   @default(USER)
  status        UserStatus @default(ACTIVE)
  emailVerified Boolean    @default(false)
  googleId      String?    @unique

  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // soft delete

  @@index([email])
  @@index([status])
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String
  resource  String
  resourceId String?
  metadata  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([resource, resourceId])
}
```

**`PrismaService` — kết nối và soft delete middleware:**
```typescript
// Tự động filter deletedAt != null cho mọi query
// Expose $transaction, $connect, $disconnect
```

**`prisma/seed.ts`:**
```typescript
// Tạo super admin mặc định:
// email: admin@example.com
// password: Admin@123 (bcrypt hashed)
// role: SUPER_ADMIN
```

**✅ Test xác nhận:**
```bash
make db-migrate
# ✔ Generated Prisma Client
# ✔ The following migration(s) have been applied: 20240101_init

make db-seed
# 🌱 Seeding...
# ✅ Created super admin: admin@example.com

make db-studio
# Prisma Studio mở tại http://localhost:5555
# Bảng User hiển thị 1 record (admin)

# Test soft delete middleware
cd apps/backend
# Query User với deletedAt set → không xuất hiện trong kết quả
```

---

## Task 2.3 — Auth Module (JWT + Refresh Token + Google OAuth)

**Mô tả:**  
Module auth hoàn chỉnh với access token ngắn hạn (15m), refresh token dài hạn (7d) lưu DB, và đăng nhập Google. Đây là tính năng mọi dự án đều cần và thường mất nhiều thời gian nhất.

**Việc cần làm:**
- Cài `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `passport-google-oauth20`, `bcrypt`
- Tạo `AuthModule` với các endpoints:
  - `POST /auth/register` — đăng ký, gửi email verify
  - `POST /auth/login` — trả về `accessToken` + `refreshToken`
  - `POST /auth/refresh` — đổi refresh token mới
  - `POST /auth/logout` — revoke refresh token
  - `GET  /auth/google` — redirect Google OAuth
  - `GET  /auth/google/callback` — callback sau OAuth
  - `GET  /auth/me` — lấy thông tin user hiện tại (require auth)
  - `POST /auth/forgot-password` — gửi email reset
  - `POST /auth/reset-password` — đặt lại password
- Tạo `JwtAuthGuard` (global optional, dùng `@Public()` để bỏ qua)
- Tạo `RolesGuard` + `@Roles()` decorator
- Lưu refresh token vào DB, revoke khi logout hoặc đổi password

**Flow token:**
```
Login → accessToken (15m, stateless) + refreshToken (7d, lưu DB)
     → Client lưu accessToken trong memory, refreshToken trong httpOnly cookie
     → Khi accessToken hết hạn → gọi /auth/refresh với cookie
     → Server verify refreshToken trong DB → cấp cặp token mới (rotation)
     → Logout → xóa refreshToken khỏi DB
```

**`@Public()` decorator — bỏ qua auth:**
```typescript
// Dùng cho các route không cần đăng nhập
@Public()
@Post('login')
async login() { ... }
```

**`@Roles()` decorator:**
```typescript
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Get('admin-only')
async adminEndpoint() { ... }
```

**✅ Test xác nhận:**
```bash
# 1. Đăng ký
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123","name":"Test User"}'
# { "success": true, "data": { "id": "...", "email": "test@test.com" } }

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123"}'
# { "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." } }

# 3. Gọi protected endpoint
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
# { "success": true, "data": { "id": "...", "email": "test@test.com", "role": "USER" } }

# 4. Gọi với token sai
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid"
# { "success": false, "statusCode": 401, "message": "Unauthorized" }

# 5. Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
# Trả về cặp token mới

# 6. Test RBAC
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <USER_token>"
# 403 Forbidden
```

---

## Task 2.4 — Generic CRUD Base

**Mô tả:**  
Abstract base class cho service và controller. Mọi module mới chỉ cần extend là có đủ CRUD + pagination + search + soft delete. Đây là phần tiết kiệm thời gian nhiều nhất cho các dự án sau.

**Việc cần làm:**
- Tạo `BaseCrudService<T>` abstract class với generic Prisma model
- Tạo `BaseCrudController<T>` abstract class
- Hỗ trợ: `findAll` (pagination + search + sort), `findOne`, `create`, `update`, `delete` (soft), `restore`
- Tạo `PaginationDto` base class
- Demo với `ProductModule` để verify pattern hoạt động

**`BaseCrudService` — interface:**
```typescript
abstract class BaseCrudService<T, CreateDto, UpdateDto> {
  abstract findAll(query: PaginationQuery): Promise<PaginatedResponse<T>>;
  abstract findOne(id: string): Promise<T>;
  abstract create(dto: CreateDto, userId?: string): Promise<T>;
  abstract update(id: string, dto: UpdateDto, userId?: string): Promise<T>;
  abstract remove(id: string, userId?: string): Promise<void>;
  abstract restore(id: string): Promise<T>;
}
```

**Cách sử dụng trong dự án thực:**
```typescript
// Chỉ cần viết thêm vài dòng là có CRUD hoàn chỉnh
@Injectable()
export class PostsService extends BaseCrudService<Post, CreatePostDto, UpdatePostDto> {
  constructor(private prisma: PrismaService) {
    super(prisma, 'post'); // truyền tên model Prisma
  }
  // Override nếu cần custom logic
}
```

**`PaginationDto`:**
```typescript
class PaginationDto {
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc' = 'desc';
}
```

**✅ Test xác nhận:**
```bash
# Tạo ProductModule extend BaseCrudService với schema:
# model Product { id, name, price, description, createdAt, deletedAt }

# Test pagination
curl "http://localhost:3000/api/products?page=1&limit=5&search=test&sortBy=createdAt"
# { "success": true, "data": { "data": [...], "meta": { "total": 10, "page": 1, "limit": 5, "totalPages": 2 } } }

# Test CRUD đầy đủ
curl -X POST http://localhost:3000/api/products -d '{"name":"Test","price":100}'
# 201 Created

curl -X PATCH http://localhost:3000/api/products/<id> -d '{"price":200}'
# 200 OK, price updated

curl -X DELETE http://localhost:3000/api/products/<id>
# 200 OK

curl http://localhost:3000/api/products/<id>
# 404 Not Found (soft deleted)

curl -X POST http://localhost:3000/api/products/<id>/restore
# 200 OK, product restored
```

---

## Task 2.5 — File Upload Module

**Mô tả:**  
Upload file với validation type/size, lưu vào MinIO (dev) hoặc S3 (prod), đồng thời LUÔN tạo record `MediaFile` trong DB. Đây là single entry point cho mọi luồng upload (FileUpload, Tiptap, Media Library).

**Việc cần làm:**
- Cài `@nestjs/platform-express`, `multer`, `minio`, `sharp`
- Tạo `StorageModule` (global) với provider pattern: `LocalStorage` hoặc `MinioStorage`
- Tạo `UploadModule` với endpoint:
  - `POST /upload/image` — upload ảnh, auto resize + convert WebP, tạo `MediaFile`
  - `POST /upload/file` — upload file bất kỳ, tạo `MediaFile`
  - `DELETE /upload/:key` — xóa file storage + xóa record `MediaFile`
- Thêm endpoint feature detection:
  - `GET /media/status` — trả `{ installed: true/false }` để frontend detect Media Library package
- Validate: type (whitelist), size (max 10MB image, 50MB file)
- Export `UploadResult` vào `packages/types` để toàn bộ apps dùng chung
- Thêm model `MediaFile` vào core schema Prisma (không đặt trong package media-library)
- Trả về payload chuẩn hóa: `id`, `url`, `key`, `name`, `size`, `mimeType`, `width?`, `height?`

**Storage interface:**
```typescript
interface IStorageProvider {
  upload(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

interface UploadResult {
  id: string;        // MediaFile.id
  key: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}
```

**Flow upload ảnh:**
```
Client upload → Multer (buffer, max 10MB)
             → Validate MIME type (image/jpeg, image/png, image/webp)
             → Sharp resize (max 1920px width, giữ aspect ratio)
             → Convert → WebP (chất lượng 85)
             → Upload lên MinIO với key: uploads/images/{year}/{month}/{uuid}.webp
             → Tạo MediaFile record trong DB
             → Trả về UploadResult chuẩn hóa
```

**✅ Test xác nhận:**
```bash
# Upload ảnh
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/test.jpg"
# { "success": true, "data": { "id":"cm...", "url": "http://localhost:9000/uploads/images/2024/01/abc.webp", "key":"uploads/images/...", "name":"test.jpg", "size": 45000, "mimeType":"image/webp", "width":1200, "height":800 } }

# Verify file trong MinIO
# Truy cập MinIO console → bucket "uploads" → thấy file .webp

# Verify DB record
# Prisma Studio bảng MediaFile có record tương ứng với key/url bên trên

# Test file quá lớn
# Upload file >10MB → 400 Bad Request "File too large"

# Test wrong type
# Upload .exe → 400 Bad Request "File type not allowed"

# Verify ảnh được resize
# Upload ảnh 4000×3000 → download về → kích thước ≤ 1920×1440

# Feature detection endpoint
curl http://localhost:3000/api/media/status
# Nếu media-library chưa cài: { "success": true, "data": { "installed": false } }
# Nếu đã cài:            { "success": true, "data": { "installed": true } }
```

---

## Task 2.6 — Email Module

**Mô tả:**  
Gửi email qua queue (Bull + Redis) để không block request. Template dùng Handlebars. Dev dùng Maildev để preview không cần SMTP thật.

**Việc cần làm:**
- Cài `@nestjs/bull`, `bull`, `nodemailer`, `handlebars`
- Tạo `MailModule` với `MailQueue` processor
- Tạo các email template trong `templates/`:
  - `welcome.hbs` — chào mừng sau đăng ký
  - `verify-email.hbs` — xác thực email
  - `reset-password.hbs` — đặt lại mật khẩu
  - `notification.hbs` — thông báo chung
- Tạo `MailService` với các method: `sendWelcome`, `sendVerifyEmail`, `sendResetPassword`
- Retry tự động 3 lần nếu gửi thất bại
- Log kết quả vào DB hoặc console

**`MailService` interface:**
```typescript
class MailService {
  sendWelcome(to: string, name: string): Promise<void>;
  sendVerifyEmail(to: string, name: string, token: string): Promise<void>;
  sendResetPassword(to: string, name: string, token: string): Promise<void>;
  sendNotification(to: string, subject: string, content: string): Promise<void>;
}
// Tất cả đều đưa vào Bull queue, không await SMTP call
```

**✅ Test xác nhận:**
```bash
# Đăng ký user mới → email welcome được gửi
curl -X POST http://localhost:3000/api/auth/register \
  -d '{"email":"newuser@test.com","password":"Test@123","name":"New User"}'

# Truy cập Maildev UI: http://localhost:1080
# Thấy email "Welcome to MyApp" gửi đến newuser@test.com

# Test forgot password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -d '{"email":"newuser@test.com"}'
# Maildev UI → thấy email reset password với link có token

# Test queue retry
# Tắt maildev container → gọi forgot-password → bật lại → email được gửi lại
docker stop app_maildev
curl -X POST http://localhost:3000/api/auth/forgot-password -d '{"email":"newuser@test.com"}'
docker start app_maildev
# Sau vài giây → Maildev nhận được email (Bull retry thành công)
```

---

## Task 2.7 — Rate Limiting + Security Headers + Logging

**Mô tả:**  
Bảo vệ API khỏi abuse và ghi log đầy đủ để debug production. Setup một lần, dùng mãi.

**Việc cần làm:**
- Cấu hình `ThrottlerModule` (rate limiting):
  - Global: 100 requests / 60 giây / IP
  - Auth endpoints: 10 requests / 60 giây / IP (strict hơn)
- Cấu hình Winston logger:
  - Development: console với màu + format đẹp
  - Production: JSON format → file `logs/error.log` và `logs/combined.log`
  - Log rotation: file tối đa 20MB, giữ 14 ngày
- Tạo `AuditLogInterceptor` ghi log các action quan trọng (create, update, delete)
- Thêm `X-Request-ID` header vào mọi response

**Log format production:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "POST /api/auth/login 200 45ms",
  "requestId": "abc-123",
  "userId": "user_cuid",
  "ip": "1.2.3.4",
  "userAgent": "Mozilla/5.0..."
}
```

**✅ Test xác nhận:**
```bash
# Test rate limit trên auth endpoint
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/auth/login \
    -d '{"email":"x@x.com","password":"wrong"}'
done
# Đầu tiên: 401 (sai password)
# Sau 10 lần: 429 Too Many Requests

# Test X-Request-ID header
curl -I http://localhost:3000/api/health
# X-Request-ID: <uuid> xuất hiện trong response headers

# Kiểm tra log file (sau vài requests)
cat apps/backend/logs/combined.log | tail -5
# JSON logs với format chuẩn

# Test audit log
# Xóa một resource → AuditLog table có record với action: "DELETE"
```
