# Phase 7 — Real-time, Notifications, 2FA & Advanced Features

> **Mục tiêu:** Bổ sung các tính năng nâng cao mà hầu hết dự án đều cần — được sắp xếp theo thứ tự ưu tiên, mỗi task độc lập, dự án nào cần thì implement, không cần thì bỏ qua.  
> **Thời gian ước tính:** 4–6 ngày (toàn bộ) hoặc chọn lọc theo nhu cầu  
> **Prerequisite:** Phase 1–2 hoàn thành. Các task trong Phase 7 không phụ thuộc nhau (trừ Task 7.3 cần Task 7.1).

---

## Thứ tự ưu tiên

| Priority | Task | Lý do |
|----------|------|-------|
| 🔴 P1 | **7.1** In-App Notification System | Gần như mọi dự án đều cần, làm sau tốn công refactor |
| 🔴 P1 | **7.2** 2FA — TOTP + Email OTP | Khách hàng hay yêu cầu sau launch, làm sẵn rẻ hơn |
| 🔴 P1 | **7.3** Real-time WebSocket | Cần thiết khi có notification live, chat, live update |
| 🟡 P2 | **7.4** Email nâng cao | Unsubscribe + template preview — cần thiết cho production |
| 🟡 P2 | **7.5** Scheduled Tasks / Cron | Báo cáo định kỳ, cleanup, digest email |
| 🟡 P2 | **7.6** Webhook System | Khi cần tích hợp Stripe, GitHub hoặc cho client đăng ký event |
| 🟢 P3 | **7.7** SMS / OTP qua Zalo OA | Dự án Việt Nam hay cần, nhưng có thể thêm sau |
| 🟢 P3 | **7.8** Feature Flags | Deploy an toàn, A/B test — nice to have |

---

## Task 7.1 — In-App Notification System 🔴 P1

**Mô tả:**  
Hệ thống thông báo trong ứng dụng: tạo notification khi có sự kiện, lưu vào DB để đọc lại, hiển thị badge count, đánh dấu đã đọc. Đây là nền tảng cho Task 7.3 (real-time push).

**Việc cần làm:**

**Backend:**
- Thêm Prisma model `Notification`
- Tạo `NotificationsModule` với CRUD endpoints
- Tạo `NotificationsService` với method `send()` để các module khác gọi
- Hỗ trợ notification types: `info`, `success`, `warning`, `error`
- Hỗ trợ action URL (click notification → navigate tới trang liên quan)
- Endpoint: `GET /notifications` (paginated), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`, `GET /notifications/unread-count`

**Prisma model:**
```prisma
model Notification {
  id         String             @id @default(cuid())
  userId     String
  user       User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       NotificationType   @default(INFO)
  title      String
  body       String
  actionUrl  String?
  metadata   Json?
  isRead     Boolean            @default(false)
  readAt     DateTime?
  createdAt  DateTime           @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
}

enum NotificationType {
  INFO
  SUCCESS
  WARNING
  ERROR
}
```

**`NotificationsService` — interface dùng trong toàn app:**
```typescript
@Injectable()
export class NotificationsService {
  // Gọi từ bất kỳ module nào để tạo notification
  async send(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification>;

  // Gửi cho nhiều users cùng lúc (broadcast)
  async sendBulk(params: {
    userIds: string[];
    type: NotificationType;
    title: string;
    body: string;
    actionUrl?: string;
  }): Promise<void>;

  // Gửi cho tất cả users theo role
  async sendToRole(params: {
    role: UserRole;
    type: NotificationType;
    title: string;
    body: string;
  }): Promise<void>;
}
```

**Cách dùng trong các module khác:**
```typescript
// Trong AuthService sau khi user đăng ký thành công
await this.notificationsService.send({
  userId: user.id,
  type: NotificationType.SUCCESS,
  title: 'Chào mừng!',
  body: `Tài khoản của bạn đã được tạo thành công.`,
  actionUrl: '/profile',
});

// Trong OrderService khi đơn hàng được xử lý
await this.notificationsService.send({
  userId: order.userId,
  type: NotificationType.INFO,
  title: 'Đơn hàng đã được xác nhận',
  body: `Đơn hàng #${order.code} đang được xử lý.`,
  actionUrl: `/orders/${order.id}`,
  metadata: { orderId: order.id },
});
```

**Frontend (Admin + Web):**
- `NotificationBell` component: icon bell + badge số đỏ khi có unread
- Dropdown list 10 notifications gần nhất
- Click notification → navigate đến `actionUrl` → mark as read
- "Mark all as read" button
- "View all" link → trang `/notifications` đầy đủ với pagination
- Poll unread count mỗi 30s (upgrade lên WebSocket ở Task 7.3)

**✅ Test xác nhận:**
```bash
# 1. Tạo notification từ backend
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"userId":"<user_id>","title":"Test","body":"Test notification"}'

