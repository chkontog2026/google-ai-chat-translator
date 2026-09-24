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
import { getBatch, qualityIssues } from '../utils/translationWorkflow';
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
  const [copyError, setCopyError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate chunks
  const totalChunks = getBatch(cues, config).total;

  // Generate current prompt
  const { promptText, label, chunkCues } = useMemo(() => {
    return generateBatchPrompt(cues, config, config.currentChunkIndex, totalChunks);
  }, [cues, config, totalChunks]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      setCopyError('Δεν ήταν δυνατή η αντιγραφή. Επιλέξτε και αντιγράψτε το κείμενο του prompt χειροκίνητα.');
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
      {copyError && <p role="alert" className="text-amber-300 text-sm">{copyError}</p>}
      <section className="panel space-y-3">
        <label htmlFor="prompt-scope" className="block text-sm font-semibold">Πόσους υπότιτλους θα στείλουμε στο chat;</label>
        <select id="prompt-scope" value={config.chunkSize}
          onChange={e => setConfig({ ...config, chunkSize: Number(e.target.value), currentChunkIndex: 0, repairOnly: false })}
          className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200">
          <option value="0">Ολόκληρο το αρχείο — ένα prompt</option>
          <option value="50">50 υπότιτλοι ανά μέρος</option>
          <option value="100">100 υπότιτλοι ανά μέρος</option>
          <option value="150">150 υπότιτλοι ανά μέρος</option>
        </select>
        {config.chunkSize === 0 && <p className="text-xs text-slate-300">
          {config.repairOnly ? 'Το prompt περιλαμβάνει τις εκκρεμείς εγγραφές από όλο το αρχείο.' : `Όλοι οι ${cues.length} υπότιτλοι περιλαμβάνονται στο ίδιο prompt, χωρίς χωρισμό σε μέρη.`}
          {' '}Σε μεγάλα αρχεία η απάντηση του chat μπορεί να κοπεί. Στο Βήμα 3 ελέγχουμε τις ελλείψεις. Αν η απάντηση είναι πλήρες, έγκυρο JSON, μπορείτε να εφαρμόσετε όσα επέστρεψε και να ζητήσετε συμπλήρωση με «Prompt διόρθωσης / ελλείψεων».
        </p>}
      </section>
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
                Μεταφράζει το κείμενο ανά σταθερό αναγνωριστικό. Η εφαρμογή κρατά τους αρχικούς χρόνους.
              </p>
            </div>
            <button
              onClick={handleCopy}
              disabled={!chunkCues.length}
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
                Επικολλήστε (Ctrl+V) στο Google AI Studio Chat και πατήστε Run.
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
                <span>Έλεγχος & Εφαρμογή</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Επικολλήστε την απάντηση στο Βήμα 3, ελέγξτε την αναφορά και εφαρμόστε τις αποδεκτές εγγραφές.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <label className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm">
        <input type="checkbox" checked={!!config.repairOnly} onChange={e => setConfig({ ...config, repairOnly: e.target.checked })} />
        Μόνο κενές εγγραφές και εγγραφές με προειδοποιήσεις {config.chunkSize === 0 ? 'σε όλο το αρχείο' : 'στο επιλεγμένο μέρος'}
      </label>
      <p className="text-xs text-slate-400">Η απάντηση θα είναι JSON. Αντιγράψτε ολόκληρο το αποτέλεσμα στο Βήμα 3. Τα ✓ δείχνουν μέρη χωρίς κενά ή προειδοποιήσεις· ο γλωσσικός έλεγχος παραμένει απαραίτητος.</p>
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
                Μέρος {i + 1}{cues.slice(i * config.chunkSize, (i + 1) * config.chunkSize).every(c => qualityIssues(c, config.maxCharsPerLine).length === 0) ? ' ✓' : ''}
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
              disabled={!chunkCues.length}
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
