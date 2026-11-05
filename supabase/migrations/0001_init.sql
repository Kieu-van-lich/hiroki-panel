-- ============================================================================
-- HIROKI PANEL - SUPABASE MIGRATION: 0001_init.sql
-- PGlite & Postgres 16 Concurrency-Verified Schema, Atomic RPCs & Strict Grants
-- ============================================================================

-- Lưu ý: Không cần pgcrypto vì Postgres 13+ đã tích hợp sẵn gen_random_uuid()

-- ============================================================================
-- 1. KHỞI TẠO CÁC BẢNG DỮ LIỆU (TABLES & CONSTRAINTS)
-- ============================================================================

-- 1.1. Bảng GAMES (Quản lý danh sách tựa game & phiên bản Mod)
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name TEXT NOT NULL UNIQUE CHECK (package_name ~ '^[a-zA-Z0-9._,]{3,128}$'),
    game_name TEXT NOT NULL,
    icon_url TEXT NOT NULL DEFAULT '/assets/icon/default-game.png',
    version TEXT NOT NULL DEFAULT '1.0.0' CHECK (version ~ '^[0-9]{1,6}(\.[0-9]{1,6}){0,3}$'),
    min_version TEXT NOT NULL DEFAULT '1.0.0' CHECK (min_version ~ '^[0-9]{1,6}(\.[0-9]{1,6}){0,3}$'),
    download_url TEXT NOT NULL DEFAULT '',
    file_checksum TEXT,
    features_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_hours INT NOT NULL DEFAULT 12 CHECK (default_hours > 0),
    default_max_devices INT NOT NULL DEFAULT 1 CHECK (default_max_devices >= 1),
    links_count INT NOT NULL DEFAULT 1 CHECK (links_count >= 1),
    min_claim_seconds INT NOT NULL DEFAULT 25 CHECK (min_claim_seconds >= 3),
    is_active BOOLEAN NOT NULL DEFAULT true,
    maintenance_msg TEXT DEFAULT 'Tựa game này đang bảo trì, vui lòng quay lại sau!',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2. Bảng LICENSE_KEYS (Lưu trữ Key bản quyền - ON DELETE RESTRICT bảo vệ Key khi xóa Game)
CREATE TABLE IF NOT EXISTS public.license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT NOT NULL UNIQUE CHECK (key_code ~ '^[A-Za-z0-9_-]{4,64}$'),
    key_type TEXT NOT NULL DEFAULT 'CUSTOM',
    all_games BOOLEAN NOT NULL DEFAULT false,
    game_package TEXT REFERENCES public.games(package_name) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_by TEXT NOT NULL DEFAULT 'USER_WEB',
    duration_label TEXT NOT NULL DEFAULT '12h',
    duration_seconds INT CHECK (duration_seconds IS NULL OR duration_seconds > 0),
    is_lifetime BOOLEAN NOT NULL DEFAULT false,
    start_on_first_use BOOLEAN NOT NULL DEFAULT false,
    activate_before TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    max_devices INT NOT NULL DEFAULT 1 CHECK (max_devices >= 0), -- 0 = Không giới hạn (chỉ dành cho ADMIN)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_ip INET,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_used_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    CONSTRAINT chk_created_by CHECK (created_by IN ('USER_WEB', 'ADMIN', 'admin')),
    CONSTRAINT chk_game_target CHECK (
        (all_games = true AND game_package IS NULL) OR
        (all_games = false AND game_package IS NOT NULL)
    ),
    CONSTRAINT chk_user_web_limits CHECK (
        created_by IN ('ADMIN', 'admin') OR (max_devices >= 1 AND is_lifetime = false AND all_games = false)
    ),
    CONSTRAINT chk_lifetime_expiry CHECK (
        (is_lifetime = true AND expires_at IS NULL AND duration_seconds IS NULL AND start_on_first_use = false) OR
        (is_lifetime = false AND duration_seconds IS NOT NULL AND duration_seconds > 0 AND (
            (start_on_first_use = false AND expires_at IS NOT NULL) OR
            (start_on_first_use = true AND activate_before IS NOT NULL)
        ))
    )
);

CREATE INDEX IF NOT EXISTS idx_license_keys_expires_at
    ON public.license_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_license_keys_game_package
    ON public.license_keys(game_package);
CREATE INDEX IF NOT EXISTS idx_license_keys_activate_before
    ON public.license_keys(activate_before) WHERE activate_before IS NOT NULL AND expires_at IS NULL;

