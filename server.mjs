import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

const page = await readFile(new URL('./index.html', import.meta.url));
const idPattern = /^[A-Za-z0-9_-]{11}$/;
let activeDownloads = 0;

function videoId(value) {
  const url = URL.parse(value ?? '');
  if (!url || url.protocol !== 'https:') return null;
  const parts = url.pathname.split('/');
  let id;
  if (url.hostname === 'youtu.be') id = parts[1];
  if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    if (['shorts', 'live'].includes(parts[1])) id = parts[2];
  }
  return idPattern.test(id ?? '') ? id : null;
}

function sendError(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

function download(id, directory, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', [
      '--ignore-config', '--no-playlist', '--no-progress', '--socket-timeout', '15',
      '--match-filter', '!is_live & duration <= 1200', '--max-filesize', '100M',
      '-f', 'b[ext=mp4][height<=720]', '-o', join(directory, 'video.mp4'),
      `https://www.youtube.com/watch?v=${id}`,
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true, signal });
    let failure;
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4096); });
    child.once('error', (error) => { failure = error; });
    child.once('close', (code) => {
      if (failure) reject(failure);
      else if (code === 0) resolve();
      else {
        const error = new Error(`yt-dlp exit code ${code}: ${stderr.trim()}`);
        if (/sign in to confirm you.re not a bot/i.test(stderr)) {
          error.code = 'YOUTUBE_SERVER_BLOCKED';
        } else if (/requested format is not available|no video formats found/i.test(stderr)) {
          error.code = 'YOUTUBE_FORMAT_UNAVAILABLE';
        }
        reject(error);
      }
    });
  });
}

createServer(async (request, response) => {
  const url = URL.parse(request.url, 'http://localhost');
  response.setHeader('Cache-Control', 'no-store');
  if (!url) {
    sendError(response, 400, 'Geçersiz istek.');
    return;
  }
  if (request.method === 'GET' && url.pathname === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page);
    return;
  }
  if (request.method !== 'GET' || url.pathname !== '/download') {
    sendError(response, 404, 'Sayfa bulunamadı.');
    return;
  }
  const id = videoId(url.searchParams.get('video'));
  if (!id) {
    sendError(response, 400, 'Geçerli bir YouTube video bağlantısı gir.');
    return;
  }
  if (activeDownloads >= 2) {
    sendError(response, 503, 'İndirme kapasitesi dolu. Biraz sonra tekrar dene.');
    return;
  }

  activeDownloads += 1;
  const cancel = new AbortController();
  const stop = () => cancel.abort();
  const timeout = setTimeout(stop, 120_000);
  const stopOnDisconnect = () => {
    if (!response.writableFinished) stop();
  };
  response.once('close', stopOnDisconnect);
  let directory;
  try {
    directory = await mkdtemp(join(tmpdir(), 'video-indirici-'));
    await download(id, directory, cancel.signal);
    const file = join(directory, 'video.mp4');
    const { size } = await stat(file);
    if (!size || size > 100 * 1024 * 1024) throw new Error('Unexpected file size');
    response.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': size,
      'Content-Disposition': `attachment; filename="${id}.mp4"`,
    });
    await pipeline(createReadStream(file), response, { signal: cancel.signal });
  } catch (error) {
    console.error(error.message);
    if (!response.headersSent && !response.destroyed) {
      if (error.code === 'YOUTUBE_SERVER_BLOCKED') {
        sendError(response, 503, 'YouTube bu sunucudan video indirmeye izin vermiyor.');
        return;
      }
      if (error.code === 'YOUTUBE_FORMAT_UNAVAILABLE') {
        sendError(response, 422, 'Bu video indirilebilir MP4 biçiminde bulunamadı.');
        return;
      }
      const message = error.code === 'ENOENT' && error.syscall?.startsWith('spawn')
        ? 'Sunucuda yt-dlp kurulu değil.'
        : 'Video hazırlanamadı. Bağlantıyı ve video sınırlarını kontrol et.';
      sendError(response, 502, message);
    }
  } finally {
    clearTimeout(timeout);
    response.off('close', stopOnDisconnect);
    if (directory) await rm(directory, { recursive: true, force: true }).catch(console.error);
    activeDownloads -= 1;
  }
}).listen(Number(process.env.PORT ?? 3000), process.env.BIND_HOST ?? '127.0.0.1', () => {
  console.log(`Video İndirici hazır. Yerel adres: http://localhost:${process.env.PORT ?? 3000}`);
});
