import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { commandsFromTranscript } from './transcript.mjs';
import { detectWeakenedTests, classifyBlastRadius } from './diff.mjs';
import { makeVerdict } from './verdict.mjs';

const fixtureRoot = resolve(process.cwd(), 'fixtures');

function fixturePath(name) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Fixture name must contain only lowercase letters, numbers, and hyphens.');
  return join(fixtureRoot, name);
}

function filesFromSnapshot(text) {
  return text.split('\n').filter(Boolean).map((line) => {
    const [status, path] = line.split('\t');
    return { status, path };
  });
}

/** Replays a frozen fixture without consulting the live repository or runner. */
export async function verifyFixture(name) {
  const directory = fixturePath(name);
  const [transcript, patch, fileList, configText, expectedText] = await Promise.all([
    readFile(join(directory, 'transcript.txt'), 'utf8'),
    readFile(join(directory, 'diff.patch'), 'utf8'),
    readFile(join(directory, 'diff-files.txt'), 'utf8'),
    readFile(join(directory, 'fixture.json'), 'utf8'),
    readFile(join(directory, 'expected-verdict.json'), 'utf8')
  ]);
  const config = JSON.parse(configText);
  const expected = JSON.parse(expectedText);
  const diff = { files: filesFromSnapshot(fileList), patch };
  const weakenedTests = detectWeakenedTests(diff);
  const blastRadius = classifyBlastRadius(diff, config.taskDescription);
  const parsed = { ...expected.parsed, commands: commandsFromTranscript(transcript) };
  const claimEvidence = expected.claimEvidence;
  const verdict = makeVerdict({ claimEvidence, weakenedTests, blastRadius });
  const report = { parsed, claimEvidence, weakenedTests, blastRadius, verdict, replay: { capturedAt: config.capturedAt || 'Unknown' } };
  Object.defineProperty(report, 'evidenceDiff', { value: patch, enumerable: false });
  return report;
}
