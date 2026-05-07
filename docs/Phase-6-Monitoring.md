# Phase 6 — Monitoring & Observability

> **Mục tiêu:** Biết ngay khi hệ thống có vấn đề — trước cả khi user báo. Toàn bộ stack monitoring chạy cùng Docker Compose trên VPS, không phụ thuộc dịch vụ ngoài (ngoại trừ Sentry free tier tùy chọn).  
> **Thời gian ước tính:** 2–3 ngày  
> **Prerequisite:** Phase 1–5 hoàn thành, production stack đang chạy.

---

## Tổng quan kiến trúc monitoring

```
┌─────────────────────────────────────────────────────────────┐
│                     VPS Docker Environment                   │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐   │
│  │ Backend  │   │  Admin   │   │      User App        │   │
│  │ NestJS   │   │ Next.js  │   │      Next.js          │   │
│  └────┬─────┘   └────┬─────┘   └──────────┬───────────┘   │
│       │metrics        │RUM/errors           │RUM/errors     │
│       ↓               ↓                    ↓               │
│  ┌────────────┐  ┌────────────────────────────────────┐    │
│  │ Prometheus │  │           Sentry                   │    │
│  │ (scrape)   │  │  (error tracking + performance)    │    │
│  └─────┬──────┘  └────────────────────────────────────┘    │
│        │                      ↓                             │
│        ↓              ┌───────────────┐                    │
│  ┌──────────────┐     │  Alerting     │                    │
│  │   Grafana    │←────│  (Email /     │                    │
│  │  Dashboard   │     │   Telegram)   │                    │
│  └──────┬───────┘     └───────────────┘                    │
│         │                                                   │
│  ┌──────┴───────┐  ┌──────────────┐  ┌────────────────┐   │
│  │     Loki     │  │ Uptime Kuma  │  │ Node Exporter  │   │
│  │ (log aggr.)  │  │  (uptime)    │  │ (VPS metrics)  │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Task 6.1 — Docker Compose Monitoring Stack

**Mô tả:**  
Thêm toàn bộ monitoring services vào Docker Compose. Tách riêng file `docker-compose.monitoring.yml` để không làm phức tạp file chính, dễ bật/tắt độc lập.

**Việc cần làm:**

- Tạo `docker/docker-compose.monitoring.yml`
- Tạo cấu hình cho: Prometheus, Grafana, Loki, Promtail, Node Exporter, Uptime Kuma
- Tạo thư mục `docker/monitoring/` chứa config files
- Thêm Makefile targets cho monitoring
- Đảm bảo monitoring services dùng chung network với app services

**`docker/docker-compose.monitoring.yml`:**

```yaml
version: '3.9'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: app_prometheus
    restart: unless-stopped
    ports:
      - '9090:9090'
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    networks: [app_network, monitoring_network]

  grafana:
    image: grafana/grafana:latest
    container_name: app_grafana
    restart: unless-stopped
    ports:
      - '3100:3000'
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-grafana123}
      GF_USERS_ALLOW_SIGN_UP: 'false'
      GF_SMTP_ENABLED: 'true'
      GF_SMTP_HOST: ${MAIL_HOST}:${MAIL_PORT}
      GF_SMTP_FROM_ADDRESS: ${MAIL_FROM}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    networks: [monitoring_network]

  loki:
    image: grafana/loki:latest
    container_name: app_loki
    restart: unless-stopped
    ports:
      - '3101:3100'
    volumes:
      - ./monitoring/loki/loki.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks: [monitoring_network]

  promtail:
    image: grafana/promtail:latest
    container_name: app_promtail
    restart: unless-stopped
    volumes:
      - ./monitoring/promtail/promtail.yml:/etc/promtail/config.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock
    command: -config.file=/etc/promtail/config.yml
    networks: [monitoring_network]

  node_exporter:
    image: prom/node-exporter:latest
    container_name: app_node_exporter
    restart: unless-stopped
    ports:
      - '9100:9100'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks: [monitoring_network]

  uptime_kuma:
    image: louislam/uptime-kuma:latest
    container_name: app_uptime_kuma
    restart: unless-stopped
    ports:
      - '3102:3001'
    volumes:
      - uptime_kuma_data:/app/data
    networks: [app_network, monitoring_network]

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  uptime_kuma_data:

