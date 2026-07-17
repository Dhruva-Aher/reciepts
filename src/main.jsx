import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import currentCodexRun from '../proofs/current-codex-run.txt?raw';
import cleanRun from '../fixtures/clean-run/transcript.txt?raw';
import liedTestRun from '../fixtures/lied-test-run/transcript.txt?raw';
import blastRadiusRun from '../fixtures/blast-radius-run/transcript.txt?raw';
import './styles.css';

const API_URL = import.meta.env.VITE_RECEIPTS_API_URL || '/verify';
const samples = [
  { label: 'Current Codex run · build passed', transcript: currentCodexRun },
  { label: 'Fixture · clean run', transcript: cleanRun, fixture: 'clean-run' },
  { label: 'Fixture · lied test run', transcript: liedTestRun, fixture: 'lied-test-run' },
  { label: 'Fixture · blast radius run', transcript: blastRadiusRun, fixture: 'blast-radius-run' }
];
const verdictColor = { MERGE: 'border-emerald-600 bg-emerald-50 text-emerald-950', FIX: 'border-amber-500 bg-amber-50 text-amber-950', 'RE-RUN': 'border-amber-500 bg-amber-50 text-amber-950', ESCALATE: 'border-red-600 bg-red-50 text-red-950' };
const verdictMotionColor = { MERGE: '#ecfdf5', FIX: '#fffbeb', 'RE-RUN': '#fffbeb', ESCALATE: '#fef2f2' };
const cardMotion = (index) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.48 + index * 0.09, duration: 0.25, ease: 'easeOut' } });
function readableError(error) {
  const message = error?.message || 'Verification could not complete.';
  if (/failed to fetch/i.test(message)) return 'Couldn’t reach the evidence server. Start the pipeline server and try again.';
  return message.replace(/\s+at\s+.*$/s, '');
}

function EvidenceCard({ item, index }) {
  const caught = item.status === 'contradicted';
  return <motion.article {...cardMotion(index)} className="border border-stone-200 bg-white p-5">
    <div className="grid gap-5 md:grid-cols-[1fr_1fr] md:gap-8">
      <section>
        <p className="evidence-label">Agent claimed</p>
        <motion.pre animate={caught ? { color: '#a83b32', textDecorationLine: 'line-through' } : { color: '#292524' }} transition={{ delay: 0.7 + index * 0.09, duration: 0.18 }} className="evidence-text evidence-claim">{item.claim}</motion.pre>
      </section>
      <motion.section initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.69 + index * 0.09, duration: 0.22 }} className="relative border-t border-stone-100 pt-5 md:border-l md:border-t-0 md:pt-0 md:pl-8">
        <span className="evidence-vs">vs</span>
        <p className="evidence-label">Actual result</p>
        <pre className="evidence-text evidence-actual">{item.output || JSON.stringify(item.actual, null, 2)}</pre>
      </motion.section>
    </div>
  </motion.article>;
}

function PipelineFinding({ finding, claim, index }) {
  return <motion.article {...cardMotion(index)} className="border border-stone-200 bg-white p-5">
    <div className="grid gap-5 md:grid-cols-[1fr_1fr] md:gap-8">
      {claim && <section><p className="evidence-label">Agent claimed</p><motion.pre animate={{ color: '#a83b32', textDecorationLine: 'line-through' }} transition={{ delay: 0.7 + index * 0.09, duration: 0.18 }} className="evidence-text evidence-claim">{claim.text}</motion.pre></section>}
      <motion.section initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.69 + index * 0.09, duration: 0.22 }} className={claim ? 'relative border-t border-stone-100 pt-5 md:border-l md:border-t-0 md:pt-0 md:pl-8' : ''}>{claim && <span className="evidence-vs">vs</span>}<p className="evidence-label">Actual result</p><pre className="evidence-text evidence-actual">{finding.line}</pre></motion.section>
    </div>
  </motion.article>;
}

function BlastRadius({ blastRadius, index }) {
  const hasEvidence = blastRadius?.sensitivePaths?.length || blastRadius?.oversized;
  if (!hasEvidence) return null;
  return <motion.article {...cardMotion(index)} className="border border-stone-200 bg-white p-5">
    <p className="evidence-label">Actual result</p>
    <pre className="evidence-text evidence-actual">{JSON.stringify(blastRadius, null, 2)}</pre>
  </motion.article>;
}

