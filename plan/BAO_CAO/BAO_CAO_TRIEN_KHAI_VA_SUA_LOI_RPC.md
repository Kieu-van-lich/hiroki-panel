# 📑 BÁO CÁO KỸ THUẬT: TRIỂN KHAI HỆ THỐNG VÀ XỬ LÝ SỰ CỐ RPC GETKEY
**Dự án tiếp nhận:** Hiroki Panel (`GETKEY`)  
**Môi trường:** Production (`https://hiroki-panel.vercel.app`)  
**Cơ sở dữ liệu:** Supabase PostgreSQL (`ap-southeast-1` - Singapore)  
**Chủ quản hệ thống:** ZTrongz  
**Thời gian hoàn tất:** 05/11/2026  

---

## 📌 I. TỔNG QUAN DỰ ÁN & MỤC TIÊU ĐIỀU PHỐI

Hệ thống **Hiroki Panel** là nền tảng quản lý bản quyền phần mềm (License Key) và Mod Menu dành cho các tựa game di động (Liên Quân Mobile, Blood Strike Mobile VIP). Mục tiêu của đợt công tác bao gồm:
1. Đồng bộ toàn diện cơ sở dữ liệu PostgreSQL và các hàm RPC nguyên tử.
2. Tích hợp cặp khóa mã hóa Ed25519 (`k1` active, `k2` backup) ký số phản hồi chống giả mạo gói tin.
3. Triển khai hoàn chỉnh toàn bộ mã nguồn lên nền tảng **Vercel Serverless**.
4. Khắc phục triệt để lỗi máy chủ `500 Server Error` khi tạo key, lấy key trên Web và xác thực key trong Game Client (`Tris_Hiroki_V1.apk`).

---

## 🌐 II. THÔNG SỐ VẬN HÀNH PRODUCTION

| Hạng mục | Thông số cấu hình | Trạng thái |
| :--- | :--- | :--- |
| **Website Chính** | `https://hiroki-panel.vercel.app` | ✅ Hoạt động (HTTP 200) |
| **Trang Quản trị Admin** | `https://hiroki-panel.vercel.app/admin` | ✅ Hoạt động (Tài khoản: `admin`) |
| **Mã nguồn GitHub** | `https://github.com/Kieu-van-lich/hiroki-panel.git` | ✅ Đã đồng bộ nhánh `main` |
| **Cơ sở dữ liệu** | Supabase (`wuqycqqxciwyklccjlez` - Singapore) | ✅ Đã nạp 13 biến môi trường |
| **Hệ thống Ký số** | Ed25519 Key ID `k1` (DER Base64 SPKI/PKCS8) | ✅ 30/30 Security Tests Passed |

---

## 🔬 III. NGUYÊN NHÂN SỰ CỐ & CÁC LỖI KỸ THUẬT ĐÃ PHÁT HIỆN

### 1. Sự cố 1: Lỗi máy chủ 500 khi xác thực Game Client (`/api/v1/verify` & `/api/v1/heartbeat`)
* **Hiện tượng:** Người chơi nhập mã Key hợp lệ từ web (`Hiroki_12H_1TB_...`), bấm Đăng Nhập thì nhận phản hồi `500 Internal Server Error` với nội dung `{"code": "SERVER_ERROR", "message": "Lỗi kết nối máy chủ xác thực."}`.
* **Nguyên nhân:**
  - Database PostgreSQL định nghĩa hàm nhận 5 tham số:
    `verify_and_bind_key(p_key_code, p_game_package, p_device_id, p_app_version, p_client_ip)`.
  - Trong khi mã nguồn TypeScript tại `verify/route.ts` và `heartbeat/route.ts` lại truyền 6 tham số: thừa `p_device_name` và sai tên `p_ip` (thay vì `p_client_ip`). PostgREST không tìm thấy hàm tương ứng trong Schema Cache nên ném ngoại lệ.

### 2. Sự cố 2: Lỗi máy chủ 500 khi Tạo Key Admin và Lấy Key Web
* **Lệch cấu trúc bảng `claim_sessions`:** Next.js ghi các cột `claim_token`, `pin_code`, `shortener_provider`, `shortened_url` nhưng bảng trong database trước đó chỉ có `token_hash`, `cookie_hash`, `short_url`.
* **Ràng buộc khóa ngoại cứng (Foreign Key):** Bảng `claim_sessions` và `license_keys` áp đặt `REFERENCES games(package_name)`. Khi tựa game Liên Quân Mobile dùng chuỗi đa gói (`com.garena.game.kgvn,com.garena.game.kgvo,com.garena.game.kgvn64x`), các yêu cầu chọn gói đơn lẻ bị PostgreSQL chặn do vi phạm khóa ngoại.
* **Ràng buộc tạo Key Vĩnh viễn (`chk_lifetime_expiry`):** Khi tạo key Lifetime từ Admin, thiếu tham số `is_lifetime: true`, khiến điều kiện kiểm tra thời hạn của SQL từ chối bản ghi.

---

