import React, { useState } from 'react';
import {
  ClipboardPaste,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import { mergeOriginalAndTranslation } from '../utils/srtParser';
import { SAMPLE_GREEK_SRT } from '../utils/sampleData';

interface PasteImporterProps {
  cues: SubtitleCue[];
  setCues: (cues: SubtitleCue[]) => void;
  onProceedToEditor: () => void;
}

export const PasteImporter: React.FC<PasteImporterProps> = ({
  cues,
  setCues,
  onProceedToEditor,
}) => {
  const [inputText, setInputText] = useState('');
  const [importReport, setImportReport] = useState<{
    repairedCount: number;
    matchedCount: number;
    unmatchedCount: number;
  } | null>(null);

  const handleProcessImport = (text: string, andProceed = false) => {
    if (!text.trim()) return;

    const { mergedCues, repairedCount, matchedCount, unmatchedCount } =
      mergeOriginalAndTranslation(cues, text);

    setCues(mergedCues);
    setImportReport({
      repairedCount,
      matchedCount,
      unmatchedCount,
    });

    if (andProceed) {
      onProceedToEditor();
    }
  };

  const handleUseSampleGreek = () => {
    setInputText(SAMPLE_GREEK_SRT);
    handleProcessImport(SAMPLE_GREEK_SRT, false);
  };

  const translatedCount = cues.filter((c) => !!c.translatedText?.trim()).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Βήμα 3: Επικόλληση Μετάφρασης από το Google AI Studio
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Αντιγράψτε την απάντηση του Gemini από το Google AI Studio Chat και επικολλήστε την εδώ.
              Ο έξυπνος μηχανισμός <strong>Auto-Repair</strong> θα συσχετίσει αυτόματα τους υποτίτλους με τους αρχικούς χρονισμούς.
            </p>
          </div>

          <button
            onClick={handleUseSampleGreek}
            className="px-3.5 py-2 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Δοκιμή με Έτοιμο Ελληνικό Δείγμα</span>
          </button>
        </div>
      </div>

      {/* Main Paste Box */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="ai-output-paste" className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-amber-400" />
            <span>Επικολλήστε εδώ το κείμενο που έδωσε το AI Studio Chat:</span>
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {inputText.length > 0 ? `${inputText.length} χαρακτήρες` : 'Ctrl+V'}
          </span>
        </div>

        <textarea
          id="ai-output-paste"
          rows={10}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="1&#10;00:00:01,200 --> 00:00:03,800&#10;Ελληνικό κείμενο υπότιτλου...&#10;&#10;2&#10;00:00:04,100 --> 00:00:06,450&#10;Επόμενη ατάκα..."
          className="w-full font-mono text-xs bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
        />

        {/* Helper bar when text is present */}
        {inputText.trim().length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-300">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Επικολλήσατε επιτυχώς το κείμενο ({inputText.length.toLocaleString()} χαρακτήρες). Πατήστε το κουμπί <strong>«Εφαρμογή & Μετάβαση στο Βήμα 4»</strong> για να προχωρήσετε!
              </span>
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            * Ακόμη κι αν το AI άλλαξε στιγμιαία τη στίξη ή έβαλε αριθμό και χρόνο στην ίδια γραμμή, το σύστημα τα διορθώνει αυτόματα.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setImportReport(null);
                }}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Καθαρισμός
              </button>
            )}

            {/* Secondary: Preview here */}
            <button
              onClick={() => handleProcessImport(inputText, false)}
              disabled={!inputText.trim()}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Ελέγξτε την ευθυγράμμιση σε αυτή τη σελίδα"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Μόνο Ευθυγράμμιση</span>
            </button>

            {/* Primary: Apply and Go to Step 4 */}
            <button
              onClick={() => handleProcessImport(inputText, true)}
              disabled={!inputText.trim()}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer scale-100 hover:scale-[1.02]"
            >
              <Wrench className="w-4 h-4 text-slate-950" />
              <span>Εφαρμογή & Μετάβαση στον Editor (Βήμα 4)</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      </div>

      {/* Import Status & Report */}
      {importReport && (
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-lg shadow-emerald-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Επιτυχής Ευθυγράμμιση & Φόρτωση!</h3>
                <p className="text-xs text-slate-400">
                  Βρέθηκαν {importReport.matchedCount} υπότιτλοι έτοιμοι για έλεγχο και εξαγωγή.
                </p>
              </div>
            </div>
            <button
              onClick={onProceedToEditor}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Μετάβαση στο Βήμα 4: Έλεγχος & Video Sync</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 mb-1">Μεταφρασμένοι Υπότιτλοι</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {importReport.matchedCount} / {cues.length}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 mb-1">Ανακτημένοι Χρονισμοί</div>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {cues.length} (100% ακρίβεια)
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 mb-1">Υπόλοιπο χωρίς μετάφραση</div>
              <div className={`text-lg font-bold font-mono ${importReport.unmatchedCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {importReport.unmatchedCount}
              </div>
            </div>
          </div>

          {importReport.unmatchedCount > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Εντοπίστηκαν {importReport.unmatchedCount} υπότιτλοι που δεν μεταφράστηκαν. Μπορείτε να τους συμπληρώσετε χειροκίνητα στο Βήμα 4 ή να επικολλήσετε το υπόλοιπο μέρος.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Preview Table of Merged Cues */}
      {translatedCount > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300">
              Γρήγορη προεπισκόπηση πρώτων ευθυγραμμισμένων υποτίτλων:
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {translatedCount} από {cues.length} μεταφρασμένοι
            </span>
          </div>

          <div className="space-y-2">
            {cues.slice(0, 4).map((cue) => (
              <div
                key={cue.id}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono"
              >
                <div>
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                    <span className="text-amber-400 font-bold">#{cue.id} EN (Αγγλικά)</span>
                    <span>{cue.startTime} → {cue.endTime}</span>
                  </div>
                  <div className="text-slate-300 whitespace-pre-wrap">{cue.originalText}</div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3">
                  <div className="text-[10px] text-emerald-400 mb-1 flex items-center justify-between font-bold">
                    <span>EL (Ελληνικά)</span>
                    <span className="font-normal text-slate-400">
                      {cue.translatedText ? `${cue.translatedText.length} χαρακτήρες` : 'Κενό'}
                    </span>
                  </div>
                  <div className="text-emerald-300 whitespace-pre-wrap">
                    {cue.translatedText || <span className="text-slate-600 italic">Χωρίς μετάφραση</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onProceedToEditor}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <span>Μετάβαση στον Πλήρη Επεξεργαστή & Συγχρονισμό Video</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