# 2. Get notifications
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <user_token>"
# { data: [...], meta: { total: 1, unread: 1 } }

# 3. Unread count
curl http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer <user_token>"
# { count: 1 }

# 4. Mark as read
curl -X PATCH http://localhost:3000/api/notifications/<id>/read \
  -H "Authorization: Bearer <user_token>"
# Unread count giảm xuống 0

# 5. Frontend:
# → Bell icon hiển thị badge "1"
# → Click bell → dropdown hiển thị notification
# → Click notification → navigate đến actionUrl → badge biến mất
# → "Mark all read" → tất cả badge biến mất
```

---

## Task 7.2 — Two-Factor Authentication (TOTP + Email OTP) 🔴 P1

**Mô tả:**  
Xác thực 2 yếu tố với 2 phương thức: TOTP (Google Authenticator / Authy) và Email OTP. User có thể chọn phương thức ưa thích. Làm sẵn từ đầu vì tích hợp vào auth flow sau này rất phức tạp.

**Việc cần làm:**
- Cài `otplib`, `qrcode`
- Cập nhật `User` model với các fields 2FA
- Tạo `TwoFactorModule` với các endpoints
- Cập nhật `AuthService.login()` để handle 2FA flow
- Tạo `TwoFactorGuard`
- Frontend: màn hình nhập OTP, màn hình setup TOTP với QR code

**Cập nhật Prisma User model:**
```prisma
model User {
  // ... existing fields

  // 2FA
  twoFactorEnabled  Boolean  @default(false)
  twoFactorMethod   TwoFactorMethod?  // TOTP | EMAIL
  twoFactorSecret   String?  // encrypted TOTP secret
  backupCodes       String[] // hashed backup codes
}

enum TwoFactorMethod {
  TOTP
  EMAIL
}
```

**Endpoints:**
```
POST /auth/2fa/totp/setup       → Tạo secret, trả về QR code + secret text
POST /auth/2fa/totp/verify      → Verify code lần đầu để activate TOTP
POST /auth/2fa/totp/disable     → Tắt 2FA (yêu cầu nhập current code)
POST /auth/2fa/email/send       → Gửi OTP 6 số qua email (hết hạn 5 phút)
POST /auth/2fa/email/verify     → Verify OTP từ email
POST /auth/2fa/backup-codes     → Generate 8 backup codes mới
POST /auth/2fa/validate         → Validate code trong login flow
```

**Login flow khi 2FA enabled:**
```
Step 1: POST /auth/login { email, password }
        → Credentials đúng nhưng 2FA enabled
        → Trả về: { requiresTwoFactor: true, tempToken: "xxx" }
           (tempToken là JWT ngắn hạn 5 phút, chỉ dùng cho bước 2)

Step 2: POST /auth/2fa/validate { tempToken, code }
        → Verify code (TOTP hoặc Email OTP)
        → Đúng → trả về accessToken + refreshToken như login thường
        → Sai 5 lần → lock 15 phút (lưu attempt count trong Redis)
```

**TOTP setup flow:**
```typescript
// 1. Generate secret
const secret = authenticator.generateSecret();
const otpauth = authenticator.keyuri(user.email, 'MyApp', secret);
const qrCode = await QRCode.toDataURL(otpauth);
// Trả về: { qrCode, secret } (secret để user nhập tay nếu scan không được)

