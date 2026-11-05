'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface KeyDevice {
  id: string;
  device_id: string;
  device_name: string;
  game_package: string;
  first_seen: string;
  last_seen: string;
  ip_address: string;
}

interface LicenseKeyRow {
  id: string;
  key_code: string;
  key_type: string;
  game_package: string | null;
  all_games: boolean;
  max_devices: number;
  duration_seconds: number | null;
  start_on_first_use: boolean;
  activate_before: string | null;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
  last_used_at: string | null;
  key_devices?: KeyDevice[];
}

interface GameRow {
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

interface BlacklistItem {
  id: string;
  target_type: 'DEVICE' | 'IP';
  target_value: string;
  reason: string;
  created_at: string;
}

interface VerifyLogItem {
  id: string;
  key_code_attempt: string;
  game_package: string;
  device_id: string;
  ip_address: string;
  fail_reason: string;
  created_at: string;
}

interface DailyMetric {
  metric_date: string;
  claims_started: number;
  claims_completed: number;
  admin_keys_created: number;
  verify_fail_count: number;
}

interface Ed25519Meta {
  activeKid: 'k1' | 'k2';
  publicKeyK1B64: string;
  publicKeyK2B64: string;
  usingCustomEnvKeys: boolean;
}

function formatDurationSec(sec: number | null): string {
  if (sec === null || sec === undefined) return 'Vĩnh viễn';
  if (sec % 86400 === 0) return `${sec / 86400} Ngày`;
  if (sec % 3600 === 0) return `${sec / 3600} Giờ`;
  return `${Math.floor(sec / 60)} Phút`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminDashboardPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'keys' | 'games' | 'blacklist' | 'settings' | 'sdk'
  >('overview');

  // Overview / Metrics Data
  const [liveCounts, setLiveCounts] = useState({
    activeKeys: 0,
    boundDevices: 0,
    pendingClaims: 0,
    blacklistedCount: 0,
  });
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [ed25519Info, setEd25519Info] = useState<Ed25519Meta | null>(null);

  // Keys Tab State
  const [keysList, setKeysList] = useState<LicenseKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keySearch, setKeySearch] = useState('');
  const [keyTypeFilter, setKeyTypeFilter] = useState('');
  const [selectedKeyDevices, setSelectedKeyDevices] = useState<LicenseKeyRow | null>(null);

  // Key Generator Form State
  const [genMode, setGenMode] = useState<'single' | 'bulk'>('single');
  const [customKeyCode, setCustomKeyCode] = useState('');
  const [bulkPrefix, setBulkPrefix] = useState('Hiroki');
  const [bulkGroups, setBulkGroups] = useState(3);
  const [bulkCharsPerGroup, setBulkCharsPerGroup] = useState(4);
  const [bulkQuantity, setBulkQuantity] = useState(10);
  const [keyDurationPreset, setKeyDurationPreset] = useState('43200'); // 12h default
  const [customDurationHours, setCustomDurationHours] = useState('');
  const [startOnFirstUse, setStartOnFirstUse] = useState(false);
  const [activateBeforeDays, setActivateBeforeDays] = useState('30');
  const [maxDevicesInput, setMaxDevicesInput] = useState('1');
  const [targetGamePackage, setTargetGamePackage] = useState('ALL');
  const [keyNote, setKeyNote] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genNotice, setGenNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [lastCreatedKeys, setLastCreatedKeys] = useState<string[]>([]);

  // Games Tab State
  const [gamesList, setGamesList] = useState<GameRow[]>([]);
  const [gameModalData, setGameModalData] = useState<Partial<GameRow> | null>(null);
  const [gameFeaturesRaw, setGameFeaturesRaw] = useState('');

  // Blacklist Tab State
  const [blacklistList, setBlacklistList] = useState<BlacklistItem[]>([]);
  const [verifyLogsList, setVerifyLogsList] = useState<VerifyLogItem[]>([]);
  const [newBlType, setNewBlType] = useState<'DEVICE' | 'IP'>('DEVICE');
  const [newBlValue, setNewBlValue] = useState('');
  const [newBlReason, setNewBlReason] = useState('Vi phạm điều khoản');

