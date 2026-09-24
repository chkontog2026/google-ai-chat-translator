import type { SubtitleCue } from '../types/subtitle';

export function timecodeToSeconds(timecode: string): number {
  const m = /^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(timecode);
  if (!m || +m[2] > 59 || +m[3] > 59) return NaN;
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
}

export function secondsToTimecode(seconds: number): string {
  const ms = Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 1000);
  const pad = (n: number, length = 2) => String(n).padStart(length, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

export function cleanRawChatResponse(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
    .replace(/^```(?:srt|json)?[ \t]*\n/i, '').replace(/\n```[ \t]*$/, '').trim();
}

export interface SrtIssue { id?: number; message: string }
export function inspectSRT(raw: string) {
  const text = cleanRawChatResponse(raw);
  const header = /^(?:(\d+)[ \t]*\n)?[ \t]*(?:(\d+)[ \t]+)?(\d{1,3}:\d{2}:\d{2}[,.]\d{3})[ \t]*-->[ \t]*(\d{1,3}:\d{2}:\d{2}[,.]\d{3})[ \t]*([^\n]*)$/gm;
  const matches = [...text.matchAll(header)];
  const cues: SubtitleCue[] = [];
  const issues: SrtIssue[] = [];
  if (!matches.length) issues.push({ message: 'Δεν βρέθηκαν εγγραφές SRT.' });
  const arrowCount = text.split('\n').filter(line => line.includes('-->')).length;
  if (arrowCount !== matches.length) issues.push({ message: 'Υπάρχουν γραμμές χρονισμού που δεν αναγνωρίζονται.' });
  if (matches.length && text.slice(0, matches[0].index).trim()) issues.push({ message: 'Υπάρχει κείμενο πριν από τον πρώτο υπότιτλο.' });
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const id = Number(m[1] || m[2]);
    const startTime = m[3].replace('.', ',');
    const endTime = m[4].replace('.', ',');
    const startSeconds = timecodeToSeconds(startTime);
    const endSeconds = timecodeToSeconds(endTime);
    const originalText = [m[5], text.slice(m.index! + m[0].length, matches[i + 1]?.index ?? text.length).trim()].filter(Boolean).join('\n').trim();
    let invalid = false;
    const issue = (message: string) => { issues.push({ id, message }); invalid = true; };
    if (!Number.isSafeInteger(id) || id <= 0) issue('Λείπει έγκυρο αναγνωριστικό υποτίτλου.');
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) issue('Μη έγκυρος χρονισμός (λεπτά/δευτερόλεπτα 00–59).');
    else if (endSeconds <= startSeconds) issue('Η λήξη πρέπει να είναι μετά την έναρξη.');
    if (!originalText) issue('Κενό κείμενο.');
    if (!invalid) cues.push({ id, startTime, endTime, startSeconds, endSeconds, originalText });
  }
  return { cues, issues, total: matches.length };
}

export function parseSRT(raw: string, isOriginal = true): SubtitleCue[] {
  const { cues, issues } = inspectSRT(raw);
  const ids = new Set<number>();
  for (let i = 0; i < cues.length; i++) {
    if (ids.has(cues[i].id)) issues.push({ id: cues[i].id, message: 'Διπλό αναγνωριστικό.' });
    ids.add(cues[i].id);
    if (i && cues[i].startSeconds < cues[i - 1].startSeconds) issues.push({ id: cues[i].id, message: 'Οι εγγραφές δεν είναι σε χρονική σειρά.' });
  }
  if (issues.length) throw new Error(issues.slice(0, 4).map(x => `${x.id ? '#' + x.id + ': ' : ''}${x.message}`).join(' '));
  return isOriginal ? cues : cues.map(c => ({ ...c, originalText: '', translatedText: c.originalText }));
}

// Compatibility entry point; no ID or positional fallback for legacy SRT.
export function mergeOriginalAndTranslation(original: SubtitleCue[], raw: string) {
  const { cues } = inspectSRT(raw);
  const mergedCues = original.map(o => {
    const matches = cues.filter(t => t.startTime === o.startTime && t.endTime === o.endTime);
    const originalMatches = original.filter(t => t.startTime === o.startTime && t.endTime === o.endTime);
    return matches.length === 1 && originalMatches.length === 1
      ? { ...o, translatedText: matches[0].originalText, needsReview: true }
      : { ...o };
  });
  const matchedCount = mergedCues.filter((c, i) => c.translatedText !== original[i].translatedText).length;
  return { mergedCues, matchedCount, repairedCount: 0, unmatchedCount: mergedCues.filter(c => !c.translatedText?.trim()).length };
}

/**
 * Calculates Characters Per Second (CPS) for subtitle readability.
 */
export function calculateCPS(text: string, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  const cleanLen = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().length;
  return parseFloat((cleanLen / durationSeconds).toFixed(1));
}

/**
 * Serializes cues into standard SRT format.
 */
export function cuesToSRT(cues: SubtitleCue[], useTranslated = true): string {
  return cues
    .map((cue, index) => {
      const text = useTranslated ? (cue.translatedText?.trim() || '[Χωρίς μετάφραση]') : cue.originalText;
      return `${cue.id}\n${cue.startTime} --> ${cue.endTime}\n${text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Serializes cues into WebVTT (.vtt) format.
 */
export function cuesToVTT(cues: SubtitleCue[], useTranslated = true): string {
  const header = 'WEBVTT - Translated with SubGreek Studio\n\n';
  const body = cues
    .map((cue, index) => {
      const text = useTranslated ? (cue.translatedText?.trim() || '[Χωρίς μετάφραση]') : cue.originalText;
      // VTT uses periods instead of commas: 00:01:23.456
      const startVtt = cue.startTime.replace(',', '.');
      const endVtt = cue.endTime.replace(',', '.');
      return `${cue.id}\n${startVtt} --> ${endVtt}\n${text.trim()}\n`;
    })
    .join('\n');
  return header + body;
}

/**
 * Generates bilingual SRT (Original English in italics on line 1, Greek translation on line 2).
 */
export function cuesToBilingualSRT(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const orig = cue.originalText.trim();
      const trans = cue.translatedText?.trim() || '[Χωρίς μετάφραση]';
      const combined = `<i>${orig}</i>\n${trans}`;
      return `${cue.id}\n${cue.startTime} --> ${cue.endTime}\n${combined}\n`;
    })
    .join('\n');
}

/**
 * Triggers browser file download with proper character encoding.
 * Can include UTF-8 BOM for legacy Smart TVs / media players.
 */
export function downloadSubtitleFile(content: string, filename: string, withBOM = false) {
  const blobData = withBOM ? ['\uFEFF', content] : [content];
  const blob = new Blob(blobData, { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Allow the browser to consume the Blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
