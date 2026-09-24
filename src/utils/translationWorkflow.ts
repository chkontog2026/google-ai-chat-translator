import type { SubtitleCue, PromptConfig } from '../types/subtitle';
import { calculateCPS, cleanRawChatResponse, inspectSRT } from './srtParser';

export function qualityIssues(cue: SubtitleCue, maxChars = 38): string[] {
  const text = (cue.translatedText || '').replace(/<[^>]*>/g, '');
  if (!text.trim()) return ['Χωρίς μετάφραση'];
  const issues: string[] = [];
  if (cue.needsReview) issues.push('Χρειάζεται έλεγχος αντιστοίχισης');
  const lines = text.split('\n');
  if (lines.length > 2) issues.push('Πάνω από 2 γραμμές');
  if (lines.some(l => [...l].length > maxChars)) issues.push(`Γραμμή άνω των ${maxChars} χαρακτήρων`);
  if (calculateCPS(text, cue.endSeconds - cue.startSeconds) > 21) issues.push('Πάνω από 21 χαρακτήρες/δευτ.');
  const words = text.match(/\p{L}+/gu) || [];
  if (words.some(w => /\p{Script=Greek}/u.test(w) && /\p{Script=Latin}/u.test(w))) issues.push('Ανάμειξη ελληνικών και λατινικών μέσα σε λέξη');
  if (words.some(w => /[^\p{Script=Greek}\p{Script=Latin}\p{M}]/u.test(w))) issues.push('Ύποπτοι χαρακτήρες άλλου αλφαβήτου');
  return issues;
}

export function getBatch(cues: SubtitleCue[], config: PromptConfig) {
  const size = config.chunkSize === 0 ? Math.max(1, cues.length) : config.chunkSize;
  const total = Math.max(1, Math.ceil(cues.length / size));
  const index = Math.min(Math.max(0, config.currentChunkIndex), total - 1);
  const start = index * size;
  const all = cues.slice(start, start + size);
  const targets = config.repairOnly ? all.filter(c => qualityIssues(c, config.maxCharsPerLine).length) : all;
  return { total, index, start, all, targets };
}

// Includes the entire source and the exact requested IDs to reject other projects/batches.
export function requestId(cues: SubtitleCue[], targets: SubtitleCue[]): string {
  const input = JSON.stringify([cues.map(c => [c.id, c.startTime, c.endTime, c.originalText]), targets.map(c => c.id)]);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return `sg-${(hash >>> 0).toString(16)}-${targets.length}`;
}

export interface Proposal { id: number; text: string; needsReview: boolean; warnings: string[] }
export interface ImportPlan {
  format: 'json' | 'srt'; proposals: Proposal[]; issues: string[];
  rejected: number; received: number; missingIds: number[]; invalidTimes: number;
}

export function analyzeTranslation(cues: SubtitleCue[], raw: string, targets: SubtitleCue[], maxChars = 38): ImportPlan {
  const clean = cleanRawChatResponse(raw);
  const plan: ImportPlan = { format: /^[{[]/.test(clean) ? 'json' : 'srt', proposals: [], issues: [], rejected: 0, received: 0, missingIds: [], invalidTimes: 0 };
  if (!cues.length) { plan.issues.push('Φορτώστε πρώτα το αρχικό αγγλικό SRT.'); return plan; }
  const originals = new Map(cues.map(c => [c.id, c]));
  const add = (id: number, text: string, needsReview: boolean) => {
    const cue = { ...originals.get(id)!, translatedText: text.trim(), needsReview };
    plan.proposals.push({ id, text: text.trim(), needsReview, warnings: qualityIssues(cue, maxChars) });
  };
  if (plan.format === 'json') {
    plan.missingIds = targets.map(c => c.id);
    let data: any;
    try { data = JSON.parse(clean); } catch { plan.issues.push('Το JSON είναι ελλιπές ή μη έγκυρο. Αντιγράψτε ολόκληρη την απάντηση.'); return plan; }
    plan.received = Array.isArray(data?.translations) ? data.translations.length : Array.isArray(data) ? data.length : 0;
    if (!data || Array.isArray(data) || data.requestId !== requestId(cues, targets) || !Array.isArray(data.translations)) {
      plan.rejected = plan.received;
      plan.issues.push('Η απάντηση δεν ανήκει στο τρέχον αρχείο/μέρος ή λείπει το requestId. Χρησιμοποιήστε το prompt του Βήματος 2.');
      return plan;
    }
    plan.received = data.translations.length;
    const expected = new Set(targets.map(c => c.id));
    const counts = new Map<number, number>();
    for (const row of data.translations) if (row && Number.isSafeInteger(row.id)) counts.set(row.id, (counts.get(row.id) || 0) + 1);
    for (const row of data.translations) {
      if (!row || !Number.isSafeInteger(row.id) || !expected.has(row.id) || counts.get(row.id) !== 1 || typeof row.text !== 'string' || !row.text.trim()) {
        plan.rejected++;
        plan.issues.push(`Απορρίφθηκε εγγραφή ${row?.id ?? '?'}: άγνωστο/διπλό ID ή κενό/μη έγκυρο κείμενο.`);
      } else add(row.id, row.text, false);
    }
    plan.missingIds = targets.filter(c => !plan.proposals.some(p => p.id === c.id)).map(c => c.id);
  } else {
    const scan = inspectSRT(raw);
    plan.received = scan.total;
    plan.invalidTimes = scan.issues.filter(i => i.message.includes('χρονισμός') || i.message.includes('λήξη')).length;
    plan.issues = scan.issues.map(i => `#${i.id ?? '?'}: ${i.message}`);
    const key = (c: SubtitleCue) => `${c.startTime}|${c.endTime}`;
    const sourceTimes = new Map<string, SubtitleCue[]>();
    const responseTimes = new Map<string, SubtitleCue[]>();
    const responseIds = new Map<number, number>();
    for (const c of cues) sourceTimes.set(key(c), [...(sourceTimes.get(key(c)) || []), c]);
    for (const c of scan.cues) {
      responseTimes.set(key(c), [...(responseTimes.get(key(c)) || []), c]);
      responseIds.set(c.id, (responseIds.get(c.id) || 0) + 1);
    }
    for (const row of scan.cues) {
      const matches = sourceTimes.get(key(row));
      if (matches?.length === 1 && responseTimes.get(key(row))?.length === 1 && responseIds.get(row.id) === 1) add(matches[0].id, row.originalText, true);
      else plan.issues.push(`#${row.id}: Δεν υπάρχει μοναδική αντιστοίχιση με τους αρχικούς χρόνους.`);
    }
    plan.rejected = plan.received - plan.proposals.length;
    plan.missingIds = cues.filter(c => !plan.proposals.some(p => p.id === c.id) && !c.translatedText?.trim()).map(c => c.id);
  }
  return plan;
}

export function applyTranslation(cues: SubtitleCue[], plan: ImportPlan, overwrite = false): SubtitleCue[] {
  const map = new Map(plan.proposals.map(p => [p.id, p]));
  return cues.map(c => {
    const p = map.get(c.id);
    if (!p || (!overwrite && c.translatedText?.trim())) return c;
    return { ...c, translatedText: p.text, needsReview: p.needsReview };
  });
}