-- 1.3. Bảng KEY_DEVICES (Gắn cứng thiết bị chơi game cho từng Key)
CREATE TABLE IF NOT EXISTS public.key_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID NOT NULL REFERENCES public.license_keys(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL CHECK (device_id ~ '^[A-Za-z0-9._:-]{4,128}$'),
    device_name TEXT DEFAULT 'Android Device',
    game_package TEXT,
    ip_address INET,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (key_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_key_devices_key_id ON public.key_devices(key_id);
CREATE INDEX IF NOT EXISTS idx_key_devices_device_id ON public.key_devices(device_id);

-- 1.4. Bảng CLAIM_SESSIONS (Phiên vượt link rút gọn chống tạo key sớm, 0-click auto-complete)
CREATE TABLE IF NOT EXISTS public.claim_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    cookie_hash TEXT NOT NULL,
    game_package TEXT NOT NULL REFERENCES public.games(package_name) ON DELETE CASCADE ON UPDATE CASCADE,
    ip_address INET NOT NULL,
    short_url TEXT,
    provider_name TEXT NOT NULL DEFAULT 'SHORTENER',
    provider_verified BOOLEAN NOT NULL DEFAULT false,
    referer_hint TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED')),
    min_complete_after TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    issued_key_id UUID REFERENCES public.license_keys(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_claim_sessions_status_expires ON public.claim_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_claim_sessions_ip_created ON public.claim_sessions(ip_address, created_at);

-- 1.5. Bảng BLACKLIST (Chặn IP hoặc Device ID)
CREATE TABLE IF NOT EXISTS public.blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    target_value TEXT NOT NULL,
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_target_type CHECK (target_type IN ('IP', 'DEVICE', 'DEVICE_ID')),
    UNIQUE (target_type, target_value)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_lookup ON public.blacklist(target_type, target_value);

-- 1.6. Bảng RATE_LIMITS (Bộ đếm chống spam / brute-force bền vững trên Serverless)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    bucket_key TEXT PRIMARY KEY,
    points INT NOT NULL DEFAULT 1,
    window_ends_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_ends_at);

-- 1.7. Bảng VERIFY_LOGS (Chỉ ghi KEY_NOT_FOUND & BLACKLISTED để phát hiện dò key, tự xóa sau 2 ngày)
CREATE TABLE IF NOT EXISTS public.verify_logs (
    id BIGSERIAL PRIMARY KEY,
    key_code_attempt TEXT,
    game_package TEXT,
    device_id TEXT,
    ip_address INET,
    error_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verify_logs_created_at ON public.verify_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_verify_logs_ip_created ON public.verify_logs(ip_address, created_at);

-- 1.8. Bảng DAILY_METRICS (Thống kê cộng dồn theo múi giờ Việt Nam Asia/Ho_Chi_Minh, chỉ 1 dòng/ngày)
CREATE TABLE IF NOT EXISTS public.daily_metrics (
    metric_date DATE PRIMARY KEY DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE,
    claims_started INT NOT NULL DEFAULT 0,
    claims_completed INT NOT NULL DEFAULT 0,
    admin_keys_created INT NOT NULL DEFAULT 0,
    verify_fail_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.9. Bảng AUDIT_LOGS (Nhật ký mọi thao tác của Admin)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 1.10. Bảng SYSTEM_SETTINGS (Cấu hình hệ thống & Adapter rút gọn link)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. BẬT ROW LEVEL SECURITY (RLS) TRÊN TOÀN BỘ BẢNG
-- (Không bật FORCE RLS để các hàm SECURITY DEFINER chạy mượt trên Supabase)
-- ============================================================================
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verify_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. CÁC HÀM HỖ TRỢ & POSTGRES RPC (ATOMIC & SECURITY DEFINER)
-- ============================================================================

-- 3.0. Hàm phụ trợ chuyển chuỗi version ("1.0" hoặc "1.10.2") thành mảng 4 số nguyên (ARRAY[1, 0, 0, 0])
CREATE OR REPLACE FUNCTION public.parse_semver(p_version TEXT)
RETURNS INT[]
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_parts TEXT[];
BEGIN
    IF p_version IS NULL OR p_version !~ '^[0-9]{1,6}(\.[0-9]{1,6}){0,3}$' THEN
        RETURN NULL;
    END IF;
    v_parts := string_to_array(p_version, '.');
    RETURN ARRAY[
        COALESCE(v_parts[1]::INT, 0),
        COALESCE(v_parts[2]::INT, 0),
        COALESCE(v_parts[3]::INT, 0),
        COALESCE(v_parts[4]::INT, 0)
    ];
END;
$$;

-- 3.1. RPC Kiểm tra & Tiêu thụ Rate Limit (Atomic Upsert)
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
    p_bucket_key TEXT,
    p_max_points INT,
    p_window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_points INT;
    v_window_ends TIMESTAMPTZ;
BEGIN
    IF p_bucket_key IS NULL OR LENGTH(p_bucket_key) > 160 OR p_max_points < 1 OR p_window_seconds < 1 THEN
        RETURN jsonb_build_object('allowed', false, 'code', 'INVALID_REQUEST');
    END IF;

    INSERT INTO public.rate_limits (bucket_key, points, window_ends_at)
    VALUES (p_bucket_key, 1, NOW() + make_interval(secs => p_window_seconds))
    ON CONFLICT (bucket_key) DO UPDATE
    SET points = CASE
            WHEN public.rate_limits.window_ends_at <= NOW() THEN 1
            ELSE public.rate_limits.points + 1
        END,
        window_ends_at = CASE
            WHEN public.rate_limits.window_ends_at <= NOW() THEN NOW() + make_interval(secs => p_window_seconds)
            ELSE public.rate_limits.window_ends_at
        END
    RETURNING points, window_ends_at INTO v_points, v_window_ends;

    IF v_points > p_max_points THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'points', v_points,
            'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_window_ends - NOW()))::INT)
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'points', v_points,
        'remaining', p_max_points - v_points
    );
END;
$$;

-- 3.2. RPC Cộng Dồn Thống Kê Ngày (Atomic Increment theo giờ Việt Nam Asia/Ho_Chi_Minh)
CREATE OR REPLACE FUNCTION public.increment_daily_metric(
    p_field TEXT,
    p_amount INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_vn_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN;
    END IF;

    INSERT INTO public.daily_metrics (
        metric_date,
        claims_started,
        claims_completed,
        admin_keys_created,
        verify_fail_count,
        updated_at
    ) VALUES (
        v_vn_today,
        CASE WHEN p_field = 'claims_started' THEN p_amount ELSE 0 END,
        CASE WHEN p_field = 'claims_completed' THEN p_amount ELSE 0 END,
        CASE WHEN p_field = 'admin_keys_created' THEN p_amount ELSE 0 END,
        CASE WHEN p_field = 'verify_fail_count' THEN p_amount ELSE 0 END,
        NOW()
    )
    ON CONFLICT (metric_date) DO UPDATE
    SET claims_started = public.daily_metrics.claims_started + (CASE WHEN p_field = 'claims_started' THEN p_amount ELSE 0 END),
        claims_completed = public.daily_metrics.claims_completed + (CASE WHEN p_field = 'claims_completed' THEN p_amount ELSE 0 END),
        admin_keys_created = public.daily_metrics.admin_keys_created + (CASE WHEN p_field = 'admin_keys_created' THEN p_amount ELSE 0 END),
        verify_fail_count = public.daily_metrics.verify_fail_count + (CASE WHEN p_field = 'verify_fail_count' THEN p_amount ELSE 0 END),
        updated_at = NOW();
END;
$$;

-- 3.3. RPC Hoàn tất Claim Session & Sinh Key 12h Atomic (Khớp Cookie hoặc cùng dải IP /24)
CREATE OR REPLACE FUNCTION public.complete_claim_session(
    p_token_hash TEXT,
    p_cookie_hash TEXT,
    p_client_ip INET,
    p_generated_key_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session public.claim_sessions%ROWTYPE;
    v_game public.games%ROWTYPE;
    v_new_key public.license_keys%ROWTYPE;
    v_identity_matched BOOLEAN := false;
    v_duration_secs INT;
    v_is_blacklisted BOOLEAN;
    v_vn_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
BEGIN
    -- Validate đầu vào tránh lỗi CHECK constraint
    IF p_token_hash IS NULL OR p_token_hash = ''
       OR p_generated_key_code IS NULL OR p_generated_key_code !~ '^[A-Za-z0-9_-]{4,64}$' THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_REQUEST', 'message', 'Tham số yêu cầu không hợp lệ.');
    END IF;

    -- Kiểm tra Blacklist IP
    IF p_client_ip IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.blacklist
            WHERE target_type = 'IP'
              AND target_value = host(p_client_ip)
              AND (expires_at IS NULL OR expires_at > NOW())
        ) INTO v_is_blacklisted;

        IF v_is_blacklisted THEN
            RETURN jsonb_build_object('success', false, 'code', 'BLACKLISTED', 'message', 'Địa chỉ mạng của bạn đã bị từ chối truy cập.');
        END IF;
    END IF;

    -- Khóa dòng claim_session để chống 2 request hoàn tất cùng lúc
    SELECT * INTO v_session
    FROM public.claim_sessions
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'CLAIM_NOT_FOUND', 'message', 'Phiên nhận Key không tồn tại hoặc đường dẫn không hợp lệ.');
    END IF;

    -- Kiểm tra định danh: Khớp Cookie HOẶC cùng dải mạng IP (/24 cho IPv4, /64 cho IPv6)
    IF p_cookie_hash IS NOT NULL AND p_cookie_hash <> '' AND v_session.cookie_hash = p_cookie_hash THEN
        v_identity_matched := true;
    ELSIF p_client_ip IS NOT NULL AND family(v_session.ip_address) = 4 AND family(p_client_ip) = 4
          AND network(set_masklen(v_session.ip_address, 24)) = network(set_masklen(p_client_ip, 24)) THEN
        v_identity_matched := true;
    ELSIF p_client_ip IS NOT NULL AND family(v_session.ip_address) = 6 AND family(p_client_ip) = 6
          AND network(set_masklen(v_session.ip_address, 64)) = network(set_masklen(p_client_ip, 64)) THEN
        v_identity_matched := true;
    END IF;

    -- Nếu phiên đã hoàn tất trước đó: chỉ trả lại Key nếu Key còn tồn tại và đúng định danh,
    -- nếu Key đã bị xóa (issued_key_id IS NULL) thì chặn luôn CLAIM_ALREADY_USED, không cấp lại Key mới!
    IF v_session.status = 'COMPLETED' THEN
        IF v_identity_matched AND v_session.issued_key_id IS NOT NULL THEN
            SELECT * INTO v_new_key FROM public.license_keys WHERE id = v_session.issued_key_id;
            IF FOUND THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'code', 'ALREADY_COMPLETED',
                    'key_id', v_new_key.id,
                    'key_code', v_new_key.key_code,
                    'game_package', v_new_key.game_package,
                    'expires_at', v_new_key.expires_at,
                    'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_new_key.expires_at - NOW()))::INT),
                    'max_devices', v_new_key.max_devices
                );
            END IF;
        END IF;
        RETURN jsonb_build_object('success', false, 'code', 'CLAIM_ALREADY_USED', 'message', 'Đường dẫn nhận Key này đã được sử dụng.');
    END IF;

    IF v_session.status = 'EXPIRED' OR v_session.expires_at <= NOW() THEN
        UPDATE public.claim_sessions SET status = 'EXPIRED' WHERE id = v_session.id;
        RETURN jsonb_build_object('success', false, 'code', 'CLAIM_EXPIRED', 'message', 'Phiên vượt link đã hết hạn (quá 30 phút). Vui lòng quay lại trang chủ lấy lại!');
    END IF;

    -- Kiểm tra thời gian tối thiểu chống bypass (Trừ khi đã có postback xác nhận từ nhà cung cấp)
    IF NOT v_session.provider_verified AND NOW() < v_session.min_complete_after THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'BYPASS_DETECTED',
            'wait_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_session.min_complete_after - NOW()))::INT),
            'message', 'Phát hiện thời gian vượt link bất thường (quá nhanh). Vui lòng vượt link hợp lệ!'
        );
    END IF;

    IF NOT v_identity_matched THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_CLAIM_SESSION',
            'message', 'Phiên trình duyệt hoặc địa chỉ mạng không khớp với nơi đã bấm Lấy Key. Vui lòng lấy lại Key trên cùng thiết bị!'
        );
    END IF;

    -- Lấy cấu hình thời hạn mặc định của Game
    SELECT * INTO v_game FROM public.games WHERE package_name = v_session.game_package;
    IF NOT FOUND OR NOT v_game.is_active THEN
        RETURN jsonb_build_object('success', false, 'code', 'MAINTENANCE', 'message', 'Tựa game này hiện đang bảo trì.');
    END IF;

    v_duration_secs := v_game.default_hours * 3600;

    -- Tạo Key thật và bắt đầu đếm ngược 12 giờ ngay từ lúc hoàn tất vượt link
    INSERT INTO public.license_keys (
        key_code,
        key_type,
        all_games,
        game_package,
        created_by,
        duration_label,
        duration_seconds,
        is_lifetime,
        start_on_first_use,
        max_devices,
        is_active,
        created_by_ip,
        created_at,
        activated_at,
        expires_at
    ) VALUES (
        p_generated_key_code,
        'FREE_12H',
        false,
        v_session.game_package,
        'USER_WEB',
        v_game.default_hours || 'h',
        v_duration_secs,
        false,
        false,
        v_game.default_max_devices,
        true,
        p_client_ip,
        NOW(),
        NOW(),
        NOW() + make_interval(secs => v_duration_secs)
    ) RETURNING * INTO v_new_key;

    -- Cập nhật trạng thái Claim Session
    UPDATE public.claim_sessions
    SET status = 'COMPLETED',
        issued_key_id = v_new_key.id,
        completed_at = NOW()
    WHERE id = v_session.id;

    -- Cộng dồn thống kê lượt vượt link thành công theo ngày giờ Việt Nam
    INSERT INTO public.daily_metrics (metric_date, claims_completed, updated_at)
    VALUES (v_vn_today, 1, NOW())
    ON CONFLICT (metric_date) DO UPDATE
    SET claims_completed = public.daily_metrics.claims_completed + 1,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'code', 'OK',
        'key_id', v_new_key.id,
        'key_code', v_new_key.key_code,
        'game_package', v_new_key.game_package,
        'expires_at', v_new_key.expires_at,
        'remaining_seconds', v_duration_secs,
        'max_devices', v_new_key.max_devices
    );
