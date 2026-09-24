import React, { useState, useRef } from 'react';
import { Upload, FileText, PlayCircle, Clock, Hash, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import { parseSRT } from '../utils/srtParser';
import { SAMPLE_ENGLISH_SRT, SAMPLE_GREEK_SRT } from '../utils/sampleData';

interface SrtUploaderProps {
  cues: SubtitleCue[];
  onLoadSource: (cues: SubtitleCue[], name: string) => void;
  fileName: string;
  onProceed: () => void;
  onLoadFullSample: () => void;
}

export const SrtUploader: React.FC<SrtUploaderProps> = ({
  cues,
  onLoadSource,
  fileName,
  onProceed,
  onLoadFullSample,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (text: string, name: string) => {
    try {
      setParseError(null);
      const parsed = parseSRT(text, true);
      if (parsed.length === 0) {
        setParseError('Δεν βρέθηκαν έγκυροι υπότιτλοι .srt. Ελέγξτε τη μορφή του αρχείου.');
        return;
      }
      onLoadSource(parsed, name);
      setPasteText('');
    } catch (err: any) {
      setParseError(`Σφάλμα κατά την ανάγνωση: ${err.message || 'Μη έγκυρο αρχείο SRT'}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleFileProcess(content, file.name);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleFileProcess(content, file.name);
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    handleFileProcess(pasteText, 'pasted-subtitles.srt');
  };

  const loadEnglishSampleOnly = () => {
    handleFileProcess(SAMPLE_ENGLISH_SRT, 'sample-action-dialogue.srt');
  };

  const durationSeconds = cues.length > 0 ? cues[cues.length - 1].endSeconds - cues[0].startSeconds : 0;
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Introduction banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Βήμα 1: Επιλογή Αγγλικών Υποτίτλων (.srt)</h2>
            <p className="text-sm text-slate-400 mt-1">
              Ανεβάστε το αρχείο υποτίτλων στα Αγγλικά. Το εργαλείο θα αναλύσει τα timestamps και θα ετοιμάσει το εξειδικευμένο prompt για το <strong>Google AI Studio Chat</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadEnglishSampleOnly}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4 text-amber-400" />
              <span>Φόρτωση Αγγλικού Δείγματος</span>
            </button>
            <button
              onClick={onLoadFullSample}
              className="px-3.5 py-2 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-2"
              title="Φορτώνει άμεσα και αγγλικούς και ελληνικούς υποτίτλους για άμεση δοκιμή του editor"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Πλήρης Δοκιμή (EN + GR)</span>
            </button>
          </div>
        </div>
      </div>

      {parseError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>{parseError}</div>
        </div>
      )}

      {/* Upload Zone & Paste Option Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
            isDragging
              ? 'border-amber-400 bg-amber-500/5'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/30 hover:bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base font-medium text-white mb-1">
            Σύρετε εδώ το αρχείο .srt ή κάντε κλικ
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Υποστηρίζονται αρχεία .srt και .txt με καθαρή κωδικοποίηση UTF-8
          </p>
          <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 font-mono">
            .srt / .txt
          </span>
        </div>

        {/* Raw Text Paste */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="srt-paste" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Ή επικολλήστε απευθείας κείμενο SRT</span>
              </label>
              <span className="text-xs text-slate-400">Ctrl+V</span>
            </div>
            <textarea
              id="srt-paste"
              rows={7}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;Example subtitle line here...&#10;&#10;2&#10;00:00:04,500 --> 00:00:07,000&#10;Next line..."
              className="w-full font-mono text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg p-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-colors"
            >
              Ανάλυση Επικολλημένου SRT
            </button>
          </div>
        </div>
      </div>

      {/* If file is loaded: display stats and preview */}
      {cues.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Φορτώθηκε επιτυχώς
                </span>
                <span className="text-sm font-semibold text-white">{fileName}</span>
              </div>
            </div>

            <button
              onClick={onProceed}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Βήμα 2: Δημιουργία Prompt για AI Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>Υπότιτλοι (Cues)</span>
              </div>
              <div className="text-xl font-semibold text-white font-mono">{cues.length}</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Διάρκεια</span>
              </div>
              <div className="text-xl font-semibold text-white font-mono">{formatDuration(durationSeconds)}</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Πρώτος Χρονισμός</div>
              <div className="text-sm font-semibold text-slate-200 font-mono">{cues[0]?.startTime}</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Τελευταίος Χρονισμός</div>
              <div className="text-sm font-semibold text-slate-200 font-mono">{cues[cues.length - 1]?.endTime}</div>
            </div>
          </div>

          {/* Sample Snippet View */}
          <div className="mt-3">
            <span className="text-xs font-medium text-slate-400 block mb-2">Προεπισκόπηση πρώτων υποτίτλων:</span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cues.slice(0, 3).map((cue) => (
                <div key={cue.id} className="text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-amber-400 font-bold mr-2">#{cue.id}</span>
                    <span className="text-slate-300 whitespace-pre-wrap">{cue.originalText}</span>
                  </div>
                  <span className="text-slate-400 shrink-0 text-[11px]">{cue.startTime} → {cue.endTime}</span>
                </div>
              ))}
              {cues.length > 3 && (
                <div className="text-center text-xs text-slate-400 py-1">
                  ... και άλλοι {cues.length - 3} υπότιτλοι έτοιμοι για μετάφραση.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
