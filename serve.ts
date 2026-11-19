// Tiny static server for local development of the cover app.
// Serves app/ on http://localhost:8080 — no build step, no network calls.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(join(fileURLToPath(new URL('.', import.meta.url)), 'app'));
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};
const port = Number(process.env.PORT ?? 8080);

createServer(async (req, res) => {
  try {
    const path = normalize(join(root, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)));
    if (!path.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const file = path.endsWith('/') ? join(path, 'index.html') : path;
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(port, () => console.log(`serving app/ at http://localhost:${port}/`));