function App() {
  const [transcript, setTranscript] = useState('');
  const [state, setState] = useState('input');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [fixture, setFixture] = useState(null);

  function selectSample(event) {
    const sample = samples[Number(event.target.value)];
    if (sample) { setTranscript(sample.transcript); setFixture(sample.fixture || null); }
  }
  async function checkRun(event) {
    event.preventDefault();
    if (!transcript.trim()) { setError('Paste a transcript before checking the run.'); setState('error'); return; }
    setState('loading'); setError(''); setReport(null);
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fixture ? { transcript, fixture } : { transcript }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Pipeline request failed with HTTP ${response.status}.`);
      if (!body.verdict) throw new Error('The pipeline returned no verdict.');
      setReport(body); setState('verdict');
    } catch (requestError) { setError(readableError(requestError)); setState('error'); }
  }
  const startOver = () => { setState('input'); setReport(null); setError(''); };

  return <main className="min-h-screen bg-stone-50 text-stone-900">
    <header className="border-b border-stone-200 bg-stone-50"><div className="mx-auto flex h-16 max-w-4xl items-center px-6"><span className="font-serif text-2xl font-bold tracking-tight">receipts<span className="text-red-700">.</span></span></div></header>
    <div className="mx-auto flex max-w-4xl justify-center px-6 py-16 sm:py-24">
      {state === 'input' && <form onSubmit={checkRun} className="w-full max-w-2xl space-y-6">
        <div><p className="eyebrow">Agent claim verification</p><h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight sm:text-6xl">Check the work,<br /><em>not the summary.</em></h1></div>
        <label className="block"><span className="evidence-label">Sample run</span><select onChange={selectSample} defaultValue="" className="mt-2 w-full border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-stone-800"><option value="" disabled>Choose an existing run</option>{samples.map((sample, index) => <option key={sample.label} value={index}>{sample.label}</option>)}</select></label>
        <label className="block"><span className="evidence-label">Transcript</span><textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Paste an agent transcript" className="mt-2 min-h-72 w-full resize-y border border-stone-300 bg-white p-4 font-mono text-sm leading-6 outline-none focus:border-stone-800" /></label>
        <button type="submit" className="bg-stone-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700">Check this run</button>
      </form>}
      {state === 'loading' && <section aria-live="polite" className="w-full max-w-2xl border border-stone-200 bg-white p-8 sm:p-12"><p className="eyebrow">Verification in progress</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Checking this run</h1><p className="mt-4 max-w-md text-sm leading-6 text-stone-600">The evidence pipeline is processing the transcript and running its checks.</p><div className="mt-8 h-px overflow-hidden bg-stone-200"><motion.div className="h-full bg-stone-700" animate={{ scaleX: [0.08, 0.72, 0.28] }} transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }} style={{ transformOrigin: 'left' }} /></div></section>}
      {state === 'error' && <section aria-live="assertive" className="w-full max-w-2xl border border-red-200 bg-red-50 p-8 sm:p-12"><p className="eyebrow text-red-700">Couldn’t check this run</p><p className="mt-4 font-mono text-sm leading-6 text-red-950">{error}</p><button onClick={startOver} className="mt-7 border border-red-300 px-4 py-2 text-sm font-medium text-red-950">Back to transcript</button></section>}
      <AnimatePresence mode="wait">{state === 'verdict' && report && <motion.section key={report.verdict.verdict} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="w-full max-w-3xl">
        <motion.div initial={{ opacity: 0, scale: 0.78, backgroundColor: '#fafaf9' }} animate={{ opacity: 1, scale: 1, backgroundColor: verdictMotionColor[report.verdict.verdict] || '#f5f5f4' }} transition={{ scale: { type: 'spring', stiffness: 420, damping: 17, mass: 0.8 }, opacity: { duration: 0.18 }, backgroundColor: { duration: 0.34 } }} className={`border-l-4 p-6 sm:p-9 ${verdictColor[report.verdict.verdict] || 'border-stone-500 text-stone-950'}`}><p className="evidence-label">Verdict</p><h1 className="mt-1 font-serif text-7xl font-semibold leading-none tracking-[-0.07em] sm:text-[8.5rem]">{report.verdict.verdict}</h1>{report.verdict.reason && <pre className="mt-4 whitespace-pre-wrap font-mono text-sm leading-6">{report.verdict.reason}</pre>}</motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.18 }} className="mt-7 space-y-3"><p className="evidence-label">Evidence</p>{report.claimEvidence?.map((item, index) => <EvidenceCard key={item.claimId} item={item} index={index} />)}{report.weakenedTests?.map((finding, index) => <PipelineFinding key={`${finding.file}-${index}`} finding={finding} index={(report.claimEvidence?.length || 0) + index} claim={report.parsed?.claims?.find((item) => item.type === 'tests_pass')} />)}<BlastRadius blastRadius={report.blastRadius} index={(report.claimEvidence?.length || 0) + (report.weakenedTests?.length || 0)} />{!report.claimEvidence?.length && !report.weakenedTests?.length && !report.blastRadius?.oversized && !report.blastRadius?.sensitivePaths?.length && <p className="text-sm text-stone-600">No evidence was returned.</p>}</motion.div>
        <button onClick={startOver} className="mt-10 border border-stone-300 bg-white px-4 py-2 text-sm font-medium">Check another run</button>
      </motion.section>}</AnimatePresence>
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
