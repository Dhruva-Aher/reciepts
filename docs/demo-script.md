# Three-minute narrated demo

This script is deliberately centered on one verification workflow, not a feature tour. Open with the frozen `lied-test-run` reveal so the contradiction lands immediately; use the recorded live capture later as runtime proof. The fixture is a reproducible weakened-test case, not a claim that Receipts blocks a merge.

## Pace it as a transformation

| Time | Show | Point to make |
| --- | --- | --- |
| 0:00–0:20 | Reproducible FIX fixture receipt | “The agent said tests passed; the test was weakened.” |
| 0:20–0:50 | `test.skip` and removed assertion | “This is executable proof, not a model opinion.” |
| 0:50–1:25 | Problem and distinction | “Receipts verifies the summary, not the code.” |
| 1:25–1:55 | Trust boundary and live capture | “Codex extracts claims; all verification afterward runs locally.” |
| 1:55–2:30 | MERGE and ESCALATE fixtures | “One clean outcome and one narrow review signal.” |
| 2:30–3:00 | Codex collaboration and close | “Trust the receipt.” |

**Judge objection answers:** CI tells you whether a configured workflow passed. Receipts checks whether an agent completion claim is supported by a re-run and repository evidence. It is not a code reviewer, a security scanner, or a CI merge gate. The system making a claim should not be the only system that verifies it.

## 0:00–0:20 — the reveal

Show the input screen, select **Frozen replay · Weakened test**, and keep the transcript visible.

> “The agent says: ‘Checkout tests pass.’ I’m going to check that summary.”

Click **Verify the summary**. Let the verdict reveal play. Pause on `FIX`.

> “FIX BEFORE MERGE. The command did exit zero, but Receipts found a skipped test and a removed assertion. The passing command is not enough evidence to trust the summary.”

## 0:20–0:50 — the receipt


Point to the agent claim, `test.skip`, and removed assertion. Do not rush this beat.

> “This is a receipt, not a confidence score: a claim, the command result, and the repository evidence beside it.”

## 0:50–1:25 — why it is different

> “Coding agents explain. Receipts checks the evidence. This is not code review. CI tells you whether a configured workflow passed. Receipts checks whether an agent’s completion claim is supported by a re-run and repository evidence. Don’t trust the summary. Trust the receipt.”

## 1:25–1:55 — how it works and live proof

Show the README architecture diagram or briefly switch to the repository.

> “At runtime, Codex extracts discrete, checkable claims from the agent transcript using `gpt-5.6-terra via authenticated Codex CLI`. Everything that follows is deterministic: command re-runs capture real exit codes and output; the diff detector finds weakened tests; the blast-radius classifier catches sensitive paths and scope surprises; one verdict engine combines those receipts.”

> “The model is load-bearing because free-form agent narration must become falsifiable assertions. The evidence is deterministic because the merge decision must be inspectable.”

Show the source link for the recorded live capture.

> “The README also includes a real Codex transcript run through this path. That transcript accurately disclosed its skipped test; it proves this is a live pipeline path, while the fixture makes the same evidence type reproducible for judges.”

## 1:55–2:30 — show the boundaries

Show the replay selector and quickly select **Frozen replay · Clean evidence**, then **Frozen replay · Sensitive path changed** if timing permits.

> “There are three frozen cases: a clean MERGE, this FIX, and an ESCALATE for an auth-path surprise. Each has captured transcript input, command evidence, a Git diff, and an expected verdict. Escalation is a narrow review signal—not a security finding. Fixtures make evaluation reproducible; the live capture demonstrates the runtime path.”

## 2:30–3:00 — Codex collaboration and close

> “Codex helped implement the evidence pipeline, refactor direct claim extraction into the `CodexProvider` and `LocalProvider`, harden failure paths, freeze the regression fixtures, and build the evidence-first UI. The human made the scope and trust-boundary decisions. At runtime, GPT-5.6 understands what the agent promised; local evidence determines whether the repository supports it.”

> “Receipts gives reviewers one answer in seconds: can I trust this agent’s PR enough to merge—or do I have a receipt that says otherwise?”

## Recording checklist

- Use a human voiceover; do not use a music-only screencast.
- Show one actual end-to-end fixture run before explaining architecture.
- Keep the video at or under three minutes.
- Do not claim external user adoption or productivity percentages unless independently measured.