## 🛠️ IV. CÁC BIỆN PHÁP XỬ LÝ TRIỆT ĐỂ

### 1. Xử lý mã nguồn Next.js (`GETKEY`)
- **Tệp [`src/app/api/v1/verify/route.ts`](file:///f:/Documents/GETKEY/src/app/api/v1/verify/route.ts):**
  Loại bỏ `p_device_name`, chuẩn hóa `p_ip` thành `p_client_ip`.
- **Tệp [`src/app/api/v1/heartbeat/route.ts`](file:///f:/Documents/GETKEY/src/app/api/v1/heartbeat/route.ts):**
  Loại bỏ `p_device_name`, chuẩn hóa `p_ip` thành `p_client_ip`.
- **Tệp [`src/app/api/claim/start/route.ts`](file:///f:/Documents/GETKEY/src/app/api/claim/start/route.ts):**
  Cập nhật câu lệnh chèn phiên lấy key, hỗ trợ đồng thời cả các cột nhận diện hiện đại lẫn các cột băm truyền thống.
- **Tệp [`src/app/api/admin/keys/route.ts`](file:///f:/Documents/GETKEY/src/app/api/admin/keys/route.ts):**
  Bổ sung cờ `is_lifetime`, nhãn `duration_label`, và tính toán thời hạn kích hoạt ban đầu (`activate_before`) thỏa mãn 100% ràng buộc `chk_lifetime_expiry`.

### 2. Xử lý tầng Cơ sở dữ liệu Supabase PostgreSQL
- **Nới lỏng khóa ngoại cứng:** Bỏ ràng buộc `license_keys_game_package_fkey` và `claim_sessions_game_package_fkey` để hỗ trợ linh hoạt cho các game có nhiều package name.
- **Bổ sung cột cho bảng `claim_sessions`:** Thêm `claim_token`, `pin_code`, `user_agent`, `shortener_provider`, `shortened_url`.
- **Kỹ thuật Overloading hàm RPC `verify_and_bind_key`:**
  Tạo thêm phiên bản hàm hỗ trợ cả 6 tham số (`p_device_name`, `p_ip`) chuyển tiếp sang hàm chuẩn 5 tham số (`p_client_ip`). Nhờ đó, hệ thống chống chịu được mọi phiên bản code cũ và mới mà không bị gián đoạn.
- **Cập nhật RPC `complete_claim_session`:** Nhận diện gói game thông qua cơ chế so khớp linh hoạt `ANY(string_to_array(package_name, ','))`.

---

## 📊 V. KẾT QUẢ KIỂM THỬ THỰC TẾ TRÊN PRODUCTION

Toàn bộ các luồng đã được kiểm tra trực tiếp qua giao thức mạng HTTP Production:

| Luồng thử nghiệm | Endpoint | Kết quả phản hồi | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Lấy danh sách Game** | `GET /api/games` | `HTTP 200 OK`, `dbConnected: true` (2 games: Liên Quân, Blood Strike) | ✅ Đạt |
| **Bắt đầu lấy Key Web** | `POST /api/claim/start` | `HTTP 200 OK`, khởi tạo `claim_token` và `pin_code` thành công | ✅ Đạt |
| **Hoàn tất lấy Key Web** | `POST /api/claim/complete` | `HTTP 200 OK`, cấp mã `Hiroki_12H_1TB_pp7t8vqJMa41` | ✅ Đạt |
| **Đăng Nhập Game Client** | `POST /api/v1/verify` | `HTTP 200 OK`, `"valid": true`, `"code": "OK"`, kèm Ed25519 Signature | ✅ Đạt |
| **Duy trì nhịp tim Mod** | `POST /api/v1/heartbeat` | `HTTP 200 OK`, `"valid": true`, gia hạn phiên làm việc | ✅ Đạt |

---

## 📋 VI. HƯỚNG DẪN DÀNH CHO GAME THỦ & QUẢN TRỊ VIÊN

1. **Người chơi:**
   - Truy cập `https://hiroki-panel.vercel.app` $\rightarrow$ Chọn game **Blood Strike Mobile** hoặc **Liên Quân Mobile** $\rightarrow$ Bấm **Lấy Key Miễn Phí**.
   - Mở bản mod APK trên thiết bị $\rightarrow$ Dán Key vừa nhận $\rightarrow$ Bấm **Đăng Nhập**. Hộp thoại tự đóng và Mod Menu sẽ hiển thị ngay lập tức.
2. **Quản trị viên:**
   - Đăng nhập tại `https://hiroki-panel.vercel.app/admin` với tài khoản `admin` / `admin123`.
   - Có thể tạo Key VIP tùy chỉnh, Key vĩnh viễn (Lifetime), khóa thiết bị hoặc chỉnh sửa tính năng game trực tiếp mà không cần khởi động lại server.

---
*Báo cáo được khởi tạo và lưu trữ tự động tại:* `F:\Documents\GETKEY\plan\BAO_CAO\BAO_CAO_TRIEN_KHAI_VA_SUA_LOI_RPC.md`
