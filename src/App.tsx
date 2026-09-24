/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SrtUploader } from './components/SrtUploader';
import { ChatPromptGenerator } from './components/ChatPromptGenerator';
import { PasteImporter } from './components/PasteImporter';
import { SubtitleEditor } from './components/SubtitleEditor';
import { VideoSubtitlePreview } from './components/VideoSubtitlePreview';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { SubtitleCue, PromptConfig } from './types/subtitle';
import { restoreProject, decodeProject, STORAGE_KEY, defaultConfig, type ProjectData } from './utils/projectStorage';
import { qualityIssues } from './utils/translationWorkflow';
import { downloadSubtitleFile, parseSRT, mergeOriginalAndTranslation } from './utils/srtParser';
import { SAMPLE_ENGLISH_SRT, SAMPLE_GREEK_SRT } from './utils/sampleData';

export default function App() {
  const [restored] = useState(restoreProject);
  const [pendingAction, setPendingAction] = useState<{ message: string; run: () => void } | null>(null);
  const [storageLocked, setStorageLocked] = useState(!!restored.error);
  const [saveStatus, setSaveStatus] = useState(restored.error || 'Αυτόματη αποθήκευση ενεργή');
  const [inputText, setInputText] = useState(restored.project?.inputText || '');
  const [activeStep, setActiveStep] = useState<number>(restored.project?.activeStep || 1);
  const [cues, setCues] = useState<SubtitleCue[]>(restored.project?.cues || []);
  const [fileName, setFileName] = useState<string>(restored.project?.fileName || 'subtitles.srt');
  const [videoFileName, setVideoFileName] = useState<string | null>(restored.project?.videoFileName || null);
  const [activeCueIndex, setActiveCueIndex] = useState<number>(0);
  const [seekRequest, setSeekRequest] = useState<{ time: number } | null>(null);
  const [activeTime, setActiveTime] = useState<number>(0);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const [promptConfig, setPromptConfig] = useState<PromptConfig>(restored.project?.promptConfig || defaultConfig);
  const project: ProjectData = { version: 1, cues, fileName, promptConfig, activeStep, inputText, videoFileName };
  useEffect(() => {
    if (storageLocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, cues, fileName, promptConfig, activeStep, inputText, videoFileName }));
      setSaveStatus('Αποθηκεύτηκε τοπικά σε αυτόν τον browser');
    } catch { setSaveStatus('Η αυτόματη αποθήκευση απέτυχε. Κατεβάστε αρχείο εργασίας για να μη χαθεί η πρόοδος.'); }
  }, [cues, fileName, promptConfig, activeStep, inputText, videoFileName, storageLocked]);
  const loadProject = (p: ProjectData) => {
    setSeekRequest(null); setCues(p.cues); setFileName(p.fileName); setPromptConfig(p.promptConfig);
    setActiveStep(p.activeStep); setInputText(p.inputText); setVideoFileName(p.videoFileName);
    setActiveCueIndex(0); setActiveTime(0); setStorageLocked(false);
  };
  const loadSource = (next: SubtitleCue[]) => {
    setCues(next); setPromptConfig(c => ({ ...c, currentChunkIndex: 0, repairOnly: false }));
    setInputText(''); setActiveCueIndex(0); setActiveTime(0); setVideoFileName(null);
  };


  const requestReplace = (message: string, run: () => void) => {
    if (cues.length || inputText || storageLocked) setPendingAction({ message, run });
    else run();
  };
  const acceptSource = (next: SubtitleCue[], name: string) => requestReplace(
    'Να αντικατασταθεί η τρέχουσα εργασία από το νέο αρχικό SRT; Κατεβάστε πρώτα αντίγραφο αν θέλετε να κρατήσετε την πρόοδο.',
    () => { loadSource(next); setFileName(name); setStorageLocked(false); }
  );
  // Handler for loading full sample (both EN and GR)
  const handleLoadFullSample = () => {

    const parsedOriginal = parseSRT(SAMPLE_ENGLISH_SRT, true);
    const { mergedCues } = mergeOriginalAndTranslation(parsedOriginal, SAMPLE_GREEK_SRT);
    requestReplace('Να αντικατασταθεί η τρέχουσα εργασία με το δείγμα;', () => {
      loadSource(mergedCues); setFileName('sample-action-movie.srt'); setActiveStep(4); setStorageLocked(false);
    });
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

      <div className="max-w-7xl w-full mx-auto px-4 pt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span role="status" className={saveStatus.includes('απέτυχε') || storageLocked ? 'text-amber-300' : 'text-slate-400'}>{saveStatus}</span>
          <button className="secondary" onClick={() => downloadSubtitleFile(JSON.stringify(project, null, 2), fileName.replace(/\.srt$/i, '') + '.subgreek.json')}>Λήψη εργασίας</button>
          <label className="secondary cursor-pointer">Φόρτωση εργασίας<input className="sr-only" type="file" accept=".json" aria-label="Φόρτωση εργασίας" onChange={async e => {
            const file = e.target.files?.[0];
            if (file) try {
              const p = decodeProject(await file.text());
              requestReplace('Να αντικατασταθεί η τρέχουσα εργασία από το αντίγραφο;', () => loadProject(p));
            } catch (error) { setSaveStatus(error instanceof Error ? error.message : 'Αποτυχία φόρτωσης.'); }
            e.target.value = '';
          }} /></label>
          <button className="secondary" onClick={() => {
            requestReplace('Νέα εργασία; Κατεβάστε πρώτα αντίγραφο αν θέλετε να κρατήσετε την τρέχουσα πρόοδο.', () => loadProject({ version: 1, cues: [], fileName: 'subtitles.srt', promptConfig: defaultConfig, activeStep: 1, inputText: '', videoFileName: null }));
          }}>Νέα εργασία</button>
        </div>
        <p className="text-xs text-slate-500">Το βίντεο δεν αποθηκεύεται. Μετά από ανανέωση, επιλέξτε το ξανά. Η λήψη εργασίας κρατά ανεξάρτητο αντίγραφο της προόδου.</p>
      </div>
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Step 1: Upload / Input */}
        {activeStep === 1 && (
          <SrtUploader
            cues={cues}
            onLoadSource={acceptSource}
            fileName={fileName}
            onProceed={() => setActiveStep(2)}
            onLoadFullSample={handleLoadFullSample}
          />
        )}

        {/* Step 2: Google AI Studio Chat Prompt Generation */}
        {activeStep === 2 && (
          <ChatPromptGenerator
            cues={cues}
            config={promptConfig}
            setConfig={setPromptConfig}
            onGoToImport={() => setActiveStep(3)}
          />
        )}

        {/* Step 3: Validate before applying translations */}
        {activeStep === 3 && (
          <PasteImporter
            cues={cues}
            setCues={setCues}
            config={promptConfig}
            inputText={inputText}
            setInputText={setInputText}
            onRepair={() => {
              const index = cues.findIndex(c => qualityIssues(c, promptConfig.maxCharsPerLine).length > 0);
              setPromptConfig(c => ({ ...c, repairOnly: true, currentChunkIndex: index < 0 ? 0 : Math.floor(index / c.chunkSize) }));
              setActiveStep(2);
            }}
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
                    onSelectCue={setActiveCueIndex}
                    seekRequest={seekRequest}
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
                      Κάνοντας κλικ σε οποιονδήποτε υπότιτλο στον πίνακα δεξιά, η αναπαραγωγή μεταβαίνει στον αρχικό χρόνο έναρξής του.
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
                      setSeekRequest({ time: cues[idx].startSeconds });
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

      {pendingAction && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <section role="dialog" aria-modal="true" aria-label="Αντικατάσταση εργασίας" className="panel max-w-lg space-y-4">
          <p>{pendingAction.message}</p>
          <div className="flex flex-wrap gap-3">
            <button className="secondary" onClick={() => setPendingAction(null)}>Ακύρωση</button>
            <button className="secondary" onClick={() => downloadSubtitleFile(JSON.stringify(project, null, 2), fileName.replace(/\.srt$/i, '') + '.subgreek.json')}>Λήψη αντιγράφου πριν την αλλαγή</button>
            <button className="primary" onClick={() => { pendingAction.run(); setPendingAction(null); }}>Αντικατάσταση εργασίας</button>
          </div>
        </section>
      </div>}
      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        cues={cues}
        originalFileName={fileName}
        maxCharsPerLine={promptConfig.maxCharsPerLine}
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
          <span className="font-mono text-[11px] text-slate-400">Τοπική επεξεργασία • Διατήρηση αρχικών χρονισμών</span>
        </div>
      </footer>
    </div>
  );
}
