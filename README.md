# 🛡️ Hiroki Panel — Hệ Thống Cấp Key 12 Giờ & Quản Lý Bản Quyền Bảo Mật

**Hiroki Panel** là giải pháp Fullstack Next.js (App Router) + Supabase PostgreSQL chuyên dụng để cấp Key miễn phí 12 giờ tự động (qua liên kết rút gọn) và quản lý bản quyền phần mềm / Game Client với cơ chế ký số Ed25519, khóa cứng thiết bị (HWID Lock) ở phía Game và bảng quản trị Admin tối tân.

---

## ✨ Điểm Nổi Bật Về Tính Năng & Kiến Trúc Bảo Mật

1. **Khóa Thiết Bị Đúng Vị Trí (In-Game HWID Binding):**
   - Người dùng lấy Key trên Web hoàn toàn tự do (không bị khóa cứng thiết bị trên trình duyệt).
   - Thiết bị (`device_id`) chỉ bị khóa cứng khi người dùng dán Key vào **Menu Mod trong Game** thông qua RPC PostgreSQL nguyên tử (`verify_and_bind_key`).
   - Ngăn chặn triệt để tình trạng Race Condition khi nhiều máy cùng tranh chấp 1 mã Key.

2. **Quy Trình Nhận Key Chống Bypass (Anti-Bypass Claim Flow):**
   - Bấm **Lấy Key** chỉ tạo phiên chờ (`claim_sessions` trạng thái `PENDING`), **chưa hề tạo Key** và chưa tính giờ.
   - Chỉ khi người dùng hoàn thành link rút gọn và gửi xác nhận tại `/claim?token=...`, hệ thống mới mint Key thật 12 giờ và bắt đầu đếm ngược thời gian.
   - Sàn thời gian tối thiểu (`min_claim_seconds`, mặc định 25s) và mã PIN 6 số dự phòng (hỗ trợ chuyển đổi mạng 4G/Wi-Fi hoặc đổi trình duyệt In-App).

3. **Tự Động Bay Màu Key Hết Hạn & Thống Kê Độc Lập:**
   - Key hết hạn quá 12 giờ sẽ bị xóa hoàn toàn khỏi bảng `license_keys` (nhờ `pg_cron` gọi `cleanup_expired_data(0)` định kỳ 5 phút) giúp database luôn nhẹ nhàng.
   - Lượt dùng, số lượt claim và tỷ lệ thành công được lưu trữ độc lập tại bảng `daily_metrics` (không bị mất khi Key bị xóa).

4. **Ký Số Ed25519 & Heartbeat Không Nghẽn Database:**
   - Endpoint `/api/v1/verify` và `/api/v1/heartbeat` trả về chuỗi **Canonical JSON** được ký số bằng thuật toán **Ed25519** (hỗ trợ luân chuyển cặp khóa `k1` và `k2`). Client Game xác thực chữ ký hoàn toàn offline.
   - `session_token` có hiệu lực 5 phút giúp game client gọi Heartbeat định kỳ 3 phút mà không phải truy vấn liên tục vào Postgres.

5. **Trang Quản Trị Admin Tùy Biến Tuyệt Đối (`/admin`):**
   - Đăng nhập bảo mật qua cookie HTTP-Only `SameSite=Strict`, chống brute-force và CSRF.
   - Tạo Key tùy ý: đặt tên Key theo sở thích hoặc sinh ngẫu nhiên theo Prefix, tùy chỉnh thời lượng (Giờ, Ngày, Tuần, Tháng, Vĩnh viễn, hoặc tính giờ từ lần mở game đầu tiên), tùy chỉnh số máy tối đa (`0` là không giới hạn).
   - Xuất file CSV danh sách Key vừa tạo.
   - Quản lý danh sách Game, bật/tắt bảo trì tức thì, quản lý Blacklist IP/HWID và xem trực tiếp nhật ký dò Key (`verify_logs`).

---

## 🚀 Cấu Trúc Thư Mục Dự Án