  // Check login status on mount
  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/login');
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Load Metrics & Settings
  const loadMetricsData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setLiveCounts(data.liveCounts || liveCounts);
        setDailyMetrics(data.dailyMetrics || []);
        setSettings(data.settings || {});
        setEd25519Info(data.ed25519 || null);
      }
    } catch (err) {
      console.error('Error loading metrics:', err);
    }
  }, []);

  // Load Keys List
  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const params = new URLSearchParams();
      if (keySearch.trim()) params.set('search', keySearch.trim());
      if (keyTypeFilter) params.set('key_type', keyTypeFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/keys?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setKeysList(data.keys || []);
      }
    } catch (err) {
      console.error('Error loading keys:', err);
    } finally {
      setKeysLoading(false);
    }
  }, [keySearch, keyTypeFilter]);

  // Load Games
  const loadGames = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/games');
      if (res.ok) {
        const data = await res.json();
        setGamesList(data.games || []);
      }
    } catch (err) {
      console.error('Error loading games:', err);
    }
  }, []);

  // Load Blacklist & Verify Logs
  const loadBlacklist = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blacklist');
      if (res.ok) {
        const data = await res.json();
        setBlacklistList(data.blacklist || []);
        setVerifyLogsList(data.verify_logs || []);
      }
    } catch (err) {
      console.error('Error loading blacklist:', err);
    }
  }, []);

  // Fetch data when authenticated or tab changes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'overview' || activeTab === 'settings' || activeTab === 'sdk') {
      loadMetricsData();
    }
    if (activeTab === 'keys') {
      loadKeys();
      loadGames();
    }
    if (activeTab === 'games') {
      loadGames();
    }
    if (activeTab === 'blacklist') {
      loadBlacklist();
    }
  }, [isAuthenticated, activeTab, loadMetricsData, loadKeys, loadGames, loadBlacklist]);

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
        setAdminPassword('');
      } else {
        setLoginError(data.message || 'Mật khẩu Admin không chính xác.');
      }
    } catch {
      setLoginError('Lỗi kết nối máy chủ khi đăng nhập.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  // Create Key (Single or Bulk)
  const handleCreateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenNotice(null);
    setGenLoading(true);

    let durationSeconds: number | null = null;
    if (keyDurationPreset === 'LIFETIME') {
      durationSeconds = null;
    } else if (keyDurationPreset === 'CUSTOM') {
      const hours = Number(customDurationHours);
      if (Number.isNaN(hours) || hours <= 0) {
        setGenNotice({ type: 'err', text: 'Số giờ tùy chỉnh không hợp lệ.' });
        setGenLoading(false);
        return;
      }
      durationSeconds = Math.round(hours * 3600);
    } else {
      durationSeconds = Number(keyDurationPreset);
    }

    const payload = {
      quantity: genMode === 'single' ? 1 : bulkQuantity,
      custom_key_code: genMode === 'single' && customKeyCode.trim() ? customKeyCode.trim() : undefined,
      prefix: bulkPrefix.trim(),
      groups: bulkGroups,
      chars_per_group: bulkCharsPerGroup,
      all_games: targetGamePackage === 'ALL',
      game_package: targetGamePackage === 'ALL' ? null : targetGamePackage,
      max_devices: Number(maxDevicesInput),
      duration_seconds: durationSeconds,
      start_on_first_use: startOnFirstUse,
      activate_before_days: startOnFirstUse ? Number(activateBeforeDays) : null,
      key_type: durationSeconds === null ? 'VIP_LIFETIME' : 'CUSTOM',
      note: keyNote.trim() || undefined,
    };

    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGenNotice({
          type: 'ok',
          text: `Đã tạo thành công ${data.created_count} Key!`,
        });
        const createdCodes = (data.keys as LicenseKeyRow[]).map((k) => k.key_code);
        setLastCreatedKeys(createdCodes);
        if (genMode === 'single') setCustomKeyCode('');
        loadKeys();
      } else {
        setGenNotice({ type: 'err', text: data.message || 'Lỗi khi tạo Key.' });
      }
    } catch {
      setGenNotice({ type: 'err', text: 'Lỗi kết nối khi gửi yêu cầu tạo Key.' });
    } finally {
      setGenLoading(false);
    }
  };

  // Export created keys to CSV
  const handleExportCsv = (codes: string[]) => {
    if (codes.length === 0) return;
    const csvContent = 'data:text/csv;charset=utf-8,Key Code\n' + codes.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hiroki-keys-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Key Actions (Toggle active, Reset HWID, Extend, Delete)
  const handleKeyAction = async (
    id: string,
    action: 'toggle_active' | 'reset_hwid' | 'extend_time' | 'update_max_devices',
    extra?: Record<string, unknown>
  ) => {
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...extra }),
      });
      if (res.ok) {
        loadKeys();
        if (selectedKeyDevices && selectedKeyDevices.id === id) {
          setSelectedKeyDevices(null);
        }
      } else {
        const d = await res.json();
        alert(d.message || 'Thao tác thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn Key này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`/api/admin/keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadKeys();
      }
    } catch {
      alert('Lỗi khi xóa key');
    }
  };

  const handlePurgeExpiredKeys = async () => {
    if (!confirm('Hành động này sẽ xóa bay màu toàn bộ Key đã hết hạn khỏi DB ngay lập tức để giải phóng dung lượng. Tiếp tục?')) return;
    try {
      const res = await fetch('/api/admin/keys?purge_expired=true', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        alert(`Đã dọn dẹp thành công ${data.result?.deleted_keys || 0} Key và ${data.result?.deleted_devices || 0} thiết bị hết hạn!`);
        loadKeys();
      }
    } catch {
      alert('Lỗi khi dọn dẹp');
    }
  };

  // Save Game (Upsert)
  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameModalData?.game_name) return;

    const pkg =
      gameModalData.package_name ||
      'game.' + gameModalData.game_name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const features = gameFeaturesRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...gameModalData,
          package_name: pkg,
          features_json: features,
        }),
      });

      if (res.ok) {
        setGameModalData(null);
        loadGames();
      } else {
        const d = await res.json();
        alert(d.message || 'Lỗi khi lưu game');
      }
    } catch {
      alert('Lỗi kết nối khi lưu game');
    }
  };

  // Delete Game
  const handleDeleteGame = async (pkg: string) => {
    if (!confirm(`Xóa cấu hình game ${pkg}?`)) return;
    try {
      const res = await fetch(`/api/admin/games?package_name=${encodeURIComponent(pkg)}`, {
        method: 'DELETE',
      });
      if (res.ok) loadGames();
    } catch {
      alert('Lỗi khi xóa game');
    }
  };

  // Add Blacklist Entry
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlValue.trim()) return;

    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: newBlType,
          target_value: newBlValue.trim(),
          reason: newBlReason.trim(),
        }),
      });

      if (res.ok) {
        setNewBlValue('');
        loadBlacklist();
      } else {
        const d = await res.json();
        alert(d.message || 'Lỗi thêm blacklist');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Delete Blacklist Entry
  const handleDeleteBlacklist = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/blacklist?id=${id}`, { method: 'DELETE' });
      if (res.ok) loadBlacklist();
    } catch {
      alert('Lỗi khi gỡ chặn');
    }
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        alert('Đã cập nhật cài đặt hệ thống thành công!');
        loadMetricsData();
      } else {
        alert('Không thể lưu cài đặt.');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  if (!authChecked) {
    return (
      <main className="hiroki-shell">
        <div style={{ color: 'var(--text-secondary)' }}>Đang kiểm tra bảo mật...</div>
      </main>
    );
  }

  // Login Screen if unauthorized
  if (!isAuthenticated) {
    return (
      <main className="hiroki-shell">
        <div className="hiroki-card" style={{ maxWidth: 440 }}>
          <div className="brand-header">
            <div className="brand-avatar-wrap" style={{ width: 72, height: 72 }}>
              <img src="/assets/images/logo.jpg" alt="Admin" className="brand-avatar" />
            </div>
            <h1 className="brand-title" style={{ fontSize: 22 }}>
              Quản Trị Hiroki Panel
            </h1>
            <p className="brand-subtitle">Xác thực quyền quản trị viên máy chủ</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label>Mật khẩu Quản trị (ADMIN_PASSWORD):</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                className="hiroki-input"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoFocus
                required
              />
            </div>

            {loginError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  padding: '9px 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                {loginError}
              </div>
            )}

            <button type="submit" className="primary-cta-btn" disabled={loginLoading}>
              {loginLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-lock-open" />
                  <span>Đăng Nhập Quản Trị</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              ← Quay về Trang chủ Hiroki
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated Admin Dashboard Layout
  return (
    <div className="admin-layout">
      {/* Top Bar */}
      <header className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/assets/images/logo.jpg"
            alt="Hiroki Admin"
            style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid var(--border-glow)' }}
          />
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700 }}>Hiroki Panel — Admin Suite</h1>
            <span style={{ fontSize: 12, color: 'var(--success)' }}>
              ● Đã kết nối Supabase PostgreSQL & Ed25519 Secure Enclave
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" target="_blank" className="action-mini-btn" style={{ textDecoration: 'none' }}>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 5 }} />
            Mở Cổng User
          </Link>
          <button type="button" className="action-mini-btn danger" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 5 }} />
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-tabs">
        {[
          { key: 'overview', label: 'Tổng Quan & Thống Kê', icon: 'fa-chart-pie' },
          { key: 'keys', label: 'Tạo & Quản Lý Key', icon: 'fa-key' },
          { key: 'games', label: 'Danh Sách Game & Bảo Trì', icon: 'fa-gamepad' },
          { key: 'blacklist', label: 'Danh Sách Đen & Logs Dò Key', icon: 'fa-shield-halved' },
          { key: 'settings', label: 'Cấu Hình Hệ Thống', icon: 'fa-sliders' },
          { key: 'sdk', label: 'Mã Tích Hợp Client Game (SDK)', icon: 'fa-code' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
          >
            <i className={`fa-solid ${tab.icon}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* TAB 1: OVERVIEW & DAILY METRICS */}
      {activeTab === 'overview' && (
        <section>
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="stat-label">Key Đang Hoạt Động</div>
              <div className="stat-value" style={{ color: '#818cf8' }}>
                {liveCounts.activeKeys}
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Thiết Bị HWID Đã Gắn</div>
              <div className="stat-value" style={{ color: '#38bdf8' }}>
                {liveCounts.boundDevices}
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Phiên Vượt Link Đang Chờ</div>
              <div className="stat-value" style={{ color: '#facc15' }}>
                {liveCounts.pendingClaims}
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Đối Tượng Bị Chặn (Blacklist)</div>
              <div className="stat-value" style={{ color: '#f87171' }}>
                {liveCounts.blacklistedCount}
              </div>
            </div>
          </div>

          <div className="admin-panel-box">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              Thống Kê Hoạt Động 30 Ngày Gần Nhất (daily_metrics)
            </h2>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Lượt Bấm Lấy Key</th>
                    <th>Lượt Cấp Key Thành Công</th>
                    <th>Key Do Admin Tạo</th>
                    <th>Lượt Dò Key / Bị Chặn</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có dữ liệu thống kê nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    dailyMetrics.map((m) => (
                      <tr key={m.metric_date}>
                        <td style={{ fontWeight: 600 }}>{m.metric_date}</td>
                        <td style={{ color: '#38bdf8' }}>{m.claims_started}</td>
                        <td style={{ color: 'var(--success)' }}>{m.claims_completed}</td>
                        <td style={{ color: '#a5b4fc' }}>{m.admin_keys_created}</td>
                        <td style={{ color: m.verify_fail_count > 0 ? '#f87171' : 'inherit' }}>
                          {m.verify_fail_count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: KEY CREATION & MANAGEMENT */}
      {activeTab === 'keys' && (
        <section>
          {/* Key Generator Box */}
          <div className="admin-panel-box">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tạo Key Tùy Ý (Định Dạng & Thời Lượng Tùy Chỉnh)</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`action-mini-btn ${genMode === 'single' ? 'active' : ''}`}
                  onClick={() => setGenMode('single')}
                >
                  Key Đơn Tùy Chỉnh
                </button>
                <button
                  type="button"
                  className={`action-mini-btn ${genMode === 'bulk' ? 'active' : ''}`}
                  onClick={() => setGenMode('bulk')}
                >
                  Tạo Hàng Loạt (Bulk)
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateKeys}>
              <div className="form-grid">
                {genMode === 'single' ? (
                  <div className="form-field">
                    <label>Mã Key (để trống sẽ tự tạo Hiroki_thời gian_thiết bị_12 ký tự):</label>
                    <input
                      type="text"
                      placeholder="Để trống hoặc tự điền theo ý muốn..."
                      className="hiroki-input"
                      value={customKeyCode}
                      onChange={(e) => setCustomKeyCode(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-field">
                      <label>Tiền tố (Prefix):</label>
                      <input
                        type="text"
                        className="hiroki-input"
                        value={bulkPrefix}
                        onChange={(e) => setBulkPrefix(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>Số lượng Key cần tạo:</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        className="hiroki-input"
                        value={bulkQuantity}
                        onChange={(e) => setBulkQuantity(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>Định dạng ngẫu nhiên:</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="number"
                          title="Số nhóm"
                          min={1}
                          max={6}
                          className="hiroki-input"
                          value={bulkGroups}
                          onChange={(e) => setBulkGroups(Number(e.target.value))}
                        />
                        <span style={{ alignSelf: 'center' }}>nhóm ×</span>
                        <input
                          type="number"
                          title="Ký tự mỗi nhóm"
                          min={3}
                          max={8}
                          className="hiroki-input"
                          value={bulkCharsPerGroup}
                          onChange={(e) => setBulkCharsPerGroup(Number(e.target.value))}
                        />
                        <span style={{ alignSelf: 'center' }}>ký tự</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-field">
                  <label>Thời lượng Key:</label>
                  <select
                    className="hiroki-select"
                    value={keyDurationPreset}
                    onChange={(e) => setKeyDurationPreset(e.target.value)}
                  >
                    <option value="43200">12 Giờ (Mặc định Free)</option>
                    <option value="86400">24 Giờ (1 Ngày)</option>
                    <option value="259200">3 Ngày (72 Giờ)</option>
                    <option value="604800">7 Ngày (1 Tuần)</option>
                    <option value="2592000">30 Ngày (1 Tháng)</option>
                    <option value="7776000">90 Ngày (3 Tháng)</option>
                    <option value="31536000">365 Ngày (1 Năm)</option>
                    <option value="LIFETIME">Vĩnh Viễn (Lifetime)</option>
                    <option value="CUSTOM">Tùy Chỉnh Số Giờ...</option>
                  </select>
                </div>

                {keyDurationPreset === 'CUSTOM' && (
                  <div className="form-field">
                    <label>Số giờ cụ thể:</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0.5}
                      placeholder="Ví dụ: 48"
                      className="hiroki-input"
                      value={customDurationHours}
                      onChange={(e) => setCustomDurationHours(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-field">
                  <label>Khóa thiết bị (Số máy tối đa):</label>
                  <select
                    className="hiroki-select"
                    value={maxDevicesInput}
                    onChange={(e) => setMaxDevicesInput(e.target.value)}
                  >
                    <option value="1">1 Thiết Bị (Mặc định)</option>
                    <option value="2">2 Thiết Bị</option>
                    <option value="3">3 Thiết Bị</option>
                    <option value="5">5 Thiết Bị</option>
                    <option value="10">10 Thiết Bị</option>
                    <option value="0">Không Giới Hạn Thiết Bị (0)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Áp dụng cho Game:</label>
                  <select
                    className="hiroki-select"
                    value={targetGamePackage}
                    onChange={(e) => setTargetGamePackage(e.target.value)}
                  >
                    <option value="ALL">★ Tất cả mọi Game</option>
                    {gamesList.map((g) => (
                      <option key={g.package_name} value={g.package_name}>
                        {g.game_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Ghi chú (Note):</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tặng VIP Discord hoặc Bán cho bạn A"
                    className="hiroki-input"
                    value={keyNote}
                    onChange={(e) => setKeyNote(e.target.value)}
                  />
                </div>
              </div>

              {keyDurationPreset !== 'LIFETIME' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 14,
                    padding: 12,
                    background: 'rgba(7, 10, 18, 0.5)',
                    borderRadius: 10,
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={startOnFirstUse}
                      onChange={(e) => setStartOnFirstUse(e.target.checked)}
                    />
                    <span>Chỉ bắt đầu đếm giờ khi người dùng mở Game lần đầu (start_on_first_use)</span>
                  </label>

                  {startOnFirstUse && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                      <span>Hạn kích hoạt:</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        style={{ width: 70 }}
                        className="hiroki-input"
                        value={activateBeforeDays}
                        onChange={(e) => setActivateBeforeDays(e.target.value)}
                      />
                      <span>ngày</span>
                    </div>
                  )}
                </div>
              )}

              {genNotice && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    background: genNotice.type === 'ok' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: genNotice.type === 'ok' ? '#34d399' : '#fca5a5',
                    border: `1px solid ${genNotice.type === 'ok' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  }}
                >
                  {genNotice.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="submit" className="primary-cta-btn" disabled={genLoading}>
                  {genLoading ? 'Đang tạo Key...' : 'Tiến Hành Tạo Key'}
                </button>
                {lastCreatedKeys.length > 0 && (
                  <button
                    type="button"
                    className="secondary-outline-btn"
                    onClick={() => handleExportCsv(lastCreatedKeys)}
                  >
                    <i className="fa-solid fa-file-csv" />
                    <span>Xuất CSV ({lastCreatedKeys.length} Key vừa tạo)</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Key List & Filters */}
          <div className="admin-panel-box">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã Key hoặc ghi chú..."
                  className="hiroki-input"
                  value={keySearch}
                  onChange={(e) => setKeySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadKeys()}
                />
                <select
                  className="hiroki-select"
                  style={{ width: 170 }}
                  value={keyTypeFilter}
                  onChange={(e) => setKeyTypeFilter(e.target.value)}
                >
                  <option value="">Tất cả loại Key</option>
                  <option value="FREE_12H">FREE_12H</option>
                  <option value="CUSTOM">CUSTOM</option>
                  <option value="VIP_LIFETIME">VIP_LIFETIME</option>
                </select>
                <button type="button" className="action-mini-btn" onClick={loadKeys}>
                  Lọc
                </button>
              </div>

              <button
                type="button"
                className="action-mini-btn danger"
                onClick={handlePurgeExpiredKeys}
                title="Xóa ngay toàn bộ Key đã hết hạn khỏi DB"
              >
                <i className="fa-solid fa-trash-can" style={{ marginRight: 5 }} />
                Dọn Dẹp Key Hết Hạn
              </button>
            </div>

            {keysLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Đang tải danh sách Key...
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã Key</th>
                      <th>Game</th>
                      <th>Thời Lượng / Hạn Dùng</th>
                      <th>Thiết Bị (HWID)</th>
                      <th>Trạng Thái</th>
                      <th>Ghi Chú</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keysList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Không tìm thấy mã Key nào.
                        </td>
                      </tr>
                    ) : (
                      keysList.map((k) => {
                        const devCount = k.key_devices?.length || 0;
                        const isExpired = k.expires_at && new Date(k.expires_at).getTime() < Date.now();
                        return (
                          <tr key={k.id}>
                            <td>
                              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                                {k.key_code}
                              </span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.key_type}</div>
                            </td>
                            <td>
                              {k.all_games ? (
                                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Tất cả Game</span>
                              ) : (
                                <span style={{ fontSize: 12 }}>{k.game_package}</span>
                              )}
                            </td>
                            <td>
                              <div>{formatDurationSec(k.duration_seconds)}</div>
                              <div style={{ fontSize: 11, color: isExpired ? '#f87171' : 'var(--text-muted)' }}>
                                {k.expires_at ? formatDate(k.expires_at) : 'Không giới hạn'}
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="action-mini-btn"
                                onClick={() => setSelectedKeyDevices(k)}
                              >
                                {devCount}/{k.max_devices === 0 ? '∞' : k.max_devices} Máy
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`badge-pill ${k.is_active ? 'badge-online' : 'badge-maint'}`}
                                style={{ border: 'none', cursor: 'pointer' }}
                                onClick={() =>
                                  handleKeyAction(k.id, 'toggle_active', { is_active: !k.is_active })
                                }
                              >
                                {k.is_active ? 'Hoạt động' : 'Đã khóa'}
                              </button>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {k.note || '—'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button
                                  type="button"
                                  className="action-mini-btn"
                                  title="Gia hạn thêm 12 Giờ"
                                  onClick={() =>
                                    handleKeyAction(k.id, 'extend_time', { add_seconds: 43200 })
                                  }
                                >
                                  +12h
                                </button>
                                <button
                                  type="button"
                                  className="action-mini-btn"
                                  title="Reset HWID thiết bị"
                                  onClick={() => handleKeyAction(k.id, 'reset_hwid')}
                                >
                                  Reset HWID
                                </button>
                                <button
                                  type="button"
                                  className="action-mini-btn danger"
                                  title="Xóa Key"
                                  onClick={() => handleDeleteKey(k.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bound Devices Modal */}
          {selectedKeyDevices && (
            <div className="modal-backdrop" onClick={() => setSelectedKeyDevices(null)}>
              <div className="modal-card" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">
                    <i className="fa-solid fa-mobile-screen-button" style={{ color: '#38bdf8' }} />
                    <span>Thiết Bị HWID Của Key: {selectedKeyDevices.key_code}</span>
                  </div>
                  <button
                    type="button"
                    className="action-mini-btn"
                    onClick={() => setSelectedKeyDevices(null)}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Đang dùng: {selectedKeyDevices.key_devices?.length || 0}/
                  {selectedKeyDevices.max_devices === 0 ? '∞' : selectedKeyDevices.max_devices} thiết bị
                </div>

                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tên / HWID</th>
                        <th>IP Cuối</th>
                        <th>Hoạt Động Cuối</th>
                        <th>Gỡ Máy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedKeyDevices.key_devices || selectedKeyDevices.key_devices.length === 0) ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chưa có thiết bị nào gắn với Key này trong Game.
                          </td>
                        </tr>
                      ) : (
                        selectedKeyDevices.key_devices.map((d) => (
                          <tr key={d.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{d.device_name}</div>
                              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                                {d.device_id}
                              </div>
                            </td>
                            <td style={{ fontSize: 12 }}>{d.ip_address}</td>
                            <td style={{ fontSize: 11 }}>{formatDate(d.last_seen)}</td>
                            <td>
                              <button
                                type="button"
                                className="action-mini-btn danger"
                                onClick={() =>
                                  handleKeyAction(selectedKeyDevices.id, 'remove_device' as any, {
                                    device_row_id: d.id,
                                  })
                                }
                              >
                                Gỡ
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <button
                    type="button"
                    className="action-mini-btn"
                    onClick={() => handleKeyAction(selectedKeyDevices.id, 'reset_hwid')}
                  >
                    Gỡ Bỏ Toàn Bộ Thiết Bị (Reset Toàn Bộ)
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: GAMES & MAINTENANCE MANAGER */}
      {activeTab === 'games' && (
        <section>
          <div className="admin-panel-box">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Danh Sách Game & Công Tắc Bảo Trì</h2>
              <button
                type="button"
                className="primary-cta-btn"
                style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
                onClick={() => {
                  setGameModalData({
                    package_name: '',
                    game_name: '',
                    icon_url: '/assets/icon/default-game.png',
                    is_active: true,
                    min_version: '1.0.0',
                    maintenance_msg: '',
                    download_url: '',
                    sort_order: 10,
                  });
                  setGameFeaturesRaw('');
                }}
              >
                + Thêm Game Mới
              </button>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Icon & Tên Game</th>
                    <th>Phiên Bản (min_version)</th>
                    <th>Trạng Thái</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {gamesList.map((g) => (
                    <tr key={g.package_name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={g.icon_url || '/assets/icon/default-game.png'}
                            alt={g.game_name}
                            style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }}
                          />
                          <span style={{ fontWeight: 600 }}>{g.game_name}</span>
                        </div>
                      </td>
                      <td>{g.min_version}</td>
                      <td>
                        <button
                          type="button"
                          className={`badge-pill ${g.is_active ? 'badge-online' : 'badge-maint'}`}
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={async () => {
                            await fetch('/api/admin/games', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                ...g,
                                is_active: !g.is_active,
                              }),
                            });
                            loadGames();
                          }}
                        >
                          {g.is_active ? 'Đang Hoạt Động' : 'Đang Bảo Trì'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="action-mini-btn"
                            onClick={() => {
                              setGameModalData(g);
                              setGameFeaturesRaw((g.features_json || []).join('\n'));
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="action-mini-btn danger"
                            onClick={() => handleDeleteGame(g.package_name)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Edit Game Modal */}
          {gameModalData && (
            <div className="modal-backdrop" onClick={() => setGameModalData(null)}>
              <div className="modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">
                    <i className="fa-solid fa-gamepad" style={{ color: '#38bdf8' }} />
                    <span>Cấu Hình Game</span>
                  </div>
                  <button type="button" className="action-mini-btn" onClick={() => setGameModalData(null)}>
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveGame}>
                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label>Tên Game Hiển Thị:</label>
                    <input
                      type="text"
                      className="hiroki-input"
                      value={gameModalData.game_name || ''}
                      onChange={(e) =>
                        setGameModalData({ ...gameModalData, game_name: e.target.value })
                      }
                      placeholder="ZingSpeed Mobile"
                      required
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label>Đường dẫn Icon URL:</label>
                    <input
                      type="text"
                      className="hiroki-input"
                      value={gameModalData.icon_url || ''}
                      onChange={(e) =>
                        setGameModalData({ ...gameModalData, icon_url: e.target.value })
                      }
                      placeholder="/assets/images/zingspeed.png"
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label>Phiên Bản Mod Tối Thiểu (min_version):</label>
                    <input
                      type="text"
                      className="hiroki-input"
                      value={gameModalData.min_version || '1.0.0'}
                      onChange={(e) =>
                        setGameModalData({ ...gameModalData, min_version: e.target.value })
                      }
                      placeholder="1.0.0"
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label>Link Tải Bản Mod (download_url):</label>
                    <input
                      type="text"
                      className="hiroki-input"
                      value={gameModalData.download_url || ''}
                      onChange={(e) =>
                        setGameModalData({ ...gameModalData, download_url: e.target.value })
                      }
                      placeholder="https://t.me/..."
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label>Thông Báo Bảo Trì (khi tắt hoạt động):</label>
                    <input
                      type="text"
                      className="hiroki-input"
                      value={gameModalData.maintenance_msg || ''}
                      onChange={(e) =>
                        setGameModalData({ ...gameModalData, maintenance_msg: e.target.value })
                      }
                      placeholder="Game đang cập nhật phiên bản mới..."
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: 12 }}>
                    <label>Danh Sách Tính Năng (Mỗi dòng 1 tính năng):</label>
                    <textarea
                      rows={4}
                      className="hiroki-textarea"
                      value={gameFeaturesRaw}
                      onChange={(e) => setGameFeaturesRaw(e.target.value)}
                      placeholder="Hiện đường dẫn&#10;Auto CWW&#10;Aimbot"
                    />
                  </div>

                  <button type="submit" className="primary-cta-btn" style={{ marginTop: 10 }}>
                    Lưu Thông Tin Game
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: BLACKLIST & SECURITY LOGS */}
      {activeTab === 'blacklist' && (
        <section>
          {/* Add Blacklist Form */}
          <div className="admin-panel-box">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              Thêm Đối Tượng Vào Danh Sách Đen (Blacklist)
            </h2>
            <form onSubmit={handleAddBlacklist} className="form-grid">
              <div className="form-field">
                <label>Loại Đối Tượng:</label>
                <select
                  className="hiroki-select"
                  value={newBlType}
                  onChange={(e) => setNewBlType(e.target.value as 'DEVICE' | 'IP')}
                >
                  <option value="DEVICE">Mã Thiết Bị (HWID)</option>
                  <option value="IP">Địa Chỉ IP</option>
                </select>
              </div>
              <div className="form-field">
                <label>Giá Trị (HWID hoặc IP):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 8a7f9b2c... hoặc 1.2.3.4"
                  className="hiroki-input"
                  value={newBlValue}
                  onChange={(e) => setNewBlValue(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Lý Do Chặn:</label>
                <input
                  type="text"
                  placeholder="Dò Key hoặc chia sẻ Key lậu"
                  className="hiroki-input"
                  value={newBlReason}
                  onChange={(e) => setNewBlReason(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="primary-cta-btn" style={{ marginTop: 22 }}>
                  Thêm Chặn
                </button>
              </div>
            </form>
          </div>

          {/* Blacklist Table */}
          <div className="admin-panel-box">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              Danh Sách Đang Bị Chặn ({blacklistList.length})
            </h3>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Giá Trị</th>
                    <th>Lý Do</th>
                    <th>Thời Điểm</th>
                    <th>Gỡ Chặn</th>
                  </tr>
                </thead>
                <tbody>
                  {blacklistList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có IP hay Thiết bị nào bị đưa vào danh sách đen.
                      </td>
                    </tr>
                  ) : (
                    blacklistList.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <span
                            className="badge-pill"
                            style={{
                              background: b.target_type === 'IP' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                              color: b.target_type === 'IP' ? '#38bdf8' : '#c084fc',
                            }}
                          >
                            {b.target_type}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono' }}>{b.target_value}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{b.reason}</td>
                        <td>{formatDate(b.created_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="action-mini-btn danger"
                            onClick={() => handleDeleteBlacklist(b.id)}
                          >
                            Gỡ Bỏ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Verify Logs (KEY_NOT_FOUND & BLACKLISTED) */}
          <div className="admin-panel-box">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              Nhật Ký Dò Key & Lượt Truy Cập Bị Chặn (verify_logs)
            </h3>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thời Điểm</th>
                    <th>Mã Key Thử Nghiệm</th>
                    <th>Game</th>
                    <th>Mã Thiết Bị (HWID)</th>
                    <th>IP</th>
                    <th>Lý Do Từ Chối</th>
                  </tr>
                </thead>
                <tbody>
                  {verifyLogsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Hệ thống sạch, chưa phát hiện hành vi dò Key hoặc truy cập từ đối tượng bị chặn.
                      </td>
                    </tr>
                  ) : (
                    verifyLogsList.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.created_at)}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', color: '#f87171' }}>
                          {log.key_code_attempt}
                        </td>
                        <td style={{ fontSize: 12 }}>{log.game_package}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{log.device_id}</td>
                        <td>{log.ip_address}</td>
                        <td>
                          <span className="badge-pill badge-maint">{log.fail_reason}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <section>
          <div className="admin-panel-box" style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Cấu Hình Tham Số Hệ Thống (system_settings)
            </h2>
            <form onSubmit={handleSaveSettings}>
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Thời lượng mặc định của Key Free (default_free_key_hours):</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  className="hiroki-input"
                  value={settings.default_free_key_hours || '12'}
                  onChange={(e) =>
                    setSettings({ ...settings, default_free_key_hours: e.target.value })
                  }
                />
              </div>

              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Thông báo chạy ngang trên Trang chủ (announcement_banner):</label>
                <input
                  type="text"
                  className="hiroki-input"
                  value={settings.announcement_banner || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, announcement_banner: e.target.value })
                  }
                />
              </div>

              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Đường dẫn Telegram Hỗ Trợ (telegram_support_url):</label>
                <input
                  type="text"
                  className="hiroki-input"
                  value={settings.telegram_support_url || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, telegram_support_url: e.target.value })
                  }
                />
              </div>

              <div className="form-field" style={{ marginBottom: 16 }}>
                <label>Link Video Hướng Dẫn YouTube (youtube_tutorial_url):</label>
                <input
                  type="text"
                  className="hiroki-input"
                  value={settings.youtube_tutorial_url || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, youtube_tutorial_url: e.target.value })
                  }
                />
              </div>

              <button type="submit" className="primary-cta-btn">
                Lưu Thay Đổi Cài Đặt
              </button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 6: CLIENT SDK SNIPPET GENERATOR */}
      {activeTab === 'sdk' && (
        <section>
          <div className="admin-panel-box">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              Khóa Công Khai Ed25519 & Đoạn Mã Tích Hợp Client Game
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Mọi gói tin phản hồi từ `/api/v1/verify` và `/api/v1/heartbeat` đều được ký số Ed25519 qua chuỗi Canonical JSON. Client chỉ cần nhúng Public Key để xác thực chữ ký chống can thiệp hoặc giả lập máy chủ.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div style={{ background: 'rgba(7, 10, 18, 0.7)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                  Public Key k1 (Primary, SPKI Base64):
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, wordBreak: 'break-all' }}>
                  {ed25519Info?.publicKeyK1B64 || 'Chưa tải'}
                </div>
              </div>

              <div style={{ background: 'rgba(7, 10, 18, 0.7)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>
                  Public Key k2 (Backup Rotation, SPKI Base64):
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, wordBreak: 'break-all' }}>
                  {ed25519Info?.publicKeyK2B64 || 'Chưa tải'}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Mã Mẫu Xác Thực Chữ Ký Ed25519 (C++ / libsodium / Android NDK):
            </h3>
            <pre
              style={{
                background: '#070a12',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 16,
                fontFamily: 'JetBrains Mono',
                fontSize: 12,
                color: '#e2e8f0',
                overflowX: 'auto',
              }}
            >
{`// 1. Gửi request POST tới /api/v1/verify
// Payload: { "key_code": "HIROKI-...", "game_package": "com.vng.speedvn", "device_id": "hwid_123", "nonce": "abc12345" }

// 2. Nhận response:
// { "kid": "k1", "payload_b64": "...", "signature": "..." }

// 3. Xác thực bằng libsodium:
#include <sodium.h>

bool verify_license(const std::string& payload_b64, const std::string& signature_b64, const unsigned char* pubkey) {
    std::string canonical_bytes = base64url_decode(payload_b64);
    std::string sig_bytes = base64url_decode(signature_b64);
    
    if (crypto_sign_verify_detached(
            (const unsigned char*)sig_bytes.data(),
            (const unsigned char*)canonical_bytes.data(),
            canonical_bytes.size(),
            pubkey) != 0) {
        return false; // Chữ ký không hợp lệ -> Giả lập server hoặc bị sửa dữ liệu!
    }
    
    // Parse canonical_bytes JSON:
    // Kiểm tra: valid == true && nonce == nonce_đã_gửi
    // Lưu session_token để gọi /api/v1/heartbeat định kỳ mỗi 3 phút
    return true;
}`}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}