// 2. User scan QR → nhập code → verify
const isValid = authenticator.verify({ token: code, secret });
if (isValid) {
  // Lưu secret (encrypt trước khi lưu DB), enable 2FA
  // Generate 8 backup codes, hash + lưu DB, show cho user 1 lần
}
```

**Backup codes:**
```typescript
// Generate 8 codes dạng: XXXX-XXXX
const codes = Array.from({ length: 8 }, () =>
  `${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`
);
// Lưu dạng bcrypt hash, không lưu plaintext
// Mỗi code chỉ dùng được 1 lần (xóa sau khi dùng)
```

**Email OTP:**
```typescript
// Lưu trong Redis với TTL 5 phút
// Key: `otp:email:${userId}` = { code: "123456", attempts: 0 }
const code = Math.floor(100000 + Math.random() * 900000).toString();
await redis.setex(`otp:email:${userId}`, 300, JSON.stringify({ code, attempts: 0 }));
// Gửi email template với mã OTP
```

**Frontend — màn hình 2FA:**
```typescript
// Sau khi login trả về requiresTwoFactor: true
// → Redirect sang /auth/two-factor với tempToken
// → Hiển thị:
//   - Input 6 digits (auto-focus, auto-submit khi đủ 6 số)
//   - "Dùng backup code" link
//   - Nếu Email OTP: countdown timer + "Gửi lại" (cooldown 60s)
//   - Nếu TOTP: link "Không có thiết bị? Dùng email"
```

**Settings page — quản lý 2FA:**
```
Security tab trong Settings:
├── 2FA Status: Đang tắt / Đang bật (TOTP / Email)
├── [Bật 2FA] button → modal chọn phương thức
│   ├── TOTP → hiển thị QR code → input verify → Backup codes
│   └── Email OTP → gửi test code → verify → Done
├── [Đổi phương thức] (nếu đã bật)
├── [Tắt 2FA] → yêu cầu nhập current 2FA code
└── [Xem / Tạo lại Backup Codes] → cảnh báo sẽ vô hiệu codes cũ
```

**✅ Test xác nhận:**
```bash
# 1. Setup TOTP
curl -X POST http://localhost:3000/api/auth/2fa/totp/setup \
  -H "Authorization: Bearer <token>"
# { qrCode: "data:image/png;base64,...", secret: "JBSWY3DPEHPK3PXP" }

# Scan QR bằng Google Authenticator → lấy code 6 số

# 2. Activate TOTP
curl -X POST http://localhost:3000/api/auth/2fa/totp/verify \
  -H "Authorization: Bearer <token>" \
  -d '{"code":"123456"}'
# { backupCodes: ["ABCD-1234", ...] } — hiển thị 1 lần duy nhất

# 3. Login với 2FA
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"test@test.com","password":"Test@123"}'
# { requiresTwoFactor: true, tempToken: "eyJ..." }

curl -X POST http://localhost:3000/api/auth/2fa/validate \
  -d '{"tempToken":"eyJ...","code":"<code_from_app>"}'
# { accessToken: "...", refreshToken: "..." }

# 4. Test wrong code 5 lần
# → 429: "Quá nhiều lần thử. Vui lòng đợi 15 phút."

# 5. Test backup code
curl -X POST http://localhost:3000/api/auth/2fa/validate \
  -d '{"tempToken":"eyJ...","code":"ABCD-1234"}'
# → Login thành công, backup code bị xóa (không dùng lại được)

# 6. Test Email OTP
# Enable Email OTP cho user → Login → check Maildev → nhập code → thành công
```

---

## Task 7.3 — Real-time WebSocket (Socket.IO) 🔴 P1

**Mô tả:**  
Nâng cấp notification system từ polling lên real-time push. Khi server tạo notification mới → user nhận ngay lập tức không cần refresh. Dùng Redis Pub/Sub để scale được khi chạy nhiều instance backend.

**Việc cần làm:**
- Cài `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `@socket.io/redis-adapter`
- Tạo `WebSocketModule` với `AppGateway`
- JWT authentication cho WebSocket connections
- Room management: mỗi user join room theo `userId`, admin join thêm room `admin`
- Tích hợp với `NotificationsService`: khi tạo notification → emit socket event
- Frontend: Socket.IO client, auto reconnect, connection state indicator
- Định nghĩa rõ ràng các event types

**`AppGateway` — server:**
```typescript
@WebSocketGateway({
  cors: { origin: process.env.WEB_URL?.split(','), credentials: true },
  namespace: '/',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Verify JWT từ handshake auth
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);

      // Join personal room
      client.join(`user:${payload.sub}`);

      // Join role-based room
      client.join(`role:${payload.role}`);

      // Track online status trong Redis
      await this.redisService.sadd('online_users', payload.sub);

      client.data.userId = payload.sub;
      client.emit('connected', { message: 'Connected successfully' });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.redisService.srem('online_users', client.data.userId);
    }
  }
}
```