END;
$$;

-- 3.4. RPC Kiểm tra Key & Khóa Cứng Thiết Bị Trong Game (Fast-Path Read + Atomic FOR UPDATE cho máy mới)
CREATE OR REPLACE FUNCTION public.verify_and_bind_key(
    p_key_code TEXT,
    p_game_package TEXT,
    p_device_id TEXT,
    p_app_version TEXT,
    p_client_ip INET
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_key public.license_keys%ROWTYPE;
    v_game public.games%ROWTYPE;
    v_device public.key_devices%ROWTYPE;
    v_device_count INT;
    v_remaining_secs INT;
    v_is_blacklisted BOOLEAN;
    v_client_ver INT[];
    v_min_ver INT[];
BEGIN
    -- Bước 0.1: Kiểm tra định dạng đầu vào trước khi chạm bảng (tránh văng lỗi CHECK constraint)
    IF p_key_code IS NULL OR p_key_code !~ '^[A-Za-z0-9_-]{4,64}$'
       OR p_game_package IS NULL OR p_game_package !~ '^[a-zA-Z0-9._,]{3,128}$'
       OR p_device_id IS NULL OR p_device_id !~ '^[A-Za-z0-9._:-]{4,128}$' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'INVALID_REQUEST',
            'message', 'Định dạng dữ liệu gửi lên không hợp lệ.'
        );
    END IF;

    -- Bước 0.2: Kiểm tra Blacklist (IP hoặc Device ID) -> Chỉ log BLACKLISTED & KEY_NOT_FOUND vào verify_logs
    SELECT EXISTS (
        SELECT 1 FROM public.blacklist
        WHERE (
            (target_type IN ('DEVICE', 'DEVICE_ID') AND target_value = p_device_id) OR
            (target_type = 'IP' AND p_client_ip IS NOT NULL AND target_value = host(p_client_ip))
        )
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO v_is_blacklisted;

    IF v_is_blacklisted THEN
        INSERT INTO public.verify_logs (key_code_attempt, game_package, device_id, ip_address, error_code)
        VALUES (p_key_code, p_game_package, p_device_id, p_client_ip, 'BLACKLISTED');

        RETURN jsonb_build_object(
            'valid', false,
            'code', 'BLACKLISTED',
            'message', 'Thiết bị hoặc địa chỉ mạng của bạn đã bị từ chối truy cập.'
        );
    END IF;

    -- Bước 1: Tra bảng games hỗ trợ cả chuỗi nhiều package cách nhau dấu phẩy (VD: Liên Quân)
    SELECT * INTO v_game
    FROM public.games
    WHERE p_game_package = ANY(string_to_array(package_name, ','))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'GAME_MISMATCH',
            'message', 'Tựa game không tồn tại trên hệ thống.'
        );
    END IF;

    IF NOT v_game.is_active THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'MAINTENANCE',
            'message', COALESCE(v_game.maintenance_msg, 'Tựa game đang bảo trì.')
        );
    END IF;

    v_min_ver := public.parse_semver(v_game.min_version);
    v_client_ver := public.parse_semver(p_app_version);

    -- Bắt buộc client phải gửi version hợp lệ và >= min_version
    IF v_min_ver IS NOT NULL AND (v_client_ver IS NULL OR v_client_ver < v_min_ver) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'UPDATE_REQUIRED',
            'min_version', v_game.min_version,
            'download_url', v_game.download_url,
            'message', 'Phiên bản Mod đã cũ (Yêu cầu bản v' || v_game.min_version || '). Vui lòng tải bản mới trên web!'
        );
    END IF;

    -- Bước 2: ĐỌC NHANH KHÔNG KHÓA DÒNG (Fast-Path SELECT)
    SELECT * INTO v_key
    FROM public.license_keys
    WHERE key_code = p_key_code;

    IF NOT FOUND THEN
        INSERT INTO public.verify_logs (key_code_attempt, game_package, device_id, ip_address, error_code)
        VALUES (p_key_code, p_game_package, p_device_id, p_client_ip, 'KEY_NOT_FOUND');

        RETURN jsonb_build_object(
            'valid', false,
            'code', 'KEY_NOT_FOUND',
            'message', 'Mã Key không tồn tại hoặc đã bị xóa khỏi hệ thống.'
        );
    END IF;

    -- Bước 3: Kiểm tra thu hồi / khóa bởi Admin
    IF NOT v_key.is_active THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'KEY_REVOKED',
            'message', 'Key này đã bị khóa bởi Quản trị viên.'
        );
    END IF;

    -- Bước 4: So khớp Key với v_game.package_name đã tìm được ở Bước 1 (Chuẩn xác cho cả Liên Quân)
    IF NOT v_key.all_games AND v_key.game_package <> v_game.package_name THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'GAME_MISMATCH',
            'message', 'Key này chỉ dùng cho tựa game khác, không khớp với game hiện tại.'
        );
    END IF;

    -- Bước 5: FAST-PATH cho thiết bị đã gắn sẵn (và Key đã kích hoạt) -> Không cần khóa FOR UPDATE trên license_keys
    IF NOT (v_key.start_on_first_use AND v_key.first_used_at IS NULL AND NOT v_key.is_lifetime) THEN
        IF NOT v_key.is_lifetime AND (v_key.expires_at IS NULL OR v_key.expires_at <= NOW()) THEN
            RETURN jsonb_build_object(
                'valid', false,
                'code', 'KEY_EXPIRED',
                'message', 'Key của bạn đã hết hạn sử dụng. Vui lòng lên web lấy Key mới!'
            );
        END IF;

        SELECT * INTO v_device
        FROM public.key_devices
        WHERE key_id = v_key.id AND device_id = p_device_id;

        IF FOUND THEN
            -- Thiết bị đã gắn sẵn: Chỉ cập nhật last_seen nếu đã qua 3 phút.
            -- Dùng SKIP LOCKED khi chạm license_keys.last_used_at để không bao giờ phải đứng chờ khóa dòng!
            IF v_device.last_seen < NOW() - INTERVAL '3 minutes' THEN
                UPDATE public.key_devices
                SET last_seen = NOW(), ip_address = COALESCE(p_client_ip, ip_address)
                WHERE id = v_device.id;

                UPDATE public.license_keys
                SET last_used_at = NOW()
                WHERE id = (
                    SELECT lk.id FROM public.license_keys lk WHERE lk.id = v_key.id FOR UPDATE SKIP LOCKED
                );
            END IF;

            IF v_key.is_lifetime THEN
                v_remaining_secs := -1;
            ELSE
                v_remaining_secs := GREATEST(0, EXTRACT(EPOCH FROM (v_key.expires_at - NOW()))::INT);
            END IF;

            RETURN jsonb_build_object(
                'valid', true,
                'code', 'OK',
                'key_id', v_key.id,
                'key_code', v_key.key_code,
                'game_package', p_game_package,
                'is_lifetime', v_key.is_lifetime,
                'expires_at', v_key.expires_at,
                'remaining_seconds', v_remaining_secs,
                'message', 'Xác thực Key thành công!'
            );
        END IF;
    END IF;

    -- Bước 6: SLOW-PATH (Chỉ chạy khi kích hoạt lần đầu HOẶC gắn thiết bị mới) -> Khóa FOR UPDATE chống Race Condition
    SELECT * INTO v_key
    FROM public.license_keys
    WHERE id = v_key.id
    FOR UPDATE;

    IF NOT FOUND OR NOT v_key.is_active THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'KEY_REVOKED',
            'message', 'Key không còn hiệu lực.'
        );
    END IF;

    -- Xử lý kích hoạt lần đầu (nếu start_on_first_use = true)
    IF v_key.start_on_first_use AND v_key.first_used_at IS NULL AND NOT v_key.is_lifetime THEN
        IF v_key.activate_before IS NOT NULL AND v_key.activate_before <= NOW() THEN
            RETURN jsonb_build_object(
                'valid', false,
                'code', 'KEY_EXPIRED',
                'message', 'Key đã quá thời hạn kích hoạt lần đầu.'
            );
        END IF;
        v_key.first_used_at := NOW();
        v_key.expires_at := NOW() + make_interval(secs => v_key.duration_seconds);
        UPDATE public.license_keys
        SET first_used_at = v_key.first_used_at,
            expires_at = v_key.expires_at
        WHERE id = v_key.id;
    END IF;

    -- Kiểm tra lại hạn sau khi giữ khóa
    IF NOT v_key.is_lifetime AND (v_key.expires_at IS NULL OR v_key.expires_at <= NOW()) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'KEY_EXPIRED',
            'message', 'Key của bạn đã hết hạn sử dụng. Vui lòng lên web lấy Key mới!'
        );
    END IF;

    -- Kiểm tra lại thiết bị dưới khóa FOR UPDATE
    SELECT * INTO v_device
    FROM public.key_devices
    WHERE key_id = v_key.id AND device_id = p_device_id;

    IF NOT FOUND THEN
        SELECT COUNT(*) INTO v_device_count
        FROM public.key_devices
        WHERE key_id = v_key.id;

        IF v_key.max_devices > 0 AND v_device_count >= v_key.max_devices THEN
            RETURN jsonb_build_object(
                'valid', false,
                'code', 'DEVICE_LIMIT',
                'max_devices', v_key.max_devices,
                'used_devices', v_device_count,
                'message', 'Key này đã đạt giới hạn thiết bị (' || v_device_count || '/' || v_key.max_devices || ' máy).'
            );
        END IF;

        INSERT INTO public.key_devices (key_id, device_id, device_name, game_package, ip_address, first_seen, last_seen)
        VALUES (v_key.id, p_device_id, 'Android Device', p_game_package, p_client_ip, NOW(), NOW())
        ON CONFLICT (key_id, device_id) DO UPDATE
        SET last_seen = NOW(),
            game_package = COALESCE(EXCLUDED.game_package, public.key_devices.game_package);

        UPDATE public.license_keys
        SET first_used_at = COALESCE(first_used_at, NOW()),
            last_used_at = NOW()
        WHERE id = v_key.id;
    END IF;

    IF v_key.is_lifetime THEN
        v_remaining_secs := -1;
    ELSE
        v_remaining_secs := GREATEST(0, EXTRACT(EPOCH FROM (v_key.expires_at - NOW()))::INT);
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'code', 'OK',
        'key_id', v_key.id,
        'key_code', v_key.key_code,
        'game_package', p_game_package,
        'is_lifetime', v_key.is_lifetime,
        'expires_at', v_key.expires_at,
        'remaining_seconds', v_remaining_secs,
        'message', 'Xác thực Key thành công!'
    );