networks:
  app_network:
    external: true
    name: docker_app_network
  monitoring_network:
    driver: bridge
```

**`docker/monitoring/prometheus/alerts.yml`:**

```yaml
groups:
  - name: app_alerts
    rules:
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: 'RAM usage > 85% trong 5 phút'

      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_free_bytes / node_filesystem_size_bytes)) * 100 > 80
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: 'Disk usage > 80%'

      - alert: BackendDown
        expr: up{job="backend"} == 0
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: 'Backend service không phản hồi'

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: 'Error rate > 10% trong 5 phút'

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: 'P95 response time > 2s'
```

**Makefile targets bổ sung:**

```makefile
monitoring-up: ## Khởi động monitoring stack
	docker compose -f docker/docker-compose.monitoring.yml up -d
	@echo "📊 Grafana:      http://localhost:3100"
	@echo "📈 Prometheus:   http://localhost:9090"
	@echo "🔍 Uptime Kuma:  http://localhost:3102"

monitoring-down: ## Dừng monitoring stack
	docker compose -f docker/docker-compose.monitoring.yml down

monitoring-logs: ## Xem logs monitoring services
	docker compose -f docker/docker-compose.monitoring.yml logs -f
```

**✅ Test xác nhận:**

```bash
make monitoring-up

docker compose -f docker/docker-compose.monitoring.yml ps
# prometheus:    running
# grafana:       running
# loki:          running
# promtail:      running
# node_exporter: running
# uptime_kuma:   running

# Grafana: http://localhost:3100 → login admin/grafana123 → dashboard mở
# Prometheus: http://localhost:9090 → Status → Targets → tất cả UP
# Uptime Kuma: http://localhost:3102 → setup wizard xuất hiện
```

---

## Task 6.2 — Backend Metrics Endpoint (Prometheus)

**Mô tả:**  
Expose metrics từ NestJS để Prometheus scrape. Bao gồm HTTP metrics (request count, latency, error rate) và custom business metrics.

**Việc cần làm:**

- Cài `@willsoto/nestjs-prometheus`, `prom-client`
- Expose endpoint `GET /api/metrics` (IP whitelist hoặc internal-only)
- Track các metrics:
  - `http_requests_total` — counter theo method, route, status code
  - `http_request_duration_seconds` — histogram latency
  - `active_connections` — gauge
  - `db_query_duration_seconds` — histogram Prisma query time
  - `email_queue_size` — gauge Bull queue
  - `file_upload_total` — counter

**`MetricsModule` setup:**

```typescript
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/api/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
})
export class MetricsModule {}
```

**Custom HTTP metrics interceptor:**

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, route } = req;
    const end = this.requestDuration.startTimer();

    return next.handle().pipe(
      tap(() => {
        const statusCode = context.switchToHttp().getResponse().statusCode;
        this.requestCounter.inc({ method, route: route?.path, status: statusCode });
        end({ method, route: route?.path, status: statusCode });
      }),
    );
  }
}
```

**Prisma query metrics middleware:**

```typescript
// Trong PrismaService — đo thời gian mỗi query
this.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  dbQueryDuration.observe({ model: params.model, action: params.action }, (after - before) / 1000);
  return result;
});
```

**✅ Test xác nhận:**

```bash
# Gọi vài requests
for i in {1..10}; do curl -s http://localhost:3000/api/health; done

curl http://localhost:3000/api/metrics | grep http_requests_total
# http_requests_total{method="GET",route="/api/health",status="200"} 10

# Prometheus UI → Graph → query: http_requests_total → thấy data points
# Prometheus Targets → backend: UP ✅
```

---

