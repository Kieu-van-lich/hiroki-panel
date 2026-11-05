import { exec } from 'node:child_process';

const url = 'http://localhost:3000';
console.log(`🚀 Đang mở trình duyệt tới: ${url}`);

const startCmd =
  process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
    ? 'start ""'
    : 'xdg-open';

exec(`${startCmd} "${url}"`, (err) => {
  if (err) {
    console.error('Không thể mở tự động. Vui lòng bấm vào link:', url);
  } else {
    console.log('✅ Đã gửi lệnh mở trình duyệt thành công!');
  }
});

