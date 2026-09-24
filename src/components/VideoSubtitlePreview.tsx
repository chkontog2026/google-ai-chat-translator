import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Volume1,
  VolumeX,
  Video,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import { secondsToTimecode } from '../utils/srtParser';

interface VideoSubtitlePreviewProps {
  cues: SubtitleCue[];
  currentCueIndex: number;
  seekRequest?: { time: number } | null;
  onSelectCue: (index: number) => void;
  activeTime: number;
  setActiveTime: React.Dispatch<React.SetStateAction<number>>;
  videoFileName?: string | null;
  onVideoLoaded?: (name: string) => void;
}

export const VideoSubtitlePreview: React.FC<VideoSubtitlePreviewProps> = ({
  cues,
  currentCueIndex,
  seekRequest,
  onSelectCue,
  activeTime,
  setActiveTime,
  videoFileName: propVideoFileName,
  onVideoLoaded,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(propVideoFileName || null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasAudioCodecNotice, setHasAudioCodecNotice] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showBilingual, setShowBilingual] = useState(false);
  const [subColor, setSubColor] = useState<'yellow' | 'white'>('yellow');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seekRequest && videoRef.current) videoRef.current.currentTime = seekRequest.time;
  }, [seekRequest]);
  useEffect(() => () => { if (videoFileUrl) URL.revokeObjectURL(videoFileUrl); }, [videoFileUrl]);

  // Total duration from cues or video duration
  const maxCuesTime = cues.length > 0 ? cues[cues.length - 1].endSeconds + 2 : 60;
  const maxTime = videoDuration && videoDuration > 0 ? videoDuration : maxCuesTime;

  // Find active cue at current time
  const currentActiveCue = cues.find(
    (c) => activeTime >= c.startSeconds && activeTime < c.endSeconds
  );

  // Simulated player tick if no video file loaded
  useEffect(() => {
    if (isPlaying && !videoFileUrl) {
      const interval = setInterval(() => {
        setActiveTime((prev) => {
          if (prev >= maxTime) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, videoFileUrl, maxTime, setActiveTime]);

  // Video time update sync
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setActiveTime(time);
      const index = cues.findIndex(c => time >= c.startSeconds && time < c.endSeconds);
      if (index >= 0 && index !== currentCueIndex) onSelectCue(index);
    }
  };

  const togglePlay = () => {
    if (videoFileUrl && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.volume = isMuted ? 0 : volume;
        videoRef.current.muted = isMuted;
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback error:', err);
            setIsPlaying(false);
          });
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (newTime: number) => {
    setActiveTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    // Update active cue in editor
    const idx = cues.findIndex((c) => newTime >= c.startSeconds && newTime <= c.endSeconds);
    if (idx !== -1) {
      onSelectCue(idx);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoDuration(null);
      setVideoFileUrl(url);
      setVideoFileName(file.name);
      onVideoLoaded?.(file.name);
      setIsPlaying(false);
      setActiveTime(0);

      // Check if file is likely MKV with AC3/DTS audio
      const isMkv = file.name.toLowerCase().endsWith('.mkv') || file.name.toLowerCase().endsWith('.avi');
      setHasAudioCodecNotice(isMkv);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setVideoDuration(videoRef.current.duration);
      }
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'sm':
        return 'text-sm md:text-base';
      case 'lg':
        return 'text-xl md:text-2xl';
      default:
        return 'text-base md:text-lg';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* Video Screen Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none group">
        {videoFileUrl ? (
          <video
            ref={videoRef}
            src={videoFileUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />
        ) : (
          /* Simulated Cinematic Stage */
          <div
            className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-black cursor-pointer"
            onClick={togglePlay}
          >
            {/* Cinematic background ambiance */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-black" />
            
            <div className="text-center p-6 z-10 pointer-events-none">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3 text-amber-400">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </div>
              <p className="text-xs text-slate-400">
                {isPlaying ? 'Προεπισκόπηση σε αναπαραγωγή...' : 'Κάντε κλικ για προεπισκόπηση συγχρονισμού'}
              </p>
            </div>
          </div>
        )}

        {/* Real-time Subtitle Overlay on Screen */}
        {currentActiveCue && (
          <div className="absolute bottom-6 left-4 right-4 flex flex-col items-center justify-center text-center pointer-events-none z-20 transition-all">
            {showBilingual &&
              currentActiveCue.originalText &&
              currentActiveCue.originalText !== currentActiveCue.translatedText && (
                <div className="text-xs md:text-sm text-slate-300 italic mb-1 px-3 py-0.5 rounded bg-black/60 backdrop-blur-xs font-sans">
                  {currentActiveCue.originalText}
                </div>
              )}

            <div
              className={`font-semibold tracking-wide px-3.5 py-1 rounded-md bg-black/75 backdrop-blur-xs font-sans whitespace-pre-wrap leading-snug drop-shadow-md ${
                subColor === 'yellow' ? 'text-amber-300' : 'text-white'
              } ${getFontSizeClass()}`}
            >
              {currentActiveCue.translatedText || currentActiveCue.originalText}
            </div>
          </div>
        )}

        {/* Video Upload trigger overlay in top-right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-[11px] font-medium bg-black/70 hover:bg-black/90 text-slate-200 border border-slate-700/80 rounded-md backdrop-blur-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Φορτώστε δικό σας βίντεο (MP4/MKV) από τον υπολογιστή για πραγματικό έλεγχο"
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>{videoFileUrl ? 'Αλλαγή Βίντεο' : 'Φόρτωση Τοπικού Βίντεο'}</span>
          </button>
        </div>

        {/* Current Time Badge */}
        <div className="absolute top-3 left-3 text-[11px] font-mono bg-black/70 px-2 py-0.5 rounded text-amber-400 border border-slate-800 backdrop-blur-sm z-30">
          {secondsToTimecode(activeTime)}
        </div>
      </div>

      {/* Codec notice if user uploaded an MKV / video file */}
      {hasAudioCodecNotice && (
        <div className="px-3 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-300/90 leading-tight">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Σημείωση ήχου:</strong> Τα αρχεία <code>.mkv</code> περιέχουν συχνά ήχο <strong>Dolby AC3 / DTS</strong>, τον οποίο οι web browsers (Chrome, Edge) δεν μπορούν να αναπαράγουν εκ φύσεως. Για πλήρη ήχο στον browser, προτιμήστε αρχεία <code>.mp4</code> (με ήχο AAC/MP3) ή βεβαιωθείτε ότι ο ήχος παρακάτω δεν είναι σε σίγαση.
          </span>
        </div>
      )}

      {/* Media Controls Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
        {/* Scrubber timeline */}
        <div className="flex items-center gap-3">
          <input
            aria-label="Χρόνος αναπαραγωγής"
            type="range"
            min="0"
            max={maxTime || 100}
            step="0.05"
            value={activeTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Buttons & Subtitle customization */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              aria-label={isPlaying ? 'Παύση' : 'Αναπαραγωγή'}
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => handleSeek(0)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Επαναφορά στην αρχή"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Volume / Mute Slider */}
            {videoFileUrl && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                <button
                  onClick={toggleMute}
                  className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Κατάργηση σίγασης' : 'Σίγαση'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-3.5 h-3.5 text-slate-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-14 sm:w-16 h-1 accent-amber-500 bg-slate-800 rounded-lg cursor-pointer appearance-none"
                  title={`Ένταση: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            )}

            <span className="font-mono text-slate-400 text-[11px] ml-1">
              {secondsToTimecode(activeTime)} / {secondsToTimecode(maxTime)}
            </span>
          </div>

          {/* Subtitle Appearance Toggles */}
          <div className="flex items-center gap-3 text-slate-400">
            {/* Color */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md border border-slate-800">
              <button
                onClick={() => setSubColor('yellow')}
                className={`w-4 h-4 rounded-full bg-amber-400 border transition-all ${
                  subColor === 'yellow' ? 'ring-2 ring-amber-400/50 scale-110' : 'opacity-60'
                }`}
                title="Κίτρινοι υπότιτλοι (Cinema)"
              />
              <button
                onClick={() => setSubColor('white')}
                className={`w-4 h-4 rounded-full bg-white border transition-all ${
                  subColor === 'white' ? 'ring-2 ring-white/50 scale-110' : 'opacity-60'
                }`}
                title="Λευκοί υπότιτλοι"
              />
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800 text-[10px]">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`px-1.5 py-0.5 rounded uppercase font-mono ${
                    fontSize === sz ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Bilingual toggle */}
            <button
              onClick={() => setShowBilingual(!showBilingual)}
              className={`px-2 py-1 rounded text-[11px] border transition-colors flex items-center gap-1 ${
                showBilingual
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Εμφάνιση και αγγλικού και ελληνικού κειμένου στην οθόνη"
            >
              <Eye className="w-3 h-3" />
              <span>Δίγλωσσο</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
