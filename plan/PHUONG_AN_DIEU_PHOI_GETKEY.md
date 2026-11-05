# 📋 KẾ HOẠCH ĐIỀU PHỐI & NHIỆM VỤ KỸ THUẬT: DỰ ÁN GETKEY
**Đơn vị điều hành:** Trung tâm điều phối `f:\Documents\Control_GETKEY-Crack`  
**Dự án nhận lệnh:** `F:\Documents\GETKEY` (Hiroki Panel — Hệ thống cấp Key & Xác thực bản quyền)  
**Nền tảng:** Next.js 14 App Router + Supabase PostgreSQL + Vercel Serverless  
**Chủ quản hệ thống:** ZTrongz  
**Ngày ban hành:** 05/11/2026  

---

## 🎯 MỤC TIÊU DỰ ÁN
Hoàn thiện toàn bộ hạ tầng Backend và Web của **Hiroki Panel**, sửa triệt để các điểm xung đột giữa mã nguồn Next.js và Database Postgres, nạp dữ liệu lên **Supabase Cloud**, sinh khóa mật mã ký số **Ed25519**, và deploy trực tiếp lên **Vercel** để cung cấp API xác thực cho Client Game Blood Strike Mobile.

---

## 🛠️ CHI TIẾT CÁC GÓI NHIỆM VỤ THỰC THI