## Task 6.3 — Grafana Dashboards (Auto-provisioning)

**Mô tả:**  
Tạo dashboards pre-built tự động load khi khởi động Grafana. Không cần setup thủ công mỗi lần deploy mới.

**Việc cần làm:**

- Cấu hình Grafana provisioning (datasources + dashboards tự động load)
- Tạo **Dashboard 1: System Overview** — VPS metrics
- Tạo **Dashboard 2: Backend Performance** — API metrics
- Tạo **Dashboard 3: Application Logs** — Loki log viewer
- Cấu hình alert rules gửi email khi có vấn đề

**Cấu trúc provisioning:**

```
docker/monitoring/grafana/
├── provisioning/
│   ├── datasources/datasources.yml   ← auto-connect Prometheus + Loki
│   └── dashboards/dashboards.yml     ← auto-load JSON dashboards
└── dashboards/
    ├── system-overview.json
    ├── backend-performance.json
    └── application-logs.json
```

**`provisioning/datasources/datasources.yml`:**

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

**Dashboard 1 — System Overview panels:**

```
Row 1: [CPU Usage %]  [RAM Usage %]  [Disk Usage %]  [Uptime]
Row 2: [CPU Over Time — line chart]  [Memory Over Time — line chart]
Row 3: [Network In/Out]  [Disk Read/Write]  [Load Average]
```

**Dashboard 2 — Backend Performance panels:**

```
Row 1: [Requests/min]  [Error Rate %]  [P95 Latency]  [Active Connections]
Row 2: [Request Rate by Status Code]  [Latency Percentiles P50/P95/P99]
Row 3: [DB Query Duration]  [Slow Queries >500ms]  [Email Queue Size]
Row 4: [5xx Errors Over Time]  [Top Error Routes — table]
```

**Dashboard 3 — Application Logs panels:**

```
Row 1: [Log Rate by Level — bar chart: info/warn/error]
Row 2: [Live log stream — filter by level, service, search text]
       LogQL: {container=~"app_.*"} |= `$search` | json
```

**Alert rule mẫu:**

```
Tên: "High Error Rate"
Condition: avg(rate(http_requests_total{status=~"5.."}[5m])) > 0.1
For: 5 minutes
Notification channel: Email → admin@example.com
Message: "⚠️ Error rate vượt 10% — kiểm tra ngay!"
```

**✅ Test xác nhận:**

```bash
# Restart Grafana để load provisioning
docker restart app_grafana

# http://localhost:3100 → Dashboards → Browse
# → 3 dashboards đã được tạo sẵn ✅

# System Overview: CPU/RAM/Disk hiển thị số liệu thực VPS

# Backend Performance:
for i in {1..50}; do curl -s http://localhost:3000/api/health; done
# → Request rate panel tăng lên, thấy graph

# Test alert → trigger 5xx errors → sau 5 phút
# → Alert "Firing" trong Grafana Alerting
# → Email được gửi (kiểm tra Maildev: http://localhost:1080)
```

---

## Task 6.4 — Sentry Error Tracking (Backend + Frontend)

**Mô tả:**  
Sentry bắt exceptions tự động kèm full context: stack trace, request info, user info, session replay. Khi production crash lúc 3 giờ sáng, nhận alert và biết chính xác dòng code nào lỗi mà không cần SSH.

**Việc cần làm:**

- Tạo tài khoản Sentry (sentry.io — free 5k errors/tháng) → tạo 3 projects: `backend`, `admin`, `web`
- Cài `@sentry/nestjs` + `@sentry/profiling-node` cho backend
- Cài `@sentry/nextjs` cho admin và web
- Gắn user context vào mỗi error (biết lỗi ảnh hưởng ai)
- Cấu hình source maps để stack trace đúng file/dòng
- Thêm `SENTRY_DSN_*` vào `.env.example`

**Backend — `main.ts`:**

```typescript
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN_BACKEND,
  environment: process.env.NODE_ENV,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  profilesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN_BACKEND,
});
```

