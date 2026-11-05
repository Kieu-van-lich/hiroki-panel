'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function formatHms(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function ClaimKeyContent() {
  const searchParams = useSearchParams();
  const claimToken = searchParams.get('token') || '';

  const [status, setStatus] = useState<
    'verifying' | 'waiting_cooldown' | 'pin_required' | 'success' | 'error'
  >('verifying');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [pinCode, setPinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [mintedKey, setMintedKey] = useState<{
    key_code: string;
    game_package: string;
    expires_at: string | null;
    max_devices: number;
  } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(43200);
  const [copied, setCopied] = useState(false);

  const attemptCompleteClaim = useCallback(
    async (overridePin?: string) => {
      if (!claimToken) {
        setStatus('error');
        setErrorMessage('Đường dẫn nhận Key thiếu mã Token hợp lệ.');
        return;
      }

      setStatus('verifying');
      let storedPin = overridePin || pinCode;
      if (!storedPin) {
        try {
          storedPin = localStorage.getItem('hiroki_last_claim_pin') || '';
        } catch {
          // ignore
        }
      }

      try {
        const res = await fetch('/api/claim/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claim_token: claimToken,
            pin_code: storedPin,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setMintedKey({
            key_code: data.key_code,
            game_package: data.game_package,
            expires_at: data.expires_at,
            max_devices: data.max_devices || 1,
          });
          if (data.expires_at) {
            const rem = Math.max(
              0,
              Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
            );
            setRemainingSeconds(rem);
          }
          setStatus('success');
          return;
        }

        if (data.error === 'CLAIM_TOO_FAST' && data.retry_after_seconds) {
          setWaitSeconds(Number(data.retry_after_seconds));
          setStatus('waiting_cooldown');
          return;
        }

        if (data.error === 'PIN_REQUIRED' || data.require_pin) {
          setStatus('pin_required');
          setErrorMessage(
            data.message ||
              'Vui lòng nhập mã PIN 6 số hiển thị lúc bấm Lấy Key để hoàn tất!'
          );
          return;
        }

        setStatus('error');
        setErrorMessage(
          data.message || 'Không thể kích hoạt Key từ phiên này. Vui lòng lấy Key mới!'
        );
      } catch {
        setStatus('error');
        setErrorMessage('Lỗi kết nối tới máy chủ. Vui lòng tải lại trang!');
      }
    },
    [claimToken, pinCode]
  );

  // Trigger POST /api/claim/complete automatically on mount (0-click for users, immune to GET link preview bots)
  useEffect(() => {
    attemptCompleteClaim();
  }, [attemptCompleteClaim]);

  // Cooldown timer when user bypassed shortener faster than min_claim_seconds
  useEffect(() => {
    if (status !== 'waiting_cooldown' || waitSeconds <= 0) return;
    const timer = setInterval(() => {
      setWaitSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          attemptCompleteClaim();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, waitSeconds, attemptCompleteClaim]);

  // Live 12h countdown once key is minted
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  const handleCopy = async () => {
    if (!mintedKey) return;
    try {
      await navigator.clipboard.writeText(mintedKey.key_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="hiroki-card" style={{ textAlign: 'center' }}>
      <div className="brand-header">
        <div className="brand-avatar-wrap">
          <img
            src="/assets/images/logo.jpg"
            alt="Hiroki Panel"
            className="brand-avatar"
          />
          <span className="brand-status-dot" />
        </div>
        <h1 className="brand-title">Hiroki Panel</h1>
        <p className="brand-subtitle">Xác Nhận & Cấp Key Tự Động</p>
      </div>

      {status === 'verifying' && (
        <div style={{ padding: '28px 10px' }}>
          <i
            className="fa-solid fa-circle-notch fa-spin"
            style={{ fontSize: 38, color: 'var(--primary)', marginBottom: 14 }}
          />
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>
            Đang xác thực phiên vượt link và khởi tạo Key 12 Giờ...
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Vui lòng đợi trong giây lát, hệ thống đang tạo Key tự động cho bạn.
          </p>
        </div>
      )}

      {status === 'waiting_cooldown' && (
        <div style={{ padding: '24px 10px' }}>
          <i
            className="fa-regular fa-hourglass-half fa-spin"
            style={{ fontSize: 34, color: 'var(--warning)', marginBottom: 14 }}
          />
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>
            Đang kiểm tra thời gian vượt link...
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Key của bạn sẽ tự động hiển thị sau{' '}
            <strong style={{ color: '#facc15', fontSize: 16 }}>{waitSeconds}s</strong> nữa!
          </p>
        </div>
      )}

      {status === 'pin_required' && (
        <div style={{ textAlign: 'left', marginTop: 10 }}>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 12,
              padding: 14,
              fontSize: 13,
              color: '#fde68a',
              marginBottom: 16,
            }}
          >
            <i className="fa-solid fa-shield-keyhole" style={{ marginRight: 6 }} />
            {errorMessage}
          </div>

          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>Nhập mã PIN 6 số dự phòng của bạn:</label>
            <input
              type="text"
              maxLength={6}
              placeholder="Ví dụ: 482910"
              className="hiroki-input"
              style={{
                textAlign: 'center',
                fontSize: 20,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.25em',
              }}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <button
            type="button"
            className="primary-cta-btn"
            disabled={pinCode.length !== 6}
            onClick={() => attemptCompleteClaim(pinCode)}
          >
            <i className="fa-solid fa-check-circle" />
            <span>Xác Nhận PIN & Nhận Key Ngay</span>
          </button>
        </div>
      )}

      {status === 'success' && mintedKey && (
        <div style={{ textAlign: 'left' }}>
          <div className="active-key-box">
            <div className="active-key-header">
              <span>
                <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
                Cấp Key 12 Giờ Thành Công!
              </span>
              <span>
                <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                {formatHms(remainingSeconds)}
              </span>
            </div>

            <div className="key-code-row" style={{ marginTop: 10 }}>
              <span className="key-code-mono" style={{ fontSize: 16 }}>
                {mintedKey.key_code}
              </span>
              <button type="button" className="copy-pill-btn" onClick={handleCopy}>
                <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} />
                {copied ? 'Đã chép!' : 'Sao chép Key'}
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginTop: 10,
              }}
            >
              <span>Gói Game: {mintedKey.game_package}</span>
              <span>Giới hạn: {mintedKey.max_devices} Thiết bị Game</span>
            </div>
          </div>

          <p
            style={{
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Hãy sao chép mã Key trên và dán vào Menu Mod trong Game để kích hoạt.
          </p>

          <Link
            href="/"
            className="secondary-outline-btn"
            style={{ textDecoration: 'none' }}
          >
            <i className="fa-solid fa-house" />
            <span>Quay về Trang Chủ Hiroki Panel</span>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '16px 0' }}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 12,
              padding: 16,
              color: '#fca5a5',
              fontSize: 13.5,
              marginBottom: 18,
            }}
          >
            <i
              className="fa-solid fa-circle-exclamation"
              style={{ fontSize: 22, display: 'block', marginBottom: 8 }}
            />
            {errorMessage}
          </div>

          <Link
            href="/"
            className="primary-cta-btn"
            style={{ textDecoration: 'none' }}
          >
            <i className="fa-solid fa-rotate-right" />
            <span>Quay lại Trang Chủ Lấy Key Mới</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ClaimPage() {
  return (
    <main className="hiroki-shell">
      <Suspense
        fallback={
          <div className="hiroki-card" style={{ textAlign: 'center', padding: 40 }}>
            Đang tải phiên nhận Key...
          </div>
        }
      >
        <ClaimKeyContent />
      </Suspense>
    </main>
  );
}

