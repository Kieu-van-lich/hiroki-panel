# 📋 LỆNH ĐIỀU PHỐI KỸ THUẬT: FIX LỖI SERVER 500 RPC TRÊN GETKEY
**Đơn vị ban hành:** Trung tâm điều phối `f:\Documents\Control_GETKEY-Crack`  
**Dự án tiếp nhận:** `F:\Documents\GETKEY` (Hiroki Panel - Next.js Backend)  
**Tệp mục tiêu:**  
- `src/app/api/v1/verify/route.ts`  
- `src/app/api/v1/heartbeat/route.ts`  
**Chủ quản hệ thống:** ZTrongz  
**Ngày ban hành:** 05/11/2026  

---

## 🔍 I. HIỆN TƯỢNG SỰ CỐ
Sau khi phía `CRACK` đã chuyển sang gọi đúng tên miền `https://hiroki-panel.vercel.app`, khi người chơi bấm **Đăng Nhập | Login** với mã Key lấy từ Web (`Hiroki_12H_1TB_...`), hệ thống gặp lỗi:

* Mã phản hồi HTTP: **`500 Internal Server Error`**
* Nội dung gói tin trả về:
  ```json
  {
    "code": "SERVER_ERROR",
    "message": "Lỗi kết nối máy chủ xác thực."
  }
  ```
Game Client hiển thị lỗi *"Lỗi kết nối máy chủ xác thực"* và không mở được Mod Menu.

---

## 🔬 II. NGUYÊN NHÂN KỸ THUẬT CỐT LÕI

* **Lệch chữ ký hàm RPC giữa Next.js và PostgreSQL Supabase:**
  Trong database Supabase (tệp `0001_init.sql`), hàm `verify_and_bind_key` được định nghĩa nhận đúng 5 tham số:
  ```sql
  CREATE OR REPLACE FUNCTION public.verify_and_bind_key(
      p_key_code TEXT,
      p_game_package TEXT,
      p_device_id TEXT,
      p_app_version TEXT,
      p_client_ip INET
  )
  ```
* **Trong mã nguồn TypeScript của GETKEY:**
  Cả 2 file `src/app/api/v1/verify/route.ts` và `src/app/api/v1/heartbeat/route.ts` lại truyền 6 tham số:
  ```typescript
  // ❌ LỖI TRUYỀN SAI THAM SỐ:
  await supabase.rpc('verify_and_bind_key', {
    p_key_code: keyCode,
    p_game_package: gamePackage,
    p_device_id: deviceId,
    p_device_name: deviceName, // ❌ THỪA: SQL không có tham số này!
    p_app_version: appVersion,
    p_ip: clientIp,            // ❌ SAI TÊN: SQL đặt tên là p_client_ip, không phải p_ip!
  });
  ```
* **Hậu quả:** PostgREST trên Supabase tìm kiếm hàm có chữ ký nhận `(p_app_version, p_device_id, p_device_name, p_game_package, p_ip, p_key_code)` nhưng không thấy trong Schema Cache $\rightarrow$ Báo lỗi `function not found` $\rightarrow$ Next.js rơi vào khối `if (error || !data)` và trả về mã lỗi 500 `SERVER_ERROR`.

---

## 🛠️ III. QUY TRÌNH FIX LỖI CHI TIẾT (DÀNH CHO DỰ ÁN GETKEY)

Kỹ sư dự án `GETKEY` thực hiện chuẩn xác 3 bước sau:

### 🔹 Bước 1: Sửa tham số RPC trong `src/app/api/v1/verify/route.ts`
Mở file [`src/app/api/v1/verify/route.ts`](file:///f:/Documents/GETKEY/src/app/api/v1/verify/route.ts), tìm đến dòng **144–151** và sửa lại:

```typescript
// ❌ CŨ:
    const { data, error } = await supabase.rpc('verify_and_bind_key', {
      p_key_code: keyCode,
      p_game_package: gamePackage,
      p_device_id: deviceId,
      p_device_name: deviceName,
      p_app_version: appVersion,
      p_ip: clientIp,
    });

// ✅ SỬA LẠI CHUẨN THÀNH:
    const { data, error } = await supabase.rpc('verify_and_bind_key', {
      p_key_code: keyCode,
      p_game_package: gamePackage,
      p_device_id: deviceId,
      p_app_version: appVersion,
      p_client_ip: clientIp,
    });
```

---

### 🔹 Bước 2: Sửa tham số RPC trong `src/app/api/v1/heartbeat/route.ts`
Mở file [`src/app/api/v1/heartbeat/route.ts`](file:///f:/Documents/GETKEY/src/app/api/v1/heartbeat/route.ts), tìm đến dòng **177–185** và sửa lại:

```typescript
// ❌ CŨ:
  const { data, error } = await supabase.rpc('verify_and_bind_key', {
    p_key_code: keyCode,
    p_game_package: gamePackage,
    p_device_id: deviceId,
    p_device_name: 'Heartbeat Client',
    p_app_version: appVersion,
    p_ip: clientIp,
  });

// ✅ SỬA LẠI CHUẨN THÀNH:
  const { data, error } = await supabase.rpc('verify_and_bind_key', {
    p_key_code: keyCode,
    p_game_package: gamePackage,
    p_device_id: deviceId,
    p_app_version: appVersion,
    p_client_ip: clientIp,
  });
```

---

### 🔹 Bước 3: Commit và Deploy lên Vercel
1. Lưu lại cả 2 tệp trên.
2. Mở terminal tại thư mục `F:\Documents\GETKEY`:
   ```bash
   git add src/app/api/v1/verify/route.ts src/app/api/v1/heartbeat/route.ts
   git commit -m "fix(api): correct verify_and_bind_key RPC parameter names"
   git push origin main
   ```
3. Vercel sẽ tự động build và deploy phiên bản mới trong vòng 1 phút.

---

## ✅ IV. TIÊU CHUẨN NGHIỆM THU
1. Gửi request kiểm thử tới `POST https://hiroki-panel.vercel.app/api/v1/verify` kèm mã Key:
   * Phản hồi trả về mã **HTTP 200 OK**.
   * Payload chứa: `"valid": true`, `"code": "OK"`, `"remaining_seconds": 43200`, `"session_token": "..."`.
2. Mở game Blood Strike đã cài APK `Tris_Hiroki_V1.apk` $\rightarrow$ dán Key $\rightarrow$ Bấm **Đăng Nhập**:
   * Hộp thoại Login đóng lại ngay lập tức.
   * Nút tròn nổi xuất hiện và Mod Menu `##MacOSWindow` bung ra thành công 100%!