**Backend — gắn user context + capture trong GlobalExceptionFilter:**

```typescript
// Sau khi verify JWT token thành công:
Sentry.setUser({ id: user.id, email: user.email, role: user.role });

// Trong GlobalExceptionFilter:
Sentry.captureException(exception, {
  extra: {
    requestId: request.headers['x-request-id'],
    body: request.body,
    query: request.query,
  },
});
```

**Frontend Admin — `sentry.client.config.ts`:**

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_ADMIN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1, // Record 10% sessions bình thường
  replaysOnErrorSampleRate: 1.0, // Record 100% sessions có error
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN_ADMIN,
});
```

**Frontend — gắn/xóa user context theo auth state:**

```typescript
// Trong auth store, sau login:
Sentry.setUser({ id: user.id, email: user.email, role: user.role });

// Sau logout:
Sentry.setUser(null);
```

**`.env.example` bổ sung:**

```env
# Sentry — để trống nếu không dùng, sẽ tự động disabled
SENTRY_DSN_BACKEND=
NEXT_PUBLIC_SENTRY_DSN_ADMIN=
NEXT_PUBLIC_SENTRY_DSN_WEB=
GRAFANA_USER=admin
GRAFANA_PASSWORD=grafana123
```

**✅ Test xác nhận:**

```bash
# Backend: tạo endpoint test
# GET /api/test/error → throw new Error('Test Sentry backend')
curl http://localhost:3000/api/test/error

# Sentry dashboard → project "backend"
# → Error "Test Sentry backend" xuất hiện với:
#   ✅ Stack trace đúng file/dòng (nhờ source maps)
#   ✅ Request URL, method, headers
#   ✅ User info nếu đã login

# Frontend Admin: trong một component
# throw new Error('Test Sentry admin')
# Sentry dashboard → project "admin"
# → Error xuất hiện với:
#   ✅ Component stack trace
#   ✅ Session replay — click "Replay" xem lại thao tác user
#   ✅ Browser, OS, URL

# Test alert: Sentry → Alerts → tạo rule "New error → send email"
# Trigger error → nhận email trong vài giây ✅
```

---

## Task 6.5 — Frontend Admin Monitoring Dashboard

**Mô tả:**  
Trang monitoring tích hợp ngay trong admin portal — không cần mở Grafana riêng. SUPER_ADMIN có thể xem health hệ thống, metrics, recent errors và resource usage trong giao diện quen thuộc mà không cần biết Grafana hay Prometheus.

**Việc cần làm:**

- Tạo trang `/monitoring` trong admin (chỉ `SUPER_ADMIN` truy cập được)
- Thêm vào sidebar nav với icon `Activity`, badge đỏ khi có errors
- Tạo backend endpoint `GET /api/admin/monitoring/overview`
- Auto-refresh mỗi 60 giây, hiển thị countdown "Last updated"
- Trang chia thành 6 sections

**Section 1 — Service Health Cards:**

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Backend     │ │  Database    │ │    Redis     │ │   Storage    │
│  ● Healthy   │ │  ● Healthy   │ │  ● Healthy   │ │  ● Healthy   │
│  45ms avg    │ │  12ms avg    │ │   1ms avg    │ │   Online     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
Màu: xanh = Healthy · vàng = Degraded · đỏ = Down
```

**Section 2 — Key Metrics (24h):**

```
┌──────────────────────────────────────────────────────────────┐
│  [Total Requests]  [Error Rate]  [Avg Latency]  [Uptime %]  │
│      12,450           0.8%          125ms          99.9%     │
└──────────────────────────────────────────────────────────────┘
```

**Section 3 — Request Rate Chart (recharts, 24h):**

```
Line chart 2 series theo giờ:
  ─── Total requests  (xanh)
  ─── Error requests  (đỏ)
Auto-refresh mỗi 60 giây
```

**Section 4 — Recent Errors Table:**

