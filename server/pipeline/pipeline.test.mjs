import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractClaims, extractClaimsLocally, MAX_TRANSCRIPT_CHARS, validateTranscript } from './transcript.mjs';
import { rerunCommand, evaluateCommandClaim } from './runner.mjs';
import { gitDiff, detectWeakenedTests, classifyBlastRadius } from './diff.mjs';
import { makeVerdict } from './verdict.mjs';
import { CodexProvider, parseCodexClaims } from './codex.mjs';
import { createClaimExtractor, DEFAULT_PROVIDER } from './providers/index.mjs';
import { verifyFixture } from './fixture.mjs';
import { LocalProvider } from './providers/local-provider.mjs';
const exec = promisify(execFile);

test('extracts executable claims from narration rather than a hardcoded list', () => {
  const result = extractClaimsLocally('I completed the task. Build passed. No breaking changes.\nRan: npm run build');
  assert.equal(result.claims.length, 2);
  assert.equal(result.claims[0].command, 'npm run build');
});

test('handles empty, uncheckable, large, multilingual, and multi-command transcripts explicitly', async () => {
  assert.throws(() => validateTranscript('   '), /Transcript is empty/);
  assert.throws(() => validateTranscript('x'.repeat(MAX_TRANSCRIPT_CHARS + 1)), /Transcript is too large/);
  const uncheckable = await extractClaims({ transcript: 'Thanks, shipped.', provider: new LocalProvider() });
  assert.deepEqual(uncheckable.claims, []);
  const parsed = extractClaimsLocally('构建已完成。\nBuild passed.\nRan: npm run build\nAll tests pass.\nRan: npm test\nTruncated claim: no breaking');
  assert.equal(parsed.claims.length, 2);
  assert.equal(parsed.claims[0].command, 'npm run build');
  assert.equal(parsed.claims[1].command, 'npm test');
});

test('captures true and false outcomes from real process execution', async () => {
  const trueClaim = extractClaimsLocally('Command passed.\nRan: node --version').claims[0];
  const falseClaim = extractClaimsLocally('Command passed.\nRan: node --definitely-not-a-node-option').claims[0];
  const trueEvidence = evaluateCommandClaim(trueClaim, await rerunCommand(trueClaim.command));
  const falseEvidence = evaluateCommandClaim(falseClaim, await rerunCommand(falseClaim.command));
  assert.equal(trueEvidence.status, 'supported');
  assert.equal(falseEvidence.status, 'contradicted');
});

test('captures missing working directories and long commands without hanging', async () => {
  const missingCwd = await rerunCommand('node --version', { cwd: '/private/tmp/receipts-missing-cwd' });
  assert.equal(missingCwd.exitCode, 1);
  assert.match(missingCwd.stderr, /Command could not start: node/);
  assert.equal(evaluateCommandClaim({ id: 'missing', text: 'Build passed', expected: { exitCode: 0 } }, missingCwd).status, 'inconclusive');
  const repo = await mkdtemp(join(tmpdir(), 'receipts-timeout-'));
  await writeFile(join(repo, 'hang.mjs'), 'setInterval(() => {}, 1000);\n');
  const timedOut = await rerunCommand('node hang.mjs', { cwd: repo, timeoutMs: 50 });
  assert.equal(timedOut.timedOut, true);
  assert.equal(evaluateCommandClaim({ id: 'slow', text: 'Tests passed', expected: { exitCode: 0 } }, timedOut).status, 'inconclusive');
});

test('accepts structured claim extraction from Codex stdout', () => {
  const claims = parseCodexClaims('{"claims":[{"id":"claim-a","type":"command_success","text":"Build passed.","expected":{"exitCode":0},"command":"npm run build"}]}', ['npm run build']);
  assert.equal(claims[0].source, 'codex-exec');
  assert.equal(claims[0].command, 'npm run build');
});

test('rejects malformed, unavailable, unauthenticated, and timed-out Codex extraction clearly', async () => {
  assert.throws(() => parseCodexClaims('not-json', []), /did not return a JSON claim list/);
  const unavailable = new CodexProvider({ bin: '/private/tmp/receipts-no-such-codex' });
  await assert.rejects(unavailable.extract({ transcript: 'Build passed.', commands: [] }), /Codex CLI unavailable/);
  const directory = await mkdtemp(join(tmpdir(), 'receipts-fake-codex-'));
  const malformedBin = join(directory, 'malformed');
  const unauthenticatedBin = join(directory, 'unauthenticated');
  const hangingBin = join(directory, 'hanging');
  await writeFile(malformedBin, '#!/bin/sh\nprintf not-json\n');
  await writeFile(unauthenticatedBin, '#!/bin/sh\necho unauthenticated >&2\nexit 1\n');
  await writeFile(hangingBin, '#!/bin/sh\nwhile true; do :; done\n');
  await Promise.all([chmod(malformedBin, 0o755), chmod(unauthenticatedBin, 0o755), chmod(hangingBin, 0o755)]);
  await assert.rejects(new CodexProvider({ bin: malformedBin }).extract({ transcript: 'Build passed.', commands: [] }), /did not return a JSON claim list/);
  await assert.rejects(new CodexProvider({ bin: unauthenticatedBin }).extract({ transcript: 'Build passed.', commands: [] }), /authentication failed/);
  await assert.rejects(new CodexProvider({ bin: hangingBin, timeoutMs: 30 }).extract({ transcript: 'Build passed.', commands: [] }), /timed out after 30ms/);
});

