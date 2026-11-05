/**
 * Complete Internationalization (i18n) Engine for GETKEY2
 * Supports 14 Languages: EN (Default), VI, ZH, RU, ES, PT, TH, ID, TL, JA, KO, AR, DE, FR
 */
(function() {
    'use strict';

    // Auto-clear any legacy restriction cookies
    try {
        document.cookie = '_geo_blocked=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;Max-Age=0';
        document.cookie = '_geo_blocked=;path=/GETKEY2/;expires=Thu, 01 Jan 1970 00:00:01 GMT;Max-Age=0';
        if (localStorage.getItem('getkey_lang') === 'zh') {
            localStorage.removeItem('getkey_lang');
        }
    } catch(e) {}

    const LANGUAGES = {
    "en": {
        "name": "English",
        "flag_code": "us",
        "label": "EN"
    },
    "vi": {
        "name": "Tiếng Việt",
        "flag_code": "vn",
        "label": "VI"
    },
    "ru": {
        "name": "Русский",
        "flag_code": "ru",
        "label": "RU"
    },
    "es": {
        "name": "Español",
        "flag_code": "es",
        "label": "ES"
    },
    "pt": {
        "name": "Português",
        "flag_code": "br",
        "label": "PT"
    },
    "th": {
        "name": "ไทย",
        "flag_code": "th",
        "label": "TH"
    },
    "id": {
        "name": "Indonesia",
        "flag_code": "id",
        "label": "ID"
    },
    "tl": {
        "name": "Filipino",
        "flag_code": "ph",
        "label": "TL"
    },
    "ja": {
        "name": "日本語",
        "flag_code": "jp",
        "label": "JA"
    },
    "ko": {
        "name": "한국어",
        "flag_code": "kr",
        "label": "KO"
    },
    "ar": {
        "name": "العربية",
        "flag_code": "sa",
        "label": "AR",
        "dir": "rtl"
    },
    "de": {
        "name": "Deutsch",
        "flag_code": "de",
        "label": "DE"
    },
    "fr": {
        "name": "Français",
        "flag_code": "fr",
        "label": "FR"
    }
};

    const TRANSLATIONS = {
    "en": {
        "gate_title": "Confirm & Get Key",
        "step_badge_gate": "Step 1/2: Verify Connection",
        "gate_desc": "Click the button below to verify and <strong>activate your access key</strong> immediately!",
        "btn_get_key_now": "GET KEY NOW",
        "btn_loading_gate": "Generating key... Redirecting...",
        "security_note_gate": "100% automated verification & key generation",
        "verify_title": "Key Verification",
        "verify_subtitle": "Please complete the verification to activate your key.",
        "btn_activate": "Activate Key",
        "success_title": "Key Generated Successfully!",
        "success_subtitle": "Your key has been activated and is ready to use.",
        "key_label_display": "Your License Key",
        "btn_copy": "Copy Key",
        "btn_copied": "Copied!",
        "toast_copied": "Key copied to clipboard!",
        "info_duration": "Valid for 8 hours",
        "info_devices": "Limit 1 device",
        "info_license": "Free License",
        "card_device": "1 Device",
        "badge_links": "links",
        "btn_buy_key": "Buy Key",
        "btn_get_key": "Get Key",
        "btn_hack_features": "Download Mod & Features",
        "search_game_placeholder": "Search games...",
        "btn_help": "Help",
        "section_title": "Game List",
        "section_subtitle": "Select a game below to get a free key or download the latest version",
        "turnstile_security": "Security Verification",
        "turnstile_hint": "Complete the verification on the right to unlock Get Key",
        "turnstile_verified": "Verified",
        "turnstile_ready": "You can now get your key — click Get Key below",
        "loading_title": "Generating Key...",
        "loading_subtitle": "Please wait a moment...",
        "help_modal_title": "Guide & Support",
        "help_step_1": "Select a game from the list and click <strong>Get Key</strong> or <strong>Buy Key</strong>.",
        "help_step_2": "Complete the verification steps to authenticate your device.",
        "help_step_3": "The system automatically redirects and displays your key.",
        "help_support_title": "Support Channel",
        "help_support_desc": "If you encounter issues or need assistance:",
        "help_btn_telegram": "Join Telegram",
        "alert_turnstile": "Please complete the security verification (checkbox above) before getting your key.",
        "alert_failed": "Unable to generate key. Please try again.",
        "alert_network": "Network error. Please check your connection.",
        "hack_modal_title": "Mod Features",
        "btn_download_now": "Download Now",
        "empty_game_title": "No Games Available",
        "empty_game_desc": "Currently no games are configured for key generation.",
        "guide_title": "User Guide",
        "guide_step_1": "Copy the key code above",
        "guide_step_2": "Open your application or game",
        "guide_step_3": "Paste the key when prompted",
        "guide_step_4": "Enjoy your 8-hour access!",
        "version_label": "Version",
        "search_not_found": "No games found",
        "search_not_found_desc": "Please try searching with a different keyword.",
        "adblock_title": "AdBlock Detected!",
        "adblock_desc": "To keep our free key service running, please disable AdBlock or Brave Shields and reload the page.",
        "adblock_btn": "I disabled AdBlock, try again",
        "btn_step1_open": "STEP 1/3: OPEN AD (STAY 5S)",
        "step_badge_gate_1": "Step 1/3: Verify Sponsor Link 1",
        "step_badge_gate_2": "Step 2/3: Verify Sponsor Link 2",
        "step_badge_gate_3": "Step 3/3: Unlock Access Key",
        "btn_step_open_1": "STEP 1/3: OPEN AD (STAY 5S)",
        "btn_step_open_2": "STEP 2/3: OPEN AD (STAY 5S)",
        "btn_step_open_3": "STEP 3/3: OPEN AD (STAY 5S)",
        "btn_step_confirm_1": "CONFIRM STEP 1/3 & NEXT",
        "btn_step_confirm_2": "CONFIRM STEP 2/3 & NEXT",
        "btn_step_confirm_3": "STEP 3/3: I WATCHED THE AD — UNLOCK KEY",
        "gate_watching_ad": "Verifying ad view: ",
        "gate_seconds_left": "s remaining...",
        "gate_ublock_warning": "<strong>Notice:</strong> If uBlock / AdBlock shows a blocked warning screen in the ad tab, you MUST click <em>'Proceed'</em> or temporarily disable it on that tab to complete verification!",
        "btn_step2_confirm": "STEP 2: I WATCHED THE AD — UNLOCK KEY",
        "btn_confirming": "Verifying ad completion...",
        "gate_desc_active": "Click the button below to open the sponsor ad. You must <strong>stay on the ad page for 5 seconds</strong> before pressing Back to return here and complete each step!",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "The sponsor ad has been opened. You <strong>MUST stay on that page for 5 seconds</strong> before pressing Back or returning here!",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "You returned after only <strong>{sec}s</strong> (required: 5s). The ad did not have enough time to load! Please open the ad again and stay on that page.",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "OPEN AD AGAIN (STAY 5S)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!",
        "quota_title": "Daily Key Quota:",
        "quota_desc": "Limit 10 keys per 24 hours per IP",
        "quota_label": "Daily Quota",
        "limit_reached_title": "Daily Limit Reached (10/10 Keys)",
        "limit_reached_desc": "You have reached the limit of 10 keys in 24 hours for this IP. Please return tomorrow to get another free key.",
        "alert_daily_limit": "You have reached the maximum limit of 10 keys per day for this IP. Please return tomorrow!"
    },
    "vi": {
        "gate_title": "Xác Nhận Lấy Key",
        "step_badge_gate": "Bước 1/2: Xác thực đường truyền",
        "gate_desc": "Nhấn vào nút bên dưới để xác thực và <strong>kích hoạt tạo mã Key</strong> của bạn ngay lập tức!",
        "btn_get_key_now": "LẤY KEY NGAY",
        "btn_loading_gate": "Đang khởi tạo Key... Đang chuyển hướng...",
        "security_note_gate": "Hệ thống xác thực và tạo Key tự động 100%",
        "verify_title": "Xác Minh Key",
        "verify_subtitle": "Vui lòng hoàn thành xác minh để kích hoạt key hoạt động.",
        "btn_activate": "Kích Hoạt Key",
        "success_title": "Lấy Key Thành Công!",
        "success_subtitle": "Mã key của bạn đã được kích hoạt và sẵn sàng sử dụng.",
        "key_label_display": "Mã Key Bản Quyền Của Bạn",
        "btn_copy": "Sao chép Key",
        "btn_copied": "Đã sao chép!",
        "toast_copied": "Đã sao chép key vào bộ nhớ tạm!",
        "info_duration": "Thời hạn 8 giờ",
        "info_devices": "Giới hạn 1 thiết bị",
        "info_license": "Bản Quyền Miễn Phí",
        "card_device": "1 Máy",
        "badge_links": "liên kết",
        "btn_buy_key": "Mua Key",
        "btn_get_key": "Lấy Key",
        "btn_hack_features": "Tải Hack & Tính Năng",
        "search_game_placeholder": "Tìm kiếm game...",
        "btn_help": "Trợ Giúp",
        "section_title": "Danh Sách Game",
        "section_subtitle": "Chọn game bên dưới để lấy key miễn phí hoặc tải bản hack mới nhất",
        "turnstile_security": "Xác minh bảo mật",
        "turnstile_hint": "Hoàn thành xác minh bên phải để mở khóa Get Key",
        "turnstile_verified": "Đã xác minh",
        "turnstile_ready": "Bạn có thể lấy key — nhấn Get Key bên dưới",
        "loading_title": "Đang tạo Key...",
        "loading_subtitle": "Vui lòng chờ trong giây lát",
        "help_modal_title": "Hướng Dẫn & Hỗ Trợ",
        "help_step_1": "Chọn game trong danh sách bên cạnh và nhấn <strong>Lấy Key</strong> hoặc <strong>Mua Key</strong>.",
        "help_step_2": "Vượt qua các liên kết rút gọn quảng cáo để xác thực thiết bị của bạn.",
        "help_step_3": "Hệ thống tự động chuyển hướng quay lại trang và in Key cho bạn.",
        "help_support_title": "Kênh Hỗ Trợ",
        "help_support_desc": "Nếu bạn gặp sự cố khi vượt link, lỗi key hoặc muốn cập nhật tính năng mới:",
        "help_btn_telegram": "Tham gia Telegram",
        "alert_turnstile": "Vui lòng xác minh Turnstile (ô checkbox phía trên) trước khi lấy key.",
        "alert_failed": "Không thể tạo key. Vui lòng thử lại.",
        "alert_network": "Lỗi mạng. Vui lòng kiểm tra kết nối.",
        "hack_modal_title": "Tính năng Hack",
        "btn_download_now": "Tải Ngay",
        "empty_game_title": "Không có game khả dụng",
        "empty_game_desc": "Hiện tại chưa có game nào được cấu hình để tạo key.",
        "guide_title": "Hướng dẫn sử dụng",
        "guide_step_1": "Sao chép mã key ở trên",
        "guide_step_2": "Mở ứng dụng hoặc game của bạn lên",
        "guide_step_3": "Dán (Paste) mã key vào khi được yêu cầu",
        "guide_step_4": "Tận hưởng 8 giờ sử dụng miễn phí!",
        "version_label": "Phiên bản",
        "search_not_found": "Không tìm thấy game",
        "search_not_found_desc": "Vui lòng thử tìm kiếm với từ khóa khác.",
        "adblock_title": "Phát Hiện Trình Chặn Quảng Cáo!",
        "adblock_desc": "Để duy trì hệ thống tạo Key miễn phí, vui lòng tắt tiện ích AdBlock (hoặc Brave Shields) rồi tải lại trang để tiếp tục.",
        "adblock_btn": "Tôi đã tắt AdBlock, thử lại",
        "btn_step1_open": "BƯỚC 1/3: MỞ QUẢNG CÁO (Ở LẠI 5S)",
        "step_badge_gate_1": "Bước 1/3: Xác thực liên kết tài trợ 1",
        "step_badge_gate_2": "Bước 2/3: Xác thực liên kết tài trợ 2",
        "step_badge_gate_3": "Bước 3/3: Xác nhận mở khóa Key",
        "btn_step_open_1": "BƯỚC 1/3: MỞ QUẢNG CÁO (Ở LẠI 5S)",
        "btn_step_open_2": "BƯỚC 2/3: MỞ QUẢNG CÁO (Ở LẠI 5S)",
        "btn_step_open_3": "BƯỚC 3/3: MỞ QUẢNG CÁO (Ở LẠI 5S)",
        "btn_step_confirm_1": "BƯỚC 1/3: XÁC NHẬN & TIẾP TỤC",
        "btn_step_confirm_2": "BƯỚC 2/3: XÁC NHẬN & TIẾP TỤC",
        "btn_step_confirm_3": "TÔI ĐÃ XEM XONG — MỞ KHÓA KEY",
        "gate_watching_ad": "Đang xác thực xem quảng cáo: ",
        "gate_seconds_left": "s còn lại...",
        "gate_ublock_warning": "<strong>Lưu ý:</strong> Nếu uBlock / AdBlock hiện màn hình chặn màu đỏ trên tab quảng cáo, bạn PHẢI nhấn <em>'Tiếp tục / Proceed'</em> hoặc tạm tắt AdBlock trên tab đó để được xác nhận!",
        "btn_step2_confirm": "BƯỚC 2: TÔI ĐÃ XEM XONG — MỞ KHÓA KEY",
        "btn_confirming": "Đang kiểm tra hoàn tất xem quảng cáo...",
        "gate_desc_active": "Nhấn vào nút bên dưới để mở trang quảng cáo. Bạn bắt buộc phải <strong>ở lại trên trang quảng cáo ít nhất 5 giây</strong> rồi mới nhấn Back quay lại đây để hoàn thành từng bước!",
        "gate_waiting_title": "Đã Mở Quảng Cáo — Vui Lòng Ở Lại Tab Ad",
        "gate_waiting_msg": "Trang quảng cáo đã được mở. Bạn <strong>BẮT BUỘC phải ở lại trang đó ít nhất 5 giây</strong> rồi mới nhấn Back quay lại đây!",
        "gate_do_not_back": "⚠️ TUYỆT ĐỐI KHÔNG nhấn Back hoặc tắt tab sớm! Nếu quay lại sớm sẽ bị hủy lượt và phải làm lại từ đầu.",
        "gate_early_title": "Bạn Vừa Nhấn Back Quá Sớm!",
        "gate_early_msg": "Bạn vừa quay lại khi mới xem được <strong>{sec} giây</strong> (yêu cầu tối thiểu 5s). Quảng cáo chưa kịp tải xong! Vui lòng bấm mở lại và ở lại trang đó.",
        "gate_anti_cheat_note": "Chống Gian Lận: Ngồi chờ trên trang Gate sẽ không được tính. Bạn bắt buộc phải ở lại trang quảng cáo.",
        "btn_reopen_ad": "MỞ LẠI QUẢNG CÁO (Ở LẠI 5S)",
        "gate_success_title": "Xác Thực Quảng Cáo Thành Công!",
        "gate_success_msg": "Bạn đã ở lại xem quảng cáo đủ <strong>{sec} giây</strong>. Lượt xem đã được ghi nhận hợp lệ!",
        "quota_title": "Hạn mức nhận key:",
        "quota_desc": "Tối đa 10 key / 24 giờ cho mỗi IP",
        "quota_label": "Hạn mức hôm nay",
        "limit_reached_title": "Hôm nay bạn đã nhận đủ 10 key!",
        "limit_reached_desc": "Mỗi địa chỉ IP được nhận tối đa 10 key trong vòng 24 giờ. Vui lòng quay lại vào ngày mai để tiếp tục nhận key miễn phí.",
        "alert_daily_limit": "Bạn đã đạt giới hạn tối đa 10 key/ngày cho địa chỉ IP này. Vui lòng quay lại vào ngày mai!"
    },
    "zh": {
        "gate_title": "确认并获取密钥",
        "step_badge_gate": "第 1/2 步：验证网络连接",
        "gate_desc": "点击下方按钮完成验证并立即<strong>激活您的访问密钥</strong>！",
        "btn_get_key_now": "立即获取密钥",
        "btn_loading_gate": "正在生成密钥... 正在跳转...",
        "security_note_gate": "100% 全自动验证与密钥生成",
        "verify_title": "密钥激活验证",
        "verify_subtitle": "请完成人机验证以激活您的密钥。",
        "btn_activate": "激活密钥",
        "success_title": "密钥生成成功！",
        "success_subtitle": "您的密钥已激活并可立即使用。",
        "key_label_display": "您的授权密钥",
        "btn_copy": "复制密钥",
        "btn_copied": "已复制！",
        "toast_copied": "密钥已成功复制到剪贴板！",
        "info_duration": "有效期 8 小时",
        "info_devices": "限 1 台设备",
        "info_license": "免费授权",
        "card_device": "1 台设备",
        "badge_links": "条验证链接",
        "btn_buy_key": "购买密钥",
        "btn_get_key": "获取密钥",
        "btn_hack_features": "下载模组与功能",
        "search_game_placeholder": "搜索游戏...",
        "btn_help": "帮助",
        "section_title": "游戏列表",
        "section_subtitle": "在下方选择游戏以获取免费密钥或下载最新版本",
        "turnstile_security": "安全验证",
        "turnstile_hint": "请完成右侧验证以解锁获取密钥功能",
        "turnstile_verified": "验证成功",
        "turnstile_ready": "您现在可以获取密钥了 — 请点击下方按钮",
        "loading_title": "正在生成密钥...",
        "loading_subtitle": "请稍候片刻...",
        "help_modal_title": "使用指南与支持",
        "help_step_1": "从列表中选择游戏并点击<strong>获取密钥</strong>或<strong>购买密钥</strong>。",
        "help_step_2": "完成简短验证步骤以认证您的设备。",
        "help_step_3": "系统将自动跳转并为您显示密钥。",
        "help_support_title": "官方支持渠道",
        "help_support_desc": "如果您遇到问题或需要帮助：",
        "help_btn_telegram": "加入 Telegram 群组",
        "alert_turnstile": "请在获取密钥前完成安全验证。",
        "alert_failed": "无法生成密钥，请重试。",
        "alert_network": "网络连接错误，请检查您的网络。",
        "hack_modal_title": "模组功能特性",
        "btn_download_now": "立即下载",
        "empty_game_title": "暂无可用游戏",
        "empty_game_desc": "目前没有配置可生成密钥的游戏。",
        "guide_title": "使用指南",
        "guide_step_1": "复制上方的密钥",
        "guide_step_2": "打开您的应用程序或游戏",
        "guide_step_3": "在提示时粘贴密钥",
        "guide_step_4": "畅享 8 小时免费体验！",
        "version_label": "版本",
        "search_not_found": "未找到游戏",
        "search_not_found_desc": "请尝试使用其他关键词搜索。",
        "adblock_title": "检测到广告拦截插件！",
        "adblock_desc": "为保持免费密钥系统运行，请禁用 AdBlock（或 Brave Shields）并刷新页面以继续。",
        "adblock_btn": "我已关闭广告拦截，重试",
        "btn_step1_open": "步骤 1：打开广告（停留 5-7 秒）",
        "gate_watching_ad": "正在验证广告观看：",
        "gate_seconds_left": "秒剩余...",
        "gate_ublock_warning": "<strong>提示：</strong>如果 uBlock / 广告拦截器显示拦截警告，您必须点击<em>“继续”</em>或临时关闭拦截才能完成验证！",
        "btn_step2_confirm": "步骤 2：我已观看完毕 — 立即解锁密钥",
        "btn_confirming": "正在验证广告观看完成...",
        "gate_desc_active": "点击下方按钮打开赞助商广告。您必须<strong>在广告页面停留 5-7 秒</strong>，然后再按返回键回到此处解锁密钥！",
        "gate_waiting_title": "已打开广告 — 请留在广告标签页",
        "gate_waiting_msg": "赞助商广告已打开。您<strong>必须在广告页停留 5-7 秒</strong>后再按返回回到这里！",
        "gate_do_not_back": "⚠️ 切勿过早按返回键或关闭广告标签页！过早返回将被取消资格并需重新开始。",
        "gate_early_title": "您按返回键太早了！",
        "gate_early_msg": "您仅停留了 <strong>{sec} 秒</strong> 就返回了（要求 5-7 秒）。广告尚未完全加载！请重新打开并停留。",
        "gate_anti_cheat_note": "防作弊保护：停留在本页面不计入时间，您必须实际留在广告页面。",
        "btn_reopen_ad": "重新打开广告（停留 5-7 秒）",
        "gate_success_title": "广告验证成功！",
        "gate_success_msg": "您已在广告页面停留了 <strong>{sec} 秒</strong>。展示已被有效确认！"
    },
    "ru": {
        "gate_title": "Подтвердить и Получить Ключ",
        "step_badge_gate": "Шаг 1/2: Проверка подключения",
        "gate_desc": "Нажмите кнопку ниже для подтверждения и <strong>активации вашего ключа</strong> прямо сейчас!",
        "btn_get_key_now": "ПОЛУЧИТЬ КЛЮЧ",
        "btn_loading_gate": "Генерация ключа... Перенаправление...",
        "security_note_gate": "100% автоматическая проверка и генерация",
        "verify_title": "Проверка Ключа",
        "verify_subtitle": "Пройдите проверку для активации ключа.",
        "btn_activate": "Активировать Ключ",
        "success_title": "Ключ Успешно Создан!",
        "success_subtitle": "Ваш ключ активирован и готов к использованию.",
        "key_label_display": "Ваш Лицензионный Ключ",
        "btn_copy": "Скопировать Ключ",
        "btn_copied": "Скопировано!",
        "toast_copied": "Ключ скопирован в буфер обмена!",
        "info_duration": "Действителен 8 часов",
        "info_devices": "Лимит 1 устройство",
        "info_license": "Бесплатная Лицензия",
        "card_device": "1 Устройство",
        "badge_links": "ссылок",
        "btn_buy_key": "Купить ключ",
        "btn_get_key": "Получить ключ",
        "btn_hack_features": "Скачать мод и функции",
        "search_game_placeholder": "Поиск игр...",
        "btn_help": "Помощь",
        "section_title": "Список Игр",
        "section_subtitle": "Выберите игру ниже для получения ключа или загрузки",
        "turnstile_security": "Проверка Безопасности",
        "turnstile_hint": "Пройдите проверку справа для доступа к ключам",
        "turnstile_verified": "Проверено",
        "turnstile_ready": "Теперь вы можете получить ключ — нажмите кнопку ниже",
        "loading_title": "Создание Ключа...",
        "loading_subtitle": "Пожалуйста, подождите...",
        "help_modal_title": "Инструкция и Поддержка",
        "help_step_1": "Выберите игру и нажмите <strong>Получить Ключ</strong>.",
        "help_step_2": "Пройдите короткие шаги проверки устройства.",
        "help_step_3": "Система автоматически покажет ваш ключ.",
        "help_support_title": "Канал Поддержки",
        "help_support_desc": "Если у вас возникли вопросы:",
        "help_btn_telegram": "Наш Telegram",
        "alert_turnstile": "Пройдите проверку капчи перед получением ключа.",
        "alert_failed": "Не удалось создать ключ. Попробуйте снова.",
        "alert_network": "Ошибка сети. Проверьте подключение.",
        "hack_modal_title": "Функции Мода",
        "btn_download_now": "Скачать Сейчас",
        "empty_game_title": "Нет доступных игр",
        "empty_game_desc": "В данный момент игры не настроены.",
        "guide_title": "Инструкция по использованию",
        "guide_step_1": "Скопируйте ключ выше",
        "guide_step_2": "Запустите ваше приложение или игру",
        "guide_step_3": "Вставьте ключ при запросе",
        "guide_step_4": "Наслаждайтесь доступом на 8 часов!",
        "version_label": "Версия",
        "search_not_found": "Игры не найдены",
        "search_not_found_desc": "Попробуйте выполнить поиск с другими ключевыми словами.",
        "adblock_title": "Обнаружен блокировщик рекламы!",
        "adblock_desc": "Чтобы поддержать бесплатный сервис ключей, отключите AdBlock и перезагрузите страницу.",
        "adblock_btn": "Я отключил AdBlock, повторить",
        "btn_step1_open": "ШАГ 1: ОТКРЫТЬ РЕКЛАМУ (ОСТАТЬСЯ 5-7 СЕК)",
        "gate_watching_ad": "Проверка просмотра рекламы: ",
        "gate_seconds_left": "сек. осталось...",
        "gate_ublock_warning": "<strong>Внимание:</strong> Если uBlock / блокировщик показывает экран блокировки, вы ДОЛЖНЫ нажать <em>«Продолжить»</em> или отключить его на той вкладке!",
        "btn_step2_confirm": "ШАГ 2: Я ПОСМОТРЕЛ РЕКЛАМУ — РАЗБЛОКИРОВАТЬ КЛЮЧ",
        "btn_confirming": "Проверка завершения просмотра...",
        "gate_desc_active": "Нажмите кнопку ниже, чтобы открыть рекламу. Вы должны <strong>оставаться на странице рекламы 5-7 секунд</strong> перед тем, как нажать Назад!",
        "gate_waiting_title": "Реклама открыта — оставайтесь на вкладке",
        "gate_waiting_msg": "Спонсорская реклама открыта. Вы <strong>ДОЛЖНЫ оставаться на ней 5-7 секунд</strong> перед возвращением сюда!",
        "gate_do_not_back": "⚠️ НЕ нажимайте Назад и не закрывайте вкладку раньше времени!",
        "gate_early_title": "Вы вернулись слишком рано!",
        "gate_early_msg": "Вы вернулись всего через <strong>{sec} сек</strong> (требуется 5-7 сек). Реклама не успела загрузиться!",
        "gate_anti_cheat_note": "Античит-защита: Ожидание на этой странице не засчитывается.",
        "btn_reopen_ad": "ОТКРЫТЬ РЕКЛАМУ СНОВА (ОСТАТЬСЯ 5-7 СЕК)",
        "gate_success_title": "Проверка рекламы успешна!",
        "gate_success_msg": "Вы пробыли на странице рекламы <strong>{sec} сек</strong>. Просмотр подтвержден!"
    },
    "es": {
        "gate_title": "Confirmar y Obtener Clave",
        "step_badge_gate": "Paso 1/2: Verificar conexión",
        "gate_desc": "¡Haz clic en el botón para verificar y <strong>activar tu clave</strong> ahora!",
        "btn_get_key_now": "OBTENER CLAVE AHORA",
        "btn_loading_gate": "Generando clave... Redirigiendo...",
        "security_note_gate": "Verificación y generación 100% automática",
        "verify_title": "Verificación de Clave",
        "verify_subtitle": "Por favor completa la verificación para activar tu clave.",
        "btn_activate": "Activar Clave",
        "success_title": "¡Clave Generada con Éxito!",
        "success_subtitle": "Tu clave ha sido activada y está lista para usar.",
        "key_label_display": "Tu Clave de Licencia",
        "btn_copy": "Copiar Clave",
        "btn_copied": "¡Copiado!",
        "toast_copied": "¡Clave copiada al portapapeles!",
        "info_duration": "Válido por 8 horas",
        "info_devices": "Límite 1 dispositivo",
        "info_license": "Licencia Gratuita",
        "card_device": "1 Dispositivo",
        "badge_links": "enlaces",
        "btn_buy_key": "Comprar Clave",
        "btn_get_key": "Obtener Clave",
        "btn_hack_features": "Descargar Mod y Funciones",
        "search_game_placeholder": "Buscar juegos...",
        "btn_help": "Ayuda",
        "section_title": "Lista de Juegos",
        "section_subtitle": "Selecciona un juego para obtener clave o descargar versión",
        "turnstile_security": "Verificación de Seguridad",
        "turnstile_hint": "Completa la verificación a la derecha para desbloquear",
        "turnstile_verified": "Verificado",
        "turnstile_ready": "Ya puedes obtener tu clave — haz clic abajo",
        "loading_title": "Generando Clave...",
        "loading_subtitle": "Un momento por favor...",
        "help_modal_title": "Guía y Soporte",
        "help_step_1": "Selecciona un juego y haz clic en <strong>Obtener Clave</strong>.",
        "help_step_2": "Completa la verificación para autenticar tu dispositivo.",
        "help_step_3": "El sistema mostrará tu clave automáticamente.",
        "help_support_title": "Canal de Soporte",
        "help_support_desc": "Si necesitas ayuda o tienes problemas:",
        "help_btn_telegram": "Unirse a Telegram",
        "alert_turnstile": "Por favor completa la verificación antes de continuar.",
        "alert_failed": "No se pudo generar la clave. Inténtalo de nuevo.",
        "alert_network": "Error de red. Revisa tu conexión.",
        "hack_modal_title": "Funciones del Mod",
        "btn_download_now": "Descargar Ahora",
        "empty_game_title": "No hay juegos disponibles",
        "empty_game_desc": "Actualmente no hay juegos configurados.",
        "guide_title": "Guía de uso",
        "guide_step_1": "Copia la clave de arriba",
        "guide_step_2": "Abre tu aplicación o juego",
        "guide_step_3": "Pega la clave cuando se solicite",
        "guide_step_4": "¡Disfruta de 8 horas de acceso!",
        "version_label": "Versión",
        "search_not_found": "No se encontraron juegos",
        "search_not_found_desc": "Intenta buscar con otra palabra clave.",
        "adblock_title": "¡Bloqueador de anuncios detectado!",
        "adblock_desc": "Para mantener el servicio gratuito, desactiva AdBlock o Brave Shields y recarga la página.",
        "adblock_btn": "Desactivé AdBlock, reintentar",
        "btn_step1_open": "PASO 1: ABRIR ANUNCIO (PERMANECER 5-7S)",
        "gate_watching_ad": "Verificando visualización del anuncio: ",
        "gate_seconds_left": "s restantes...",
        "gate_ublock_warning": "<strong>Aviso:</strong> Si uBlock / AdBlock muestra pantalla de bloqueo roja, DEBES hacer clic en <em>'Continuar'</em> para completar la verificación.",
        "btn_step2_confirm": "PASO 2: HE VISTO EL ANUNCIO — DESBLOQUEAR CLAVE",
        "btn_confirming": "Verificando finalización del anuncio...",
        "gate_desc_active": "Haz clic en el botón para abrir el anuncio. ¡Debes <strong>permanecer en la página del anuncio de 5 a 7 segundos</strong> antes de volver!",
        "gate_waiting_title": "Anuncio abierto — Permanece en la pestaña",
        "gate_waiting_msg": "Se ha abierto el anuncio. ¡<strong>DEBES permanecer allí de 5 a 7 segundos</strong> antes de volver aquí!",
        "gate_do_not_back": "⚠️ ¡NO presiones Atrás ni cierres la pestaña antes de tiempo!",
        "gate_early_title": "¡Presionaste Atrás demasiado pronto!",
        "gate_early_msg": "Regresaste después de solo <strong>{sec}s</strong> (se requieren 5-7s). ¡El anuncio no tuvo tiempo de cargar!",
        "gate_anti_cheat_note": "Protección Antitrampas: Esperar en esta página no cuenta.",
        "btn_reopen_ad": "ABRIR ANUNCIO OTRA VEZ (PERMANECER 5-7S)",
        "gate_success_title": "¡Verificación de Anuncio Exitosa!",
        "gate_success_msg": "Permaneciste en el anuncio durante <strong>{sec}s</strong>. ¡Impresión validada con éxito!"
    },
    "pt": {
        "gate_title": "Confirmar e Obter Chave",
        "step_badge_gate": "Passo 1/2: Verificar conexão",
        "gate_desc": "Clique no botão para verificar e <strong>ativar sua chave</strong> agora!",
        "btn_get_key_now": "OBTER CHAVE AGORA",
        "btn_loading_gate": "Gerando chave... Redirecionando...",
        "security_note_gate": "Verificação e geração 100% automática",
        "verify_title": "Verificação de Chave",
        "verify_subtitle": "Por favor complete a verificação para ativar sua chave.",
        "btn_activate": "Ativar Chave",
        "success_title": "Chave Gerada com Sucesso!",
        "success_subtitle": "Sua chave foi ativada e está pronta para uso.",
        "key_label_display": "Sua Chave de Licença",
        "btn_copy": "Copiar Chave",
        "btn_copied": "Copiado!",
        "toast_copied": "Chave copiada para a área de transferência!",
        "info_duration": "Válido por 8 horas",
        "info_devices": "Limite 1 dispositivo",
        "info_license": "Licença Gratuita",
        "card_device": "1 Dispositivo",
        "badge_links": "links",
        "btn_buy_key": "Comprar Chave",
        "btn_get_key": "Obter Chave",
        "btn_hack_features": "Baixar Mod e Recursos",
        "search_game_placeholder": "Buscar jogos...",
        "btn_help": "Ajuda",
        "section_title": "Lista de Jogos",
        "section_subtitle": "Selecione um jogo para obter chave ou baixar versão",
        "turnstile_security": "Verificação de Segurança",
        "turnstile_hint": "Complete a verificação à direita para desbloquear",
        "turnstile_verified": "Verificado",
        "turnstile_ready": "Você já pode obter sua chave — clique abaixo",
        "loading_title": "Gerando Chave...",
        "loading_subtitle": "Aguarde um momento...",
        "help_modal_title": "Guia e Suporte",
        "help_step_1": "Selecione um jogo e clique em <strong>Obter Chave</strong>.",
        "help_step_2": "Complete a verificação para autenticar seu dispositivo.",
        "help_step_3": "O sistema mostrará sua chave automaticamente.",
        "help_support_title": "Canal de Suporte",
        "help_support_desc": "Se precisar de ajuda ou tiver dúvidas:",
        "help_btn_telegram": "Entrar no Telegram",
        "alert_turnstile": "Por favor complete a verificação de segurança.",
        "alert_failed": "Não foi possível gerar a chave. Tente novamente.",
        "alert_network": "Erro de rede. Verifique sua conexão.",
        "hack_modal_title": "Recursos do Mod",
        "btn_download_now": "Baixar Agora",
        "empty_game_title": "Nenhum jogo disponível",
        "empty_game_desc": "Atualmente não há jogos configurados.",
        "guide_title": "Instruções de uso",
        "guide_step_1": "Copie a chave acima",
        "guide_step_2": "Abra seu aplicativo ou jogo",
        "guide_step_3": "Cole a chave quando solicitado",
        "guide_step_4": "Aproveite 8 horas de acesso!",
        "version_label": "Versão",
        "search_not_found": "Nenhum jogo encontrado",
        "search_not_found_desc": "Tente pesquisar com outras palavras-chave.",
        "adblock_title": "Bloqueador de anúncios detectado!",
        "adblock_desc": "Para manter o serviço gratuito ativo, desative o AdBlock e recarregue a página.",
        "adblock_btn": "Já desativei o AdBlock, tentar de novo",
        "btn_step1_open": "PASSO 1: ABRIR ANÚNCIO (FICAR 5-7S)",
        "gate_watching_ad": "Verificando visualização do anúncio: ",
        "gate_seconds_left": "s restantes...",
        "gate_ublock_warning": "<strong>Aviso:</strong> Se o uBlock / AdBlock mostrar tela vermelha de bloqueio, você DEVE clicar em <em>'Continuar'</em> para concluir a verificação.",
        "btn_step2_confirm": "PASSO 2: JÁ ASSISTI AO ANÚNCIO — DESBLOQUEAR CHAVE",
        "btn_confirming": "Verificando conclusão do anúncio...",
        "gate_desc_active": "Clique no botão para abrir o anúncio. Você deve <strong>permanecer na página do anúncio por 5-7 segundos</strong> antes de voltar!",
        "gate_waiting_title": "Anúncio aberto — Fique na aba do anúncio",
        "gate_waiting_msg": "O anúncio foi aberto. Você <strong>DEVE ficar lá por 5-7 segundos</strong> antes de voltar aqui!",
        "gate_do_not_back": "⚠️ NÃO pressione Voltar nem feche a aba antes do tempo!",
        "gate_early_title": "Você voltou rápido demais!",
        "gate_early_msg": "Você voltou após apenas <strong>{sec}s</strong> (mínimo 5-7s). O anúncio não carregou a tempo!",
        "gate_anti_cheat_note": "Proteção Antitrapaça: Esperar nesta página não conta.",
        "btn_reopen_ad": "ABRIR ANÚNCIO NOVAMENTE (FICAR 5-7S)",
        "gate_success_title": "Verificação do Anúncio Concluída!",
        "gate_success_msg": "Você ficou na página do anúncio por <strong>{sec}s</strong>. Impressão validada!"
    },
    "th": {
        "gate_title": "ยืนยันและรับคีย์",
        "step_badge_gate": "ขั้นตอน 1/2: ตรวจสอบการเชื่อมต่อ",
        "gate_desc": "คลิกปุ่มด้านล่างเพื่อยืนยันและ <strong>เปิดใช้งานคีย์ของคุณ</strong> ทันที!",
        "btn_get_key_now": "รับคีย์ทันที",
        "btn_loading_gate": "กำลังสร้างคีย์... กำลังเปลี่ยนเส้นทาง...",
        "security_note_gate": "ระบบตรวจสอบและสร้างคีย์อัตโนมัติ 100%",
        "verify_title": "ยืนยันคีย์",
        "verify_subtitle": "โปรดยืนยันตัวตนเพื่อเปิดใช้งานคีย์ของคุณ",
        "btn_activate": "เปิดใช้งานคีย์",
        "success_title": "สร้างคีย์สำเร็จแล้ว!",
        "success_subtitle": "คีย์ของคุณเปิดใช้งานแล้วและพร้อมใช้งานทันที",
        "key_label_display": "รหัสคีย์ลิขสิทธิ์ของคุณ",
        "btn_copy": "คัดลอกคีย์",
        "btn_copied": "คัดลอกแล้ว!",
        "toast_copied": "คัดลอกคีย์ไปยังคลิปบอร์ดแล้ว!",
        "info_duration": "ใช้งานได้ 8 ชั่วโมง",
        "info_devices": "จำกัด 1 อุปกรณ์",
        "info_license": "ใบอนุญาตฟรี",
        "card_device": "1 เครื่อง",
        "badge_links": "ลิงก์",
        "btn_buy_key": "ซื้อคีย์",
        "btn_get_key": "รับคีย์",
        "btn_hack_features": "ดาวน์โหลดม็อดและฟีเจอร์",
        "search_game_placeholder": "ค้นหาเกม...",
        "btn_help": "ช่วยเหลือ",
        "section_title": "รายการเกม",
        "section_subtitle": "เลือกเกมด้านล่างเพื่อรับคีย์ฟรีหรือดาวน์โหลดเวอร์ชันล่าสุด",
        "turnstile_security": "การตรวจสอบความปลอดภัย",
        "turnstile_hint": "ยืนยันตัวตนทางด้านขวาเพื่อปลดล็อกการรับคีย์",
        "turnstile_verified": "ตรวจสอบแล้ว",
        "turnstile_ready": "คุณสามารถรับคีย์ได้แล้ว — คลิกปุ่มด้านล่าง",
        "loading_title": "กำลังสร้างคีย์...",
        "loading_subtitle": "โปรดรอสักครู่...",
        "help_modal_title": "คำแนะนำและความช่วยเหลือ",
        "help_step_1": "เลือกเกมจากรายการแล้วคลิก <strong>รับคีย์</strong>",
        "help_step_2": "ทำตามขั้นตอนเพื่อยืนยันอุปกรณ์ของคุณ",
        "help_step_3": "ระบบจะแสดงคีย์ของคุณโดยอัตโนมัติ",
        "help_support_title": "ช่องทางสนับสนุน",
        "help_support_desc": "หากคุณพบปัญหาหรือต้องการความช่วยเหลือ:",
        "help_btn_telegram": "เข้าร่วม Telegram",
        "alert_turnstile": "โปรดยืนยันความปลอดภัยก่อนรับคีย์",
        "alert_failed": "ไม่สามารถสร้างคีย์ได้ โปรดลองอีกครั้ง",
        "alert_network": "เกิดข้อผิดพลาดของเครือข่าย",
        "hack_modal_title": "ฟีเจอร์ม็อด",
        "btn_download_now": "ดาวน์โหลดทันที",
        "empty_game_title": "ไม่มีเกมที่พร้อมใช้งาน",
        "empty_game_desc": "ขณะนี้ยังไม่มีการกำหนดค่าเกม",
        "guide_title": "คำแนะนำการใช้งาน",
        "guide_step_1": "คัดลอกรหัสคีย์ด้านบน",
        "guide_step_2": "เปิดแอปพลิเคชันหรือเกมของคุณ",
        "guide_step_3": "วางรหัสคีย์เมื่อมีข้อความแจ้งเตือน",
        "guide_step_4": "เพลิดเพลินกับสิทธิ์การเข้าถึง 8 ชั่วโมง!",
        "version_label": "เวอร์ชัน",
        "search_not_found": "ไม่พบเกม",
        "search_not_found_desc": "โปรดลองค้นหาด้วยคำค้นอื่น",
        "adblock_title": "ตรวจพบตัวบล็อกโฆษณา!",
        "adblock_desc": "เพื่อเปิดให้บริการสร้างคีย์ฟรีต่อไป โปรดปิด AdBlock หรือ Brave Shields แล้วโหลดหน้าเว็บใหม่",
        "adblock_btn": "ฉันปิดตัวบล็อกแล้ว ลองอีกครั้ง",
        "btn_step1_open": "ขั้นตอน 1: เปิดโฆษณา (อยู่ 5-7 วินาที)",
        "gate_watching_ad": "กำลังยืนยันการดูโฆษณา: ",
        "gate_seconds_left": "วินาทีที่เหลือ...",
        "gate_ublock_warning": "<strong>ข้อควรระวัง:</strong> หาก uBlock / ตัวบล็อกโฆษณาแสดงหน้าจอเตือน คุณต้องคลิก <em>'ดำเนินการต่อ'</em> เพื่อให้การตรวจสอบเสร็จสมบูรณ์!",
        "btn_step2_confirm": "ขั้นตอน 2: ฉันดูโฆษณาเสร็จแล้ว — ปลดล็อกคีย์",
        "btn_confirming": "กำลังยืนยันว่าดูโฆษณาเสร็จแล้ว...",
        "gate_desc_active": "คลิกปุ่มเพื่อเปิดโฆษณา คุณต้อง<strong>อยู่ในหน้าโฆษณา 5-7 วินาที</strong>ก่อนกดย้อนกลับ!",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "เปิดโฆษณาแล้ว คุณ<strong>ต้องอยู่ในหน้าโฆษณา 5-7 วินาที</strong>ก่อนกดย้อนกลับมาที่นี่!",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "คุณกลับมาเร็วเกินไป (เพียง <strong>{sec} วินาที</strong>, ต้องการ 5-7 วินาที)!",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "เปิดโฆษณาอีกครั้ง (อยู่ 5-7 วินาที)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    },
    "id": {
        "gate_title": "Konfirmasi & Dapatkan Kunci",
        "step_badge_gate": "Langkah 1/2: Verifikasi Koneksi",
        "gate_desc": "Klik tombol di bawah untuk memverifikasi dan <strong>mengaktifkan kunci akses</strong> sekarang!",
        "btn_get_key_now": "DAPATKAN KUNCI SEKARANG",
        "btn_loading_gate": "Membuat kunci... Mengalihkan...",
        "security_note_gate": "Verifikasi & pembuatan kunci 100% otomatis",
        "verify_title": "Verifikasi Kunci",
        "verify_subtitle": "Silakan selesaikan verifikasi untuk mengaktifkan kunci Anda.",
        "btn_activate": "Aktifkan Kunci",
        "success_title": "Kunci Berhasil Dibuat!",
        "success_subtitle": "Kunci Anda telah diaktifkan dan siap digunakan.",
        "key_label_display": "Kunci Lisensi Anda",
        "btn_copy": "Salin Kunci",
        "btn_copied": "Tersalin!",
        "toast_copied": "Kunci disalin ke papan klip!",
        "info_duration": "Berlaku 8 jam",
        "info_devices": "Batas 1 perangkat",
        "info_license": "Lisensi Gratis",
        "card_device": "1 Perangkat",
        "badge_links": "tautan",
        "btn_buy_key": "Beli Kunci",
        "btn_get_key": "Dapatkan Kunci",
        "btn_hack_features": "Unduh Mod & Fitur",
        "search_game_placeholder": "Cari game...",
        "btn_help": "Bantuan",
        "section_title": "Daftar Game",
        "section_subtitle": "Pilih game di bawah untuk mendapatkan kunci gratis atau unduh versi terbaru",
        "turnstile_security": "Verifikasi Keamanan",
        "turnstile_hint": "Selesaikan verifikasi di sebelah kanan untuk membuka Dapatkan Kunci",
        "turnstile_verified": "Terverifikasi",
        "turnstile_ready": "Sekarang Anda dapat mengambil kunci — klik tombol di bawah",
        "loading_title": "Membuat Kunci...",
        "loading_subtitle": "Mohon tunggu sebentar...",
        "help_modal_title": "Panduan & Dukungan",
        "help_step_1": "Pilih game dan klik <strong>Dapatkan Kunci</strong>.",
        "help_step_2": "Selesaikan langkah verifikasi untuk perangkat Anda.",
        "help_step_3": "Sistem akan otomatis menampilkan kunci Anda.",
        "help_support_title": "Saluran Dukungan",
        "help_support_desc": "Jika Anda mengalami kendala:",
        "help_btn_telegram": "Gabung Telegram",
        "alert_turnstile": "Harap selesaikan verifikasi captcha sebelum mengambil kunci.",
        "alert_failed": "Gagal membuat kunci. Silakan coba lagi.",
        "alert_network": "Kesalahan jaringan. Periksa koneksi Anda.",
        "hack_modal_title": "Fitur Mod",
        "btn_download_now": "Unduh Sekarang",
        "empty_game_title": "Tidak Ada Game Tersedia",
        "empty_game_desc": "Saat ini belum ada game yang dikonfigurasi.",
        "guide_title": "Panduan Penggunaan",
        "guide_step_1": "Salin kode kunci di atas",
        "guide_step_2": "Buka aplikasi atau game Anda",
        "guide_step_3": "Tempel kunci saat diminta",
        "guide_step_4": "Nikmati akses 8 jam Anda!",
        "version_label": "Versi",
        "search_not_found": "Game tidak ditemukan",
        "search_not_found_desc": "Silakan coba cari dengan kata kunci lain.",
        "adblock_title": "Pemblokir Iklan Terdeteksi!",
        "adblock_desc": "Untuk menjaga layanan kunci gratis tetap aktif, harap nonaktifkan AdBlock dan muat ulang halaman.",
        "adblock_btn": "Saya sudah matikan AdBlock, coba lagi",
        "btn_step1_open": "LANGKAH 1: BUKA IKLAN (TINGGAL 5-7D)",
        "gate_watching_ad": "Memverifikasi tampilan iklan: ",
        "gate_seconds_left": "detik tersisa...",
        "gate_ublock_warning": "<strong>Perhatian:</strong> Jika uBlock / AdBlock menampilkan layar blokir merah, Anda HARUS mengklik <em>'Lanjutkan'</em> untuk menyelesaikan verifikasi!",
        "btn_step2_confirm": "LANGKAH 2: SAYA SUDAH MENONTON IKLAN — BUKA KUNCI",
        "btn_confirming": "Memverifikasi penyelesaian iklan...",
        "gate_desc_active": "Klik tombol untuk membuka iklan. Anda harus <strong>tinggal di halaman iklan selama 5-7 detik</strong> sebelum menekan Kembali!",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "Iklan telah dibuka. Anda <strong>HARUS tinggal selama 5-7 detik</strong> sebelum kembali!",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "Anda kembali terlalu cepat (hanya <strong>{sec} detik</strong>, diperlukan 5-7 detik)!",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "BUKA IKLAN LAGI (TINGGAL 5-7D)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    },
    "tl": {
        "gate_title": "Kumpirmahin at Kunin ang Key",
        "step_badge_gate": "Hakbang 1/2: I-verify ang Koneksyon",
        "gate_desc": "Pindutin ang button sa ibaba upang i-verify at <strong>i-activate ang access key</strong> ngayon!",
        "btn_get_key_now": "KUNIN ANG KEY NGAYON",
        "btn_loading_gate": "Bumubuo ng key... Nagre-redirect...",
        "security_note_gate": "100% awtomatikong pag-verify at paggawa ng key",
        "verify_title": "Pag-verify ng Key",
        "verify_subtitle": "Mangyaring kumpletuhin ang pag-verify upang ma-activate ang iyong key.",
        "btn_activate": "I-activate ang Key",
        "success_title": "Matagumpay na Nagawa ang Key!",
        "success_subtitle": "Aktibo na ang iyong key at handa nang gamitin.",
        "key_label_display": "Ang Iyong License Key",
        "btn_copy": "Kopyahin ang Key",
        "btn_copied": "Nakopya na!",
        "toast_copied": "Nakopya ang key sa clipboard!",
        "info_duration": "Wasto sa loob ng 8 oras",
        "info_devices": "Limitasyon sa 1 device",
        "info_license": "Libreng Lisensya",
        "card_device": "1 Device",
        "badge_links": "mga link",
        "btn_buy_key": "Bumili ng Key",
        "btn_get_key": "Kunin ang Key",
        "btn_hack_features": "I-download ang Mod & Features",
        "search_game_placeholder": "Maghanap ng mga laro...",
        "btn_help": "Tulong",
        "section_title": "Listahan ng Laro",
        "section_subtitle": "Pumili ng laro sa ibaba upang makakuha ng libreng key o mag-download",
        "turnstile_security": "Seguridad na Pag-verify",
        "turnstile_hint": "Kumpletuhin ang pag-verify sa kanan upang i-unlock",
        "turnstile_verified": "Na-verify na",
        "turnstile_ready": "Maaari mo nang kunin ang key — pindutin sa ibaba",
        "loading_title": "Bumubuo ng Key...",
        "loading_subtitle": "Mangyaring maghintay...",
        "help_modal_title": "Gabay at Suporta",
        "help_step_1": "Pumili ng laro at pindutin ang <strong>Kunin ang Key</strong>.",
        "help_step_2": "Kumpletuhin ang mga hakbang para sa iyong device.",
        "help_step_3": "Awtomatikong ipapakita ng system ang iyong key.",
        "help_support_title": "Channel ng Suporta",
        "help_support_desc": "Kung mayroon kang mga katanungan o isyu:",
        "help_btn_telegram": "Sumali sa Telegram",
        "alert_turnstile": "Pakikumpleto ang pag-verify bago kunin ang key.",
        "alert_failed": "Hindi nagawa ang key. Subukan muli.",
        "alert_network": "May problema sa network. Suriin ang koneksyon.",
        "hack_modal_title": "Mga Feature ng Mod",
        "btn_download_now": "I-download Ngayon",
        "empty_game_title": "Walang Magagamit na Laro",
        "empty_game_desc": "Kasalukuyang walang nakasaayos na laro.",
        "guide_title": "Gabay sa Paggamit",
        "guide_step_1": "Kopyahin ang key sa itaas",
        "guide_step_2": "Buksan ang iyong app o laro",
        "guide_step_3": "I-paste ang key kapag hiningi",
        "guide_step_4": "Masiyahan sa iyong 8-oras na access!",
        "version_label": "Bersyon",
        "search_not_found": "Walang nahanap na laro",
        "search_not_found_desc": "Pakisubukan maghanap gamit ang ibang salita.",
        "adblock_title": "AdBlock Nahanap!",
        "adblock_desc": "Upang mapanatiling libre ang serbisyong ito, mangyaring i-disable ang AdBlock at i-refresh ang page.",
        "adblock_btn": "Na-disable ko na ang AdBlock, subukan ulit",
        "btn_step1_open": "HAKBANG 1: BUKSAN ANG AD (MANATILI 5-7S)",
        "gate_watching_ad": "Bine-verify ang panonood ng ad: ",
        "gate_seconds_left": "segundong natitira...",
        "gate_ublock_warning": "<strong>Paunawa:</strong> Kung nagpapakita ang uBlock / AdBlock ng pulang screen ng pag-block, DAPAT mong i-click ang <em>'Magpatuloy'</em> upang makumpleto ang pag-verify!",
        "btn_step2_confirm": "HAKBANG 2: NATAPOS KO NA ANG AD — I-UNLOCK ANG KEY",
        "btn_confirming": "Bine-verify ang pagkumpleto ng ad...",
        "gate_desc_active": "I-click ang button upang buksan ang ad. Dapat kang <strong>manatili sa pahina ng ad nang 5-7 segundo</strong> bago bumalik!",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "Nabuksan na ang ad. <strong>DAPAT kang manatili nang 5-7 segundo</strong> bago bumalik dito!",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "Bumalik ka nang masyadong maaga (<strong>{sec}s</strong> lang, kailangan 5-7s)!",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "BUKSAN MULI ANG AD (MANATILI 5-7S)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    },
    "ja": {
        "gate_title": "確認してキーを取得",
        "step_badge_gate": "ステップ 1/2: 接続の確認",
        "gate_desc": "下のボタンをクリックして確認を完了し、<strong>キーを有効化</strong>してください！",
        "btn_get_key_now": "今すぐキーを取得",
        "btn_loading_gate": "キーを生成中... リダイレクト中...",
        "security_note_gate": "100% 自動認証およびキー生成",
        "verify_title": "キーの認証",
        "verify_subtitle": "キーを有効化するために認証を完了してください。",
        "btn_activate": "キーを有効化",
        "success_title": "キーの生成に成功しました！",
        "success_subtitle": "キーが有効化され、すぐに利用できます。",
        "key_label_display": "あなたのライセンスキー",
        "btn_copy": "キーをコピー",
        "btn_copied": "コピー完了！",
        "toast_copied": "キーをクリップボードにコピーしました！",
        "info_duration": "8時間有効",
        "info_devices": "1 デバイス限定",
        "info_license": "無料ライセンス",
        "card_device": "1 デバイス",
        "badge_links": "リンク",
        "btn_buy_key": "キーを購入",
        "btn_get_key": "キーを取得",
        "btn_hack_features": "Mod・機能のダウンロード",
        "search_game_placeholder": "ゲームを検索...",
        "btn_help": "ヘルプ",
        "section_title": "ゲーム一覧",
        "section_subtitle": "ゲームを選択して無料キーを取得または最新版をダウンロード",
        "turnstile_security": "セキュリティ認証",
        "turnstile_hint": "右側の認証を完了してキー取得を解除してください",
        "turnstile_verified": "認証完了",
        "turnstile_ready": "キーを取得できます — 下のボタンを押してください",
        "loading_title": "キーを生成中...",
        "loading_subtitle": "しばらくお待ちください...",
        "help_modal_title": "利用ガイド・サポート",
        "help_step_1": "ゲームを選択して<strong>キーを取得</strong>をクリックします。",
        "help_step_2": "手順に従ってデバイスの認証を完了します。",
        "help_step_3": "システムが自動的にキーを表示します。",
        "help_support_title": "サポートチャンネル",
        "help_support_desc": "ご不明な点やお困りの際はこちら:",
        "help_btn_telegram": "Telegramに参加",
        "alert_turnstile": "キーを取得する前に認証を完了してください。",
        "alert_failed": "キーの生成に失敗しました。再試行してください。",
        "alert_network": "ネットワークエラーが発生しました。",
        "hack_modal_title": "Mod機能一覧",
        "btn_download_now": "今すぐダウンロード",
        "empty_game_title": "利用可能なゲームがありません",
        "empty_game_desc": "現在設定されているゲームはありません。",
        "guide_title": "利用ガイド",
        "guide_step_1": "上記のキーをコピーします",
        "guide_step_2": "アプリまたはゲームを起動します",
        "guide_step_3": "要求されたらキーを貼り付けます",
        "guide_step_4": "8時間のアクセスをお楽しみください！",
        "version_label": "バージョン",
        "search_not_found": "ゲームが見つかりません",
        "search_not_found_desc": "別のキーワードで再検索してください。",
        "adblock_title": "広告ブロッカーが検出されました！",
        "adblock_desc": "無料サービスを維持するため、AdBlockを無効にしてページを再読み込みしてください。",
        "adblock_btn": "AdBlockを解除しました、再試行",
        "btn_step1_open": "ステップ 1: 広告を開く（5〜7秒滞在）",
        "gate_watching_ad": "広告の視聴を確認中: ",
        "gate_seconds_left": "秒残り...",
        "gate_ublock_warning": "<strong>注意:</strong> uBlockまたは広告ブロッカーがブロック画面を表示した場合は、必ず<em>「続行」</em>をクリックして完了してください。",
        "btn_step2_confirm": "ステップ 2: 広告視聴完了 — キーのロックを解除",
        "btn_confirming": "広告視聴完了を確認中...",
        "gate_desc_active": "下のボタンをクリックして広告を開きます。戻るボタンを押す前に、<strong>広告ページに5〜7秒間滞在</strong>してください！",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "広告が開きました。戻る前に<strong>必ず広告ページに5〜7秒間滞在</strong>してください！",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "戻るのが早すぎました（わずか<strong>{sec}秒</strong>、必要: 5〜7秒）！",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "広告を再度開く（5〜7秒滞在）",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    },
    "ko": {
        "gate_title": "확인 및 키 발급",
        "step_badge_gate": "1단계 / 2단계: 연결 확인",
        "gate_desc": "아래 버튼을 눌러 확인하고 <strong>접속 키를 즉시 활성화</strong>하세요!",
        "btn_get_key_now": "지금 키 받기",
        "btn_loading_gate": "키 생성 중... 이동 중...",
        "security_note_gate": "100% 자동 확인 및 키 생성",
        "verify_title": "키 인증",
        "verify_subtitle": "키를 활성화하려면 인증을 완료하세요.",
        "btn_activate": "키 활성화",
        "success_title": "키 생성 완료!",
        "success_subtitle": "키가 활성화되었으며 바로 사용할 수 있습니다.",
        "key_label_display": "내 라이선스 키",
        "btn_copy": "키 복사",
        "btn_copied": "복사됨!",
        "toast_copied": "키가 클립보드에 복사되었습니다!",
        "info_duration": "8시간 유효",
        "info_devices": "1대 기기 제한",
        "info_license": "무료 라이선스",
        "card_device": "1 기기",
        "badge_links": "링크",
        "btn_buy_key": "키 구매",
        "btn_get_key": "키 발급",
        "btn_hack_features": "모드 다운로드 및 기능",
        "search_game_placeholder": "게임 검색...",
        "btn_help": "도움말",
        "section_title": "게임 목록",
        "section_subtitle": "게임을 선택하여 무료 키를 발급받거나 최신 버전을 다운로드하세요",
        "turnstile_security": "보안 인증",
        "turnstile_hint": "키 발급 잠금을 해제하려면 오른쪽 인증을 완료하세요",
        "turnstile_verified": "인증됨",
        "turnstile_ready": "이제 키를 발급받을 수 있습니다 — 아래를 클릭하세요",
        "loading_title": "키 생성 중...",
        "loading_subtitle": "잠시만 기다려 주세요...",
        "help_modal_title": "안내 및 고객지원",
        "help_step_1": "게임을 선택하고 <strong>키 발급</strong>을 클릭하세요.",
        "help_step_2": "기기 인증 단계를 완료하세요.",
        "help_step_3": "시스템이 자동으로 키를 표시합니다.",
        "help_support_title": "고객지원 채널",
        "help_support_desc": "문제가 있거나 지원이 필요한 경우:",
        "help_btn_telegram": "Telegram 참여",
        "alert_turnstile": "키를 받기 전에 보안 인증을 완료해 주세요.",
        "alert_failed": "키를 생성할 수 없습니다. 다시 시도해 주세요.",
        "alert_network": "네트워크 오류가 발생했습니다.",
        "hack_modal_title": "모드 기능",
        "btn_download_now": "지금 다운로드",
        "empty_game_title": "사용 가능한 게임 없음",
        "empty_game_desc": "현재 설정된 게임이 없습니다.",
        "guide_title": "사용 안내",
        "guide_step_1": "위의 키 코드를 복사합니다",
        "guide_step_2": "앱 또는 게임을 실행합니다",
        "guide_step_3": "요청 시 키를 붙여넣습니다",
        "guide_step_4": "8시간 무료 이용을 즐기세요!",
        "version_label": "버전",
        "search_not_found": "게임을 찾을 수 없습니다",
        "search_not_found_desc": "다른 키워드로 다시 검색해 보세요.",
        "adblock_title": "광고 차단 프로그램 감지됨!",
        "adblock_desc": "무료 키 생성을 유지하기 위해 AdBlock을 끄고 페이지를 새로고침해 주세요.",
        "adblock_btn": "AdBlock을 껐습니다, 다시 시도",
        "btn_step1_open": "1단계: 광고 열기 (5~7초 체류)",
        "gate_watching_ad": "광고 시청 확인 중: ",
        "gate_seconds_left": "초 남음...",
        "gate_ublock_warning": "<strong>주의:</strong> uBlock 또는 광고 차단기가 차단 화면을 표시하는 경우 반드시 <em>'계속'</em>을 클릭하여 인증을 완료해야 합니다!",
        "btn_step2_confirm": "2단계: 광고 시청 완료 — 키 잠금 해제",
        "btn_confirming": "광고 시청 완료 확인 중...",
        "gate_desc_active": "아래 버튼을 눌러 광고를 엽니다. 뒤로 가기를 누르기 전에 <strong>광고 페이지에 5~7초 동안 머물러야</strong> 합니다!",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "광고가 열렸습니다. 여기로 돌아오기 전에 <strong>반드시 5~7초 동안 머무르세요</strong>!",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "너무 일찍 돌아왔습니다 (<strong>{sec}초</strong> 경과, 5~7초 필요)!",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "광고 다시 열기 (5~7초 체류)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    },
    "ar": {
        "gate_title": "تأكيد والحصول على المفتاح",
        "step_badge_gate": "الخطوة 1/2: التحقق من الاتصال",
        "gate_desc": "انقر فوق الزر أدناه للتحقق و<strong>تفعيل مفتاح الوصول</strong> فوراً!",
        "btn_get_key_now": "احصل على المفتاح الآن",
        "btn_loading_gate": "جاري إنشاء المفتاح... جاري التحويل...",
        "security_note_gate": "تحقق وإنشاء مفاتيح آلي 100%",
        "verify_title": "التحقق من المفتاح",
        "verify_subtitle": "يرجى إكمال التحقق لتفعيل المفتاح الخاص بك.",
        "btn_activate": "تفعيل المفتاح",
        "success_title": "تم إنشاء المفتاح بنجاح!",
        "success_subtitle": "تم تفعيل مفتاحك وهو جاهز للاستخدام الآن.",
        "key_label_display": "مفتاح الترخيص الخاص بك",
        "btn_copy": "نسخ المفتاح",
        "btn_copied": "تم النسخ!",
        "toast_copied": "تم نسخ المفتاح إلى الحافظة!",
        "info_duration": "صالح لمدة 8 ساعات",
        "info_devices": "جهاز واحد فقط",
        "info_license": "ترخيص مجاني",
        "card_device": "جهاز واحد",
        "badge_links": "روابط",
        "btn_buy_key": "شراء مفتاح",
        "btn_get_key": "الحصول على مفتاح",
        "btn_hack_features": "تحميل المود والميزات",
        "search_game_placeholder": "البحث عن ألعاب...",
        "btn_help": "مساعدة",
        "section_title": "قائمة الألعاب",
        "section_subtitle": "حدد لعبة أدناه للحصول على مفتاح مجاني أو تنزيل الإصدار",
        "turnstile_security": "التحقق الأمني",
        "turnstile_hint": "أكمل التحقق على اليمين لفتح الحصول على المفتاح",
        "turnstile_verified": "تم التحقق",
        "turnstile_ready": "يمكنك الآن الحصول على مفتاحك — انقر بالأسفل",
        "loading_title": "جاري إنشاء المفتاح...",
        "loading_subtitle": "يرجى الانتظار لحظة...",
        "help_modal_title": "الدليل والدعم",
        "help_step_1": "اختر لعبة وانقر فوق <strong>الحصول على مفتاح</strong>.",
        "help_step_2": "أكمل خطوات التحقق لجهازك.",
        "help_step_3": "سيقوم النظام بعرض مفتاحك تلقائياً.",
        "help_support_title": "قناة الدعم",
        "help_support_desc": "إذا واجهت أي مشاكل أو كنت بحاجة إلى مساعدة:",
        "help_btn_telegram": "الانضمام إلى Telegram",
        "alert_turnstile": "يرجى إكمال التحقق الأمني قبل المتابعة.",
        "alert_failed": "تعذر إنشاء المفتاح. يرجى المحاولة مرة أخرى.",
        "alert_network": "خطأ في الشبكة. يرجى التحقق من اتصالك.",
        "hack_modal_title": "ميزات المود",
        "btn_download_now": "تحميل الآن",
        "empty_game_title": "لا توجد ألعاب متاحة",
        "empty_game_desc": "لا توجد ألعاب مهيأة حالياً.",
        "guide_title": "دليل الاستخدام",
        "guide_step_1": "انسخ رمز المفتاح أعلاه",
        "guide_step_2": "افتح التطبيق أو اللعبة الخاصة بك",
        "guide_step_3": "الصق المفتاح عند المطالبة",
        "guide_step_4": "استمتع بـ 8 ساعات من الوصول!",
        "version_label": "الإصدار",
        "search_not_found": "لم يتم العثور على ألعاب",
        "search_not_found_desc": "يرجى تجربة البحث بكلمة رئيسية أخرى.",
        "adblock_title": "تم اكتشاف مانع الإعلانات!",
        "adblock_desc": "للحفاظ على استمرار خدمة المفاتيح المجانية، يرجى تعطيل AdBlock وتحديث الصفحة.",
        "adblock_btn": "لقد عطلت AdBlock، حاول مرة أخرى",
        "btn_step1_open": "الخطوة 1: فتح الإعلان (البقاء 5-7 ثوانٍ)",
        "gate_watching_ad": "جارٍ التحقق من مشاهدة الإعلان: ",
        "gate_seconds_left": "ثانية متبقية...",
        "gate_ublock_warning": "<strong>ملاحظة:</strong> إذا عرض uBlock أو مانع الإعلانات شاشة الحظر، فيجب عليك النقر على <em>'متابعة'</em> لإكمال التحقق!",
        "btn_step2_confirm": "الخطوة 2: لقد شاهدت الإعلان — فتح المفتاح",
        "btn_confirming": "جارٍ التحقق من اكتمال الإعلان...",
        "gate_desc_active": "انقر فوق الزر أدناه لفتح الإعلان. يجب عليك <strong>البقاء في صفحة الإعلان لمدة 5-7 ثوانٍ</strong> قبل العودة!",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "تم فتح الإعلان. <strong>يجب عليك البقاء لمدة 5-7 ثوانٍ</strong> قبل العودة هنا!",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "لقد عدت مبكراً جداً (بعد <strong>{sec} ثوانٍ</strong> فقط، المطلوب: 5-7 ثوانٍ)!",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "إعادة فتح الإعلان (البقاء 5-7 ثوانٍ)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    },
    "de": {
        "gate_title": "Bestätigen & Schlüssel Erhalten",
        "step_badge_gate": "Schritt 1/2: Verbindung überprüfen",
        "gate_desc": "Klicken Sie unten, um die Überprüfung abzuschließen und Ihren <strong>Schlüssel sofort zu aktivieren</strong>!",
        "btn_get_key_now": "SCHLÜSSEL JETZT HOLEN",
        "btn_loading_gate": "Schlüssel wird generiert... Weiterleitung...",
        "security_note_gate": "100% automatische Überprüfung & Schlüsselgenerierung",
        "verify_title": "Schlüsselüberprüfung",
        "verify_subtitle": "Bitte schließen Sie die Überprüfung ab, um Ihren Schlüssel zu aktivieren.",
        "btn_activate": "Schlüssel Aktivieren",
        "success_title": "Schlüssel Erfolgreich Erstellt!",
        "success_subtitle": "Ihr Schlüssel wurde aktiviert und ist einsatzbereit.",
        "key_label_display": "Ihr Lizenzschlüssel",
        "btn_copy": "Schlüssel Kopieren",
        "btn_copied": "Kopiert!",
        "toast_copied": "Schlüssel in Zwischenablage kopiert!",
        "info_duration": "Gültig für 8 Stunden",
        "info_devices": "Limit 1 Gerät",
        "info_license": "Kostenlose Lizenz",
        "card_device": "1 Gerät",
        "badge_links": "Links",
        "btn_buy_key": "Schlüssel kaufen",
        "btn_get_key": "Schlüssel holen",
        "btn_hack_features": "Mod & Funktionen herunterladen",
        "search_game_placeholder": "Spiele suchen...",
        "btn_help": "Hilfe",
        "section_title": "Spieleliste",
        "section_subtitle": "Wählen Sie ein Spiel aus, um einen Schlüssel zu erhalten oder die Version herunterzuladen",
        "turnstile_security": "Sicherheitsüberprüfung",
        "turnstile_hint": "Überprüfung rechts abschließen, um Schlüssel freizuschalten",
        "turnstile_verified": "Verifiziert",
        "turnstile_ready": "Sie können Ihren Schlüssel jetzt abrufen — unten klicken",
        "loading_title": "Schlüssel wird generiert...",
        "loading_subtitle": "Bitte einen Moment warten...",
        "help_modal_title": "Anleitung & Support",
        "help_step_1": "Wählen Sie ein Spiel und klicken Sie auf <strong>Schlüssel holen</strong>.",
        "help_step_2": "Schließen Sie die Schritte zur Geräteauthentifizierung ab.",
        "help_step_3": "Das System zeigt Ihren Schlüssel automatisch an.",
        "help_support_title": "Support-Kanal",
        "help_support_desc": "Bei Fragen oder Problemen:",
        "help_btn_telegram": "Telegram beitreten",
        "alert_turnstile": "Bitte schließen Sie die Sicherheitsüberprüfung ab.",
        "alert_failed": "Schlüssel konnte nicht generiert werden. Erneut versuchen.",
        "alert_network": "Netzwerkfehler. Bitte Verbindung prüfen.",
        "hack_modal_title": "Mod-Funktionen",
        "btn_download_now": "Jetzt Herunterladen",
        "empty_game_title": "Keine Spiele verfügbar",
        "empty_game_desc": "Derzeit sind keine Spiele konfiguriert.",
        "guide_title": "Bedienungsanleitung",
        "guide_step_1": "Kopieren Sie den Schlüssel oben",
        "guide_step_2": "Öffnen Sie Ihre App oder Ihr Spiel",
        "guide_step_3": "Fügen Sie den Schlüssel bei Aufforderung ein",
        "guide_step_4": "Genießen Sie 8 Stunden Zugriff!",
        "version_label": "Version",
        "search_not_found": "Keine Spiele gefunden",
        "search_not_found_desc": "Bitte versuchen Sie es mit einem anderen Suchbegriff.",
        "adblock_title": "AdBlocker erkannt!",
        "adblock_desc": "Um unseren kostenlosen Dienst aufrechtzuerhalten, deaktivieren Sie bitte AdBlock und laden Sie die Seite neu.",
        "adblock_btn": "AdBlock deaktiviert, erneut versuchen",
        "btn_step1_open": "SCHRITT 1: WERBUNG ÖFFNEN (5-7 SEK. BLEIBEN)",
        "gate_watching_ad": "Werbungsansicht wird überprüft: ",
        "gate_seconds_left": "Sek. verbleibend...",
        "gate_ublock_warning": "<strong>Hinweis:</strong> Wenn uBlock / AdBlock einen Sperrbildschirm anzeigt, MÜSSEN Sie auf <em>'Fortfahren'</em> klicken, um die Verifizierung abzuschließen!",
        "btn_step2_confirm": "SCHRITT 2: ICH HABE DIE WERBUNG GESEHEN — SCHLÜSSEL FREISCHALTEN",
        "btn_confirming": "Abschluss der Werbung wird überprüft...",
        "gate_desc_active": "Klicken Sie unten, um die Werbung zu öffnen. Sie müssen <strong>5-7 Sekunden auf der Werbeseite bleiben</strong>, bevor Sie zurückkehren!",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "Werbung wurde geöffnet. Sie <strong>MÜSSEN 5-7 Sekunden dort bleiben</strong>, bevor Sie zurückkehren!",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "Sie sind zu früh zurückgekehrt (nach nur <strong>{sec} Sek.</strong>, erforderlich: 5-7 Sek.)!",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "WERBUNG ERNEUT ÖFFNEN (5-7 SEK. BLEIBEN)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    },
    "fr": {
        "gate_title": "Confirmer et Obtenir la Clé",
        "step_badge_gate": "Étape 1/2 : Vérification de la connexion",
        "gate_desc": "Cliquez ci-dessous pour vérifier et <strong>activer votre clé d'accès</strong> immédiatement !",
        "btn_get_key_now": "OBTENIR LA CLÉ MAINTENANT",
        "btn_loading_gate": "Génération de la clé... Redirection...",
        "security_note_gate": "Vérification et génération de clé 100% automatiques",
        "verify_title": "Vérification de la Clé",
        "verify_subtitle": "Veuillez compléter la vérification pour activer votre clé.",
        "btn_activate": "Activer la Clé",
        "success_title": "Clé Générée avec Succès !",
        "success_subtitle": "Votre clé a été activée et est prête à l'emploi.",
        "key_label_display": "Votre Clé de Licence",
        "btn_copy": "Copier la Clé",
        "btn_copied": "Copié !",
        "toast_copied": "Clé copiée dans le presse-papiers !",
        "info_duration": "Valable 8 heures",
        "info_devices": "Limite 1 appareil",
        "info_license": "Licence Gratuite",
        "card_device": "1 Appareil",
        "badge_links": "liens",
        "btn_buy_key": "Acheter Clé",
        "btn_get_key": "Obtenir Clé",
        "btn_hack_features": "Télécharger Mod & Fonctionnalités",
        "search_game_placeholder": "Rechercher des jeux...",
        "btn_help": "Aide",
        "section_title": "Liste des Jeux",
        "section_subtitle": "Sélectionnez un jeu ci-dessous pour obtenir une clé ou télécharger",
        "turnstile_security": "Vérification de Sécurité",
        "turnstile_hint": "Complétez la vérification à droite pour débloquer",
        "turnstile_verified": "Vérifié",
        "turnstile_ready": "Vous pouvez maintenant obtenir votre clé — cliquez ci-dessous",
        "loading_title": "Génération de la Clé...",
        "loading_subtitle": "Veuillez patienter un instant...",
        "help_modal_title": "Guide et Support",
        "help_step_1": "Sélectionnez un jeu et cliquez sur <strong>Obtenir la Clé</strong>.",
        "help_step_2": "Complétez les étapes pour vérifier votre appareil.",
        "help_step_3": "Le système affiche automatiquement votre clé.",
        "help_support_title": "Canal de Support",
        "help_support_desc": "En cas de question ou problème :",
        "help_btn_telegram": "Rejoindre Telegram",
        "alert_turnstile": "Veuillez compléter la vérification de sécurité ci-dessus.",
        "alert_failed": "Impossible de générer la clé. Veuillez réessayer.",
        "alert_network": "Erreur réseau. Veuillez vérifier votre connexion.",
        "hack_modal_title": "Fonctionnalités du Mod",
        "btn_download_now": "Télécharger Maintenant",
        "empty_game_title": "Aucun jeu disponible",
        "empty_game_desc": "Aucun jeu n'est actuellement configuré.",
        "guide_title": "Guide d'utilisation",
        "guide_step_1": "Copiez la clé ci-dessus",
        "guide_step_2": "Ouvrez votre application ou jeu",
        "guide_step_3": "Collez la clé lorsque demandé",
        "guide_step_4": "Profitez de 8 heures d’accès !",
        "version_label": "Version",
        "search_not_found": "Aucun jeu trouvé",
        "search_not_found_desc": "Veuillez essayer avec un autre mot-clé.",
        "adblock_title": "Bloqueur de publicité détecté !",
        "adblock_desc": "Pour maintenir ce service gratuit, veuillez désactiver AdBlock et recharger la page.",
        "adblock_btn": "J’ai désactivé AdBlock, réessayer",
        "btn_step1_open": "ÉTAPE 1 : OUVRIR LA PUB (RESTER 5-7S)",
        "gate_watching_ad": "Vérification du visionnage de la pub : ",
        "gate_seconds_left": "s restantes...",
        "gate_ublock_warning": "<strong>Remarque :</strong> Si uBlock / AdBlock affiche un écran rouge de blocage, vous DEVEZ cliquer sur <em>« Continuer »</em> pour valider !",
        "btn_step2_confirm": "ÉTAPE 2 : J'AI VU LA PUB — DÉBLOQUER LA CLÉ",
        "btn_confirming": "Vérification de la fin de la pub...",
        "gate_desc_active": "Cliquez ci-dessous pour ouvrir la pub. Vous devez <strong>rester sur la page de pub pendant 5 à 7 secondes</strong> avant de revenir !",
        "gate_waiting_title": "Ad Opened — Please Stay on Ad Tab",
        "gate_waiting_msg": "La pub a été ouverte. Vous <strong>DEVEZ y rester 5 à 7 secondes</strong> avant de revenir ici !",
        "gate_do_not_back": "⚠️ DO NOT press Back or close the ad tab early! If you return too early, the session will be cancelled and you will have to restart.",
        "gate_early_title": "You Pressed Back Too Early!",
        "gate_early_msg": "Vous êtes revenu trop tôt (après seulement <strong>{sec}s</strong>, requis : 5-7s) !",
        "gate_anti_cheat_note": "Anti-Cheat Protection: Sitting on the Gate page does not count. You must actually stay on the ad page.",
        "btn_reopen_ad": "ROUVRIR LA PUB (RESTER 5-7S)",
        "gate_success_title": "Ad Verification Successful!",
        "gate_success_msg": "You stayed on the ad page for <strong>{sec}s</strong>. The sponsor impression has been verified successfully!"
    }
};

    function detectUserLanguage() {
        const saved = localStorage.getItem('getkey_lang');
        if (saved && LANGUAGES[saved]) return saved;

        const navLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        const code2 = navLang.split('-')[0];

        if (LANGUAGES[code2]) return code2;
        if (code2 === 'fil') return 'tl';

        return 'en'; // Default to English
    }

    let currentLang = detectUserLanguage();

    function t(key) {
        if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) {
            return TRANSLATIONS[currentLang][key];
        }
        if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
            return TRANSLATIONS['en'][key];
        }
        return key;
    }

    function applyTranslations() {
        // Text and innerHTML elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (translation.includes('<') && translation.includes('>')) {
                el.innerHTML = translation;
            } else {
                el.textContent = translation;
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', t(key));
        });

        // Plural refinement for link badges in English
        if (currentLang === 'en') {
            document.querySelectorAll('.banner-badge-link').forEach(badge => {
                const count = parseInt(badge.textContent, 10) || 1;
                const span = badge.querySelector('[data-i18n="badge_links"]');
                if (span) {
                    span.textContent = count > 1 ? 'links' : 'link';
                }
            });
        }

        // Document language & direction
        document.documentElement.lang = currentLang;
        if (LANGUAGES[currentLang]?.dir === 'rtl') {
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.documentElement.removeAttribute('dir');
        }

        // Update pill button label & flag
        const langLabel = document.getElementById('currentLangLabel');
        const langFlag = document.getElementById('currentLangFlag');
        if (langLabel && LANGUAGES[currentLang]) {
            langLabel.textContent = LANGUAGES[currentLang].label;
        }
        if (langFlag && LANGUAGES[currentLang]) {
            const fc = LANGUAGES[currentLang].flag_code;
            langFlag.innerHTML = `<img src="https://flagcdn.com/w40/${fc}.png" alt="${fc}" class="lang-flag-img">`;
        }

        // Trigger custom event for custom components
        window.dispatchEvent(new CustomEvent('langChanged', { detail: { lang: currentLang, t: t } }));
    }

    function setLanguage(lang) {
        if (!LANGUAGES[lang]) return;
        currentLang = lang;
        localStorage.setItem('getkey_lang', lang);
        applyTranslations();
        closeDropdown();
    }

    function closeDropdown() {
        const dropdown = document.getElementById('langDropdown');
        if (dropdown) dropdown.classList.remove('active');
    }

    function toggleDropdown(e) {
        if (e) e.stopPropagation();
        const dropdown = document.getElementById('langDropdown');
        if (dropdown) dropdown.classList.toggle('active');
    }

    function injectLanguageSwitcher() {
        if (document.getElementById('langSwitcherContainer')) return;

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            .lang-switcher-container {
                position: fixed;
                top: 16px;
                right: 16px;
                z-index: 999999;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .lang-pill-btn {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                background: rgba(24, 24, 27, 0.88);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.16);
                color: #f4f4f5;
                padding: 7px 14px;
                border-radius: 30px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                transition: all 0.2s ease;
                user-select: none;
            }
            .lang-pill-btn:hover {
                background: rgba(39, 39, 42, 0.98);
                border-color: rgba(59, 130, 246, 0.6);
                transform: translateY(-1px);
            }
            .lang-flag-img {
                width: 18px;
                height: 13px;
                object-fit: cover;
                border-radius: 2px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                vertical-align: middle;
            }
            .lang-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                width: 260px;
                background: rgba(18, 18, 22, 0.98);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 14px;
                padding: 10px;
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
                max-height: 380px;
                overflow-y: auto;
            }
            .lang-dropdown.active {
                display: block;
                animation: langFadeInDown 0.2s ease;
            }
            @keyframes langFadeInDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .lang-dropdown-title {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #71717a;
                padding: 4px 8px 8px 8px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                margin-bottom: 6px;
            }
            .lang-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                border-radius: 8px;
                color: #d4d4d8;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .lang-item:hover {
                background: rgba(59, 130, 246, 0.18);
                color: #fff;
            }
            .lang-item.active {
                background: rgba(59, 130, 246, 0.28);
                color: #60a5fa;
                font-weight: 700;
            }
            .lang-item .flag {
                display: inline-flex;
                align-items: center;
                width: 20px;
            }
            .lang-item .flag img {
                width: 20px;
                height: 14px;
                object-fit: cover;
                border-radius: 2px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            .lang-item .lang-name {
                flex: 1;
            }
            .lang-item .lang-check {
                font-size: 12px;
                opacity: 0;
            }
            .lang-item.active .lang-check {
                opacity: 1;
            }
            .lang-dropdown::-webkit-scrollbar {
                width: 5px;
            }
            .lang-dropdown::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.1);
            }
            .lang-dropdown::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
            }
            @media (max-width: 480px) {
                .lang-switcher-container {
                    top: 10px;
                    right: 10px;
                }
                .lang-dropdown {
                    right: 0;
                    width: 230px;
                }
            }
        `;
        document.head.appendChild(style);

        // Inject Container
        const container = document.createElement('div');
        container.id = 'langSwitcherContainer';
        container.className = 'lang-switcher-container';

        // Build Items HTML
        let itemsHtml = '';
        for (const [code, info] of Object.entries(LANGUAGES)) {
            itemsHtml += `
                <div class="lang-item ${code === currentLang ? 'active' : ''}" data-code="${code}">
                    <span class="flag"><img src="https://flagcdn.com/w40/${info.flag_code}.png" alt="${info.flag_code}" class="lang-flag-img"></span>
                    <span class="lang-name">${info.name}</span>
                    <i class="fa-solid fa-check lang-check"></i>
                </div>
            `;
        }

        const curFlagCode = LANGUAGES[currentLang]?.flag_code || 'us';
        container.innerHTML = `
            <div class="lang-pill-btn" id="langPillBtn">
                <span id="currentLangFlag"><img src="https://flagcdn.com/w40/${curFlagCode}.png" alt="${curFlagCode}" class="lang-flag-img"></span>
                <span id="currentLangLabel">${LANGUAGES[currentLang]?.label || 'EN'}</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 10px; opacity: 0.7;"></i>
            </div>
            <div class="lang-dropdown" id="langDropdown">
                <div class="lang-dropdown-title">Select Language</div>
                <div class="lang-list">${itemsHtml}</div>
            </div>
        `;

        document.body.appendChild(container);

        // Event Listeners
        document.getElementById('langPillBtn').addEventListener('click', toggleDropdown);

        container.querySelectorAll('.lang-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const code = this.getAttribute('data-code');
                container.querySelectorAll('.lang-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                setLanguage(code);
            });
        });

        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                closeDropdown();
            }
        });
    }

    // Expose Global API
    window.GETKEY_I18N = {
        t: t,
        setLanguage: setLanguage,
        getLanguage: () => currentLang,
        languages: LANGUAGES,
        apply: applyTranslations
    };

    // Auto Init on DOM Ready
    function init() {
        injectLanguageSwitcher();
        applyTranslations();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
