'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Script from 'next/script';

interface GameItem {
  package_name: string;
  game_name: string;
  icon_url: string;
  is_active: boolean;
  maintenance_msg?: string;
  min_version: string;
  download_url?: string;
  features_json: string[];
  sort_order: number;
}

type LangCode = 'vi' | 'en' | 'zh';

const TRANSLATIONS: Record<
  LangCode,
  {
    subtitle: string;
    selectGame: string;
    viewFeatures: string;
    getKeyBtn: string;
    processing: string;
    activeKeyTitle: string;
    remaining: string;
    copy: string;
    copied: string;
    help: string;
    support: string;
    maintBadge: string;
    onlineBadge: string;
    pinNoticeTitle: string;
    pinNoticeDesc: string;
    continueLink: string;
    deviceNote: string;
    helpTitle: string;
    helpStep1: string;
    helpStep2: string;
    helpStep3: string;
    helpStep4: string;
  }
> = {
  vi: {
    subtitle: 'Hệ Thống Lấy Key Miễn Phí 12 Giờ Tự Động',
    selectGame: '1. Chọn tựa game của bạn',
    viewFeatures: 'Xem chức năng Mod',
    getKeyBtn: 'Lấy Key Miễn Phí (12 Giờ)',
    processing: 'Đang khởi tạo phiên bảo mật...',
    activeKeyTitle: 'Key Đang Hoạt Động Của Bạn',
    remaining: 'Còn lại',
    copy: 'Sao chép',
    copied: 'Đã chép!',
    help: 'Hướng dẫn',
    support: 'Hỗ trợ',
    maintBadge: 'Bảo trì',
    onlineBadge: 'Hoạt động',
    pinNoticeTitle: 'Đã tạo phiên vượt link thành công!',
    pinNoticeDesc:
      'Mã PIN 6 số dự phòng của bạn (dùng nếu bạn mở link ở trình duyệt khác hoặc đổi mạng 4G/Wi-Fi):',
    continueLink: 'Tiếp tục tới trang vượt Link ngay',
    deviceNote:
      'Key 12h chỉ khóa cứng 1 thiết bị khi bạn dán Key vào trong Game. Trên web bạn luôn có thể lấy Key mới khi hết hạn.',
    helpTitle: 'Hướng dẫn lấy và sử dụng Key trên Hiroki Panel',
    helpStep1: 'Bước 1: Chọn đúng tựa game bạn đang chơi ở danh sách bên dưới.',
    helpStep2:
      'Bước 2: Nhấn nút "Lấy Key Miễn Phí (12 Giờ)" và hoàn thành bước rút gọn link (khoảng 25–45 giây).',
    helpStep3:
      'Bước 3: Hệ thống tự động chuyển về trang nhận Key và bắt đầu tính 12 giờ kể từ lúc bạn nhận được Key.',
    helpStep4:
      'Bước 4: Sao chép mã Key và dán vào Menu Mod trong Game (Key sẽ tự động gắn với thiết bị Game của bạn).',
  },
  en: {
    subtitle: 'Automated 12-Hour Free License Key System',
    selectGame: '1. Select your game',
    viewFeatures: 'View Mod Features',
    getKeyBtn: 'Get Free Key (12 Hours)',
    processing: 'Creating secure claim session...',
    activeKeyTitle: 'Your Active License Key',
    remaining: 'Remaining',
    copy: 'Copy',
    copied: 'Copied!',
    help: 'Guide',
    support: 'Support',
    maintBadge: 'Maintenance',
    onlineBadge: 'Online',
    pinNoticeTitle: 'Claim Session Created!',
    pinNoticeDesc:
      'Your 6-digit backup PIN (only needed if you switch browsers or mobile data during the link step):',
    continueLink: 'Proceed to Shortened Link',
    deviceNote:
      'Your 12h Key binds to 1 device only when entered inside the Game. You can always claim a new key on the web once expired.',
    helpTitle: 'How to Claim & Use Your Key',
    helpStep1: 'Step 1: Select your target game from the dropdown list.',
    helpStep2: 'Step 2: Click "Get Free Key (12 Hours)" and complete the shortener link.',
    helpStep3: 'Step 3: Your 12-hour key is generated automatically upon completion.',
    helpStep4: 'Step 4: Copy the key and paste it into the in-game Mod Menu.',
  },
  zh: {
    subtitle: '12小时免费卡密自动获取系统',
    selectGame: '1. 选择您的游戏',
    viewFeatures: '查看功能列表',
    getKeyBtn: '获取免费卡密 (12小时)',
    processing: '正在创建安全会话...',
    activeKeyTitle: '您当前激活的卡密',
    remaining: '剩余时间',
    copy: '复制',
    copied: '已复制!',
    help: '使用说明',
    support: '客服支持',
    maintBadge: '维护中',
    onlineBadge: '正常运行',
    pinNoticeTitle: '卡密申请会话已创建！',
    pinNoticeDesc: '您的6位备用PIN码（仅在更换浏览器或切换网络时需要输入）：',
    continueLink: '立即前往任务链接',
    deviceNote: '12小时卡密仅在游戏内输入时绑定1台设备，过期后可在网页重新获取。',
    helpTitle: 'Hiroki Panel 卡密获取指南',
    helpStep1: '第一步：在下拉列表中选择您要游玩的游戏。',
    helpStep2: '第二步：点击“获取免费卡密”并完成短链验证。',
    helpStep3: '第三步：验证完成后系统自动生成12小时卡密并开始计时。',
    helpStep4: '第四步：复制卡密并粘贴到游戏内的悬浮窗菜单中即可。',
  },
};

