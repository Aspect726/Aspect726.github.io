import { createServer } from 'node:http';
import { parseArgs } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { createApp } from './server/backend.mjs';
import { createSQLiteDB } from './server/storage.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const db = createSQLiteDB(process.env.DATABASE_PATH || resolve(root, 'private/practice.sqlite'));
db.migrate();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const assets = {};
for (const name of ['index.html', 'app.js', 'student.mjs', 'teacher.mjs', 'styles.css', 'assets/favicon.svg', 'assets/math-playground.svg', 'assets/graph-paper.svg']) {
  try { assets[`/${name}`] = { body: await readFile(resolve(root, 'public', name)), type: types[extname(name)] }; } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const name of await readdir(resolve(root, 'public/assets/fonts')).catch(() => [])) {
  if (name.endsWith('.woff2')) assets[`/assets/fonts/${name}`] = { body: await readFile(resolve(root, 'public/assets/fonts', name)), type: types['.woff2'] };
}
let questionPool = null;
try { questionPool = JSON.parse(await readFile(resolve(root, 'private/vetted-seeds.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const app = createApp({ db, assets, questionPool, production: process.env.NODE_ENV === 'production' });
const { values: cli } = parseArgs({ options: { port: { type: 'string' }, host: { type: 'string' }, strictPort: { type: 'boolean' } } });
const port = Number(process.env.PORT || cli.port || 3000);
const host = process.env.HOST || cli.host || '127.0.0.1';
const server = createServer(async (req, res) => {
  try {
    const origin = process.env.APP_ORIGIN || `http://${req.headers.host}`;
    const method = req.method || 'GET';
    const init = { method, headers: req.headers };
    if (!['GET', 'HEAD'].includes(method)) { init.body = req; init.duplex = 'half'; }
    const response = await app.fetch(new Request(new URL(req.url, origin), init));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (method === 'HEAD') res.end(); else res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500, { 'content-type': 'text/plain' }); res.end('The request could not be completed.'); }
});
server.listen(port, host, () => console.log(`Double Advanced: http://${host}:${port}`));
// Export one snapshot each Pacific date, even on a day with no visits.
let lastBackupDate = null;
const timer = setInterval(async () => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  if (date === lastBackupDate) return;
  try { await app.backup(); lastBackupDate = date; } catch (error) { console.error('Backup failed:', error); }
}, 60000);
timer.unref();
process.on('SIGTERM', () => server.close(() => { clearInterval(timer); db.close(); }));