**Server Events (emit từ server → client):**
```typescript
// Các event server gửi xuống client
export const SERVER_EVENTS = {
  // Notifications
  NOTIFICATION_NEW:    'notification:new',     // có notification mới
  NOTIFICATION_COUNT:  'notification:count',   // cập nhật unread count

  // Data updates (cho admin dashboard)
  DATA_UPDATED:        'data:updated',         // record trong DB được cập nhật
  DATA_CREATED:        'data:created',         // record mới được tạo
  DATA_DELETED:        'data:deleted',         // record bị xóa

  // System
  SYSTEM_ALERT:        'system:alert',         // thông báo hệ thống từ admin
  USER_ONLINE_COUNT:   'user:online_count',    // số users đang online (cho admin)
} as const;
```

**Client Events (emit từ client → server):**
```typescript
export const CLIENT_EVENTS = {
  MARK_NOTIFICATION_READ: 'notification:read',  // user đánh dấu đã đọc
  PING:                   'ping',               // keepalive
} as const;
```

**Tích hợp vào `NotificationsService`:**
```typescript
async send(params: SendNotificationParams): Promise<Notification> {
  // 1. Lưu vào DB
  const notification = await this.prisma.notification.create({ data: params });

  // 2. Emit real-time qua WebSocket
  this.gateway.server
    .to(`user:${params.userId}`)
    .emit(SERVER_EVENTS.NOTIFICATION_NEW, notification);

  // 3. Cập nhật unread count
  const unreadCount = await this.getUnreadCount(params.userId);
  this.gateway.server
    .to(`user:${params.userId}`)
    .emit(SERVER_EVENTS.NOTIFICATION_COUNT, { count: unreadCount });

  return notification;
}
```

**Redis Adapter — scale nhiều instance:**
```typescript
// Khi chạy nhiều backend instances, Redis Pub/Sub đảm bảo
// event emit từ instance A vẫn đến được client kết nối ở instance B
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

**Frontend — `useSocket` hook:**
```typescript
// apps/admin/src/hooks/useSocket.ts
export function useSocket() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Khi có notification mới → cập nhật cache TanStack Query
    socket.on(SERVER_EVENTS.NOTIFICATION_NEW, (notification) => {
      queryClient.setQueryData(['notifications'], (old: any) => ({
        ...old,
        data: [notification, ...(old?.data || [])],
      }));
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

      // Show toast
      toast(notification.title, { description: notification.body });
    });

    // Data updates → invalidate relevant queries
    socket.on(SERVER_EVENTS.DATA_CREATED, ({ resource }) => {
      queryClient.invalidateQueries({ queryKey: [resource] });
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error:', err.message);
      // Fallback về polling nếu WebSocket không khả dụng
    });

    return () => { socket.disconnect(); };
  }, [accessToken]);
}
```

**Connection state indicator (UI):**
```typescript
// Component hiển thị trạng thái kết nối WebSocket ở góc màn hình
// 🟢 Connected (xanh, ẩn sau 3s)
// 🟡 Reconnecting... (vàng, hiển thị luôn)
// 🔴 Disconnected (đỏ, hiển thị luôn + nút "Kết nối lại")
```

**✅ Test xác nhận:**
```bash
# 1. Mở Admin UI ở tab 1 (đã login)
# DevTools → Network → WS tab → thấy WebSocket connection

# 2. Từ terminal, tạo notification qua API
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"userId":"<user_id>","title":"Real-time test","body":"Bạn có thông báo mới"}'

# 3. Tab Admin UI:
# → Notification bell badge tăng ngay lập tức (không cần refresh)
# → Toast xuất hiện ở góc màn hình
# → Không có HTTP polling request nào trong Network tab

# 4. Test reconnect
# DevTools → Network → Offline → đợi 3s → Online
# → Toast "Đã kết nối lại" xuất hiện
# → WebSocket reconnect trong vài giây

