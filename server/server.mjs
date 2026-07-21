import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { verifyRun } from './pipeline/index.mjs';
import { verifyFixture } from './pipeline/fixture.mjs';
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const MAX_REQUEST_BODY_BYTES = 128 * 1024;
const MAX_HISTORY_ENTRIES = 200;
const MAX_STORED_DIFF_BYTES = 96 * 1024;
const workspacePath = process.cwd();
const historyFile = join(process.cwd(), '.receipts', 'history.json');
let historyWrite = Promise.resolve();
let verificationInProgress = false;
const exec = promisify(execFile);
async function readHistory() { try { const history = JSON.parse(await readFile(historyFile, 'utf8')); return Array.isArray(history) ? history : []; } catch (error) { if (error.code === 'ENOENT') return []; throw error; } }
async function repositoryContext() {
  const branch = await exec('git', ['branch', '--show-current'], { cwd: workspacePath }).then(({ stdout }) => stdout.trim() || 'detached HEAD').catch(() => 'unknown branch');
  return { repo: workspacePath.split('/').at(-1) || 'configured repository', branch };
}
function claimKind(report) {
  const claim = report.parsed?.claims?.[0];
  if (claim?.type === 'tests_pass') return 'test claim';
  if (report.blastRadius?.sensitivePaths?.length) return 'sensitive-path claim';
  return 'command claim';
}
function storedReport(report) {
  return { ...report, evidenceDiff: (report.evidenceDiff || '').slice(0, MAX_STORED_DIFF_BYTES) };
}
async function remember(report) {
  const write = historyWrite.catch(() => {}).then(async () => {
    const history = await readHistory();
    const context = await repositoryContext();
    const entry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      verdict: report.verdict.verdict,
      claims: report.parsed.claims.length,
      evidence: report.verdict.evidenceCount,
      claim: report.parsed?.claims?.[0]?.text || 'No executable claim was extracted.',
      claimKind: claimKind(report),
      agent: report.replay ? 'Captured coding agent' : 'Configured coding agent',
      ...context,
      hasSensitivePath: Boolean(report.blastRadius?.sensitivePaths?.length),
      report: storedReport(report)
    };
    await mkdir(join(process.cwd(), '.receipts'), { recursive: true });
    const temp = `${historyFile}.${crypto.randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify([entry, ...history].slice(0, MAX_HISTORY_ENTRIES), null, 2));
    await rename(temp, historyFile);
    return entry;
  });
  historyWrite = write;
  return write;
}
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8787');
  if (req.method === 'GET' && url.pathname === '/history') return send(res, 200, { reports: await readHistory() });
  if (req.method === 'GET' && url.pathname.startsWith('/history/')) {
    const id = decodeURIComponent(url.pathname.slice('/history/'.length));
    const receipt = (await readHistory()).find((entry) => entry.id === id);
    if (!receipt?.report) return send(res, 404, { error: 'This receipt is unavailable. It may have been created before receipt snapshots were retained.' });
    return send(res, 200, { receipt, report: receipt.report });
  }
  if (req.method !== 'POST' || url.pathname !== '/verify') return send(res, 404, { error: 'POST /verify' });
  if (verificationInProgress) return send(res, 429, { error: 'A verification is already running. Wait for it to finish, then try again.' });
  verificationInProgress = true;
  try {
    let raw = ''; let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_REQUEST_BODY_BYTES) { const error = new Error(`Request body is too large. Maximum supported size is ${MAX_REQUEST_BODY_BYTES} bytes.`); error.statusCode = 413; throw error; }
      raw += chunk;
    }
    const { transcript, repoPath, taskDescription, base, fixture } = JSON.parse(raw);
    if (repoPath && resolve(repoPath) !== workspacePath) throw new Error('External repository paths are not allowed. Receipts verifies its configured workspace only.');
    const report = fixture ? await verifyFixture(fixture) : await verifyRun({ transcript, cwd: workspacePath, taskDescription, base });
    let history = null;
    try { history = await remember(report); }
    catch (historyError) { console.warn(`Receipts history could not be saved: ${historyError.message}`); }
    send(res, 200, { ...storedReport(report), history });
  }
  catch (error) { send(res, error.statusCode || 400, { error: error.message }); }
  finally { verificationInProgress = false; }
}).listen(8787, '127.0.0.1', () => console.log('Receipts evidence API listening on http://127.0.0.1:8787'));