```
f:\Documents\GETKEY\
├── public/                     # Logo, favicon, icon các tựa game
├── src/
│   ├── app/
│   │   ├── page.tsx            # Trang chủ lấy Key người dùng (Dark Glassmorphism)
│   │   ├── layout.tsx          # App shell, fonts, favicon
│   │   ├── globals.css         # Hệ thống giao diện hiện đại
│   │   ├── claim/page.tsx      # Trang nhận Key tự động (0-click)
│   │   ├── admin/page.tsx      # Admin Dashboard toàn diện
│   │   └── api/                # Cụm REST API & RPC handlers
│   │       ├── games/          # Danh sách game & thông báo
│   │       ├── keys/my-keys/   # Lấy Key hiện tại của người dùng qua cookie ký số
│   │       ├── claim/start/    # Khởi tạo phiên claim pending
│   │       ├── claim/complete/ # Hoàn tất phiên claim, tạo key 12h
│   │       ├── claim/callback/ # Webhook postback từ nhà cung cấp rút gọn link
│   │       ├── v1/verify/      # API xác thực & khóa thiết bị trong Game (Ký Ed25519)
│   │       ├── v1/heartbeat/   # API Heartbeat định kỳ trong Game (Ký Ed25519)
│   │       └── admin/*         # API CRUD Admin (JWT, CSRF, Audit Logs)
│   └── lib/
│       ├── supabase.ts         # Supabase service-role client (Server-only)
│       ├── crypto-sign.ts      # Ký số Ed25519 Canonical JSON & Cookie HMAC
│       ├── security.ts         # Rate limit, Cloudflare Turnstile, lọc regex
│       ├── shortener.ts        # Link shortener adapter (Fail-closed)
│       └── admin-auth.ts       # Xác thực Admin JWT & kiểm tra CSRF Origin
├── supabase/
│   └── migrations/
│       └── 0001_init.sql       # Toàn bộ schema DB, RLS, Indexes và RPCs
└── scripts/
    ├── generate-ed25519-keys.mjs # Tool CLI sinh cặp khóa Ed25519
    └── test-security.mjs       # Bộ test kiểm thử bảo mật & ký số tự động
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Triển Khai

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Sinh Cặp Khóa Ed25519
Chạy script sau để tạo cặp khóa `k1` (chính) và `k2` (dự phòng):
```bash
node scripts/generate-ed25519-keys.mjs
```
Copy các biến môi trường xuất ra dán vào file `.env.local`.

### 3. Cấu hình Môi Trường (`.env.local`)
Tạo file `.env.local` từ mẫu [`.env.example`](file:///f:/Documents/GETKEY/.env.example):
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOW_DIRECT_CLAIM=true

ADMIN_PASSWORD=MatKhauAdminCuaBan123@!
ADMIN_JWT_SECRET=chuoi-bi-mat-jwt-ngau-nhien-it-nhat-32-ky-tu

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Paste các khóa Ed25519 vừa sinh:
ED25519_ACTIVE_KID=k1
ED25519_PRIVATE_KEY_K1_B64=...
ED25519_PUBLIC_KEY_K1_B64=...
ED25519_PRIVATE_KEY_K2_B64=...
ED25519_PUBLIC_KEY_K2_B64=...
```

### 4. Thiết lập Cơ sở dữ liệu Supabase
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com).
2. Mở mục **SQL Editor**.
3. Copy toàn bộ nội dung file [`supabase/migrations/0001_init.sql`](file:///f:/Documents/GETKEY/supabase/migrations/0001_init.sql) và bấm **Run**.

### 5. Chạy Kiểm Thử Bảo Mật Tự Động
```bash
node scripts/test-security.mjs
```

### 6. Khởi Chạy Local Development
```bash
npm run dev
```
- Trang Người dùng: `http://localhost:3000`
- Trang Quản trị Admin: `http://localhost:3000/admin`

---

## 🚢 Triển Khai Lên Vercel
1. Đẩy code lên GitHub repository.
2. Import project vào [Vercel](https://vercel.com).
3. Thêm toàn bộ các biến môi trường từ `.env.local` vào mục **Environment Variables** trên Vercel.
4. Bấm **Deploy**.