# 5. Test Redis Pub/Sub (nếu chạy 2 instance)
# docker compose scale backend=2
# Gửi notification từ instance 1 → client kết nối instance 2 vẫn nhận được
```

---

## Task 7.4 — Email Nâng Cao 🟡 P2

**Mô tả:**  
Hoàn thiện email system cho production: unsubscribe chuẩn CAN-SPAM, live preview template trong dev, và bounce/complaint handling khi dùng AWS SES hoặc SendGrid.

**Việc cần làm:**

**Unsubscribe mechanism:**
- Thêm `emailPreferences` vào User model
- Mỗi email marketing/notification có link `Unsubscribe` ở footer
- Link chứa signed JWT (không cần login để unsubscribe)
- `GET /email/unsubscribe?token=xxx` → trang xác nhận → cập nhật preferences
- Kiểm tra preferences trước khi gửi email

```prisma
model EmailPreference {
  id                  String  @id @default(cuid())
  userId              String  @unique
  user                User    @relation(fields: [userId], references: [id])

  marketing           Boolean @default(true)   // newsletter, promotions
  productUpdates      Boolean @default(true)   // tính năng mới
  securityAlerts      Boolean @default(true)   // không cho unsubscribe
  weeklyDigest        Boolean @default(true)
  unsubscribedAll     Boolean @default(false)  // unsubscribe toàn bộ

  updatedAt           DateTime @updatedAt
}
```

**Template preview server (development):**
```typescript
// GET /api/email/preview/:templateName?data={}
// Render template với data mẫu → trả về HTML
// Tự động reload khi file template thay đổi (chokidar watch)
// Accessible tại http://localhost:3000/api/email/preview/welcome
@Get('preview/:template')
async previewTemplate(
  @Param('template') template: string,
  @Query('data') data: string,
) {
  if (process.env.NODE_ENV === 'production') throw new NotFoundException();
  const sampleData = data ? JSON.parse(data) : this.getSampleData(template);
  return this.mailService.renderTemplate(template, sampleData);
}
```

**Bounce & Complaint Handling (SES/SendGrid):**
```typescript
// Webhook endpoint nhận bounce/complaint từ email provider
// POST /api/webhooks/email/ses  (AWS SES → SNS → HTTP)
// POST /api/webhooks/email/sendgrid

// Khi nhận bounce cứng (hard bounce):
// → Đánh dấu email invalid trong DB
// → Không gửi email đến địa chỉ này nữa

// Khi nhận complaint (spam report):
// → Unsubscribe toàn bộ email cho user này
// → Log lại để review
```

**✅ Test xác nhận:**
```bash
# 1. Template preview
open http://localhost:3000/api/email/preview/welcome
# → HTML email hiển thị trong browser

open "http://localhost:3000/api/email/preview/reset-password?data={\"name\":\"John\",\"token\":\"abc\"}"
# → Email với tên và token custom

# 2. Unsubscribe flow
# Gửi email → click link Unsubscribe trong Maildev
# → Trang xác nhận unsubscribe
# → Confirm → "Đã hủy đăng ký thành công"
# → Thử gửi email marketing → bị skip (log: "User unsubscribed, skipping")
# → Security alert vẫn được gửi (không thể unsubscribe)

# 3. Email preferences
curl -X PATCH http://localhost:3000/api/users/me/email-preferences \
  -H "Authorization: Bearer <token>" \
  -d '{"marketing": false, "weeklyDigest": false}'
# → Preferences cập nhật
# → Email marketing không còn được gửi cho user này
```

---

## Task 7.5 — Scheduled Tasks / Cron Jobs 🟡 P2

**Mô tả:**  
Các tác vụ chạy tự động theo lịch: gửi digest email hàng tuần, dọn dẹp data cũ, tạo báo cáo. Dùng `@nestjs/schedule` + Bull Queue để đảm bảo không bị mất job khi restart.

**Việc cần làm:**
- Cài `@nestjs/schedule`
- Tạo `SchedulerModule` tập trung tất cả cron jobs
- Tạo `CronJobsService` với các jobs mẫu
- Admin UI: trang xem danh sách jobs + trạng thái + lần chạy gần nhất + trigger thủ công
- Lưu lịch sử chạy job vào DB để audit

**Prisma model:**
```prisma
model CronJobLog {
  id        String   @id @default(cuid())
  jobName   String
  status    String   // success | failed
  duration  Int      // milliseconds
  message   String?
  error     String?
  startedAt DateTime
  endedAt   DateTime
  createdAt DateTime @default(now())

  @@index([jobName, startedAt])
}
```

**Các jobs mẫu có sẵn:**
```typescript
@Injectable()
export class CronJobsService {

  // Dọn refresh tokens hết hạn — chạy lúc 3:00 AM mỗi ngày
  @Cron('0 3 * * *', { name: 'cleanup-expired-tokens' })
  async cleanupExpiredTokens() {
    const deleted = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.log('cleanup-expired-tokens', `Deleted ${deleted.count} expired tokens`);
  }

