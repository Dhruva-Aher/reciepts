import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const testPath = /(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|\.|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const sensitivePath = /(?:^|\/)(auth|billing|migrations?|secrets?|infra|\.github\/workflows)(?:\/|$)|(?:docker|terraform|kubernetes|deploy)/i;

export async function gitDiff(cwd, base = 'HEAD') {
  const isRepository = await exec('git', ['rev-parse', '--is-inside-work-tree'], { cwd }).then(({ stdout }) => stdout.trim() === 'true').catch(() => false);
  if (!isRepository) throw new Error(`Git diff unavailable: ${cwd} is not a Git repository.`);
  const hasHead = await exec('git', ['rev-parse', '--verify', 'HEAD'], { cwd }).then(() => true).catch(() => false);
  const hasBase = await exec('git', ['rev-parse', '--verify', base], { cwd }).then(() => true).catch(() => false);
  if (hasHead && !hasBase) throw new Error(`Git base ${base} does not exist.`);
  if (!hasBase) {
    const { stdout } = await exec('git', ['ls-files', '--others', '--exclude-standard'], { cwd });
    const paths = stdout.split('\n').filter(Boolean);
    const patches = await Promise.all(paths.map((path) => exec('git', ['diff', '--no-index', '--unified=0', '/dev/null', path], { cwd }).then((r) => r.stdout).catch((error) => error.stdout || '')));
    return { files: paths.map((path) => ({ status: 'A', path })), patch: patches.join('\n'), stat: '' };
  }
  const [{ stdout: nameStatus }, { stdout: patch }, { stdout: stat }] = await Promise.all([
    exec('git', ['diff', '--name-status', base], { cwd }),
    exec('git', ['diff', '--unified=0', base], { cwd }),
    exec('git', ['diff', '--stat', base], { cwd }).catch(() => ({ stdout: '' }))
  ]);
  const files = nameStatus.split('\n').filter(Boolean).map((line) => { const [status, ...parts] = line.split('\t'); return { status, path: parts.at(-1) }; });
  return { files, patch, stat };
}

export function detectWeakenedTests(diff) {
  const findings = [];
  let currentFile = '';
  for (const line of diff.patch.split('\n')) {
    if (line.startsWith('+++ b/')) currentFile = line.slice(6);
    if (!testPath.test(currentFile)) continue;
    if (/^\+\s*(?:test|it|describe|suite)\.(?:skip|only)\s*\(/i.test(line)) findings.push({ type: 'skipped_test', file: currentFile, line, severity: 'high' });
    if (/^\+\s*(?!.*writeFile)[^\n]*\|\|\s*true\b/.test(line)) findings.push({ type: 'masked_failure', file: currentFile, line, severity: 'high' });
    if (line.startsWith('-') && !line.startsWith('---') && /\b(expect|assert|should\.|toEqual|toBe|toThrow)\b/i.test(line)) findings.push({ type: 'removed_assertion', file: currentFile, line, severity: 'medium' });
  }
  return findings;
}

export function classifyBlastRadius(diff, taskDescription = '') {
  const sensitive = diff.files.filter((file) => sensitivePath.test(file.path));
  const changedLines = (diff.patch.match(/^[+-](?![+-])/gm) || []).length;
  const taskWords = taskDescription.trim().split(/\s+/).filter(Boolean).length;
  const threshold = Math.max(80, taskWords * 7);
  return { sensitivePaths: sensitive, changedLines, taskWords, threshold, oversized: changedLines > threshold, status: sensitive.length || changedLines > threshold ? 'surprise' : 'expected' };
}
