export const ACTIVE_KEYS_COOKIE = 'hiroki_active_keys';
export const CLAIM_SID_COOKIE = 'hiroki_claim_sid';

export interface ActiveKeyCookieItem {
  id: string;
  key_code: string;
  game_package: string | null;
  all_games: boolean;
  expires_at: string | null;
}

export interface ClaimSidCookiePayload {
  session_id: string;
  claim_token: string;
  pin_code: string;
  game_package: string;
  created_at: number;
}

export interface DefaultGameItem {
  package_name: string;
  game_name: string;
  icon_url: string;
  is_active: boolean;
  maintenance_msg: string;
  min_version: string;
  download_url: string;
  features_json: string[];
  sort_order: number;
}

export const DEFAULT_GAMES: DefaultGameItem[] = [
  {
    package_name: 'com.netease.newspike',
    game_name: 'Blood Strike',
    icon_url: '/assets/images/bloodstrike.png',
    is_active: true,
    maintenance_msg: '',
    min_version: '1.0.0',
    download_url: '',
    features_json: [
      'ESP Khung xương & Khoảng cách',
      'Hiện thanh máu & tên vũ khí',
      'Aimbot tâm mượt tùy chỉnh FOV',
      'Giảm giật đạn (No Recoil)',
      'Cảnh báo địch ngắm từ xa',
    ],
    sort_order: 1,
  },
  {
    package_name: 'com.garena.game.kgvn,com.garena.game.kgtw,com.garena.game.kgth',
    game_name: 'Liên Quân Mobile',
    icon_url: '/assets/images/lienquan.png',
    is_active: true,
    maintenance_msg: '',
    min_version: '1.0.0',
    download_url: '',
    features_json: [
      'Hack Map sáng 100%',
      'Hiện thời gian hồi chiêu & phép bổ trợ',
      'Cam xa 3 nấc mượt mà',
      'Hiện khung viền & máu địch',
      'Aim Elsu tự động chuẩn xác',
    ],
    sort_order: 2,
  },
  {
    package_name: 'com.vng.speedvn',
    game_name: 'ZingSpeed Mobile',
    icon_url: '/assets/images/zingspeed.png',
    is_active: true,
    maintenance_msg: '',
    min_version: '1.0.0',
    download_url: '',
    features_json: [
      'Hiện đường dẫn',
      'Hiện thời gian hồi vật phẩm (đạo cụ)',
      'Auto CWW, WCW (Đua tốc độ)',
      'Auto bấm tinh linh',
      'Nhìn xuyên tường & cảnh báo tên lửa',
    ],
    sort_order: 3,
  },
  {
    package_name: 'com.mobile.legends',
    game_name: 'Mobile Legends: Bang Bang',
    icon_url: '/assets/images/mlbb.png',
    is_active: true,
    maintenance_msg: '',
    min_version: '1.0.0',
    download_url: '',
    features_json: [
      'Hack Map sáng toàn bản đồ',
      'Hiện lịch sử đấu & ẩn tên',
      'Hiện thời gian hồi chiêu địch',
      'Hiện vị trí địch trong bụi cỏ',
      'Camera góc nhìn siêu rộng (Drone View)',
    ],
    sort_order: 4,
  },
];

