import { extractClaims } from './transcript.mjs';
import { rerunCommand, evaluateCommandClaim } from './runner.mjs';
import { gitDiff, detectWeakenedTests, classifyBlastRadius } from './diff.mjs';
import { makeVerdict } from './verdict.mjs';
import { createClaimExtractor } from './providers/index.mjs';
import { performance } from 'node:perf_hooks';

export async function verifyRun({ transcript, cwd, taskDescription = '', base = 'HEAD', provider, measure = false }) {
  const startedAt = performance.now();
  const claimExtractor = provider && typeof provider.extract === 'function' ? provider : createClaimExtractor(provider);
  const parsed = await extractClaims({ transcript, provider: claimExtractor });
  const extractionMs = performance.now() - startedAt;
  const runnable = parsed.claims.filter((claim) => claim.command && (claim.type === 'tests_pass' || claim.type === 'command_success'));
  const claimEvidence = [];
  for (const claim of runnable) claimEvidence.push(evaluateCommandClaim(claim, await rerunCommand(claim.command, { cwd })));
  for (const claim of parsed.claims.filter((claim) => !runnable.includes(claim))) {
    claimEvidence.push({ claimId: claim.id, kind: 'unsupported_claim', status: 'inconclusive', claim: claim.text, output: 'Receipts does not currently have deterministic evidence for this claim.' });
  }
  const verificationMs = performance.now() - startedAt - extractionMs;
  const diffStartedAt = performance.now();
  const diff = await gitDiff(cwd, base);
  const weakenedTests = detectWeakenedTests(diff);
  const blastRadius = classifyBlastRadius(diff, taskDescription);
  const report = { parsed, claimEvidence, weakenedTests, blastRadius, verdict: makeVerdict({ claimEvidence, weakenedTests, blastRadius }) };
  if (measure) report.timing = { claimExtractionMs: Math.round(extractionMs), commandVerificationMs: Math.round(verificationMs), diffInspectionMs: Math.round(performance.now() - diffStartedAt), totalMs: Math.round(performance.now() - startedAt) };
  return report;
}