  // Dọn notifications cũ hơn 90 ngày — 4:00 AM Chủ nhật
  @Cron('0 4 * * 0', { name: 'cleanup-old-notifications' })
  async cleanupOldNotifications() {
    const cutoff = subDays(new Date(), 90);
    const deleted = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff }, isRead: true },
    });
    this.log('cleanup-old-notifications', `Deleted ${deleted.count} old notifications`);
  }

  // Gửi weekly digest email — 9:00 AM thứ Hai
  @Cron('0 9 * * 1', { name: 'weekly-digest' })
  async sendWeeklyDigest() {
    const activeUsers = await this.prisma.user.findMany({
      where: {
        emailPreferences: { weeklyDigest: true },
        status: 'ACTIVE',
      },
    });
    // Đưa vào Bull queue, không xử lý đồng bộ
    for (const user of activeUsers) {
      await this.mailQueue.add('weekly-digest', { userId: user.id });
    }
    this.log('weekly-digest', `Queued digest for ${activeUsers.length} users`);
  }

  // Tạo báo cáo thống kê hàng ngày — 1:00 AM
  @Cron('0 1 * * *', { name: 'daily-stats' })
  async generateDailyStats() {
    // Tính toán stats và lưu vào bảng riêng để dashboard load nhanh
    // thay vì query real-time mỗi lần
  }
}
```

**Admin UI — Cron Job Manager:**
```
/admin/system/cron-jobs

┌─────────────────────────┬──────────────┬────────────────────┬──────────┐
│ Job Name                │ Schedule     │ Last Run           │ Actions  │
├─────────────────────────┼──────────────┼────────────────────┼──────────┤
│ cleanup-expired-tokens  │ 0 3 * * *    │ 2 hours ago ✅     │ [Run now]│
│ cleanup-old-notifications│ 0 4 * * 0   │ 5 days ago ✅      │ [Run now]│
│ weekly-digest           │ 0 9 * * 1    │ 6 days ago ✅      │ [Run now]│
│ daily-stats             │ 0 1 * * *    │ 1 hour ago ✅      │ [Run now]│
└─────────────────────────┴──────────────┴────────────────────┴──────────┘

[Click vào job → xem log history]
```

**✅ Test xác nhận:**
```bash
# 1. Trigger job thủ công qua API
curl -X POST http://localhost:3000/api/admin/cron-jobs/cleanup-expired-tokens/run \
  -H "Authorization: Bearer <admin_token>"
# { "status": "started", "jobName": "cleanup-expired-tokens" }

# 2. Kiểm tra log
curl http://localhost:3000/api/admin/cron-jobs/cleanup-expired-tokens/logs \
  -H "Authorization: Bearer <admin_token>"
# [{ status: "success", duration: 45, message: "Deleted 12 expired tokens", ... }]

# 3. Tạo expired tokens giả → chạy cleanup → verify bị xóa
# Insert refresh token với expiresAt = yesterday vào DB
# Trigger cleanup job → verify token bị xóa

# 4. Test weekly digest
# Đặt EmailPreference.weeklyDigest = true cho vài users
# Trigger weekly-digest job
# → Check Bull queue: jobs được add
# → Check Maildev: emails được gửi
```

---

## Task 7.6 — Webhook System 🟡 P2

**Mô tả:**  
Cho phép đăng ký nhận HTTP callback khi có event xảy ra trong hệ thống. Cần thiết khi tích hợp với Stripe, GitHub, hoặc khi client muốn nhận event từ platform.

**Việc cần làm:**
- Tạo `WebhooksModule` cho phép đăng ký endpoint URL + chọn events
- HMAC SHA-256 signature để client verify request đến từ server
- Retry với exponential backoff (tối đa 5 lần: 1m, 5m, 30m, 2h, 12h)
- Delivery logs: xem history request/response
- Incoming webhooks: nhận webhook từ Stripe, GitHub (verify signature)

**Prisma models:**
```prisma
model Webhook {
  id          String         @id @default(cuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id])
  url         String
  secret      String         // để tạo HMAC signature
  events      String[]       // ["user.created", "order.paid", ...]
  isActive    Boolean        @default(true)
  description String?

  deliveries  WebhookDelivery[]
  createdAt   DateTime       @default(now())
}

model WebhookDelivery {
  id            String    @id @default(cuid())
  webhookId     String
  webhook       Webhook   @relation(fields: [webhookId], references: [id])
  event         String
  payload       Json
  statusCode    Int?
  responseBody  String?
  attempts      Int       @default(0)
  nextRetryAt   DateTime?
  status        String    // pending | success | failed
  createdAt     DateTime  @default(now())
}
```

**Danh sách events chuẩn:**
```typescript
export const WEBHOOK_EVENTS = {
  USER_CREATED:       'user.created',
  USER_UPDATED:       'user.updated',
  USER_DELETED:       'user.deleted',
  USER_LOGIN:         'user.login',
  PASSWORD_CHANGED:   'user.password_changed',
  // Thêm events theo từng dự án
} as const;
```

**Dispatch webhook với signature:**
```typescript
async dispatch(event: string, payload: Record<string, unknown>) {
  const webhooks = await this.findActiveByEvent(event);

  for (const webhook of webhooks) {
    await this.deliveryQueue.add('dispatch', {
      webhookId: webhook.id,
      event,
      payload,
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 60_000, // bắt đầu từ 1 phút
      },
    });
  }
}

