import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import currentCodexRun from '../proofs/current-codex-run.txt?raw';
import cleanRun from '../fixtures/clean-run/transcript.txt?raw';
import liedTestRun from '../fixtures/lied-test-run/transcript.txt?raw';
import blastRadiusRun from '../fixtures/blast-radius-run/transcript.txt?raw';
import './styles.css';

const API_URL = import.meta.env.VITE_RECEIPTS_API_URL || '/verify';
const REQUEST_TIMEOUT_MS = 95_000;
const samples = [
  { label: 'Frozen replay · Weakened test', transcript: liedTestRun, fixture: 'lied-test-run' },
  { label: 'Frozen replay · Clean evidence', transcript: cleanRun, fixture: 'clean-run' },
  { label: 'Frozen replay · Sensitive path changed', transcript: blastRadiusRun, fixture: 'blast-radius-run' },
  { label: 'Live runtime proof · Requires authenticated Codex', transcript: currentCodexRun }
];
const verdictColor = { MERGE: 'verdict-merge', FIX: 'verdict-fix', 'RE-RUN': 'verdict-fix', ESCALATE: 'verdict-escalate' };
const verdictMotionColor = { MERGE: '#ecfdf5', FIX: '#fffbeb', 'RE-RUN': '#fffbeb', ESCALATE: '#fef2f2' };
function verdictPresentation(report) {
  const verdict = report.verdict.verdict;
  const contradicted = report.claimEvidence?.some((item) => item.status === 'contradicted');
  if (verdict === 'MERGE') return { signal: 'Claim supported', action: 'No evidence against this claim', detail: 'The command and repository evidence supported the agent’s claim.' };
  if (verdict === 'FIX') return { signal: contradicted ? 'Claim disproved' : 'Claim not supported', action: 'Do not merge — fix required', detail: contradicted ? 'The command result contradicted the agent’s claim.' : 'The command was green, but repository evidence shows the test was weakened.' };
  if (verdict === 'ESCALATE') return { signal: 'Human decision needed', action: 'Escalate before merge', detail: 'The claim held up, but repository evidence includes a sensitive scope signal.' };
  return { signal: 'Verification incomplete', action: 'Re-run before trusting this summary', detail: 'Receipts could not complete the evidence check.' };
}
function receiptFacts(report) {
  const facts = [];
  for (const item of report.claimEvidence || []) {
    if (item.actual?.exitCode === 0) facts.push({ tone: 'supported', text: `${item.command} executed successfully` });
    else if (item.status === 'contradicted') facts.push({ tone: 'failed', text: item.claim });
    else if (item.status === 'inconclusive') facts.push({ tone: 'failed', text: `inconclusive · ${item.claim}` });
  }
  for (const finding of report.weakenedTests || []) facts.push({ tone: 'failed', text: `${finding.type.replaceAll('_', ' ')} · ${finding.file}` });
  for (const path of report.blastRadius?.sensitivePaths || []) facts.push({ tone: 'failed', text: `sensitive path changed · ${path.path}` });
  return facts;
}
function downloadReceipt(report) {
  const lines = ['# Receipts verification receipt', '', `**Recommendation:** ${report.verdict.verdict}`, `**Reason:** ${report.verdict.reason}`, '', '## Agent claims', ...report.parsed.claims.map((claim) => `- ${claim.text}`), '', '## Evidence'];
  for (const item of report.claimEvidence || []) lines.push(`- **${item.status}** — ${item.claim}`);
  for (const finding of report.weakenedTests || []) lines.push(`- **${finding.type.replaceAll('_', ' ')}** — \`${finding.file}\`: \`${finding.line}\``);
  for (const path of report.blastRadius?.sensitivePaths || []) lines.push(`- **sensitive path changed** — \`${path.path}\``);
  const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `receipts-${report.verdict.verdict.toLowerCase()}.md`; document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}
