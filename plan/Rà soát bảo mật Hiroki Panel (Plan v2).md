# Rà soát bảo mật Hiroki Panel (Plan v2)

Oct 31, 2026 · @Kiều Lịch

## Tóm tắt

Plan mới đã đóng được các lỗ hổng lớn (tạo key sớm, race condition, RLS, mã lỗi), nhưng còn 15 điểm cần xử lý trước khi chạy thật. Chúng chia thành ba nhóm, xếp theo mức độ quan trọng: sửa trước khi viết code, chữ ký Ed25519 và heartbeat, quản trị và dữ liệu.

## Nên sửa trước khi viết code

Năm điểm dưới đây ảnh hưởng trực tiếp đến việc có ai đó lấy key miễn phí hoặc dò key hay không, nên cần chốt trước khi code.

- **RPC bị lộ qua Supabase Data API.** Các hàm trong schema `public` mặc định gọi được trực tiếp qua `/rest/v1/rpc/...` bằng anon key. RLS không bảo vệ chính hàm, và hàm `SECURITY DEFINER` còn bỏ qua RLS. Nếu để vậy, ai cũng gọi thẳng `verify_and_bind_key` hay `complete_claim_session`, bỏ qua Turnstile, rate limit và chữ ký. Cần `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` rồi chỉ `GRANT` cho `service_role`, đặt `search_path` cố định cho hàm `SECURITY DEFINER`, và `REVOKE ALL` trên các bảng cho `anon`/`authenticated`.
- **Token claim nằm ngay trong URL đích.** Các trang bypass link lấy được `/claim?token=...`, nên lớp chống còn lại chỉ là mốc 15 giây và cookie, mà 15 giây thì quá dễ chờ. Hãy nâng thời gian tối thiểu lên mức thực tế theo số bước của nhà cung cấp (ví dụ 40–60 giây), dùng Referer của nhà cung cấp làm tín hiệu phụ (đừng chặn cứng vì Referer có thể rỗng), và hỏi nhà cung cấp có cách xác minh phía server (postback/API) không. Bypass không chặn hẳn được, mục tiêu là làm nó tốn công hơn giá trị một key.
- **Cookie binding sẽ làm hỏng người dùng thật trên điện thoại.** Link rút gọn hay mở trong in-app browser (Zalo, Facebook) hoặc trình duyệt khác nơi bấm "Lấy Key", cookie `claim_sid` không khớp và họ nhận `INVALID_CLAIM` dù đã vượt link đúng. Cần đường lui, ví dụ chấp nhận khi cookie hoặc IP khớp, hoặc cho nhập mã claim ngắn hiện ở bước đầu. Ngoài ra `GET /claim?token=` đang vừa đọc vừa đổi trạng thái, nên bot xem trước link có thể chạm vào. Chuyển bước hoàn tất sang `POST` (sau Turnstile) và đảm bảo lần thử sai cookie không làm hỏng token.
- **Chưa có chỗ lưu bộ đếm rate limit.** Plan nhắc `RATE_LIMITED` nhưng ERD không có bảng nào cho việc này, còn bộ nhớ trong của Vercel serverless không dùng được (mỗi instance một bộ đếm). Dùng Upstash Redis (có gói free) hoặc bảng Postgres với `INSERT ... ON CONFLICT`. Nhiều nhà mạng di động dùng chung IP (CGNAT) nên ngưỡng theo IP phải rộng, để Turnstile + cookie gánh phần chính. Hãy lấy IP từ header do Vercel đặt, đừng tin header client tự gửi.
- **Ô "Tra cứu trạng thái Key" là công cụ dò key.** Cho nhập key bất kỳ và trả trạng thái/thời gian còn lại thì ai cũng quét được key đang sống, nhất là key admin tự đặt dễ đoán. Chỉ trả cho đúng chủ cookie, hoặc rate limit nghiêm + Turnstile + trả thông tin tối thiểu. Có thể bỏ luôn vì trang chủ đã hiện lại key qua cookie.

## Chữ ký Ed25519 và heartbeat

Chữ ký hiện chưa đủ để client tin phản hồi, vì chuỗi ký thiếu trường và cách tính hạn còn dựa vào đồng hồ máy.