// Tạo HMAC signature cho từng request
private createSignature(secret: string, payload: string): string {
  const timestamp = Date.now();
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
// Header: X-Webhook-Signature: t=1234567890,v1=abc123...
// Client verify: recompute signature với secret → so sánh
```

**✅ Test xác nhận:**
```bash
# 1. Đăng ký webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer <token>" \
  -d '{
    "url": "https://webhook.site/test-id",
    "events": ["user.created"],
    "description": "Test webhook"
  }'
# { id: "...", secret: "whsec_..." }

# 2. Trigger event
# Tạo user mới → webhook được gửi đến webhook.site

# 3. Verify trên webhook.site
# → Nhận POST request với body: { event: "user.created", data: {...} }
# → Header: X-Webhook-Signature có HMAC hợp lệ

# 4. Test retry
# Đặt URL không tồn tại → gửi event → retry 5 lần
curl http://localhost:3000/api/webhooks/<id>/deliveries \
  -H "Authorization: Bearer <token>"
# [{ status: "failed", attempts: 5, ... }]

# 5. Test signature verify (code mẫu cho client)
# const sig = req.headers['x-webhook-signature'];
# → Verify HMAC đúng với secret → accept
# → Sai → reject 403
```

---

## Task 7.7 — SMS / OTP qua Zalo OA 🟢 P3

**Mô tả:**  
Gửi OTP qua SMS hoặc Zalo OA — phổ biến ở Việt Nam. Thiết kế interface thống nhất, swap provider dễ dàng không sửa business logic.

**Việc cần làm:**
- Tạo `SmsModule` với provider interface
- Implement 2 providers: `EsmsProvider` (SMS), `ZaloOAProvider`
- Tích hợp vào 2FA Email OTP → có thể switch sang Phone OTP
- Rate limit: tối đa 5 OTP/số điện thoại/giờ
- Thêm `phone` field vào User model

**Provider interface:**
```typescript
interface ISmsProvider {
  send(params: {
    to: string;    // số điện thoại: 0912345678 hoặc +84912345678
    message: string;
  }): Promise<{ success: boolean; messageId?: string }>;
}

// Chọn provider qua env
// SMS_PROVIDER=esms | zalo
```

**Zalo OA Provider:**
```typescript
// Zalo OA gửi message tới người dùng đã follow OA
// Rẻ hơn SMS, tỉ lệ nhận cao hơn ở Việt Nam
// Yêu cầu: user phải follow Zalo OA, lưu zaloUserId

async sendZaloOTP(zaloUserId: string, otp: string): Promise<void> {
  await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
    method: 'POST',
    headers: {
      'access_token': process.env.ZALO_OA_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { user_id: zaloUserId },
      message: {
        text: `[MyApp] Mã xác thực của bạn là: ${otp}. Có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.`,
      },
    }),
  });
}
```

**✅ Test xác nhận:**
```bash
# Setup với eSMS test account
# POST /api/auth/phone/send-otp { phone: "0912345678" }
# → Nhận SMS với mã 6 số (hoặc check eSMS dashboard)

# POST /api/auth/phone/verify { phone: "0912345678", code: "123456" }
# → { verified: true }

# Test rate limit
# Gửi 6 lần trong 1 giờ → lần 6: 429 "Quá nhiều yêu cầu"

