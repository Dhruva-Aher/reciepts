const COMMAND_LINE = /(?:^|\n)\s*(?:Ran|Command|Executed)\s*:\s*`?([^`\n]+)`?/gim;
const INLINE_COMMAND = /`((?:pnpm|npm|yarn|bun|node|pytest|python|go|cargo|make)\b[^`]*)`/g;
export const MAX_TRANSCRIPT_CHARS = 120_000;

export function validateTranscript(transcript) {
  if (typeof transcript !== 'string' || !transcript.trim()) throw new Error('Transcript is empty. Paste the agent’s final message and referenced commands.');
  if (transcript.length > MAX_TRANSCRIPT_CHARS) throw new Error(`Transcript is too large (${transcript.length} characters). Maximum supported size is ${MAX_TRANSCRIPT_CHARS} characters.`);
}

export function commandsFromTranscript(transcript) {
  const commands = new Set();
  for (const match of transcript.matchAll(COMMAND_LINE)) commands.add(match[1].trim());
  for (const match of transcript.matchAll(INLINE_COMMAND)) commands.add(match[1].trim());
  return [...commands];
}

function nearestCommand(commands, kind) {
  const test = commands.find((command) => /\b(test|pytest|vitest|jest|mocha)\b/i.test(command));
  const build = commands.find((command) => /\b(build|compile|typecheck)\b/i.test(command));
  return kind === 'tests' ? test : kind === 'build' ? build : undefined;
}

/**
 * Converts free-form agent narration into falsifiable claims. This is the
 * deterministic implementation used by LocalProvider.
 */
export function extractClaimsLocally(transcript) {
  const commands = commandsFromTranscript(transcript);
  const claims = [];
  const lines = transcript.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const normalized = line.toLowerCase();
    const count = line.match(/(?:all\s+)?(\d+)\s*(?:\/\s*(\d+)\s*)?tests?\s+(?:pass|passed|passing)/i);
    if (count || /\b(all )?tests? (pass|passed|passing)\b/i.test(line)) {
      claims.push({ id: `claim-${claims.length + 1}`, type: 'tests_pass', text: line, expected: count ? { passed: Number(count[1]), total: Number(count[2] || count[1]) } : { exitCode: 0 }, command: nearestCommand(commands, 'tests'), source: 'local-parser' });
    }
    if (/\b(build|compile|typecheck|command)\b.*\b(pass|passed|success|succeed)/i.test(line)) {
      claims.push({ id: `claim-${claims.length + 1}`, type: 'command_success', text: line, expected: { exitCode: 0 }, command: nearestCommand(commands, 'build') || commands[0], source: 'local-parser' });
    }
    if (/\b(no|without|zero)\b.*\b(breaking changes?|breaking change|api changes?)\b/i.test(normalized)) {
      claims.push({ id: `claim-${claims.length + 1}`, type: 'no_breaking_change', text: line, expected: { sensitiveChanges: false }, source: 'local-parser' });
    }
  }
  return { commands, claims };
}

export async function extractClaims({ transcript, provider }) {
  validateTranscript(transcript);
  const local = extractClaimsLocally(transcript);
  const claims = await provider.extract({ transcript, commands: local.commands });
  return { commands: local.commands, claims, extraction: provider.id };
}
