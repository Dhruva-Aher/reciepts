# Three-minute narrated demo

This script is deliberately centered on one live workflow, not a feature tour. Record with the frozen `lied-test-run` fixture so the evidence remains reproducible.

## Pace it as a transformation

| Time | Show | Point to make |
| --- | --- | --- |
| 0:00–0:15 | “Checkout tests pass” | “The agent looks finished. I’m about to trust it.” |
| 0:15–0:40 | Receipts receipt reveals | “Do not merge: the test command ran, but test integrity was weakened.” |
| 0:40–1:20 | `test.skip` and removed assertion | “This is executable proof, not a model opinion.” |
| 1:20–2:00 | Trust boundary | “Codex extracts claims; all verification afterward runs locally.” |
| 2:00–2:40 | Blast-radius fixture | “Escalation is a deliberately narrow heuristic for sensitive paths and scope surprises, not a security proof.” |
| 2:40–3:00 | Closing screen | “Every autonomous coding agent will eventually need an independent verifier.” |

**Judge objection answers:** CI tells you whether tests passed. Receipts tells you whether the agent’s summary truthfully represents what it did. The system making a claim should not be the only system that verifies it.

## 0:00–0:25 — problem and insight

> “Coding agents now finish pull requests with confident summaries: ‘tests pass, no breaking changes.’ The reviewer either trusts that summary or manually repeats the agent’s work. Receipts is for that reviewer. Don’t trust the summary. Trust the receipt.”

Show the input screen, select **Fixture · lied test run**, and keep the transcript visible.

## 0:25–1:10 — the wow moment

> “This agent says checkout tests pass. I’ll check the run.”

Click **Check this run**. Let the verdict reveal play. Pause on `FIX`.

> “Receipts did not generate a confidence score. It re-ran the claimed command and inspected the frozen test diff. The test command exits successfully—but the test was skipped, and an assertion was deleted. That is why this is a FIX.”

Point to the struck-through claim, `test.skip`, and removed assertion. Do not rush this beat.

## 1:10–1:55 — how it works

Show the README architecture diagram or briefly switch to the repository.

> “At runtime, Codex extracts discrete, checkable claims from the agent transcript using `gpt-5.6-terra via authenticated Codex CLI`. Everything that follows is deterministic: command re-runs capture real exit codes and output; the diff detector finds weakened tests; the blast-radius classifier catches sensitive paths and scope surprises; one verdict engine combines those receipts.”

> “The model is load-bearing because free-form agent narration must become falsifiable assertions. The evidence is deterministic because the merge decision must be inspectable.”

## 1:55–2:30 — prove it is a product, not a demo trick

Show the fixture selector and quickly select `clean run`, then `blast radius run` if timing permits.

> “There are three frozen cases: a clean MERGE, this FIX, and an ESCALATE for an auth-path surprise. Every fixture contains a real Codex-generated transcript, a captured Git diff, command evidence, and an expected verdict. The regression suite replays each twice with byte-stable output.”

## 2:30–3:00 — Codex collaboration and close

> “Codex accelerated the whole lifecycle: planning the verdict schema, implementing the evidence layers, debugging empty-history and diff-detection edge cases, creating frozen regression fixtures, refactoring claim extraction into Codex and Local providers, and documenting the final product. The human made the trust boundary and product decisions; Codex made the workflow faster to build and test.”

> “Receipts gives reviewers one answer in seconds: can I trust this agent’s PR enough to merge—or do I have a receipt that says otherwise?”

## Recording checklist

- Use a human voiceover; do not use a music-only screencast.
- Show one actual end-to-end fixture run before explaining architecture.
- Keep the video at or under three minutes.
- Do not claim external user adoption or productivity percentages unless independently measured.