```
┌──────────────┬───────┬──────────────────────────┬──────────────┐
│ Time         │ Level │ Message                  │ Route        │
├──────────────┼───────┼──────────────────────────┼──────────────┤
│ 2 mins ago   │ ERROR │ DB connection timeout    │ POST /users  │
│ 15 mins ago  │ WARN  │ Rate limit exceeded      │ POST /login  │
│ 1 hour ago   │ ERROR │ File upload failed       │ POST /upload │
└──────────────┴───────┴──────────────────────────┴──────────────┘
Click row → modal chi tiết với stack trace đầy đủ
```

**Section 5 — System Resources:**

```
CPU:   [████████░░░░░░░░] 45%   Last 5min avg: 42%
RAM:   [████████████░░░░] 67%   Used: 1.3 GB / 2 GB
Disk:  [██████░░░░░░░░░░] 38%   Used: 19 GB / 50 GB
```

**Section 6 — Queue Status:**

```
Email Queue:  3 pending  ·  0 failed  ·  1,240 completed
```

**Backend endpoint response type:**

```typescript
interface MonitoringOverview {
  services: {
    backend: { status: 'healthy' | 'degraded' | 'down'; latencyMs: number };
    database: { status: 'healthy' | 'degraded' | 'down'; latencyMs: number };
    redis: { status: 'healthy' | 'degraded' | 'down'; latencyMs: number };
    storage: { status: 'healthy' | 'degraded' | 'down' };
  };
  metrics24h: {
    totalRequests: number;
    errorRate: number; // percentage 0–100
    avgLatencyMs: number;
    uptimePercent: number;
  };
  requestChart: Array<{
    hour: string; // "14:00"
    total: number;
    errors: number;
  }>;
  recentErrors: Array<{
    id: string;
    timestamp: string;
    level: 'error' | 'warn';
    message: string;
    route: string;
    stackTrace?: string;
  }>;
  system: {
    cpuPercent: number;
    memUsedMb: number;
    memTotalMb: number;
    diskUsedGb: number;
    diskTotalGb: number;
  };
  queues: {
    email: { pending: number; failed: number; completed: number };
  };
}
```

**Service health check logic:**

```typescript
// Ping mỗi service và đo latency
// PostgreSQL:  SELECT 1  →  latency > 500ms = degraded, exception = down
// Redis:       PING      →  latency > 200ms = degraded, exception = down
// MinIO:       listBuckets → exception = down
// Backend:     tự check (luôn healthy nếu endpoint trả về 200)
```

**Frontend — TanStack Query + auto-refresh:**

```typescript
const { data, isFetching } = useQuery({
  queryKey: ['monitoring-overview'],
  queryFn: fetchMonitoringOverview,
  refetchInterval: 60_000, // tự refresh mỗi 60 giây
  staleTime: 30_000,
});

// Hiển thị countdown "Last updated: Xs ago"
// Nút manual refresh với spinner khi isFetching
// Status dot nhấp nháy khi đang fetch
```

**Sidebar nav — badge đỏ khi có lỗi:**

```typescript
// nav-items.config.ts
{
  title: 'Monitoring',
  href: '/monitoring',
  icon: Activity,
  roles: [UserRole.SUPER_ADMIN],
  // badge tự động query /api/admin/monitoring/error-count mỗi 60s
  // hiển thị số đỏ nếu có recent errors trong 1 giờ qua
}
```

**✅ Test xác nhận:**

