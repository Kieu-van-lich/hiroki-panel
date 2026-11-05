import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hiroki Panel — Hệ Thống Cấp Key & Quản Lý License Bảo Mật',
  description:
    'Cổng lấy Key miễn phí 12h tự động và quản lý bản quyền Game Client tốc độ cao — Hiroki Panel.',
  icons: {
    icon: '/assets/images/favicon.png',
    shortcut: '/assets/images/favicon.png',
    apple: '/assets/images/logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

