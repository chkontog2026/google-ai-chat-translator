export interface SubtitleCue {
  id: number;
  startTime: string; // e.g., "00:01:20,500"
  endTime: string;   // e.g., "00:01:23,800"
  startSeconds: number;
  endSeconds: number;
  originalText: string;
  translatedText?: string;
  hasWarning?: boolean;
  warningMessage?: string;
  needsReview?: boolean;
}

export type TranslationTone = 'natural_spoken' | 'youth_slang' | 'formal_doc' | 'action_punchy' | 'humor_sitcom';

export interface PromptConfig {
  tone: TranslationTone;
  politeness: 'informal' | 'formal' | 'auto';
  maxCharsPerLine: number;
  preserveTags: boolean; // <i>, <b>, etc.
  preserveBrackets: boolean; // [Applause], (laughter)
  customGlossary: string; // e.g. "Shield: Ασπίδα\nTony: Τόνι"
  chunkSize: number; // 0 for all at once, or 50, 100, 200
  currentChunkIndex: number;
  repairOnly?: boolean;
}

export interface ValidationReport {
  totalOriginal: number;
  totalTranslated: number;
  missingCueIds: number[];
  repairedTimestamps: number;
  longLinesCount: number;
  highCPSCount: number;
}