test('uses CodexProvider by default and LocalProvider only when selected', () => {
  assert.equal(DEFAULT_PROVIDER, 'codex');
  assert.equal(createClaimExtractor().id, 'codex');
  assert.equal(createClaimExtractor('local').id, 'local');
});

test('replays frozen demo fixtures with byte-stable evidence', async () => {
  for (const name of ['clean-run', 'lied-test-run', 'blast-radius-run']) {
    const first = await verifyFixture(name);
    const second = await verifyFixture(name);
    const expected = JSON.parse(await (await import('node:fs/promises')).readFile(`fixtures/${name}/expected-verdict.json`, 'utf8'));
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    assert.deepEqual(first, expected);
  }
});

test('flags weakened test logic from an actual git diff', async () => {
  const repo = await mkdtemp(join(tmpdir(), 'receipts-real-diff-'));
  await exec('git', ['init'], { cwd: repo });
  await exec('git', ['config', 'user.email', 'proof@example.test'], { cwd: repo });
  await exec('git', ['config', 'user.name', 'Receipts Proof'], { cwd: repo });
  await writeFile(join(repo, 'checkout.test.js'), "import test from 'node:test';\ntest('tax', () => { assert.equal(total, 3); });\n");
  await exec('git', ['add', '.'], { cwd: repo }); await exec('git', ['commit', '-m', 'baseline'], { cwd: repo });
  await writeFile(join(repo, 'checkout.test.js'), "import test from 'node:test';\ntest.skip('tax', () => { /* assertion removed */ });\nconst command = 'checkout || true';\n");
  const diff = await gitDiff(repo);
  const findings = detectWeakenedTests(diff);
  assert.deepEqual(findings.map((item) => item.type).sort(), ['masked_failure', 'removed_assertion', 'skipped_test']);
  const radius = classifyBlastRadius({ ...diff, files: [...diff.files, { status: 'M', path: 'auth/session.js' }] }, 'Change checkout copy');
  assert.equal(radius.status, 'surprise');
  assert.equal(makeVerdict({ claimEvidence: [], weakenedTests: findings, blastRadius: radius }).verdict, 'FIX');
});

test('handles no repository, empty history, unchanged, binary, renamed, and large diffs', async () => {
  const notRepo = await mkdtemp(join(tmpdir(), 'receipts-not-repo-'));
  await assert.rejects(gitDiff(notRepo), /not a Git repository/);
  const emptyRepo = await mkdtemp(join(tmpdir(), 'receipts-empty-repo-'));
  await exec('git', ['init'], { cwd: emptyRepo });
  const emptyDiff = await gitDiff(emptyRepo);
  assert.deepEqual(emptyDiff.files, []);
  assert.deepEqual(detectWeakenedTests(emptyDiff), []);
  await exec('git', ['config', 'user.email', 'proof@example.test'], { cwd: emptyRepo });
  await exec('git', ['config', 'user.name', 'Receipts Proof'], { cwd: emptyRepo });
  await writeFile(join(emptyRepo, 'asset.bin'), Buffer.from([0, 1, 2, 3]));
  await writeFile(join(emptyRepo, 'old.test.mjs'), 'export const result = true;\n');
  await exec('git', ['add', '.'], { cwd: emptyRepo });
  await exec('git', ['commit', '-m', 'baseline'], { cwd: emptyRepo });
  const unchanged = await gitDiff(emptyRepo);
  assert.equal(unchanged.patch, '');
  await writeFile(join(emptyRepo, 'asset.bin'), Buffer.from([3, 2, 1, 0]));
  await exec('git', ['mv', 'old.test.mjs', 'renamed.test.mjs'], { cwd: emptyRepo });
  const changed = await gitDiff(emptyRepo);
  assert.deepEqual(detectWeakenedTests(changed), []);
  assert.equal(changed.files.some((file) => file.status.startsWith('R')), true);
  const large = classifyBlastRadius({ files: [], patch: '+line\n'.repeat(100_000) }, 'small task');
  assert.equal(large.oversized, true);
  assert.equal(large.changedLines, 100_000);
});

test('documents conservative verdict priority for missing and conflicting evidence', () => {
  assert.equal(makeVerdict({ claimEvidence: [], weakenedTests: [], blastRadius: { status: 'expected' } }).verdict, 'RE-RUN');
  assert.equal(makeVerdict({ claimEvidence: [{ status: 'inconclusive' }], weakenedTests: [], blastRadius: { status: 'expected' } }).verdict, 'RE-RUN');
  assert.equal(makeVerdict({ claimEvidence: [{ status: 'supported' }], weakenedTests: [], blastRadius: { status: 'surprise', sensitivePaths: [{ path: 'auth/session.mjs' }] } }).verdict, 'ESCALATE');
  assert.equal(makeVerdict({ claimEvidence: [{ status: 'contradicted', claim: 'Tests pass' }], weakenedTests: [], blastRadius: { status: 'surprise', sensitivePaths: [{ path: 'auth/session.mjs' }] } }).verdict, 'FIX');
});
