/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { SrtUploader } from './components/SrtUploader';
import { ChatPromptGenerator } from './components/ChatPromptGenerator';
import { PasteImporter } from './components/PasteImporter';
import { SubtitleEditor } from './components/SubtitleEditor';
import { VideoSubtitlePreview } from './components/VideoSubtitlePreview';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { SubtitleCue, PromptConfig } from './types/subtitle';
import { parseSRT, mergeOriginalAndTranslation } from './utils/srtParser';
import { SAMPLE_ENGLISH_SRT, SAMPLE_GREEK_SRT } from './utils/sampleData';

export default function App() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [fileName, setFileName] = useState<string>('subtitles.srt');
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [activeCueIndex, setActiveCueIndex] = useState<number>(0);
  const [activeTime, setActiveTime] = useState<number>(0);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    tone: 'natural_spoken',
    politeness: 'auto',
    maxCharsPerLine: 38,
    preserveTags: true,
    preserveBrackets: true,
    customGlossary: '',
    chunkSize: 0,
    currentChunkIndex: 0,
  });

  // Handler for loading full sample (both EN and GR)
  const handleLoadFullSample = () => {
    const parsedOriginal = parseSRT(SAMPLE_ENGLISH_SRT, true);
    const { mergedCues } = mergeOriginalAndTranslation(parsedOriginal, SAMPLE_GREEK_SRT);
    setCues(mergedCues);
    setFileName('sample-action-movie.srt');
    setActiveStep(4); // Jump straight to editor & video preview
    setActiveCueIndex(0);
    setActiveTime(0);
  };

  const translatedCuesCount = cues.filter((c) => !!c.translatedText?.trim()).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation & Status */}
      <Header
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        totalCues={cues.length}
        translatedCuesCount={translatedCuesCount}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Step 1: Upload / Input */}
        {activeStep === 1 && (
          <SrtUploader
            cues={cues}
            setCues={setCues}
            fileName={fileName}
            setFileName={setFileName}
            onProceed={() => setActiveStep(2)}
            onLoadFullSample={handleLoadFullSample}
          />
        )}

        {/* Step 2: Google AI Studio Chat Prompt Generation */}
        {activeStep === 2 && (
          <ChatPromptGenerator
            cues={cues.length > 0 ? cues : parseSRT(SAMPLE_ENGLISH_SRT, true)}
            config={promptConfig}
            setConfig={setPromptConfig}
            onGoToImport={() => setActiveStep(3)}
          />
        )}

        {/* Step 3: Paste Response & Auto-Repair */}
        {activeStep === 3 && (
          <PasteImporter
            cues={cues}
            setCues={setCues}
            onProceedToEditor={() => setActiveStep(4)}
          />
        )}

        {/* Step 4: Side-by-Side Editor & Video Sync Preview */}
        {activeStep === 4 && (
          <div className="space-y-6">
            {/* Split view: Video Preview Stage on Top / Side, Subtitle Editor below */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Video Player & Subtitle Sync Display */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-24">
                  <VideoSubtitlePreview
                    cues={cues}
                    currentCueIndex={activeCueIndex}
                    onSelectCue={(idx) => {
                      setActiveCueIndex(idx);
                      if (cues[idx]) {
                        setActiveTime(cues[idx].startSeconds);
                      }
                    }}
                    activeTime={activeTime}
                    setActiveTime={setActiveTime}
                    videoFileName={videoFileName}
                    onVideoLoaded={setVideoFileName}
                  />

                  <div className="mt-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                    <p className="flex items-center gap-1.5 font-medium text-slate-300 mb-1">
                      💡 Συγχρονισμός σε πραγματικό χρόνο:
                    </p>
                    <span>
                      Κάνοντας κλικ σε οποιονδήποτε υπότιτλο στον πίνακα δεξιά, η αναπαραγωγή μεταβαίνει αυτόματα στο ακριβές χιλιοστό του δευτερολέπτου.
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtitle Side-by-Side Editor */}
              <div className="lg:col-span-7">
                <SubtitleEditor
                  cues={cues}
                  setCues={setCues}
                  activeCueIndex={activeCueIndex}
                  onSelectCue={(idx) => {
                    setActiveCueIndex(idx);
                    if (cues[idx]) {
                      setActiveTime(cues[idx].startSeconds);
                    }
                  }}
                  onOpenExport={() => setIsExportOpen(true)}
                  maxCharsPerLine={promptConfig.maxCharsPerLine}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        cues={cues}
        originalFileName={fileName}
        videoFileName={videoFileName}
      />

      {/* Help / Instructions Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SubGreek Studio — Εξειδικευμένο εργαλείο υποτιτλισμού για το Google AI Studio Chat</span>
          <span className="font-mono text-[11px] text-slate-400">100% Client-Side • Ακρίβεια Χρονισμών 0ms Drift</span>
        </div>
      </footer>
    </div>
  );
}
