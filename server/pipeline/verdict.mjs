export function makeVerdict({ claimEvidence, weakenedTests, blastRadius }) {
  const contradictions = claimEvidence.filter((item) => item.status === 'contradicted');
  const inconclusive = claimEvidence.filter((item) => item.status === 'inconclusive');
  if (contradictions.length || weakenedTests.length) return { verdict: 'FIX', reason: contradictions[0]?.claim || weakenedTests[0]?.type, evidenceCount: claimEvidence.length + weakenedTests.length };
  if (blastRadius.status === 'surprise') return { verdict: 'ESCALATE', reason: blastRadius.sensitivePaths[0]?.path || `${blastRadius.changedLines} changed lines`, evidenceCount: claimEvidence.length + 1 };
  if (inconclusive.length) return { verdict: 'RE-RUN', reason: 'A referenced command could not be completed.', evidenceCount: claimEvidence.length };
  if (!claimEvidence.length) return { verdict: 'RE-RUN', reason: 'No executable claims were found.', evidenceCount: 0 };
  return { verdict: 'MERGE', reason: 'Every executable claim was supported by its re-run.', evidenceCount: claimEvidence.length };
}