const cardMotion = (index) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.48 + index * 0.09, duration: 0.25, ease: 'easeOut' } });
function readableError(error) {
  const message = error?.message || 'Verification could not complete.';
  if (error?.name === 'AbortError') return 'Verification timed out before the evidence server responded. Check Codex and the referenced command, then try again.';
  if (/failed to fetch/i.test(message)) return 'Couldn’t reach the evidence server. Start the pipeline server and try again.';
  if (/Transcript is too large/i.test(message)) return 'This transcript is too large to verify. Paste a shorter completion summary.';
  if (/verification is already running/i.test(message)) return 'Another verification is in progress. Wait for it to finish, then try again.';
  if (/no executable claims/i.test(message)) return 'Couldn’t find a command claim to verify in this transcript.';
  if (/not a Git repository/i.test(message)) return 'Repository evidence is unavailable because this folder is not a Git repository.';
  return message.replace(/\s+at\s+.*$/s, '');
}

function EvidenceCard({ item, index }) {
  const caught = item.status === 'contradicted';
  return <motion.article {...cardMotion(index)} className="evidence-card p-5 sm:p-6">
    <div className="grid gap-5 md:grid-cols-[1fr_1fr] md:gap-8">
      <section>
        <p className="evidence-label">Agent claim</p>
        <motion.pre animate={caught ? { color: '#a83b32', textDecorationLine: 'line-through' } : { color: '#292524' }} transition={{ delay: 0.7 + index * 0.09, duration: 0.18 }} className="evidence-text evidence-claim">{item.claim}</motion.pre>
      </section>
      <motion.section initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.69 + index * 0.09, duration: 0.22 }} className="relative border-t border-stone-100 pt-5 md:border-l md:border-t-0 md:pt-0 md:pl-8">
        <span className="evidence-vs">vs</span>
        <p className="evidence-label">Repository evidence</p>
        <pre className="evidence-text evidence-actual">{item.output || JSON.stringify(item.actual, null, 2)}</pre>{item.actual?.outputTruncated && <p className="mt-3 text-xs text-stone-500">Output capped at 64 KB.</p>}
      </motion.section>
    </div>
  </motion.article>;
}

function PipelineFinding({ finding, claim, index }) {
  return <motion.article {...cardMotion(index)} className="evidence-card p-5 sm:p-6">
    <div className="grid gap-5 md:grid-cols-[1fr_1fr] md:gap-8">
      {claim && <section><p className="evidence-label">Agent claim</p><pre className="evidence-text evidence-claim">{claim.text}</pre></section>}
      <motion.section initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.69 + index * 0.09, duration: 0.22 }} className={claim ? 'relative border-t border-stone-100 pt-5 md:border-l md:border-t-0 md:pt-0 md:pl-8' : ''}>{claim && <span className="evidence-vs">vs</span>}<p className="evidence-label">Test-integrity evidence</p>{finding.file && <p className="evidence-location">{finding.file}</p>}<pre className="evidence-text evidence-actual">{finding.line}</pre></motion.section>
    </div>
  </motion.article>;
}

function BlastRadius({ blastRadius, index }) {
  const hasEvidence = blastRadius?.sensitivePaths?.length || blastRadius?.oversized;
  if (!hasEvidence) return null;
  return <motion.article {...cardMotion(index)} className="evidence-card p-5 sm:p-6">
    <p className="evidence-label">Actual result</p>
    <pre className="evidence-text evidence-actual">{JSON.stringify(blastRadius, null, 2)}</pre>
  </motion.article>;
}

