# Three-minute narrated demo

This script is deliberately centered on one verification workflow, not a feature tour. Open with the recorded live capture, then use the frozen `lied-test-run` fixture for a reproducible judge-facing replay. The live source transcript accurately records that the test was skipped; do not describe it as a concealed lie.

## Pace it as a transformation

| Time | Show | Point to make |
| --- | --- | --- |
| 0:00–0:15 | Recorded live Codex-to-FIX capture | “This is a real agent transcript and a real local re-run.” |
| 0:15–0:40 | Reproducible FIX fixture receipt | “The command ran, but test integrity was weakened.” |
| 0:40–1:20 | `test.skip` and removed assertion | “This is executable proof, not a model opinion.” |
| 1:20–2:00 | Trust boundary | “Codex extracts claims; all verification afterward runs locally.” |
| 2:00–2:40 | Blast-radius fixture | “Escalation is a deliberately narrow heuristic for sensitive paths and scope surprises, not a security proof.” |
| 2:40–3:00 | Closing screen | “Every autonomous coding agent will eventually need an independent verifier.” |

**Judge objection answers:** CI tells you whether a configured workflow passed. Receipts checks whether an agent completion claim is supported by a re-run and repository evidence. It is not a code reviewer, a security scanner, or a CI merge gate. The system making a claim should not be the only system that verifies it.

## 0:00–0:25 — problem and live proof

> “Coding agents finish with summaries. A reviewer either trusts that summary or manually repeats the work. Receipts is for the moment between those two choices.”

Play the first seconds of the recorded live capture. Keep the source transcript and its reported skipped test visible.

> “This is a real Codex transcript. The agent accurately reports an exit-zero test command and one skipped test. Receipts re-runs that command and inspects the real Git diff; it finds the skipped test plus a removed assertion and produces FIX. This is a live pipeline run—not a staged success state.”

## 0:25–1:10 — the wow moment

Switch to the app, select **Fixture · lied test run**, and say:

> “Now I’ll replay the same supported evidence type from the frozen judge fixture: this agent says checkout tests pass.”

Click **Check this run**. Let the verdict reveal play. Pause on `FIX`.

> “Receipts did not generate a confidence score. It re-ran the claimed command and inspected the frozen test diff. The test command exits successfully—but the test was skipped, and an assertion was deleted. That is why this is a FIX.”

Point to the struck-through claim, `test.skip`, and removed assertion. Do not rush this beat.

## 1:10–1:55 — how it works

Show the README architecture diagram or briefly switch to the repository.

> “At runtime, Codex extracts discrete, checkable claims from the agent transcript using `gpt-5.6-terra via authenticated Codex CLI`. Everything that follows is deterministic: command re-runs capture real exit codes and output; the diff detector finds weakened tests; the blast-radius classifier catches sensitive paths and scope surprises; one verdict engine combines those receipts.”

> “The model is load-bearing because free-form agent narration must become falsifiable assertions. The evidence is deterministic because the merge decision must be inspectable.”

## 1:55–2:30 — prove it is a product, not a demo trick

Show the fixture selector and quickly select `clean run`, then `blast radius run` if timing permits.

> “There are three frozen cases: a clean MERGE, this FIX, and an ESCALATE for an auth-path surprise. Each has captured transcript input, command evidence, a Git diff, and an expected verdict. The regression suite replays each twice with byte-stable output. Fixtures make evaluation reproducible; the live capture demonstrates the runtime path.”

## 2:30–3:00 — Codex collaboration and close

> “Codex helped implement the evidence pipeline, refactor direct claim extraction into the `CodexProvider` and `LocalProvider`, harden failure paths, freeze the regression fixtures, and build the evidence-first UI. The human made the scope and trust-boundary decisions. At runtime, GPT-5.6 understands what the agent promised; local evidence determines whether the repository supports it.”

> “Receipts gives reviewers one answer in seconds: can I trust this agent’s PR enough to merge—or do I have a receipt that says otherwise?”

## Recording checklist

- Use a human voiceover; do not use a music-only screencast.
- Show one actual end-to-end fixture run before explaining architecture.
- Keep the video at or under three minutes.
- Do not claim external user adoption or productivity percentages unless independently measured.
