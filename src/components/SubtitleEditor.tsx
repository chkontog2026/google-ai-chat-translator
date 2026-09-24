import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Replace,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit3,
  Download,
  Filter,
  Play,
  ArrowUpDown,
  Sparkles,
  Copy,
  Check,
  FileText,
  Upload,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import { qualityIssues } from '../utils/translationWorkflow';
import { calculateCPS, parseSRT } from '../utils/srtParser';

interface SubtitleEditorProps {
  cues: SubtitleCue[];
  setCues: React.Dispatch<React.SetStateAction<SubtitleCue[]>>;
  activeCueIndex: number;
  onSelectCue: (index: number) => void;
  onOpenExport: () => void;
  maxCharsPerLine?: number;
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  cues,
  setCues,
  activeCueIndex,
  onSelectCue,
  onOpenExport,
  maxCharsPerLine = 40,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'warning'>('all');
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const englishFileInputRef = useRef<HTMLInputElement>(null);

  // Check if original English text is present and differs from translation
  const hasAnyOriginal = useMemo(() => {
    return cues.some(
      (c) => Boolean(c.originalText && c.originalText.trim() && c.originalText !== c.translatedText)
    );
  }, [cues]);

  // Handler for attaching the English original SRT
  const handleAttachEnglish = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsedEnglish = parseSRT(content, true);
        setCues(prev => prev.map(cue => {
          const matches = parsedEnglish.filter(p => p.startTime === cue.startTime && p.endTime === cue.endTime);
          return matches.length === 1 ? { ...cue, originalText: matches[0].originalText, needsReview: true } : cue;
        }));
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Update a specific cue's translation
  const handleTextChange = (id: number, newText: string) => {
    setCues((prev) =>
      prev.map((cue) => (cue.id === id ? { ...cue, translatedText: newText } : cue))
    );
  };