function App() {
  const [transcript, setTranscript] = useState('');
  const [state, setState] = useState('input');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [inputError, setInputError] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [fixture, setFixture] = useState(null);
  const [selectedSample, setSelectedSample] = useState('');
  const transcriptRef = useRef(null);

  function selectSample(event) {
    const value = event.target.value;
    const sample = samples[Number(value)];
    if (sample) { setTranscript(sample.transcript); setFixture(sample.fixture || null); setSelectedSample(value); setInputError(''); }
  }
  function updateTranscript(event) {
    setTranscript(event.target.value);
    setFixture(null);
    setSelectedSample('');
    setInputError('');
  }
  function submitWithShortcut(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit();
  }
  async function checkRun(event) {
    event.preventDefault();
    if (!transcript.trim()) { setInputError('Paste a transcript before checking the run.'); transcriptRef.current?.focus(); return; }
    setState('loading'); setError(''); setReport(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fixture ? { transcript, fixture } : { transcript, taskDescription }), signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Pipeline request failed with HTTP ${response.status}.`);
      if (!body.verdict) throw new Error('The pipeline returned no verdict.');
      setReport(body); setState('verdict');
    } catch (requestError) { setError(readableError(requestError)); setState('error'); }
    finally { window.clearTimeout(timer); }
  }
  const startOver = () => { setState('input'); setReport(null); setError(''); setInputError(''); window.setTimeout(() => transcriptRef.current?.focus(), 0); };

  return <main className="min-h-screen bg-stone-50 text-stone-900">
    <header className="border-b border-stone-200 bg-stone-50"><div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-6"><span className="brand-mark" aria-hidden="true">✓</span><span className="wordmark font-serif text-2xl font-bold">receipts<span className="text-red-700">.</span></span><span className="ml-auto hidden font-mono text-[.58rem] uppercase tracking-[.16em] text-stone-400 sm:block">Evidence-based agent verification</span></div></header>
    <div className="mx-auto flex max-w-4xl justify-center px-6 py-16 sm:py-24">
      {state === 'input' && <form onSubmit={checkRun} className="w-full max-w-2xl space-y-6">
        <div><p className="eyebrow">Evidence-based verification for coding-agent summaries</p><h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight sm:text-6xl">The agent made a claim.<br /><em>Does the repository support it?</em></h1><p className="mt-5 max-w-lg text-sm leading-6 text-stone-600">1. Agent claim &nbsp; 2. Repository evidence &nbsp; 3. Your decision</p></div>
        <label className="block"><span className="evidence-label">Open a reproducible proof</span><select onChange={selectSample} value={selectedSample} className="mt-2 w-full border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-stone-800"><option value="" disabled>Choose a replay or live proof</option>{samples.map((sample, index) => <option key={sample.label} value={index}>{sample.label}</option>)}</select></label>
        <label className="block"><span className="evidence-label">Agent completion summary</span><textarea ref={transcriptRef} value={transcript} onChange={updateTranscript} onKeyDown={submitWithShortcut} aria-invalid={Boolean(inputError)} aria-describedby={inputError ? 'transcript-error' : undefined} placeholder="Paste the agent’s final summary and referenced commands" className="mt-2 min-h-72 w-full resize-y border border-stone-300 bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-stone-800" /></label>
        <label className="block"><span className="evidence-label">Original task/request <span className="normal-case tracking-normal">(optional)</span></span><textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="What was the agent asked to change?" className="mt-2 min-h-24 w-full resize-y border border-stone-300 bg-white p-4 text-sm leading-6 outline-none focus:border-stone-800" /></label>
        {inputError && <p id="transcript-error" role="alert" className="-mt-3 text-sm text-red-700">{inputError}</p>}
        <p className="text-sm leading-6 text-stone-600">Receipts verifies stated commands and selected repository evidence. It does not review code quality or prove security.</p>
        <button type="submit" aria-keyshortcuts="Control+Enter Meta+Enter" title="Verify the summary (Ctrl/⌘ + Enter)" className="bg-stone-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700">Verify the summary <span className="ml-2 hidden text-stone-400 sm:inline">⌘↵</span></button>
      </form>}
      {state === 'loading' && <section role="status" aria-live="polite" aria-busy="true" className="w-full max-w-2xl border border-stone-200 bg-white p-8 sm:p-12"><p className="eyebrow">Receipts</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Checking what the agent claimed</h1><p className="mt-4 max-w-md text-sm leading-6 text-stone-600">{fixture ? 'Loading captured command and repository evidence...' : 'This can take a moment: Receipts is waiting on real command and Git-diff evidence.'}</p><div className="mt-8 h-px overflow-hidden bg-stone-200"><motion.div className="h-full bg-stone-700" animate={{ scaleX: [0.08, 0.72, 0.28] }} transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }} style={{ transformOrigin: 'left' }} /></div><p className="mt-4 font-mono text-[.68rem] uppercase tracking-[.12em] text-stone-400">No staged progress — results appear when evidence is ready.</p></section>}
      {state === 'error' && <section aria-live="assertive" className="w-full max-w-2xl border border-red-200 bg-red-50 p-8 sm:p-12"><p className="eyebrow text-red-700">Couldn’t check this run</p><p className="mt-4 font-mono text-sm leading-6 text-red-950">{error}</p><p className="mt-4 text-sm leading-6 text-red-900">Your transcript is still here. Correct it or restore the evidence server, then submit again.</p><button onClick={startOver} className="mt-7 border border-red-300 px-4 py-2 text-sm font-medium text-red-950">Back to transcript</button></section>}
      <AnimatePresence mode="wait">{state === 'verdict' && report && <motion.section key={report.verdict.verdict} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="w-full max-w-3xl">
        <motion.div initial={{ opacity: 0, scale: 0.78, backgroundColor: '#fafaf9' }} animate={{ opacity: 1, scale: 1, backgroundColor: verdictMotionColor[report.verdict.verdict] || '#f5f5f4' }} transition={{ scale: { type: 'spring', stiffness: 420, damping: 17, mass: 0.8 }, opacity: { duration: 0.18 }, backgroundColor: { duration: 0.34 } }} className={`receipt-card p-7 sm:p-11 ${verdictColor[report.verdict.verdict] || 'text-stone-950'}`}><div className="receipt-top"><p className="evidence-label">Receipt · {report.replay ? 'frozen evidence replay' : 'independent verification'}</p><span className="receipt-id">{report.verdict.verdict}</span></div>{report.replay && <p className="mt-3 font-mono text-[.68rem] uppercase tracking-[.12em] text-stone-400">Captured on {report.replay.capturedAt}</p>}<div className="receipt-rule" /><p className="receipt-section">Agent claim</p><p className="receipt-claim">{report.parsed?.claims?.[0]?.text || 'No executable claim was extracted.'}</p><p className="receipt-section mt-7">Repository evidence</p><ul className="receipt-facts">{receiptFacts(report).map((fact, index) => <li key={`${fact.text}-${index}`} className={fact.tone}> {fact.text}</li>)}</ul><div className="receipt-rule mt-8" /><h1 className="verdict-word mt-6 font-serif font-semibold">{verdictPresentation(report).signal}</h1><p className="verdict-action mt-7">{verdictPresentation(report).action}</p><p className="verdict-summary mt-3">{verdictPresentation(report).detail}</p></motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.18 }} className="mt-16 space-y-4"><p className="evidence-label">Full repository evidence</p>{report.claimEvidence?.map((item, index) => <EvidenceCard key={item.claimId} item={item} index={index} />)}{report.weakenedTests?.map((finding, index) => <PipelineFinding key={`${finding.file}-${index}`} finding={finding} index={(report.claimEvidence?.length || 0) + index} claim={report.parsed?.claims?.find((item) => item.type === 'tests_pass')} />)}<BlastRadius blastRadius={report.blastRadius} index={(report.claimEvidence?.length || 0) + (report.weakenedTests?.length || 0)} />{!report.claimEvidence?.length && !report.weakenedTests?.length && !report.blastRadius?.oversized && !report.blastRadius?.sensitivePaths?.length && <p className="text-sm text-stone-600">Receipts completed, but the pipeline returned no additional repository evidence for this run.</p>}</motion.div>
        <div className="mt-10 flex flex-wrap gap-3"><button onClick={() => downloadReceipt(report)} className="bg-stone-950 px-4 py-2 text-sm font-medium text-white">Download receipt</button><button onClick={startOver} className="border border-stone-300 bg-white px-4 py-2 text-sm font-medium">Verify another summary</button></div>
      </motion.section>}</AnimatePresence>
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
