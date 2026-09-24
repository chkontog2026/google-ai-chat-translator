import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Tv,
  FileCode,
  Globe,
  Layers,
  Sparkles,
} from 'lucide-react';
import { qualityIssues } from '../utils/translationWorkflow';
import { SubtitleCue } from '../types/subtitle';
import {
  cuesToSRT,
  cuesToVTT,
  cuesToBilingualSRT,
  downloadSubtitleFile,
} from '../utils/srtParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cues: SubtitleCue[];
  originalFileName: string;
  videoFileName?: string | null;
  maxCharsPerLine?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  cues,
  originalFileName,
  videoFileName,
  maxCharsPerLine = 38,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [exportFormat, setExportFormat] = useState<'srt' | 'srt_bom' | 'vtt' | 'bilingual'>('srt');
  const [customFilename, setCustomFilename] = useState<string>('');

  if (!isOpen) return null;

  // Derive base name prioritizing the video's actual filename, or subtitle filename
  const computeBaseName = () => {
    if (videoFileName && videoFileName.trim()) {
      return videoFileName.replace(/\.[^/.]+$/, '');
    }
    if (originalFileName && originalFileName.trim() && originalFileName !== 'subtitles.srt') {
      return originalFileName
        .replace(/\.[^/.]+$/, '')
        .replace(/\.(en|eng|english)$/i, '');
    }
    return 'video';
  };

  const baseName = computeBaseName();
  const ext = exportFormat === 'vtt' ? 'vtt' : 'srt';
  const suffix = exportFormat === 'bilingual' ? '_EL_EN' : '_EL';
  const issueCount = cues.filter(c => qualityIssues(c, maxCharsPerLine).length > 0).length;
  const suggestedFilename = `${baseName}${suffix}${issueCount ? '_DRAFT' : ''}.${ext}`;
  const finalFilename = customFilename.trim() || suggestedFilename;

  const getOutputContent = () => {
    switch (exportFormat) {
      case 'vtt':
        return cuesToVTT(cues, true);
      case 'bilingual':
        return cuesToBilingualSRT(cues);
      case 'srt':
      case 'srt_bom':
      default:
        return cuesToSRT(cues, true);
    }
  };

  const currentContent = getOutputContent();

  const handleDownload = () => {
    const withBOM = exportFormat === 'srt_bom';
    downloadSubtitleFile(currentContent, finalFilename, withBOM);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { setCopyError('Η αντιγραφή απέτυχε. Χρησιμοποιήστε τη λήψη αρχείου.'); }
  };

  const translatedCount = cues.filter((c) => !!c.translatedText?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Εξαγωγή Ελληνικών Υποτίτλων</h3>
              <p className="text-xs text-slate-400">
                {translatedCount} από {cues.length} υπότιτλοι με συμπληρωμένη μετάφραση
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {issueCount > 0 && <div role="alert" className="mx-5 mt-4 p-3 border border-amber-500/40 rounded-lg text-xs text-amber-300">
          Πρόχειρη εξαγωγή: {cues.length - translatedCount} κενές μεταφράσεις και {issueCount} εγγραφές με εκκρεμότητες/προειδοποιήσεις. Οι κενές εμφανίζονται ως [Χωρίς μετάφραση]. Διατηρούνται όλες οι αρχικές εγγραφές και οι χρόνοι τους.
        </div>}
        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Format selection cards */}
          <div>
            <label className="text-slate-300 font-semibold block mb-2">
              Επιλέξτε μορφή αρχείου:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Standard SRT */}
              <button
                onClick={() => setExportFormat('srt')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportFormat === 'srt'
                    ? 'bg-amber-500/10 border-amber-500/80 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span>Πρότυπο .SRT (UTF-8)</span>
                  </span>
                  {exportFormat === 'srt' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Ιδανικό για VLC, MPV, Plex, Stremio, κινητά και σύγχρονα media players.
                </p>
              </button>

              {/* Option 2: SRT with BOM for Smart TVs */}
              <button
                onClick={() => setExportFormat('srt_bom')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportFormat === 'srt_bom'
                    ? 'bg-amber-500/10 border-amber-500/80 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-amber-400" />
                    <span>SRT με UTF-8 BOM</span>
                  </span>
                  {exportFormat === 'srt_bom' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Συνιστάται για Smart TVs (Samsung, LG, Sony) και USB players που βγάζουν "κινέζικα/ερωτηματικά".
                </p>
              </button>

              {/* Option 3: WebVTT */}
              <button
                onClick={() => setExportFormat('vtt')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportFormat === 'vtt'
                    ? 'bg-amber-500/10 border-amber-500/80 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>WebVTT (.vtt)</span>
                  </span>
                  {exportFormat === 'vtt' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Για HTML5 web players, YouTube, Vimeo και online streaming πλατφόρμες.
                </p>
              </button>

              {/* Option 4: Bilingual Dual Subtitles */}
              <button
                onClick={() => setExportFormat('bilingual')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportFormat === 'bilingual'
                    ? 'bg-amber-500/10 border-amber-500/80 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Δίγλωσσο (Dual EN + EL)</span>
                  </span>
                  {exportFormat === 'bilingual' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Αγγλικά στην επάνω γραμμή, Ελληνικά στην κάτω. Ιδανικό για εκμάθηση γλώσσας!
                </p>
              </button>
            </div>
          </div>

          {/* Filename preview & editor */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="export-filename-input" className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Όνομα αρχείου λήψης:</span>
              </label>
              {customFilename && customFilename !== suggestedFilename && (
                <button
                  type="button"
                  onClick={() => setCustomFilename('')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  title="Επαναφορά στο προεπιλεγμένο όνομα"
                >
                  Επαναφορά ({suggestedFilename})
                </button>
              )}
            </div>

            <div className="relative">
              <input
                id="export-filename-input"
                type="text"
                value={customFilename !== '' ? customFilename : suggestedFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/90 rounded-lg px-3 py-1.5 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder={suggestedFilename}
              />
            </div>

            <p className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>* Αυτόματη ονομασία με το όνομα του βίντεό σας και κατάληξη <code>_EL.srt</code> για άμεση αναγνώριση από VLC & Smart TV.</span>
              <span className="font-mono text-slate-400 shrink-0">UTF-8</span>
            </p>
          </div>

          {/* Quick text preview */}
          <div>
            <span className="text-slate-400 block mb-1.5 font-medium">Προεπισκόπηση περιεχομένου:</span>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg max-h-40 overflow-y-auto font-mono text-[11px] text-slate-300 select-all">
              {currentContent.slice(0, 1000)}
              {currentContent.length > 1000 ? '\n... (και το υπόλοιπο αρχείο)' : ''}
            </pre>
          </div>
        </div>

        {copyError && <p role="alert" className="px-5 text-xs text-amber-300">{copyError}</p>}
        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Αντιγράφηκε!' : 'Αντιγραφή Κειμένου'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Κλείσιμο
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Λήψη Αρχείου ({exportFormat.toUpperCase()})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
