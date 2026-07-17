import { spawn } from 'node:child_process';

const forbidden = /(?:^|\s)(?:rm|sudo|curl|wget|ssh|scp|git\s+push)\b|[;&|><`$()]/i;
const allowed = /^(?:npm|pnpm|yarn|bun|node|pytest|python(?:3)?|go|cargo|make)\b/;

export function validateCommand(command) {
  if (!command || !allowed.test(command) || forbidden.test(command)) throw new Error(`Unsafe or unsupported command: ${command || '(missing)'}`);
}

export async function rerunCommand(command, { cwd, timeoutMs = 30_000 } = {}) {
  validateCommand(command);
  return new Promise((resolve) => {
    const child = spawn(command.split(/\s+/)[0], command.split(/\s+/).slice(1), { cwd, env: { ...process.env, CI: '1', NO_COLOR: '1' }, shell: false });
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (exitCode, signal) => { clearTimeout(timer); resolve({ command, exitCode: exitCode ?? 1, signal, timedOut, stdout, stderr, ranAt: new Date().toISOString() }); });
    child.on('error', (error) => { clearTimeout(timer); resolve({ command, exitCode: 1, timedOut: false, couldNotStart: true, stdout, stderr: `${stderr}Command could not start: ${command.split(/\s+/)[0]} (${error.code || error.message})`, ranAt: new Date().toISOString() }); });
  });
}

export function evaluateCommandClaim(claim, run) {
  const actual = { exitCode: run.exitCode, timedOut: run.timedOut, couldNotStart: Boolean(run.couldNotStart) };
  if (run.timedOut || run.couldNotStart) return { claimId: claim.id, kind: 'claim_vs_reality', status: 'inconclusive', claim: claim.text, command: run.command, actual, output: `${run.stdout}\n${run.stderr}`.trim() };
  const passed = !run.timedOut && run.exitCode === (claim.expected?.exitCode ?? 0);
  return { claimId: claim.id, kind: 'claim_vs_reality', status: passed ? 'supported' : 'contradicted', claim: claim.text, command: run.command, actual, output: `${run.stdout}\n${run.stderr}`.trim() };
}
