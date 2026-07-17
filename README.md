# Receipts

Coding agents frequently finish with “all tests pass” and “no breaking changes.” A developer must either trust that summary or spend time re-running commands and inspecting the diff by hand.

> **Don’t trust the summary. Trust the receipt.**

Receipts turns an agent’s own narration into checkable claims, re-runs the referenced command, inspects the test diff and blast radius, then returns one merge decision backed by the evidence that earned it.

![A frozen lied-test demo: an agent's “Checkout tests pass” claim is struck through beside the captured test.skip and removed assertion evidence.](assets/lied-test-run-fix.png)

## Architecture

```mermaid
flowchart LR
    T["Agent transcript"] --> C["CodexProvider\n`gpt-5.6-terra via authenticated Codex CLI`"]
    C --> CL["Discrete, checkable claims"]
    CL --> R["Command re-run\nexit code + stdout/stderr"]
    D["Git diff"] --> W["Weakened test detector\nskip / removed assertion / || true"]
    D --> B["Blast-radius classifier\nsensitive paths + diff size"]
    R --> V["Deterministic verdict engine"]
    W --> V
    B --> V
    V --> U["React verdict UI\nMERGE / FIX / RE-RUN / ESCALATE"]
```

Codex is essential at the interpretation boundary: free-form agent narration must become discrete, falsifiable claims. The command runner, diff checks, and verdict engine are deterministic so every decision has a concrete receipt.

## Setup

Prerequisites: Node.js and an authenticated Codex CLI session. The default provider invokes `codex exec` non-interactively; no `OPENAI_API_KEY` is required.

```bash
npm install
npm run evidence:server
```

In another terminal:

```bash
npm run dev
```

Open the Vite URL, choose a frozen fixture, and select **Check this run**.

## The demo moment

Run the deterministic cases without reading the current working tree:

```bash
npm run evidence -- --fixture=clean-run
npm run evidence -- --fixture=lied-test-run
npm run evidence -- --fixture=blast-radius-run
```

The lied-test case is the shortest demo: the agent says checkout tests pass; Receipts returns `FIX` because the frozen diff contains `test.skip` and a deleted assertion.

## Impact and verification

Receipts eliminates the manual step of re-running an agent-claimed command and separately inspecting its test diff by hand. Each frozen fixture contains one captured executable claim, its captured command evidence, a frozen Git diff, and its expected verdict:

| Fixture | Captured claim | Verdict | Deterministic evidence |
| --- | --- | --- | --- |
| `clean-run` | `npm test` passes | `MERGE` | Command exited successfully; no weakened tests or blast-radius surprise. |
| `lied-test-run` | Checkout tests pass | `FIX` | `test.skip` plus a removed assertion in the captured diff. |
| `blast-radius-run` | Confirmation-email tests pass | `ESCALATE` | Captured diff touches `auth/session.mjs`. |

```bash
npm run test:pipeline
npm run build
```

The fixture test replays all three reports twice and asserts byte-stable evidence output, so demo behavior does not depend on the repository’s current `HEAD` or working tree.

## Claim-extraction providers

Claim extraction is a pluggable boundary. Everything after it—the command runner, test-weakeness detector, blast-radius classifier, and verdict engine—is provider-independent.

- **`CodexProvider` (default):** runs `codex exec` using **`gpt-5.6-terra via authenticated Codex CLI`**. This identifier was observed in the local Codex rollout session at `~/.codex/sessions/2026/07/17/rollout-2026-07-17T18-25-07-019f7025-1876-7bd1-a6e7-dae015c1333d.jsonl` as `"model":"gpt-5.6-terra"`.
- **`LocalProvider`:** deterministic transcript parsing for fast offline development and automated tests. It is opt-in, never the default.
- **`OpenAIProvider`:** documented extension point for a future direct API integration. It deliberately has no API client or runtime dependency today.

```bash
# Default: authenticated Codex CLI
npm run evidence -- proofs/current-codex-run.txt "$PWD" "Implement an evidence pipeline"

# Explicit local deterministic provider
npm run evidence -- proofs/current-codex-run.txt "$PWD" "Implement an evidence pipeline" --provider=local
```

`RECEIPTS_CLAIM_PROVIDER=local` is the equivalent server-side override.

## How Codex accelerated this project

This was iterative development, not one-shot generation.

1. **Planning:** Codex helped reduce the problem to one user decision—merge, fix, re-run, or escalate—and separated model interpretation from deterministic evidence.
2. **Implementation:** the initial transcript parser, command re-runner, test-diff detector, blast-radius classifier, and verdict engine were built as independently testable layers.
3. **Debugging:** Codex exposed real edge cases: an empty Git history, test-like strings inside fixture-generator source, and the need to safely isolate the claim-extraction subprocess from repository data.
4. **Testing:** Codex generated and exercised actual isolated Git repositories, real `codex exec` transcripts, and frozen reports for `MERGE`, `FIX`, and `ESCALATE`. The fixture system became the regression guard for the demo.
5. **Refactoring:** Codex helped move claim extraction behind `ClaimExtractor`, preserving `CodexProvider` as the live default while making `LocalProvider` explicit and leaving `OpenAIProvider` as a safe future extension point.
6. **Documentation:** Codex captured the real `FIX` reveal, recorded the observed provider model identifier, and turned the architecture and reproducible fixtures into this handoff.

## Repository map

```text
src/                         React/Tailwind/Framer Motion verdict UI
server/pipeline/             deterministic evidence pipeline and providers
fixtures/                    frozen transcript, diff, evidence, and verdict demos
assets/lied-test-run-fix.png captured FIX contradiction screenshot
```