### 📌 NHIỆM VỤ 1: ĐIỀU CHỈNH SCHEMA CƠ SỞ DỮ LIỆU (`0001_init.sql`)
Trước khi nạp vào Supabase SQL Editor, tệp migration [`supabase/migrations/0001_init.sql`](file:///f:/Documents/GETKEY/supabase/migrations/0001_init.sql) phải được cập nhật các định nghĩa bảng để đồng bộ 100% với mã nguồn TypeScript:

#### 1.1. Bảng `public.games`:
Đồng bộ các tên cột với các Route Handlers (`/api/games`, `/api/admin/games`, `/api/claim/start`):
* Đổi `name` $\rightarrow$ `game_name TEXT NOT NULL`.
* Đổi `maintenance_message` $\rightarrow$ `maintenance_msg TEXT DEFAULT 'Tựa game này đang bảo trì, vui lòng quay lại sau!'`.
* Đổi `features` $\rightarrow$ `features_json JSONB NOT NULL DEFAULT '[]'::jsonb`.

#### 1.2. Bảng `public.system_settings`:
Đổi cấu trúc từ `(setting_key, setting_value)` thành `(key, value)` để khớp với hàm cập nhật `.upsert(rows, { onConflict: 'key' })` trong Admin API:
```sql
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 1.3. Bảng `public.license_keys`:
* Bổ sung cột `key_type TEXT NOT NULL DEFAULT 'CUSTOM'`.
* Bổ sung cột `activated_at TIMESTAMPTZ`.
* Nới lỏng ràng buộc `created_by` để chấp nhận cả chữ hoa và chữ thường:
  ```sql
  CONSTRAINT chk_created_by CHECK (created_by IN ('USER_WEB', 'ADMIN', 'admin'))
  ```

#### 1.4. Bảng `public.key_devices`:
* Bổ sung cột `device_name TEXT DEFAULT 'Android Device'`.
* Bổ sung cột `game_package TEXT`.

#### 1.5. Bảng `public.blacklist`:
* Cập nhật ràng buộc kiểm tra loại chặn:
  ```sql
  CONSTRAINT chk_target_type CHECK (target_type IN ('IP', 'DEVICE', 'DEVICE_ID'))
  ```

#### 1.6. Cập nhật các hàm RPC nguyên tử:
* Trong hàm `verify_and_bind_key`: Đổi các trường tham chiếu `v_game.name` thành `v_game.game_name`, `v_game.maintenance_message` thành `v_game.maintenance_msg`.
* Trong hàm `complete_claim_session`: Đổi trường insert vào `license_keys` tương ứng.

---

### 📌 NHIỆM VỤ 2: ĐIỀU CHỈNH MÃ NGUỒN NEXT.JS (`src/`)

#### 2.1. Vô hiệu hóa Cache tĩnh trên tuyến `/api/games`:
* **Tệp cần sửa:** [`src/app/api/games/route.ts`](file:///f:/Documents/GETKEY/src/app/api/games/route.ts).
* **Thao tác:** Thêm cấu hình dynamic ở ngay đầu file:
  ```typescript
  export const dynamic = 'force-dynamic';
  export const revalidate = 0;
  ```
* **Mục đích:** Ngăn Vercel prerender tĩnh danh sách game lúc build, đảm bảo khi Admin cập nhật game trên Supabase thì Web lập tức hiển thị dữ liệu mới.

#### 2.2. Chuẩn hóa giá trị `created_by` trong Admin API:
* **Tệp cần sửa:** [`src/app/api/admin/keys/route.ts`](file:///f:/Documents/GETKEY/src/app/api/admin/keys/route.ts#L198).
* **Thao tác:** Đổi `created_by: 'admin'` thành `created_by: 'ADMIN'`.

---

### 📌 NHIỆM VỤ 3: KHỞI TẠO CƠ SỞ DỮ LIỆU SUPABASE

1. **Tạo Project Supabase:**
   * Truy cập Dashboard Supabase $\rightarrow$ New Project (đặt tên `hiroki-panel`).
   * Chọn Region gần nhất: `Singapore (ap-southeast-1)`.
2. **Thực thi Migration:**
   * Mở mục **SQL Editor**, dán toàn bộ tệp `supabase/migrations/0001_init.sql` (đã chỉnh sửa theo Nhiệm vụ 1) và bấm **Run**.
3. **Thêm dữ liệu khởi tạo cho game Blood Strike Mobile:**
   Chạy đoạn lệnh SQL sau để kích hoạt game trên hệ thống:
   ```sql
   INSERT INTO public.games (
       package_name,
       game_name,
       icon_url,
       version,
       min_version,
       download_url,
       features_json,
       default_hours,
       default_max_devices,
       links_count,
       min_claim_seconds,
       is_active
   ) VALUES (
       'com.netease.newspike',
       'Blood Strike Mobile (VIP Mod)',
       '/assets/icon/default-game.png',
       '1.0.0',
       '1.0.0',
       'https://your-domain.vercel.app',
       '["ESP Khung xương & Khoảng cách", "Aimbot tâm mượt tuỳ chỉnh FOV", "Giảm giật súng (No Recoil)", "Cảnh báo địch ngắm từ xa"]'::jsonb,
       12,
       1,
       1,
       25,
       true
   ) ON CONFLICT (package_name) DO UPDATE SET
       game_name = EXCLUDED.game_name,
       default_hours = EXCLUDED.default_hours;
   ```
4. **Trích xuất thông tin kết nối:**
   * Vào **Project Settings** $\rightarrow$ **API**:
     * Lưu `Project URL` (dạng `https://xxxx.supabase.co`).
     * Lưu `service_role` secret key (bắt đầu bằng `eyJh...`).

---

### 📌 NHIỆM VỤ 4: SINH CẶP KHÓA KÝ SỐ MẬT MÃ ED25519

1. Tại thư mục dự án `F:\Documents\GETKEY`, chạy script:
   ```bash
   node scripts/generate-ed25519-keys.mjs
   ```
2. Lưu trữ an toàn các giá trị xuất ra:
   * `ED25519_ACTIVE_KID=k1`
   * `ED25519_PRIVATE_KEY_K1_B64=...`
   * `ED25519_PUBLIC_KEY_K1_SPKI_B64=...` *(Cung cấp cho dự án Crack để nhúng vào APK)*
   * `ED25519_PRIVATE_KEY_K2_B64=...`

---

### 📌 NHIỆM VỤ 5: DEPLOY LÊN VERCEL (PRODUCTION)

1. Đẩy mã nguồn [`F:\Documents\GETKEY`](file:///f:/Documents/GETKEY) lên kho Git (GitHub / GitLab).
2. Tạo dự án mới trên Vercel và cấu hình các biến môi trường (**Environment Variables**):
   * `NEXT_PUBLIC_APP_URL`: Domain Vercel được cấp (ví dụ: `https://hiroki-getkey.vercel.app`)
   * `ALLOW_DIRECT_CLAIM`: `true` (cho phép claim trực tiếp để test, sau này nối shortener sau)
   * `ADMIN_PASSWORD`: Mật khẩu đăng nhập Admin (đặt chuỗi bảo mật cao)
   * `ADMIN_JWT_SECRET`: Chuỗi ký tự ngẫu nhiên ít nhất 32 ký tự
   * `SUPABASE_URL`: URL lấy từ Nhiệm vụ 3
   * `SUPABASE_SERVICE_ROLE_KEY`: Service role secret lấy từ Nhiệm vụ 3
   * `ED25519_ACTIVE_KID`: `k1`
   * `ED25519_PRIVATE_KEY_K1_B64`: Khóa bí mật k1 sinh từ Nhiệm vụ 4
   * `ED25519_PRIVATE_KEY_K2_B64`: Khóa bí mật k2 sinh từ Nhiệm vụ 4
3. Bấm **Deploy**.
4. Bàn giao lại **Domain Vercel chính thức** và **Public Key Ed25519** cho dự án `CRACK`.

---

## ✅ TIÊU CHUẨN NGHIỆM THU DỰ ÁN GETKEY
1. Truy cập `https://<domain-vercel>/`: Danh sách game hiển thị đầy đủ, chọn Blood Strike và bấm nhận key tạo thành công.
2. Truy cập `https://<domain-vercel>/admin`: Đăng nhập thành công, tạo thử 1 Key VIP 24h và kiểm tra danh sách key hiển thị trong bảng.
3. Kiểm thử API: Gửi request `POST https://<domain-vercel>/api/v1/verify` với body JSON test trả về kết quả ký số kèm `session_token` hợp lệ.
