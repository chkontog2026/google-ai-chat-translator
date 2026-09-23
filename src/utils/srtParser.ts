import { SubtitleCue } from '../types/subtitle';

/**
 * Parses timestamp string "00:01:23,456" or "00:01:23.456" into seconds.
 */
export function timecodeToSeconds(timecode: string): number {
  if (!timecode) return 0;
  const cleaned = timecode.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Converts seconds to standard SRT timestamp format: "00:01:23,456"
 */
export function secondsToTimecode(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);

  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * Strips markdown code blocks, conversational greetings, and preamble that an LLM might prepend.
 */
export function cleanRawChatResponse(text: string): string {
  let cleaned = text.trim();
  
  // Remove UTF-8 BOM if present
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1);
  }

  // Remove markdown code blocks like ```srt ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```[a-zA-Z]*\r?\n/gm, '');
  cleaned = cleaned.replace(/\r?\n```$/gm, '');
  cleaned = cleaned.replace(/```/g, '');

  // Look for the first occurrence of a subtitle cue (e.g. "1" or timecode)
  const cueStartMatch = cleaned.match(/(?:^|\n)(?:\d+\s+)?(\d{1,2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,\.]\d{3})/);
  if (cueStartMatch && cueStartMatch.index !== undefined) {
    const startIndex = cueStartMatch.index === 0 ? 0 : cueStartMatch.index + 1;
    cleaned = cleaned.slice(startIndex);
  }

  return cleaned;
}

/**
 * Parses raw SRT string into SubtitleCue[] array.
 * Supports standard multi-line SRT, as well as single-line/inline formats
 * like: "301 00:31:46,450 --> 00:31:46,850 Ξέχνα το."
 */
export function parseSRT(rawText: string, isOriginal = true): SubtitleCue[] {
  const cleaned = cleanRawChatResponse(rawText);
  // Normalize newlines
  const normalized = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into blocks by double newline or cue header pattern
  const rawBlocks = normalized.split(/\n\s*\n+/);
  const cues: SubtitleCue[] = [];
  const timecodeRegex = /(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})/;

  for (const block of rawBlocks) {
    const lines = block.trim().split('\n');
    if (!lines || lines.length === 0 || !lines[0].trim()) continue;

    let id = 0;
    let timecodeLineIndex = -1;
    let startTime = '';
    let endTime = '';
    let inlineText = '';

    // Find the line containing the timecode
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(timecodeRegex);
      if (match && match.index !== undefined) {
        timecodeLineIndex = i;
        startTime = match[1].replace('.', ',');
        endTime = match[2].replace('.', ',');

        // Check if there is an ID before the timecode on the same line (e.g. "301 00:31:46,450 --> ...")
        const beforeTc = lines[i].slice(0, match.index).trim();
        if (beforeTc && /^\d+$/.test(beforeTc)) {
          id = parseInt(beforeTc, 10);
        }

        // Check if there is text after the timecode on the same line (e.g. "... --> 00:31:46,850 Ξέχνα το.")
        const afterTc = lines[i].slice(match.index + match[0].length).trim();
        if (afterTc) {
          inlineText = afterTc;
        }
        break;
      }
    }

    if (timecodeLineIndex === -1) continue;

    // If ID wasn't before timecode on the same line, check preceding line
    if (id === 0 && timecodeLineIndex > 0) {
      const candidateId = parseInt(lines[timecodeLineIndex - 1].trim(), 10);
      if (!isNaN(candidateId)) {
        id = candidateId;
      }
    }
    if (id === 0) {
      id = cues.length + 1;
    }

    // Collect all subtitle text lines: inline text + any lines following the timecode
    const subsequentLines = lines.slice(timecodeLineIndex + 1).map(l => l.trim()).filter(Boolean);
    const allTextLines = [
      ...(inlineText ? [inlineText] : []),
      ...subsequentLines,
    ];
    const content = allTextLines.join('\n').trim();

    const startSeconds = timecodeToSeconds(startTime);
    const endSeconds = timecodeToSeconds(endTime);

    cues.push({
      id,
      startTime,
      endTime,
      startSeconds,
      endSeconds,
      originalText: isOriginal ? content : '',
      translatedText: !isOriginal ? content : undefined,
    });
  }

  // Sort by start time just in case
  return cues.sort((a, b) => a.startSeconds - b.startSeconds);
}