- **`valid` không nằm trong chuỗi ký.** Chuỗi canonical chỉ có `code`. Client phải chỉ tin `code` đã ký (hoặc ký cả JSON payload), nếu không kẻ chen giữa sửa `valid:false` thành `true` mà chữ ký vẫn đúng. Mục 1.2 nói ký cả `session_token` nhưng chuỗi ở 3.4 không có nó, và nên thêm `game_package` vào chuỗi ký.
- **Dấu `|` làm ngăn cách.** `key` và `device_id` do client gửi, nếu chứa `|` thì có thể làm hai phản hồi khác nhau trùng chuỗi ký. Validate charset/độ dài bằng regex hoặc ký JSON canonical.
- **Timestamp.** Client mà so timestamp với đồng hồ máy thì máy lệch giờ bị từ chối oan; nonce do client tự sinh và kiểm tra khớp là đủ chống replay. Ngược lại, tính hạn offline bằng đồng hồ máy thì người dùng chỉnh lùi ngày là kéo dài được key. Hãy tính theo thời gian trôi qua kể từ phản hồi hợp lệ gần nhất, và chốt rõ heartbeat bao lâu một lần, mất mạng thì ân hạn bao lâu.
- **`session_token` chưa được định nghĩa.** Nên là token ký, sống vài phút, gắn key + device. Heartbeat chỉ cần kiểm chữ ký rồi mới chạm DB mỗi N phút (để bắt thu hồi), vừa giảm tải vừa bớt khóa dòng.
- **Quản lý khóa.** Public key nhúng trong client nên đổi khóa nghĩa là mọi người phải cập nhật. Thêm `kid` và cho client giữ sẵn 2 public key (hiện tại + dự phòng). Khóa riêng chỉ để trong biến môi trường Vercel, không lưu DB, và không nên sinh cặp khóa qua trang admin (khóa riêng đi qua request) mà sinh bằng script chạy local.

## Quản trị và dữ liệu

Nhóm này ít gây mất key hơn hai nhóm trên, nhưng có hai chỗ có thể biến thành cửa hậu hoặc key tồn tại mãi.

- **Xác thực admin tự viết** đang thiếu CSRF (cookie-auth cho các POST đổi dữ liệu cần `SameSite=Strict` + kiểm `Origin`) và 2FA. Dùng thư viện đã được kiểm chứng (`iron-session`/`jose`, hoặc Supabase Auth + MFA) thay vì tự cài ký session.
- **`start_on_first_use` xung đột với `expires_at NULL = Vĩnh viễn`.** Key chưa kích hoạt cũng có `expires_at` rỗng nên bị coi là vĩnh viễn, và key không ai dùng sẽ tồn tại mãi. Thêm cột `activate_before` và phân biệt vĩnh viễn bằng cờ hoặc `duration_label`, không dùng NULL.
- **Chế độ "Direct/Bypass khi chưa điền API"** là cửa hậu nếu thiếu biến môi trường trên Vercel: cả hệ thống tự cấp key miễn phí. Chỉ bật khi có cờ rõ ràng (`ALLOW_DIRECT_CLAIM=true`, mặc định tắt ở production). Nếu nhà cung cấp lỗi hoặc timeout thì từ chối hoặc xoay sang bên khác, không tự cấp key.
- **Thống kê:** mỗi lần verify cộng vào một dòng `daily_metrics` duy nhất tạo điểm nghẽn khóa dòng, đúng kiểu ghi liên tục cần tránh. Hãy thêm `verify_logs` chỉ ghi lần thất bại (giữ vài ngày bằng `pg_cron`) và tổng hợp theo giờ, nhờ đó mới truy ra ai đang dò key.
- **Vài chỗ nhỏ trong schema:**
  - `blacklist.target_value UNIQUE` nên là `UNIQUE(target_type, target_value)`.
  - Thêm index cho `license_keys(expires_at)` và `claim_sessions(status, expires_at)`.
  - Dùng kiểu `inet` cho IP.
  - Bước kiểm `BLACKLISTED` có trong bảng mã nhưng chưa có trong các bước của RPC.

## Kiểm thử và bước tiếp theo

Nên thêm "Chặng 5" cho kiểm thử, vì các lỗi ở trên chỉ lộ ra khi chạy song song hoặc khi cấu hình sai.

- [ ] Bắn khoảng 20 request verify song song với `device_id` khác nhau lên key `max_devices = 1`, xác nhận đúng 1 request thành công.
- [ ] Test claim token: dùng lại, sai cookie, đến sớm.
- [ ] Kiểm tra `SERVICE_ROLE`, khóa Ed25519 và secret session không nằm trong repo.

Bước tiếp theo: khi có file `0001_init.sql`, rà lại phần RPC và `GRANT/REVOKE`, vì đó là chỗ dễ sai nhất.
