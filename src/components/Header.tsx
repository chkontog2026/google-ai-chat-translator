import React from 'react';
import { Sparkles, ExternalLink, Film, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeStep: number;
  setActiveStep: (step: number) => void;
  totalCues: number;
  translatedCuesCount: number;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeStep,
  setActiveStep,
  totalCues,
  translatedCuesCount,
  onOpenHelp,
}) => {
  const steps = [
    { id: 1, label: '1. Αρχείο SRT', status: totalCues > 0 ? `${totalCues} υπότιτλοι` : 'Κενό' },
    { id: 2, label: '2. Google AI Studio Chat', status: 'Έτοιμο prompt' },
    { id: 3, label: '3. Εισαγωγή Απάντησης', status: translatedCuesCount > 0 ? `${translatedCuesCount}/${totalCues}` : 'Εκκρεμεί' },
    { id: 4, label: '4. Έλεγχος & Video Sync', status: 'Editor' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
              <Film className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-white tracking-tight">SubGreek Studio</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono border border-slate-700">
                  AI Studio Companion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Φυσική μετάφραση SRT στα Ελληνικά με ακριβείς χρονισμούς
              </p>
            </div>
          </div>

          {/* Quick External Link & Help */}
          <div className="flex items-center gap-3">
            <a
              href="https://aistudio.google.com/prompts/new_chat"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
              title="Άνοιγμα του δωρεάν Google AI Studio Chat"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google AI Studio Chat</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>

            <button
              onClick={onOpenHelp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Οδηγίες Χρήσης</span>
            </button>
          </div>
        </div>

        {/* Step Navigation Bar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 py-2.5 overflow-x-auto no-scrollbar gap-2">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            const isCompleted =
              (step.id === 1 && totalCues > 0) ||
              (step.id === 3 && translatedCuesCount === totalCues && totalCues > 0);

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : isCompleted
                    ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <span>{step.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
