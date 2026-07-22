import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.md':'text/markdown; charset=utf-8' };

createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = normalize(join(root, relative));
    if (!file.startsWith(normalize(root))) throw new Error('Forbidden');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not found');
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