```bash
# 1. Permission
#    Login SUPER_ADMIN → thấy "Monitoring" trong sidebar
#    Login ADMIN → không thấy menu này
#    Truy cập /monitoring trực tiếp với ADMIN token → 403

# 2. Service health cards
#    Tất cả 4 cards hiển thị "Healthy" màu xanh với latency ms
#    Simulate DB slow: thêm delay vào health check query
#    → Card "Database" chuyển sang "Degraded" màu vàng

# 3. Request chart
#    Gọi 20 requests: for i in {1..20}; do curl http://localhost:3000/api/health; done
#    Đợi auto-refresh (60s) hoặc click Refresh
#    → Bar của giờ hiện tại tăng lên

# 4. Recent errors
#    Gọi route sai 5 lần: for i in {1..5}; do curl http://localhost:3000/api/wrong; done
#    Refresh → 5 entries mới xuất hiện trong bảng
#    Click row → modal hiển thị message + route đầy đủ

# 5. System resources
#    CPU/RAM/Disk hiển thị số liệu thực
#    Chạy: stress --cpu 2 --timeout 30 (cần cài stress)
#    Sau 60s auto-refresh → CPU % tăng lên

# 6. Auto-refresh
#    Quan sát "Last updated" đếm ngược 60→0 → tự động refresh
#    Metrics cập nhật không cần reload trang

# 7. Sidebar badge
#    Khi có recent errors → icon "Monitoring" có badge số đỏ
#    Vào trang, errors đã qua 1 giờ → badge biến mất
```

---

## Task 6.6 — Uptime Kuma

**Mô tả:**  
Monitor uptime tất cả endpoints quan trọng. Alert ngay khi service down, không chờ user báo. Status page public để chia sẻ với client nếu cần.

**Việc cần làm:**

- Setup Uptime Kuma lần đầu qua UI
- Tạo 6 monitors cho tất cả services
- Cấu hình notification (Email + Telegram tùy chọn)
- Export config để tái sử dụng cho dự án mới

**Monitors cần tạo:**

```
1. Backend API Health
   Type: HTTP · URL: http://app_backend:3000/api/health
   Interval: 60s · Expected: 200

2. Admin App
   Type: HTTP · URL: http://app_admin:3001
   Interval: 60s

3. User App
   Type: HTTP · URL: http://app_web:3002
   Interval: 60s

4. PostgreSQL
   Type: TCP Port · Host: app_postgres · Port: 5432
   Interval: 60s

5. Redis
   Type: TCP Port · Host: app_redis · Port: 6379
   Interval: 60s

6. MinIO
   Type: HTTP · URL: http://app_minio:9000/minio/health/live
   Interval: 120s
```

**Telegram notification (nhanh hơn email):**

```
1. Chat với @BotFather → /newbot → lấy BOT_TOKEN
2. Gửi message tới bot → lấy CHAT_ID từ
   https://api.telegram.org/bot<TOKEN>/getUpdates
3. Thêm vào .env:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
4. Uptime Kuma → Settings → Notifications → Add Telegram
```

**✅ Test xác nhận:**

```bash
# Truy cập http://localhost:3102 → tạo admin account
# Tạo 6 monitors → tất cả ● UP (xanh)

# Simulate downtime:
docker stop app_backend

# Sau 60–120 giây:
# → Monitor "Backend API Health" → ● DOWN (đỏ)
# → Nhận email / Telegram: "Backend API Health is DOWN"

docker start app_backend
# Sau vài phút → ● UP + recovery notification

# Kiểm tra uptime statistics:
# Click monitor → thấy uptime %, response time chart, incident history
```

---

## Task 6.7 — Log Aggregation với Loki + Promtail

**Mô tả:**  
Thu thập logs từ tất cả containers, query bằng Grafana UI thay vì SSH grep. Khi có incident, tìm root cause trong vài giây thay vì hàng giờ.

**Việc cần làm:**

- Cấu hình Promtail scrape logs từ tất cả Docker containers
- Cấu hình Loki lưu và index logs với retention 30 ngày
- Cập nhật Winston backend output JSON (Loki parse được)
- Tạo Loki query library trong Grafana (saved queries)

**`docker/monitoring/promtail/promtail.yml`:**

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker_containers
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
        filters:
          - name: name
            values: ['app_backend', 'app_admin', 'app_web']
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: container
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: stream
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            request_id: requestId
      - labels:
          level:
          request_id:
