import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Sliders,
  Sparkles,
  Layers,
  FileCheck,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { SubtitleCue, PromptConfig, TranslationTone } from '../types/subtitle';
import { generateBatchPrompt, getToneDescription } from '../utils/promptGenerator';

interface ChatPromptGeneratorProps {
  cues: SubtitleCue[];
  config: PromptConfig;
  setConfig: React.Dispatch<React.SetStateAction<PromptConfig>>;
  onGoToImport: () => void;
}

export const ChatPromptGenerator: React.FC<ChatPromptGeneratorProps> = ({
  cues,
  config,
  setConfig,
  onGoToImport,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate chunks
  const totalChunks = config.chunkSize > 0 && cues.length > config.chunkSize
    ? Math.ceil(cues.length / config.chunkSize)
    : 1;

  // Generate current prompt
  const { promptText, label, chunkCues } = useMemo(() => {
    return generateBatchPrompt(cues, config, config.currentChunkIndex, totalChunks);
  }, [cues, config, totalChunks]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const tones: { id: TranslationTone; label: string; sub: string }[] = [
    { id: 'natural_spoken', label: 'Φυσική Καθομιλουμένη', sub: 'Ιδανικό για ταινίες, σειρές & διαλόγους' },
    { id: 'youth_slang', label: 'Νεανική / Slang', sub: 'Αυθόρμητες ατάκες, σύγχρονη αργκό' },
    { id: 'humor_sitcom', label: 'Κωμωδία / Sitcom', sub: 'Προσαρμογή λογοπαιγνίων & έξυπνο χιούμορ' },
    { id: 'action_punchy', label: 'Δράση / Κοφτό', sub: 'Σύντομες, δυναμικές ατάκες υψηλής έντασης' },
    { id: 'formal_doc', label: 'Επίσημο / Ντοκιμαντέρ', sub: 'Ακριβές λεξιλόγιο για ντοκιμαντέρ & συνεντεύξεις' },
  ];

  return (
    <div className="space-y-6">
      {/* Visual Workflow Explainer */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">
            Πώς λειτουργεί μέσω του Google AI Studio Chat (Χωρίς API Key):
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">1</span>
                <span>Αντιγράψτε το Prompt</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Περιέχει αυστηρές οδηγίες διατήρησης χρονισμών, φυσικής ελληνικής γλώσσας και τις ατάκες σας.
              </p>
            </div>
            <button
              onClick={handleCopy}
              className={`mt-3 w-full py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                copied ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Αντιγράφηκε!' : 'Αντιγραφή Prompt'}</span>
            </button>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">2</span>
                <span>Άνοιγμα AI Studio Chat</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Επικολλήστε (Ctrl+V) στο Google AI Studio Chat (προτείνεται Gemini 1.5 Pro ή Flash) και πατήστε Run.
              </p>
            </div>
            <a
              href="https://aistudio.google.com/prompts/new_chat"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full py-1.5 px-3 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Άνοιγμα AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">3</span>
                <span>Επικόλληση & Auto-Fix</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Επικολλήστε την απάντηση στο Βήμα 3. Το σύστημα ανακτά αυτόματα τους αρχικούς χρονισμούς.
              </p>
            </div>
            <button
              onClick={onGoToImport}
              className="mt-3 w-full py-1.5 px-3 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Μετάβαση στο Βήμα 3</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tone & Subtitling Settings */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Προσαρμογή Ύφους & Κανόνων Υποτιτλισμού</h3>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-amber-400 hover:underline cursor-pointer"
          >
            {showAdvanced ? 'Απόκρυψη προηγμένων' : 'Προηγμένες ρυθμίσεις & Γλωσσάρι'}
          </button>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-2">
            Ύφος Ελληνικής Γλώσσας:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {tones.map((t) => (
              <button
                key={t.id}
                onClick={() => setConfig({ ...config, tone: t.id })}
                className={`p-3 rounded-lg text-left transition-all border cursor-pointer ${
                  config.tone === t.id
                    ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>{t.label}</span>
                  {config.tone === t.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">{t.sub}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 italic">
            💡 {getToneDescription(config.tone)}
          </div>
        </div>

        {/* Advanced Settings Drawer */}
        {showAdvanced && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Πληθυντικός / Ενικός:</label>
                <select
                  value={config.politeness}
                  onChange={(e) => setConfig({ ...config, politeness: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="auto">Αυτόματο (Ανάλογα με το περιεχόμενο)</option>
                  <option value="informal">Ενικός (Ανεπίσημο / Καθημερινό)</option>
                  <option value="formal">Πληθυντικός Ευγενείας (Επίσημο)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Μέγιστοι χαρακτήρες / γραμμή:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="32"
                    max="45"
                    value={config.maxCharsPerLine}
                    onChange={(e) => setConfig({ ...config, maxCharsPerLine: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="font-mono text-amber-400 font-bold w-6">{config.maxCharsPerLine}</span>
                </div>
                <span className="text-[10px] text-slate-400">Πρότυπο cinema: 37-40 χαρακτήρες</span>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Κατάτμηση (Chunks):</label>
                <select
                  value={config.chunkSize}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      chunkSize: parseInt(e.target.value, 10),
                      currentChunkIndex: 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="0">Όλοι οι υπότιτλοι (1 Prompt)</option>
                  <option value="50">50 υπότιτλοι ανά μέρος</option>
                  <option value="100">100 υπότιτλοι ανά μέρος</option>
                  <option value="150">150 υπότιτλοι ανά μέρος</option>
                </select>
              </div>
            </div>

            {/* Custom Glossary */}
            <div>
              <label className="text-slate-300 font-medium flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Ειδικό Γλωσσάρι / Ονόματα Χαρακτήρων (Προαιρετικό):</span>
              </label>
              <textarea
                rows={2}
                value={config.customGlossary}
                onChange={(e) => setConfig({ ...config, customGlossary: e.target.value })}
                placeholder="π.χ.&#10;Tony: Τόνι&#10;Mainframe: Κεντρικός διακομιστής&#10;Starfleet: Αστροστόλος"
                className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Chunk navigation if chunking is enabled */}
      {totalChunks > 1 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-white">Μέρος {config.currentChunkIndex + 1} από {totalChunks}</span>
            <span className="text-xs text-slate-400 font-mono">({chunkCues.length} υπότιτλοι)</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: totalChunks }).map((_, i) => (
              <button
                key={i}
                onClick={() => setConfig({ ...config, currentChunkIndex: i })}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  config.currentChunkIndex === i
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Μέρος {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ready-to-copy Prompt View */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Έτοιμο Prompt για Επικόλληση:</span>
            <span className="text-xs text-slate-400 font-mono">({label})</span>
          </div>

          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Αντιγράφηκε στο πρόχειρο!' : 'Αντιγραφή Ολόκληρου Prompt'}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="w-full max-h-72 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-[11px] text-slate-300 whitespace-pre-wrap select-all leading-relaxed">
            {promptText}
          </pre>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            Χαρακτήρες: <span className="font-mono text-slate-200">{promptText.length.toLocaleString()}</span> | Περιλαμβάνει {chunkCues.length} υπότιτλους.
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://aistudio.google.com/prompts/new_chat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 transition-colors"
            >
              <span>Άνοιγμα AI Studio Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onGoToImport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <span>Συνέχεια στο Βήμα 3</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