END;
$$;

-- 3.5. RPC Dọn Rác Định Kỳ (Mặc định p_expired_key_grace_hours = 0 -> Xóa ngay khi hết hạn 12h!)
CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
    p_expired_key_grace_hours INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_keys INT;
    v_deleted_claims INT;
    v_deleted_logs INT;
    v_deleted_limits INT;
    v_vn_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
    v_today_fails INT;
BEGIN
    -- 0. Đồng bộ số lượt verify thất bại (KEY_NOT_FOUND & BLACKLISTED) trong ngày
    SELECT COUNT(*) INTO v_today_fails
    FROM public.verify_logs
    WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE = v_vn_today;

    INSERT INTO public.daily_metrics (metric_date, verify_fail_count, updated_at)
    VALUES (v_vn_today, v_today_fails, NOW())
    ON CONFLICT (metric_date) DO UPDATE
    SET verify_fail_count = GREATEST(public.daily_metrics.verify_fail_count, EXCLUDED.verify_fail_count),
        updated_at = NOW();

    -- 1. Xóa bay hoàn toàn các Key đã hết hạn (mặc định grace = 0h là xóa ngay khi hết 12h)
    -- Hoặc các Key start_on_first_use chưa kích hoạt nhưng đã quá hạn activate_before
    WITH deleted AS (
        DELETE FROM public.license_keys
        WHERE is_lifetime = false
          AND (
              (expires_at IS NOT NULL AND expires_at <= NOW() - make_interval(hours => GREATEST(0, COALESCE(p_expired_key_grace_hours, 0))))
              OR
              (expires_at IS NULL AND activate_before IS NOT NULL AND activate_before <= NOW())
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_keys FROM deleted;

    -- 2. Xóa các Claim Session đã hết hạn quá 1 giờ
    WITH deleted_c AS (
        DELETE FROM public.claim_sessions
        WHERE expires_at <= NOW() - INTERVAL '1 hour'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_claims FROM deleted_c;

    -- 3. Xóa các Rate Limit cũ
    WITH deleted_r AS (
        DELETE FROM public.rate_limits
        WHERE window_ends_at <= NOW() - INTERVAL '5 minutes'
        RETURNING bucket_key
    )
    SELECT COUNT(*) INTO v_deleted_limits FROM deleted_r;

    -- 4. Xóa verify_logs cũ quá 2 ngày (giữ DB nhẹ)
    WITH deleted_l AS (
        DELETE FROM public.verify_logs
        WHERE created_at <= NOW() - INTERVAL '2 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_logs FROM deleted_l;

    RETURN jsonb_build_object(
        'deleted_keys', v_deleted_keys,
        'deleted_claims', v_deleted_claims,
        'deleted_rate_limits', v_deleted_limits,
        'deleted_verify_logs', v_deleted_logs
    );
END;
$$;

-- ============================================================================
-- 4. KHÓA CHẶT QUYỀN TRUY CẬP (REVOKE / GRANT) CHO BẢNG, SEQUENCE & HÀM RPC
-- ============================================================================

-- 4.1. Thu hồi toàn bộ quyền trên Schema, Bảng, Sequence, Function hiện có
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4.2. Khóa quyền thực thi từng hàm cụ thể và chỉ cấp cho service_role
REVOKE ALL ON FUNCTION public.parse_semver(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.parse_semver(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.increment_daily_metric(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_daily_metric(TEXT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.complete_claim_session(TEXT, TEXT, INET, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_claim_session(TEXT, TEXT, INET, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.verify_and_bind_key(TEXT, TEXT, TEXT, TEXT, INET) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_bind_key(TEXT, TEXT, TEXT, TEXT, INET) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_data(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(INT) TO service_role;

-- 4.3. Đặt Default Privileges (Bao gồm lệnh không kèm IN SCHEMA để gỡ sạch EXECUTE mặc định của PUBLIC trên hàm mới)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ============================================================================
-- 5. TỰ ĐỘNG ĐĂNG KÝ PG_CRON (RAISE WARNING NẾU CHƯA BẬT PG_CRON)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'hiroki-cleanup-expired-every-5m',
            '*/5 * * * *',
            'SELECT public.cleanup_expired_data(0);'
        );
    ELSE
        RAISE WARNING 'pg_cron chưa được bật trên hệ thống này. Trên Supabase thật, hãy bật pg_cron để tự động chạy cleanup_expired_data(0).';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Không thể tự động đăng ký lịch pg_cron: %', SQLERRM;
END $$;

-- ============================================================================
-- 6. NẠP DỮ LIỆU MẶC ĐỊNH CHO 5 TỰA GAME & CẤU HÌNH HỆ THỐNG
-- ============================================================================

INSERT INTO public.games (package_name, game_name, icon_url, version, min_version, download_url, features_json, default_hours, default_max_devices, links_count, min_claim_seconds, is_active, sort_order)
VALUES
(
    'com.vng.speedvn',
    'ZingSpeed | Speed Drifter',
    '/assets/images/zingspeed.png',
    '1.0.0',
    '1.0.0',
    '',
    '[{"title":"Chính","items":[{"text":"CWW Nhanh","vip":false},{"text":"Full Nitro + H2O","vip":false},{"text":"Full Mini Boost","vip":false},{"text":"Ra Trận Nhanh","vip":false},{"text":"Gia Tốc Nhanh","vip":false}]},{"title":"Tốc Biến","items":[{"text":"Tốc Biến Nhấn Phanh","vip":false},{"text":"Tốc Biến Nhấn Drift","vip":false},{"text":"Tuỳ Chỉnh Tốc Độ Tốc Biến","vip":false}]},{"title":"Phụ","items":[{"text":"Hiển Thị Time Map","vip":true}]}]'::jsonb,
    12, 1, 1, 25, true, 1
),
(
    'com.mobile.legends',
    'Mobile Legends Bang Bang',
    '/assets/images/mlbb.png',
    '1.0.0',
    '1.0.0',
    '',
    '[{"title":"Draw ESP","items":[{"text":"ESP Line","vip":false},{"text":"ESP Box","vip":false},{"text":"ESP Health","vip":false},{"text":"ESP Icon","vip":false},{"text":"ESP Minimap","vip":false}]},{"title":"Room Info","items":[{"text":"Show Entity Name","vip":false},{"text":"Show Entity Hero","vip":false}]}]'::jsonb,
    12, 1, 1, 25, true, 2
),
(
    'com.garena.game.kgvn,com.garena.game.kgvo,com.garena.game.kgvn64x',
    'Liên Quân Mobile',
    '/assets/images/lienquan.png',
    '1.0.0',
    '1.0.0',
    '',
    '[{"title":"Draw ESP","items":[{"text":"ESP Line","vip":false},{"text":"ESP Box","vip":false},{"text":"ESP Monster","vip":false},{"text":"ESP Minimap","vip":false},{"text":"Drone View","vip":false}]}]'::jsonb,
    12, 1, 1, 25, true, 3
),
(
    'com.netease.newspike',
    'Blood Strike Mobile (VIP Mod)',
    '/assets/images/bloodstrike.png',
    '1.0.0',
    '1.0.0',
    '',
    '["ESP Khung xương & Khoảng cách", "Aimbot tâm mượt tuỳ chỉnh FOV", "Giảm giật súng (No Recoil)", "Cảnh báo địch ngắm từ xa"]'::jsonb,
    12, 1, 1, 25, true, 4
),
(
    'com.miniclip.eightballpool',
    '8 Ball Pool',
    '/assets/images/8ballpool.png',
    '1.0.0',
    '1.0.0',
    '',
    '[]'::jsonb,
    12, 1, 1, 25, true, 5
)
ON CONFLICT (package_name) DO UPDATE SET
    game_name = EXCLUDED.game_name,
    features_json = EXCLUDED.features_json,
    default_hours = EXCLUDED.default_hours;

INSERT INTO public.system_settings (key, value)
VALUES
(
    'shortener_config',
    '{"enabled": false, "providers": [], "fallback_mode": "FAIL_CLOSED"}'
),
(
    'key_config',
    '{"default_prefix": "HIROKI", "random_bytes": 6, "expired_grace_hours": 0}'
),
(
    'announcement_banner',
    'Hệ thống lấy Key miễn phí 12h tự động — Hiroki Panel'
),
(
    'telegram_support_url',
    'https://t.me/hirokipanel'
),
(
    'youtube_tutorial_url',
    'https://youtube.com'
),
(
    'default_free_key_hours',
    '12'
),
(
    'min_claim_seconds',
    '25'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value;
