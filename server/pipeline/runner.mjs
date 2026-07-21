import { spawn } from 'node:child_process';

const forbidden = /[;&|><`$()'"\\]/;
const MAX_OUTPUT_BYTES = 64 * 1024;
const packageManagers = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const packageScripts = new Set(['test', 'build', 'typecheck', 'compile', 'check', 'lint']);
const simpleArgument = /^[\w./:=@+-]+$/;

function isSupportedCommand(parts) {
  const [bin, ...args] = parts;
  if (packageManagers.has(bin)) {
    const script = args[0] === 'run' ? args[1] : args[0];
    const rest = args[0] === 'run' ? args.slice(2) : args.slice(1);
    return packageScripts.has(script) && rest.every((arg) => simpleArgument.test(arg));
  }
  if (bin === 'node') return (args[0] === '--version' && args.length === 1) || (args[0] === '--test' && args.slice(1).every((arg) => simpleArgument.test(arg)));
  if (bin === 'pytest') return args.every((arg) => simpleArgument.test(arg));
  if ((bin === 'python' || bin === 'python3') && args[0] === '-m' && args[1] === 'pytest') return args.slice(2).every((arg) => simpleArgument.test(arg));
  if (bin === 'go') return args[0] === 'test' && args.slice(1).every((arg) => simpleArgument.test(arg));
  if (bin === 'cargo') return args[0] === 'test' && args.slice(1).every((arg) => simpleArgument.test(arg));
  return bin === 'make' && packageScripts.has(args[0]) && args.length === 1;
}

export function validateCommand(command) {
  if (!command || forbidden.test(command) || !isSupportedCommand(command.trim().split(/\s+/))) throw new Error(`Unsupported verification command: ${command || '(missing)'}`);
}

export async function rerunCommand(command, { cwd, timeoutMs = 30_000 } = {}) {
  validateCommand(command);
  return new Promise((resolve) => {
    const child = spawn(command.split(/\s+/)[0], command.split(/\s+/).slice(1), { cwd, env: { ...process.env, CI: '1', NO_COLOR: '1' }, shell: false });
    let stdout = '', stderr = '', timedOut = false, outputTruncated = false;
    const appendOutput = (current, chunk) => {
      const remaining = MAX_OUTPUT_BYTES - Buffer.byteLength(stdout) - Buffer.byteLength(stderr);
      if (remaining <= 0) { outputTruncated = true; return current; }
      const text = chunk.toString();
      if (Buffer.byteLength(text) > remaining) { outputTruncated = true; return current + text.slice(0, remaining); }
      return current + text;
    };
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout = appendOutput(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = appendOutput(stderr, chunk); });
    child.on('close', (exitCode, signal) => { clearTimeout(timer); resolve({ command, exitCode: exitCode ?? 1, signal, timedOut, stdout, stderr, outputTruncated, ranAt: new Date().toISOString() }); });
    child.on('error', (error) => { clearTimeout(timer); resolve({ command, exitCode: 1, timedOut: false, couldNotStart: true, stdout, stderr: `${stderr}Command could not start: ${command.split(/\s+/)[0]} (${error.code || error.message})`, outputTruncated, ranAt: new Date().toISOString() }); });
  });
}

export function evaluateCommandClaim(claim, run) {
  const actual = { exitCode: run.exitCode, timedOut: run.timedOut, couldNotStart: Boolean(run.couldNotStart), outputTruncated: Boolean(run.outputTruncated) };
  if (run.timedOut || run.couldNotStart) return { claimId: claim.id, kind: 'claim_vs_reality', status: 'inconclusive', claim: claim.text, command: run.command, actual, output: `${run.stdout}\n${run.stderr}`.trim() };
  const passed = !run.timedOut && run.exitCode === (claim.expected?.exitCode ?? 0);
  return { claimId: claim.id, kind: 'claim_vs_reality', status: passed ? 'supported' : 'contradicted', claim: claim.text, command: run.command, actual, output: `${run.stdout}\n${run.stderr}`.trim() };
}
