# OpenAI Build Week submission checklist

## Stage-one gate

- [x] Developer Tools track: Receipts verifies autonomous coding-agent claims before merge.
- [x] Working, runnable project with a React UI and server-side evidence pipeline.
- [x] Codex is used in product runtime through `CodexProvider`.
- [x] The exact observed runtime identifier is `gpt-5.6-terra via authenticated Codex CLI`.
- [x] README includes setup, frozen sample data, and a testing path.
- [x] README opens with a 20-second real Codex-to-FIX capture and links the captured source transcript; its copy accurately states that the source agent reported the skip.
- [x] README documents supported platforms and a no-rebuild frozen-fixture path for judges.
- [ ] Run `/feedback` in the primary Codex build session and record the returned session ID in the Devpost submission. Do not substitute a diagnostic-session ID.

## Required submission artifacts

- [ ] Public YouTube video at or below three minutes, with a human voiceover.
- [ ] Video covers: what Receipts does, the real `FIX` workflow, how Codex was used to build it, and how `gpt-5.6-terra via authenticated Codex CLI` is load-bearing at runtime.
- [ ] Repository visibility matches the event’s submission requirement.
- [x] README includes setup, sample fixtures, testing path, architecture, screenshot, and Codex collaboration narrative.

## Judge-facing final pass

- [ ] Open the submitted video with the recorded real Codex-to-FIX capture in the first 20 seconds, then replay the frozen FIX fixture for judges.
- [ ] Verify the fixture dropdown works from a clean install.
- [ ] Run `npm run test:pipeline` and `npm run build` immediately before submitting.
- [ ] Confirm all impact statements remain limited to demonstrated behavior; no unmeasured productivity claims.
