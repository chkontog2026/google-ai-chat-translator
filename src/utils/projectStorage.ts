import type { SubtitleCue, PromptConfig } from '../types/subtitle';
import { timecodeToSeconds } from './srtParser';

export const STORAGE_KEY = 'subgreek.project.v1';
export const defaultConfig: PromptConfig = {
  tone: 'natural_spoken', politeness: 'auto', maxCharsPerLine: 38,
  preserveTags: true, preserveBrackets: true, customGlossary: '',
  chunkSize: 0, currentChunkIndex: 0, repairOnly: false,
};
export interface ProjectData {
  version: 1; cues: SubtitleCue[]; fileName: string; promptConfig: PromptConfig;
  activeStep: number; inputText: string; videoFileName: string | null;
}

export function decodeProject(raw: string): ProjectData {
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.cues) || !data.promptConfig || typeof data.fileName !== 'string' || typeof data.inputText !== 'string') throw new Error('Μη έγκυρο αρχείο εργασίας.');
  const ids = new Set<number>();
  const cues = data.cues.map((c: any) => {
    if (!c || !Number.isSafeInteger(c.id) || c.id <= 0 || ids.has(c.id) || typeof c.originalText !== 'string' || !c.originalText.trim() || (c.translatedText !== undefined && typeof c.translatedText !== 'string') || typeof c.startTime !== 'string' || typeof c.endTime !== 'string') throw new Error('Μη έγκυρες εγγραφές στο αρχείο εργασίας.');
    ids.add(c.id);
    const startSeconds = timecodeToSeconds(c.startTime);
    const endSeconds = timecodeToSeconds(c.endTime);
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) throw new Error('Μη έγκυροι χρόνοι στο αρχείο εργασίας.');
    return { id: c.id, originalText: c.originalText, startTime: c.startTime, endTime: c.endTime, startSeconds, endSeconds, translatedText: c.translatedText, needsReview: !!c.needsReview };
  });
  if (cues.some((c: SubtitleCue, i: number) => i > 0 && c.startSeconds < cues[i - 1].startSeconds)) throw new Error('Λανθασμένη σειρά υποτίτλων.');
  const c = data.promptConfig;
  if (!['natural_spoken', 'youth_slang', 'formal_doc', 'action_punchy', 'humor_sitcom'].includes(c.tone) || !['auto', 'formal', 'informal'].includes(c.politeness) || ![0, 50, 100, 150].includes(c.chunkSize) || !Number.isInteger(c.currentChunkIndex) || c.currentChunkIndex < 0 || !Number.isInteger(c.maxCharsPerLine) || c.maxCharsPerLine < 20 || c.maxCharsPerLine > 60 || typeof c.customGlossary !== 'string' || typeof c.preserveTags !== 'boolean' || typeof c.preserveBrackets !== 'boolean') throw new Error('Μη έγκυρες ρυθμίσεις εργασίας.');
  return { version: 1, cues, fileName: data.fileName, promptConfig: { ...defaultConfig, ...c, currentChunkIndex: c.chunkSize === 0 ? 0 : Math.min(c.currentChunkIndex, Math.max(0, Math.ceil(cues.length / c.chunkSize) - 1)) }, activeStep: [1, 2, 3, 4].includes(data.activeStep) ? data.activeStep : 1, inputText: data.inputText, videoFileName: typeof data.videoFileName === 'string' ? data.videoFileName : null };
}

export function restoreProject(): { project: ProjectData | null; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { project: raw ? decodeProject(raw) : null, error: '' };
  } catch { return { project: null, error: 'Δεν φορτώθηκε η αποθηκευμένη εργασία. Τα αποθηκευμένα δεδομένα δεν αντικαταστάθηκαν. Φορτώστε αντίγραφο ή επιλέξτε Νέα εργασία.' }; }
}