```

**Winston config cập nhật — JSON format production:**

```typescript
export const winstonConfig: WinstonModuleOptions = {
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(), // Loki parse được
            )
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(), // Dễ đọc khi dev
            ),
    }),
  ],
};
```

**Saved queries trong Grafana (tạo sẵn để dùng nhanh):**

```logql
# Tất cả errors từ backend
{container="app_backend"} |= `"level":"error"` | json

# Trace một request cụ thể theo ID
{container="app_backend"} |= `"requestId":"abc-123"` | json

# Slow requests (> 1000ms)
{container="app_backend"} | json | duration > 1000

# Login thất bại
{container="app_backend"} |= `"action":"login"` |= `"status":401` | json

# Tất cả logs của một user
{container="app_backend"} |= `"userId":"user_cuid_here"` | json

# Errors trong 1 giờ qua từ tất cả services
{container=~"app_.*"} |= `"level":"error"` | json
```

**✅ Test xác nhận:**

```bash
# Tạo log events
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"wrong@test.com","password":"wrong"}'
curl http://localhost:3000/api/nonexistent

# Grafana → Explore → Datasource: Loki
# Query: {container="app_backend"}
# → Logs xuất hiện real-time với màu theo level ✅

# Filter by level:
# {container="app_backend"} |= `"level":"error"`
# → Chỉ thấy error logs ✅

# Trace theo requestId:
curl -I http://localhost:3000/api/health
# X-Request-ID: req-abc-123

# Loki query: {container="app_backend"} |= `"req-abc-123"`
# → Tìm thấy đúng request đó ✅

# Dashboard "Application Logs":
# → Log stream panel hiển thị logs live với màu info/warn/error
# → Filter field hoạt động, search text tìm được theo keyword
```

---

## Checklist Hoàn thành Phase 6

```
Infrastructure
☑ make monitoring-up → 6 containers running không lỗi
☑ Prometheus Targets → tất cả UP màu xanh

Grafana
☑ 3 dashboards tự động load khi khởi động (provisioning)
☑ System Overview: CPU/RAM/Disk số liệu thực
☑ Backend Performance: request rate thay đổi khi gọi API
☑ Alert rule trigger → email được gửi (kiểm tra Maildev)

Sentry
☑ Backend throw exception → xuất hiện Sentry với stack trace đúng dòng
☑ Frontend error → xuất hiện với session replay có thể xem lại
☑ User context (email, role) gắn vào mỗi error

Admin Monitoring Page (/monitoring)
☑ Chỉ SUPER_ADMIN truy cập được, ADMIN bị 403
☑ 4 service health cards đúng status + latency
☑ Request chart cập nhật khi gọi API
☑ Recent errors table có data, click xem modal chi tiết
☑ CPU/RAM/Disk hiển thị số liệu thực từ backend
☑ Auto-refresh 60 giây, countdown hiển thị
☑ Sidebar badge đỏ khi có recent errors

Uptime Kuma
☑ 6 monitors đều UP
☑ Dừng backend → alert trong vòng 2 phút
☑ Khởi động lại → recovery alert

Loki
☑ Logs từ app_backend xuất hiện trong Grafana Explore
☑ Filter level=error hoạt động
☑ Tìm log theo requestId hoạt động
```

---

## Implementation Status (2026-05-07)

```
☑ Added docker monitoring stack scaffold:
  - docker/docker-compose.monitoring.yml
  - docker/monitoring/prometheus|grafana|loki|promtail configs
☑ Added Makefile monitoring targets: monitoring-up/down/logs
☑ Added backend /api/metrics endpoint (Prometheus text format baseline)
☑ Added request-id propagation in response + error payloads
☑ Added metrics interceptor for request count/latency/error tracking
☑ Added admin endpoints:
  - GET /api/admin/monitoring/overview (SUPER_ADMIN)
  - GET /api/admin/monitoring/error-count (SUPER_ADMIN)
☑ Added admin /monitoring page + sidebar badge (SUPER_ADMIN only)
☐ Pending runtime validation on VPS (docker monitors + alert channels)
☐ Pending Sentry full integration (backend/admin/web DSN wiring)
```