export default function HirokiHomePage() {
  const [lang, setLang] = useState<LangCode>('vi');
  const t = TRANSLATIONS[lang];

  const [games, setGames] = useState<GameItem[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [announcement, setAnnouncement] = useState(
    'Hệ thống lấy Key miễn phí 12h tự động — Hiroki Panel'
  );
  const [telegramUrl, setTelegramUrl] = useState('https://t.me/hirokipanel');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const [loadingClaim, setLoadingClaim] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [claimSessionResult, setClaimSessionResult] = useState<{
    redirect_url: string;
    pin_code: string;
    is_direct_dev?: boolean;
  } | null>(null);

  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const gamesRes = await fetch('/api/games');

      if (gamesRes.ok) {
        const gData = await gamesRes.json();
        const list: GameItem[] = gData.games || [];
        setGames(list);
        if (list.length > 0) {
          setSelectedGame((prev) => prev || list[0]);
        }
        if (gData.settings?.announcement_banner) {
          setAnnouncement(gData.settings.announcement_banner);
        }
        if (gData.settings?.telegram_support_url) {
          setTelegramUrl(gData.settings.telegram_support_url);
        }
        if (gData.turnstileSiteKey) {
          setTurnstileSiteKey(gData.turnstileSiteKey);
        }
      }
    } catch (err) {
      console.error('Error loading Hiroki Panel:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Global callback for Cloudflare Turnstile when configured
  useEffect(() => {
    (window as unknown as Record<string, unknown>).onHirokiTurnstileSuccess = (
      token: string
    ) => {
      setTurnstileToken(token);
    };
  }, []);

  const handleStartClaim = async () => {
    if (!selectedGame) return;
    setErrorMsg(null);
    setClaimSessionResult(null);

    if (!selectedGame.is_active) {
      setErrorMsg(
        selectedGame.maintenance_msg ||
          'Tựa game này hiện đang tạm đóng để bảo trì nâng cấp!'
      );
      return;
    }

    setLoadingClaim(true);
    try {
      const res = await fetch('/api/claim/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_package: selectedGame.package_name,
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || 'Không thể khởi tạo phiên lấy Key.');
        setLoadingClaim(false);
        return;
      }


      if (data.pin_code) {
        try {
          localStorage.setItem('hiroki_last_claim_pin', data.pin_code);
        } catch {
          // Ignore storage error
        }
      }

      // If in local dev direct mode, navigate immediately; otherwise show PIN backup & redirect
      if (data.is_direct_dev && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      setClaimSessionResult({
        redirect_url: data.redirect_url,
        pin_code: data.pin_code,
        is_direct_dev: data.is_direct_dev,
      });
    } catch {
      setErrorMsg('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại!');
    } finally {
      setLoadingClaim(false);
    }
  };

  return (
    <main className="hiroki-shell">
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
      )}

      <div className="hiroki-card">
        {/* Top bar: Language switcher + Help & Support */}
        <div className="top-bar">
          <div className="lang-group">
            {(['vi', 'en', 'zh'] as LangCode[]).map((code) => (
              <button
                key={code}
                type="button"
                className={`lang-btn ${lang === code ? 'active' : ''}`}
                onClick={() => setLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowHelpModal(true)}
            >
              <i className="fa-solid fa-circle-question" />
              <span>{t.help}</span>
            </button>
            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
              >
                <i className="fa-brands fa-telegram" style={{ color: '#38bdf8' }} />
                <span>{t.support}</span>
              </a>
            )}
          </div>
        </div>

        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-avatar-wrap">
            <img
              src="/assets/images/logo.jpg"
              alt="Hiroki Panel"
              className="brand-avatar"
            />
            <span className="brand-status-dot" title="System Online" />
          </div>
          <h1 className="brand-title">Hiroki Panel</h1>
          <p className="brand-subtitle">{t.subtitle}</p>
        </div>

        {/* Announcement Banner */}
        {announcement && (
          <div className="announcement-bar">
            <i className="fa-solid fa-bullhorn" />
            <span>{announcement}</span>
          </div>
        )}



        {/* Step 1: Game Selector */}
        <div className="section-label">
          <span>{t.selectGame}</span>
          {selectedGame && (
            <button
              type="button"
              onClick={() => setShowFeaturesModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 5 }} />
              {t.viewFeatures}
            </button>
          )}
        </div>

        <div className="game-selector-wrap">
          {selectedGame && (
            <button
              type="button"
              className={`game-trigger ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <div className="game-trigger-left">
                <img
                  src={selectedGame.icon_url || '/assets/icon/default-game.png'}
                  alt={selectedGame.game_name}
                  className="game-icon-img"
                />
                <div>
                  <div className="game-title-text">{selectedGame.game_name}</div>
                  <div className="game-pkg-sub">{selectedGame.package_name}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className={`badge-pill ${
                    selectedGame.is_active ? 'badge-online' : 'badge-maint'
                  }`}
                >
                  {selectedGame.is_active ? t.onlineBadge : t.maintBadge}
                </span>
                <i
                  className={`fa-solid fa-chevron-${dropdownOpen ? 'up' : 'down'}`}
                  style={{ color: 'var(--text-secondary)', fontSize: 13 }}
                />
              </div>
            </button>
          )}

          {dropdownOpen && (
            <div className="game-dropdown-menu">
              {games.map((g) => (
                <button
                  key={g.package_name}
                  type="button"
                  className={`game-option-item ${
                    selectedGame?.package_name === g.package_name ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedGame(g);
                    setDropdownOpen(false);
                    setErrorMsg(null);
                  }}
                >
                  <div className="game-trigger-left">
                    <img
                      src={g.icon_url || '/assets/icon/default-game.png'}
                      alt={g.game_name}
                      className="game-icon-img"
                    />
                    <div>
                      <div className="game-title-text">{g.game_name}</div>
                      <div className="game-pkg-sub">{g.package_name}</div>
                    </div>
                  </div>
                  <span
                    className={`badge-pill ${
                      g.is_active ? 'badge-online' : 'badge-maint'
                    }`}
                  >
                    {g.is_active ? t.onlineBadge : t.maintBadge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Optional Cloudflare Turnstile Widget */}
        {turnstileSiteKey && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-callback="onHirokiTurnstileSuccess"
              data-theme="dark"
            />
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '11px 14px',
              borderRadius: '12px',
              fontSize: 13,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Backup PIN & Shortener Redirect Notice */}
        {claimSessionResult ? (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.45)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 14.5,
                color: '#a5b4fc',
                marginBottom: 6,
              }}
            >
              <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }} />
              {t.pinNoticeTitle}
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                marginBottom: 10,
              }}
            >
              {t.pinNoticeDesc}
            </p>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: '#38bdf8',
                background: 'rgba(7, 10, 18, 0.8)',
                padding: '8px 16px',
                borderRadius: 10,
                display: 'inline-block',
                marginBottom: 14,
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              {claimSessionResult.pin_code}
            </div>
            <a
              href={claimSessionResult.redirect_url}
              className="primary-cta-btn"
              style={{ textDecoration: 'none' }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" />
              <span>{t.continueLink}</span>
            </a>
          </div>
        ) : (
          <button
            type="button"
            className="primary-cta-btn"
            disabled={loadingClaim || !selectedGame}
            onClick={handleStartClaim}
          >
            {loadingClaim ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" />
                <span>{t.processing}</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-key" />
                <span>{t.getKeyBtn}</span>
              </>
            )}
          </button>
        )}

        {/* Info Footnote */}
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          <i className="fa-solid fa-lock" style={{ marginRight: 5 }} />
          {t.deviceNote}
        </p>
      </div>

      {/* Mod Features Modal */}
      {showFeaturesModal && selectedGame && (
        <div
          className="modal-backdrop"
          onClick={() => setShowFeaturesModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i
                  className="fa-solid fa-wand-magic-sparkles"
                  style={{ color: '#38bdf8' }}
                />
                <span>Chức năng Mod — {selectedGame.game_name}</span>
              </div>
              <button
                type="button"
                className="action-mini-btn"
                onClick={() => setShowFeaturesModal(false)}
              >
                ✕
              </button>
            </div>
            <ul className="feature-list">
              {(selectedGame.features_json || []).map((feat, idx) => (
                <li key={idx} className="feature-item">
                  <i
                    className="fa-solid fa-circle-check"
                    style={{ color: 'var(--success)' }}
                  />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            {selectedGame.download_url && (
              <a
                href={selectedGame.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-cta-btn"
                style={{ marginTop: 16, textDecoration: 'none' }}
              >
                <i className="fa-solid fa-download" />
                <span>Tải Bản Mod ({selectedGame.min_version})</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Help Guide Modal */}
      {showHelpModal && (
        <div className="modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i
                  className="fa-solid fa-book-open"
                  style={{ color: '#818cf8' }}
                />
                <span>{t.helpTitle}</span>
              </div>
              <button
                type="button"
                className="action-mini-btn"
                onClick={() => setShowHelpModal(false)}
              >
                ✕
              </button>
            </div>
            <ul className="feature-list">
              <li className="feature-item">{t.helpStep1}</li>
              <li className="feature-item">{t.helpStep2}</li>
              <li className="feature-item">{t.helpStep3}</li>
              <li className="feature-item">{t.helpStep4}</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}