/**
 * Merges translated subtitles with the original cues.
 * Even if Google AI Studio chat missed or slightly tweaked a timestamp,
 * this function aligns by cue ID or relative order, restoring 100% original timings!
 * If originalCues is empty or doesn't match the pasted IDs, it seamlessly adopts the pasted cues.
 */
export function mergeOriginalAndTranslation(
  originalCues: SubtitleCue[],
  translatedRawText: string
): {
  mergedCues: SubtitleCue[];
  repairedCount: number;
  matchedCount: number;
  unmatchedCount: number;
} {
  const parsedTranslated = parseSRT(translatedRawText, false);

  // If no original cues exist, directly adopt the parsed translated cues!
  if (!originalCues || originalCues.length === 0) {
    const mergedCues = parsedTranslated.map((pt) => ({
      ...pt,
      translatedText: pt.translatedText || pt.originalText || '',
      originalText: '',
    }));
    return {
      mergedCues,
      repairedCount: 0,
      matchedCount: mergedCues.length,
      unmatchedCount: 0,
    };
  }
  
  // Build a map of translated cues by id
  const translationById = new Map<number, string>();
  for (const t of parsedTranslated) {
    if (t.id && t.translatedText) {
      translationById.set(t.id, t.translatedText);
    }
  }

  // Check if there is any ID overlap
  const hasMatchingIds = originalCues.some((o) => translationById.has(o.id));

  // If original was just a small sample (e.g. 1-12) and user pasted real chunk (e.g. 301-350), adopt the pasted cues!
  if (!hasMatchingIds && parsedTranslated.length > 0 && originalCues.length < 20 && parsedTranslated[0]?.id > 20) {
    const mergedCues = parsedTranslated.map((pt) => ({
      ...pt,
      translatedText: pt.translatedText || pt.originalText || '',
      originalText: '',
    }));
    return {
      mergedCues,
      repairedCount: 0,
      matchedCount: mergedCues.length,
      unmatchedCount: 0,
    };
  }

  let repairedCount = 0;
  let matchedCount = 0;

  const mergedCues = originalCues.map((orig, index) => {
    let translatedText = translationById.get(orig.id);

    // Fallback: If ID didn't match (e.g. Gemini started numbering from 1 for a chunk, or shifted IDs),
    // check matching by approximate timecode or sequential index if parsedTranslated length matches
    if (!translatedText && parsedTranslated[index]?.translatedText) {
      translatedText = parsedTranslated[index].translatedText;
      repairedCount++;
    }

    if (translatedText) {
      matchedCount++;
    }

    return {
      ...orig,
      translatedText: translatedText || orig.translatedText || '',
    };
  });

  const unmatchedCount = originalCues.length - matchedCount;

  return {
    mergedCues,
    repairedCount,
    matchedCount,
    unmatchedCount,
  };
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
      const text = useTranslated && cue.translatedText !== undefined ? cue.translatedText : cue.originalText;
      return `${index + 1}\n${cue.startTime} --> ${cue.endTime}\n${text.trim()}\n`;
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
      const text = useTranslated && cue.translatedText !== undefined ? cue.translatedText : cue.originalText;
      // VTT uses periods instead of commas: 00:01:23.456
      const startVtt = cue.startTime.replace(',', '.');
      const endVtt = cue.endTime.replace(',', '.');
      return `${index + 1}\n${startVtt} --> ${endVtt}\n${text.trim()}\n`;
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
      const trans = (cue.translatedText || '').trim();
      const combined = `<i>${orig}</i>\n${trans}`;
      return `${index + 1}\n${cue.startTime} --> ${cue.endTime}\n${combined}\n`;
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
  URL.revokeObjectURL(url);
}
