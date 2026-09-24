import React, { useState } from 'react';
import type { SubtitleCue, PromptConfig } from '../types/subtitle';
import { analyzeTranslation, applyTranslation, getBatch, requestId, type ImportPlan } from '../utils/translationWorkflow';
import { downloadSubtitleFile } from '../utils/srtParser';

interface Props {
  cues: SubtitleCue[];
  setCues: (cues: SubtitleCue[]) => void;
  config: PromptConfig;
  inputText: string;
  setInputText: (text: string) => void;
  onProceedToEditor: () => void;
  onRepair: () => void;
}

export function PasteImporter({ cues, setCues, config, inputText, setInputText, onProceedToEditor, onRepair }: Props) {
  const [preview, setPreview] = useState<{ plan: ImportPlan; source: SubtitleCue[]; raw: string; token: string } | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState('');
  const batch = getBatch(cues, config);
  const token = requestId(cues, batch.targets);
  const plan = preview?.plan;
  const current = preview && preview.source === cues && preview.raw === inputText && preview.token === token;
  const existing = new Map(cues.map(c => [c.id, c]));
  const applicable = plan?.proposals.filter(p => overwrite || !existing.get(p.id)?.translatedText?.trim()).length || 0;
  const analyze = () => {
    setMessage('');
    setPreview({ plan: analyzeTranslation(cues, inputText, batch.targets, config.maxCharsPerLine), source: cues, raw: inputText, token });
  };
  const apply = () => {
    if (!current || !plan) return;
    setCues(applyTranslation(cues, plan, overwrite));
    setMessage(`Εφαρμόστηκαν ${applicable} μεταφράσεις. Οι αρχικοί χρόνοι και οι υπόλοιπες μεταφράσεις διατηρήθηκαν.`);
    setPreview(null);
  };
  return <div className="space-y-5">
    <section className="panel space-y-3">
      <h2 className="text-lg font-semibold">Βήμα 3: Έλεγχος απάντησης</h2>
      <p className="text-sm text-slate-300">Επικολλήστε την πλήρη απάντηση JSON {config.chunkSize === 0 ? 'για ολόκληρο το αρχείο' : `για το μέρος ${batch.index + 1}/${batch.total}`}. Η εφαρμογή ελέγχει το αρχείο, τα αναγνωριστικά και τις ελλείψεις πριν εφαρμόσει αλλαγές.</p>
      <p className="text-xs text-amber-300">Για παλιό ελληνικό SRT: ανακτώνται μόνο μοναδικές αντιστοιχίσεις με ακριβώς ίδιους χρόνους. Όλες παραμένουν σημειωμένες για έλεγχο νοήματος.</p>
      {!cues.length && <p role="alert" className="text-amber-300">Φορτώστε πρώτα το αρχικό αγγλικό SRT στο Βήμα 1.</p>}
      <label className="block text-sm" htmlFor="ai-output-paste">Απάντηση AI Studio ή παλιό ελληνικό SRT</label>
      <textarea id="ai-output-paste" rows={10} value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs" placeholder='{"requestId":"...","translations":[{"id":1,"text":"..."}]}' />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Φόρτωση απάντησης <input aria-label="Φόρτωση απάντησης" type="file" accept=".srt,.json,.txt" onChange={async e => {
          const file = e.target.files?.[0];
          if (file) try { setInputText(await file.text()); setPreview(null); setMessage(''); } catch { setMessage('Δεν ήταν δυνατή η ανάγνωση του αρχείου.'); }
          e.target.value = '';
        }} className="block text-xs mt-1" /></label>
        <button className="primary" disabled={!cues.length || !inputText.trim()} onClick={analyze}>Έλεγχος απάντησης</button>
        <button className="secondary" onClick={() => { setInputText(''); setPreview(null); setMessage(''); }}>Καθαρισμός πεδίου</button>
      </div>
    </section>
    {message && <p role="status" className="panel text-emerald-300">{message}</p>}
    {plan && <section className="panel space-y-4">
      <h3 className="font-semibold">Αποτελέσματα ελέγχου — {plan.format === 'json' ? 'Απάντηση JSON' : 'Ανάκτηση παλιού SRT'}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <p>Παραλήφθηκαν: <strong>{plan.received}</strong></p>
        <p>Προτάσεις εισαγωγής: <strong>{plan.proposals.length}</strong></p>
        <p>Απορρίφθηκαν: <strong>{plan.rejected}</strong></p>
        <p>Μη έγκυροι χρόνοι: <strong>{plan.invalidTimes}</strong></p>
      </div>
      <p className="text-sm text-amber-300">{plan.missingIds.length} εγγραφές χωρίς αποδεκτή απάντηση {plan.format === 'json' ? 'για τα ζητούμενα ID' : 'και χωρίς προηγούμενη μετάφραση'}. {plan.proposals.filter(p => p.warnings.length).length} προτάσεις με προειδοποιήσεις.</p>
      {plan.missingIds.length > 0 && <p className="text-xs break-words">ID: {plan.missingIds.slice(0, 60).join(', ')}{plan.missingIds.length > 60 ? '…' : ''}</p>}
      {plan.issues.length > 0 && <details open><summary className="text-amber-300 cursor-pointer">Προβλήματα ({plan.issues.length})</summary><ul className="mt-2 text-xs space-y-1 max-h-48 overflow-auto">{plan.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details>}
      <details><summary className="cursor-pointer">Προεπισκόπηση αντιστοίχισης ({plan.proposals.length})</summary>
        <div className="max-h-80 overflow-auto space-y-3 mt-3">{plan.proposals.map(p => <div key={p.id} className="border border-slate-700 rounded-lg p-3 text-xs space-y-1">
          <strong>#{p.id} • {existing.get(p.id)?.startTime}</strong>
          <p className="whitespace-pre-wrap text-slate-400">{existing.get(p.id)?.originalText}</p>
          <p className="whitespace-pre-wrap text-emerald-300">{p.text}</p>
          <p className="text-amber-300">{p.warnings.join(' • ')}</p>
        </div>)}</div>
      </details>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />Αντικατάσταση υπαρχουσών μεταφράσεων στις προτεινόμενες εγγραφές</label>
      {!current && <p className="text-amber-300 text-sm">Τα δεδομένα άλλαξαν. Πατήστε ξανά «Έλεγχος απάντησης».</p>}
      <div className="flex flex-wrap gap-3">
        <button className="primary" disabled={!current || !applicable} onClick={apply}>Εφαρμογή {applicable} μεταφράσεων</button>
        <button className="secondary" onClick={() => downloadSubtitleFile(JSON.stringify(plan, null, 2), 'translation-report.json')}>Λήψη αναφοράς ελέγχου</button>
      </div>
    </section>}
    <div className="flex flex-wrap gap-3">
      <button className="secondary" disabled={!cues.length} onClick={onRepair}>Prompt διόρθωσης / ελλείψεων</button>
      <button className="primary" disabled={!cues.length} onClick={onProceedToEditor}>Μετάβαση στον Editor</button>
    </div>
  </div>;
}