# Test Zalo OA (nếu có OA account)
# → Nhắn tin từ Zalo → nhận mã OTP qua chat
```

---

## Task 7.8 — Feature Flags 🟢 P3

**Mô tả:**  
Bật/tắt tính năng mà không cần deploy lại. Hữu ích cho: deploy an toàn (tắt feature mới nếu có bug), A/B test, rollout từng nhóm user.

**Việc cần làm:**
- Tạo `FeatureFlagsModule` với model trong DB
- Admin UI: toggle flags, target theo userId/role/percentage
- Backend decorator `@FeatureFlag('flag-name')` cho route/service
- Frontend hook `useFeatureFlag('flag-name')` để show/hide UI
- Cache flags trong Redis (TTL 60s) để không query DB mỗi request

**Prisma model:**
```prisma
model FeatureFlag {
  id          String  @id @default(cuid())
  key         String  @unique  // "new-dashboard", "beta-checkout"
  name        String
  description String?
  isEnabled   Boolean @default(false)

  // Targeting rules (nếu isEnabled = false nhưng có rules)
  targetUsers   String[]   // userIds cụ thể
  targetRoles   String[]   // ["ADMIN", "BETA_USER"]
  rolloutPercent Int?       // 0-100: % users ngẫu nhiên

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Backend decorator:**
```typescript
// Route level
@FeatureFlag('new-api-v2')
@Get('new-endpoint')
async newEndpoint() { ... }
// → 404 nếu flag tắt

// Service level
async processOrder(orderId: string) {
  if (await this.featureFlags.isEnabled('new-payment-flow', userId)) {
    return this.newPaymentFlow(orderId);
  }
  return this.legacyPaymentFlow(orderId);
}
```

**Frontend hook:**
```typescript
// Fetch flags một lần khi login, cache trong Zustand
const { isEnabled } = useFeatureFlag('new-dashboard');
return isEnabled ? <NewDashboard /> : <OldDashboard />;
```

**✅ Test xác nhận:**
```bash
# 1. Tạo feature flag
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -d '{"key":"new-feature","name":"New Feature","isEnabled":false}'

# 2. Kiểm tra feature bị ẩn
curl http://localhost:3000/api/new-feature-endpoint
# 404 Not Found

# 3. Bật flag
curl -X PATCH http://localhost:3000/api/admin/feature-flags/new-feature \
  -d '{"isEnabled":true}'

# 4. Kiểm tra feature hoạt động
curl http://localhost:3000/api/new-feature-endpoint
# 200 OK

# 5. Test targeting theo role
# Flag tắt globally, nhưng targetRoles: ["ADMIN"]
# → Login admin → thấy feature
# → Login user → không thấy feature

# 6. Test rollout 50%
# targetRoles: [], rolloutPercent: 50
# → 50% users thấy feature (deterministic theo userId hash)
```

---

## Checklist Hoàn thành Phase 7

```
P1 — In-App Notifications (7.1)
☑ POST /notifications → tạo thành công, lưu vào DB
☑ GET /notifications → paginated, đúng user
☑ PATCH /notifications/read-all → unread count về 0
☑ Bell icon badge cập nhật đúng
☑ Click notification → navigate đến actionUrl

P1 — 2FA (7.2)
☑ Setup TOTP → QR code scan được bằng Google Authenticator
☑ Login với 2FA TOTP → nhập code → vào được dashboard
☑ Login sai code 5 lần → bị lock 15 phút
☑ Backup code dùng được 1 lần → lần 2 bị từ chối
☑ Email OTP → nhận mã trong Maildev → verify thành công

P1 — WebSocket (7.3)
☑ Tạo notification → frontend nhận ngay (không reload)
☑ Toast hiển thị khi có notification mới
☑ Disconnect → reconnect → không mất events trong thời gian reconnect
☑ Network tab: không có polling request, chỉ có WebSocket

P2 — Email nâng cao (7.4)
☑ Preview template: http://localhost:3000/api/email/preview/welcome
☑ Unsubscribe link trong email → click → confirmed unsubscribed
☑ Gửi email cho user đã unsubscribe → bị skip (không gửi)
☑ Security alert vẫn gửi dù đã unsubscribe

P2 — Cron Jobs (7.5)
☑ Trigger job thủ công → chạy thành công → log được lưu
☑ Cron schedule đúng giờ (test với schedule 1 phút)
☑ Admin UI hiển thị danh sách jobs + last run

P2 — Webhooks (7.6)
☑ Đăng ký webhook URL → nhận event khi có action
☑ HMAC signature verify đúng
☑ URL lỗi → retry đúng schedule (exponential backoff)
☑ Delivery log hiển thị đúng status

P3 — SMS/Zalo (7.7)
☑ Gửi OTP qua SMS → nhận được trên điện thoại
☑ Rate limit 5 OTP/giờ/số hoạt động

P3 — Feature Flags (7.8)
☑ Tắt flag → route trả về 404
☑ Bật flag → route hoạt động
☑ Target theo role → chỉ đúng role mới thấy
☑ Cache Redis: bật flag → có hiệu lực trong max 60s
```
