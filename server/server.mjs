import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifyRun } from './pipeline/index.mjs';
import { verifyFixture } from './pipeline/fixture.mjs';
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(body)); };
const historyFile = join(process.cwd(), '.receipts', 'history.json');
async function readHistory() { try { return JSON.parse(await readFile(historyFile, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } }
async function remember(report) {
  const history = await readHistory();
  const entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), verdict: report.verdict.verdict, claims: report.parsed.claims.length, evidence: report.verdict.evidenceCount };
  await mkdir(join(process.cwd(), '.receipts'), { recursive: true });
  const temp = `${historyFile}.tmp`;
  await writeFile(temp, JSON.stringify([entry, ...history].slice(0, 20), null, 2));
  await rename(temp, historyFile);
  return entry;
}
createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/history') return send(res, 200, { reports: await readHistory() });
  if (req.method !== 'POST' || req.url !== '/verify') return send(res, 404, { error: 'POST /verify' });
  let raw = ''; for await (const chunk of req) raw += chunk;
  try {
    const { transcript, repoPath, taskDescription, base, fixture } = JSON.parse(raw);
    const report = fixture ? await verifyFixture(fixture) : await verifyRun({ transcript, cwd: repoPath || process.cwd(), taskDescription, base });
    let history = null;
    try { history = await remember(report); }
    catch (historyError) { console.warn(`Receipts history could not be saved: ${historyError.message}`); }
    send(res, 200, { ...report, history });
  }
  catch (error) { send(res, 400, { error: error.message }); }
}).listen(8787, () => console.log('Receipts evidence API listening on http://localhost:8787'));