  // Replace all occurrences in translations
  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    setCues((prev) =>
      prev.map((cue) => {
        if (!cue.translatedText) return cue;
        return {
          ...cue,
          translatedText: cue.translatedText.replace(regex, () => replaceQuery),
        };
      })
    );
  };

  // Copy cue text
  const handleCopyText = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter cues
  const filteredCues = useMemo(() => {
    return cues.filter((cue) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        cue.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cue.translatedText && cue.translatedText.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Category filter
      if (filterMode === 'missing') {
        return !cue.translatedText || !cue.translatedText.trim();
      }

      if (filterMode === 'warning') return qualityIssues(cue, maxCharsPerLine).length > 0;

      return true;
    });
  }, [cues, searchQuery, filterMode, maxCharsPerLine]);

  const pageCount = Math.max(1, Math.ceil(filteredCues.length / 50));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const visibleCues = filteredCues.slice(currentPage * 50, (currentPage + 1) * 50);
  useEffect(() => { setPageIndex(0); }, [searchQuery, filterMode]);
  useEffect(() => {
    const selectedId = cues[activeCueIndex]?.id;
    const position = filteredCues.findIndex(c => c.id === selectedId);
    if (position >= 0) setPageIndex(Math.floor(position / 50));
  }, [activeCueIndex]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = 0; }, [currentPage, searchQuery, filterMode]);

  // Overall stats
  const totalCues = cues.length;
  const translatedCount = cues.filter((c) => !!c.translatedText?.trim()).length;
  const missingCount = totalCues - translatedCount;

  return (
    <div className="space-y-4">
      {/* Hidden file input for attaching original English SRT */}
      <input
        ref={englishFileInputRef}
        type="file"
        accept=".srt,.txt"
        onChange={handleAttachEnglish}
        className="hidden"
      />

      {/* Top Action Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Όλοι ({totalCues})
          </button>
          <button
            onClick={() => setFilterMode('missing')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterMode === 'missing'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Χωρίς μετάφραση ({missingCount})
          </button>
          <button
            onClick={() => setFilterMode('warning')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterMode === 'warning'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Χρειάζονται έλεγχο
          </button>
        </div>

        {/* Right: Attach English, Search & Replace Toggle and Export Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {!hasAnyOriginal && (
            <button
              onClick={() => englishFileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Φορτώστε το αρχικό αγγλικό .srt για να εμφανίζονται τα Αγγλικά δίπλα στα Ελληνικά"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Φόρτωση Αγγλικού SRT (για σύγκριση)</span>
            </button>
          )}

          <button
            onClick={() => setShowSearchReplace(!showSearchReplace)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              showSearchReplace
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Εύρεση & Αντικατάσταση</span>
          </button>

          <button
            onClick={onOpenExport}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Εξαγωγή .SRT / .VTT</span>
          </button>
        </div>
      </div>

      {/* Helpful banner when only Greek subtitles are present */}
      {!hasAnyOriginal && (
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Εμφανίζονται οι <strong>Ελληνικοί Υπότιτλοι</strong>. Αν θέλετε σύγκριση δίπλα-δίπλα με τα αρχικά Αγγλικά:
            </span>
          </div>
          <button
            onClick={() => englishFileInputRef.current?.click()}
            className="px-3 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold cursor-pointer shrink-0 transition-colors"
          >
            + Φόρτωση Αγγλικού .srt
          </button>
        </div>
      )}

      {/* Expandable Search & Replace Box */}
      {showSearchReplace && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση λέξης / όρου..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-5 relative">
            <Replace className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Αντικατάσταση με..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              onClick={handleReplaceAll}
              disabled={!searchQuery}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Όλα
            </button>
          </div>
        </div>
      )}

      {/* Subtitles List */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <button className="secondary" disabled={currentPage === 0} onClick={() => setPageIndex(currentPage - 1)}>Προηγούμενη σελίδα</button>
        <span>Σελίδα {currentPage + 1}/{pageCount} • {filteredCues.length} αποτελέσματα</span>
        <button className="secondary" disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex(currentPage + 1)}>Επόμενη σελίδα</button>
      </div>
      <div ref={listRef} className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
        {filteredCues.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 border border-slate-800/80 rounded-xl text-slate-400 text-xs">
            Δεν βρέθηκαν υπότιτλοι με τα επιλεγμένα κριτήρια.
          </div>
        ) : (
          visibleCues.map((cue, idx) => {
            const isSelected = activeCueIndex === idx;
            const duration = cue.endSeconds - cue.startSeconds;
            const text = cue.translatedText || '';
            const lines = text.split('\n');
            const maxLineLen = Math.max(...lines.map((l) => l.length), 0);
            const cps = calculateCPS(text, duration);
            const isHighCPS = cps > 21;
            const isLineTooLong = maxLineLen > maxCharsPerLine;
            const hasOriginalText = Boolean(
              cue.originalText && cue.originalText.trim() && cue.originalText !== cue.translatedText
            );

            return (
              <div
                key={cue.id}
                onClick={() => onSelectCue(idx)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header of Cue */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">#{cue.id}</span>
                    <span className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{cue.startTime} → {cue.endTime}</span>
                      <span className="text-slate-500">({duration.toFixed(1)}s)</span>
                    </span>
                  </div>

                  {/* Quality & Speed Badges */}
                  <div className="flex items-center gap-2 text-[11px]">
                    {isHighCPS && (
                      <span
                        className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 font-mono"
                        title="Υψηλή ταχύτητα ανάγνωσης για το θεατή (> 21 χαρακτήρες ανά δευτερόλεπτο)"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>{cps} CPS</span>
                      </span>
                    )}

                    {isLineTooLong && (
                      <span
                        className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono"
                        title="Γραμμή με πολλούς χαρακτήρες. Προτείνεται σπάσιμο σε 2 γραμμές με Enter."
                      >
                        {maxLineLen} χαρακτήρες
                      </span>
                    )}

                    {!cue.translatedText && (
                      <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        Εκκρεμεί
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-amber-300 mb-2 space-y-1">
                  <p>{qualityIssues(cue, maxCharsPerLine).join(' • ')}</p>
                  {cue.needsReview && <button className="secondary" onClick={e => { e.stopPropagation(); setCues(prev => prev.map(c => c.id === cue.id ? { ...c, needsReview: false } : c)); }}>Έλεγξα την αντιστοίχιση</button>}
                </div>
                {/* Content: 2-column side-by-side if original text exists, otherwise clean single-column Greek editor */}
                {hasOriginalText ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    {/* Left: English Original */}
                    <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-300 relative group">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-sans font-medium flex items-center justify-between">
                        <span>Αγγλικά (Original)</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(cue.originalText, cue.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                          title="Αντιγραφή αγγλικού κειμένου"
                        >
                          {copiedId === cue.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed select-text">
                        {cue.originalText}
                      </div>
                    </div>

                    {/* Right: Greek Editable Translation */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 focus-within:border-amber-500 transition-colors">
                      <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 font-sans font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          <span>Ελληνικά (Επεξεργάσιμο)</span>
                        </span>
                        <span className="font-mono text-slate-400 lowercase">
                          {text.length} χαρακτήρες
                        </span>
                      </div>

                      <textarea
                        aria-label={`Μετάφραση υποτίτλου ${cue.id}`}
                        rows={Math.max(2, lines.length)}
                        value={cue.translatedText || ''}
                        onChange={(e) => handleTextChange(cue.id, e.target.value)}
                        placeholder="Πληκτρολογήστε ή επικολλήστε τη μετάφραση..."
                        className="w-full bg-transparent border-0 p-0 text-emerald-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ) : (
                  /* Single Column: Clean Greek Subtitle Editor without misleading English box */
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 focus-within:border-amber-500 transition-colors font-mono text-xs">
                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1.5 font-sans font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ελληνικός Υπότιτλος (Επεξεργάσιμος)</span>
                      </span>
                      <span className="font-mono text-slate-400 lowercase">
                        {text.length} χαρακτήρες
                      </span>
                    </div>

                    <textarea
                      aria-label={`Μετάφραση υποτίτλου ${cue.id}`}
                        rows={Math.max(2, lines.length)}
                      value={cue.translatedText || ''}
                      onChange={(e) => handleTextChange(cue.id, e.target.value)}
                      placeholder="Πληκτρολογήστε ή επικολλήστε τη μετάφραση..."
                      className="w-full bg-transparent border-0 p-0 text-emerald-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
