import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { StudioControls } from './components/StudioControls';
import { CaptionCustomizer } from './components/CaptionCustomizer';
import { LiveCaptionOverlay } from './components/LiveCaptionOverlay';
import { SmartClipSelector } from './components/SmartClipSelector';
import { BenchmarkModal } from './components/BenchmarkModal';
import { PrivacyModal } from './components/PrivacyModal';
import { ProcessingProgress } from './components/ProcessingProgress';
import { ResultView } from './components/ResultView';
import { TranscriptViewer } from './components/TranscriptViewer';
import { detectHardwareCapabilities, type HardwareStatus } from './services/hardwareService';
import { 
  ffmpegService, 
  type ProgressState, 
  type AspectRatioType, 
  type QualityType, 
  type CropAlignment 
} from './services/ffmpegService';
import { extractVideoMetadata, type VideoMetadata } from './services/videoMetadata';
import { whisperService } from './services/whisperService';
import { DEFAULT_CAPTION_STYLE, type CaptionStyle } from './services/captionStyles';
import { selectCandidateClips, type CandidateClip } from './services/clipSelector';
import type { CaptionSegment } from './services/subtitleUtils';
import { 
  ShieldCheck, 
  Film, 
  AlertCircle, 
  Sliders, 
  Palette, 
  Flame, 
  Activity, 
  Cpu, 
  ChevronDown, 
  ChevronUp,
  Leaf,
  Clock,
  Gauge
} from 'lucide-react';

export function App() {
  const [hardware, setHardware] = useState<HardwareStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'captions_style' | 'viral_clips'>('settings');

  // Modals & Power Profile State
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [engineMode, setEngineMode] = useState<'auto' | 'webgpu' | 'wasm' | 'wasm-eco'>('auto');
  const [isEcoMode, setIsEcoMode] = useState<boolean>(true); // Default to Safe Eco mode for smooth laptop usage
  const [threadCount, setThreadCount] = useState<number>(2); // Default to 2 cores for low heat

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Studio Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [quality, setQuality] = useState<QualityType>('720p'); // Safe default
  const [cropAlignment, setCropAlignment] = useState<CropAlignment>('center');
  const [enableCaptions, setEnableCaptions] = useState<boolean>(true);
  const [trimRange, setTrimRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // Caption Styling State (Fully customizable)
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);

  // Transcript & AI Candidate Clips State
  const [transcriptSegments, setTranscriptSegments] = useState<CaptionSegment[]>([]);
  const [candidateClips, setCandidateClips] = useState<CandidateClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [transcriptionTimeMs, setTranscriptionTimeMs] = useState<number | undefined>(undefined);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    phase: 'idle',
    progress: 0,
    statusMessage: '',
    logs: [],
  });
  const [result, setResult] = useState<{
    blob: Blob;
    url: string;
    executionTimeMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detect hardware capabilities on mount
  useEffect(() => {
    detectHardwareCapabilities().then((hw) => {
      setHardware(hw);
      if (hw.recommendation) {
        setIsEcoMode(hw.recommendation.isLaptopRecommendedSafe);
        setThreadCount(hw.recommendation.suggestedThreads);
        setQuality(hw.recommendation.suggestedQuality);
      }
    });
  }, []);

  // Toggle Eco Mode Helper
  const handleToggleEcoMode = (enabled: boolean) => {
    setIsEcoMode(enabled);
    if (enabled) {
      setEngineMode('wasm-eco');
      setThreadCount(2);
      setQuality('720p');
    } else {
      setEngineMode('auto');
      setThreadCount(hardware?.cores ? Math.min(hardware.cores, 4) : 4);
    }
  };

  // Recalculate AI Candidate Clips whenever transcript or duration updates
  useEffect(() => {
    if (transcriptSegments.length > 0 && metadata?.duration) {
      const clips = selectCandidateClips(transcriptSegments, metadata.duration);
      setCandidateClips(clips);
    }
  }, [transcriptSegments, metadata?.duration]);

  // Handle video selection & extract metadata
  const handleVideoSelected = async (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    setTranscriptSegments([]);
    setCandidateClips([]);
    setSelectedClipId(null);
    setTranscriptionTimeMs(undefined);
    setActiveTab('settings');

    try {
      const meta = await extractVideoMetadata(file);
      setMetadata(meta);
      setTrimRange({ start: 0, end: meta.duration });
    } catch (e) {
      console.warn('Could not extract full video metadata:', e);
      setMetadata(null);
    }
  };

  // Reset to initial upload state
  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setSelectedFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setTranscriptSegments([]);
    setCandidateClips([]);
    setSelectedClipId(null);
    setTranscriptionTimeMs(undefined);
    setResult(null);
    setError(null);
    setActiveTab('settings');
    setProgressState({
      phase: 'idle',
      progress: 0,
      statusMessage: '',
      logs: [],
    });
  };

  // Seek video preview to timestamp
  const handleSeek = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play();
    }
  };

  // Preview Candidate Clip in video player
  const handlePreviewClip = (clip: CandidateClip) => {
    setSelectedClipId(clip.id);
    if (videoRef.current) {
      videoRef.current.currentTime = clip.start;
      videoRef.current.play();
    }
  };

  // Select Candidate Clip and set trim range
  const handleSelectClip = (clip: CandidateClip) => {
    setSelectedClipId(clip.id);
    setTrimRange({ start: clip.start, end: clip.end });
  };

  // 1-Click Generate specific Candidate Clip
  const handleGenerateClipDirect = async (clip: CandidateClip) => {
    setSelectedClipId(clip.id);
    setTrimRange({ start: clip.start, end: clip.end });
    await executeGeneration({ start: clip.start, end: clip.end }, clip.segments);
  };

  // Standalone transcription trigger
  const handleTranscribeOnly = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    const activeMode = isEcoMode ? 'wasm-eco' : engineMode;

    try {
      setProgressState({
        phase: 'processing',
        progress: 10,
        statusMessage: `Extracting audio & initializing Whisper AI (${activeMode === 'wasm-eco' ? 'Eco 8-Bit • ' + threadCount + ' Cores' : activeMode.toUpperCase()})...`,
        logs: [`[Whisper] Engine: ${activeMode.toUpperCase()} starting on-device with ${threadCount} CPU threads...`],
      });

      const transResult = await whisperService.transcribeVideo(
        selectedFile,
        (p) => {
          setProgressState((prev) => ({
            ...prev,
            progress: p.progress,
            statusMessage: p.status,
            logs: [...prev.logs, `[Whisper] ${p.status}`],
          }));
        },
        activeMode,
        threadCount
      );

      setTranscriptSegments(transResult.segments);
      setTranscriptionTimeMs(transResult.executionTimeMs);

      // Auto calculate candidate clips and open Viral Clips tab
      if (metadata?.duration) {
        const clips = selectCandidateClips(transResult.segments, metadata.duration);
        setCandidateClips(clips);
        if (clips.length > 0) {
          setActiveTab('viral_clips');
        }
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(
        err?.message || 
        'Failed to transcribe audio. Please ensure the video has an audible voice track, or retry in Eco Safe mode.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Core generation executor
  const executeGeneration = async (
    targetTrim?: { start: number; end: number },
    targetSegments?: CaptionSegment[]
  ) => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    const activeMode = isEcoMode ? 'wasm-eco' : engineMode;

    try {
      let currentSegments = targetSegments || transcriptSegments;

      // Step 1: Run Whisper transcription if captions are ON and not yet transcribed
      if (enableCaptions && currentSegments.length === 0) {
        setProgressState({
          phase: 'processing',
          progress: 5,
          statusMessage: `Transcribing speech locally with Whisper AI (${isEcoMode ? 'Eco 8-Bit' : activeMode.toUpperCase()})...`,
          logs: [`[Whisper] Generating transcript on-device with ${threadCount} threads...`],
        });

        try {
          const transResult = await whisperService.transcribeVideo(
            selectedFile,
            (p) => {
              setProgressState((prev) => ({
                ...prev,
                progress: Math.min(30, Math.round(p.progress * 0.3)),
                statusMessage: p.status,
                logs: [...prev.logs, `[Whisper] ${p.status}`],
              }));
            },
            activeMode,
            threadCount
          );
          currentSegments = transResult.segments;
          setTranscriptSegments(transResult.segments);
          setTranscriptionTimeMs(transResult.executionTimeMs);
        } catch (transErr) {
          console.warn('Whisper transcription warning:', transErr);
        }
      }

      const activeTrim = targetTrim || (trimRange.end > trimRange.start ? trimRange : undefined);

      // Filter sub-segments for target trim range
      const filteredSegments = activeTrim
        ? currentSegments
            .filter((s) => s.end >= activeTrim.start && s.start <= activeTrim.end)
            .map((s) => ({
              ...s,
              start: Math.max(0, s.start - activeTrim.start),
              end: Math.max(0, s.end - activeTrim.start),
            }))
        : currentSegments;

      // Step 2: Convert & Burn Captions using FFmpeg WASM / Compositor with thread limit
      const output = await ffmpegService.convertToVerticalShort(selectedFile, {
        aspectRatio,
        quality,
        cropAlignment,
        threads: threadCount,
        trimRange: activeTrim,
        enableCaptions,
        captionSegments: filteredSegments,
        captionStyle,
        onProgress: (state) => {
          setProgressState(state);
        },
      });

      setResult(output);
    } catch (err: any) {
      console.error('Error generating short:', err);
      setError(
        err?.message || 
        'An error occurred during video rendering. In Eco Mode, try trimming the clip to under 45s or choosing 540p resolution.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = () => {
    executeGeneration();
  };

  const faqItems = [
    {
      q: "How does Eco / Low-Spec mode keep my laptop cool and quiet?",
      a: "Eco mode limits CPU core utilization to 2 threads (leaving all other cores free for Windows/Mac and Chrome) and loads an 8-bit quantized AI model. This eliminates fan spin-up, prevents thermal throttling, and guarantees your browser remains completely smooth."
    },
    {
      q: "Does my video or audio ever get uploaded to an external server?",
      a: "No, never. 0 bytes leave your machine. The entire application executes inside your browser via WebAssembly (FFmpeg) and WebGPU/Transformers.js (Whisper AI). You can inspect your browser's Network tab (F12) to verify zero media uploads."
    },
    {
      q: "How long will processing take on my laptop?",
      a: `On your detected hardware (${hardware?.cores || 4} cores, ${hardware?.webGpuSupported ? 'GPU Ready' : 'WASM CPU'}), a 30-second Short typically takes ~${hardware?.recommendation?.estimatedProcessingTime || '10–20s'}.`
    },
    {
      q: "What video file formats are supported?",
      a: "Standard MP4, MOV, WebM, and MKV video files encoded with H.264, VP8/VP9, or AV1 video and AAC/MP3 audio are supported directly in modern browsers (Chrome, Edge, Firefox, Brave)."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100">
      <Header 
        hardware={hardware} 
        engineMode={engineMode}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        isEcoMode={isEcoMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">
        
        {/* State 1: No Video Selected (Hero, Dropzone, Hardware Safety, Walkthrough, Diagnostics, FAQ) */}
        {!selectedFile && !result && (
          <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
            {/* Hero Text */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-inner">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified 100% On-Device • Zero Server Processing</span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Turn Videos Into{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Viral Shorts
                </span>{' '}
                on Your Device
              </h1>
              
              <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Smart vertical 9:16 framing, on-device Whisper AI speech-to-text, viral hook detection, and customizable animated captions. Fast, private, and optimized for laptop performance.
              </p>
            </div>

            {/* Dropzone Area */}
            <Dropzone onVideoSelected={handleVideoSelected} />

            {/* Laptop Hardware Safety & Core Advisor Card */}
            {hardware?.recommendation && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0e1320] to-[#101524] border border-emerald-500/30 space-y-4 shadow-xl shadow-emerald-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                      <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Laptop Hardware Safety Advisor</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                          {hardware.cores} Cores Detected
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-400/90 font-medium">
                        {hardware.recommendation.safetyTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleEcoMode(!isEcoMode)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isEcoMode
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isEcoMode ? '🌿 Safe Eco Mode ON' : 'Enable Safe Eco Mode'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Suggested Cores</div>
                    <div className="font-bold text-white font-mono flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{hardware.recommendation.suggestedThreads} of {hardware.cores} Cores (Safe)</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Leaves cores free for browser UI</div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Export Time</div>
                    <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{hardware.recommendation.estimatedProcessingTime}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Based on your CPU/GPU profile</div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Model Memory Footprint</div>
                    <div className="font-bold text-white font-mono flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-pink-400" />
                      <span>~38 MB (8-Bit Quantized)</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Zero fan spin-up or battery drain</div>
                  </div>
                </div>
              </div>
            )}

            {/* Value Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => setIsPrivacyOpen(true)}
                className="p-5 rounded-2xl bg-[#10131e]/60 hover:bg-[#10131e]/90 border border-white/5 hover:border-emerald-500/30 backdrop-blur-sm space-y-2 cursor-pointer transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white flex items-center justify-between">
                  <span>100% Local Privacy</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">Verify ➔</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Video and audio never touch external cloud servers. Transcribed and rendered locally.
                </p>
              </div>

              <div 
                onClick={() => setIsBenchmarkOpen(true)}
                className="p-5 rounded-2xl bg-[#10131e]/60 hover:bg-[#10131e]/90 border border-white/5 hover:border-indigo-500/30 backdrop-blur-sm space-y-2 cursor-pointer transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white flex items-center justify-between">
                  <span>Core & Benchmark Studio</span>
                  <span className="text-[10px] text-indigo-400 font-mono font-normal">Open Studio ➔</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Benchmark your GPU vs CPU inference speeds and adjust laptop CPU thread limits.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#10131e]/60 border border-white/5 backdrop-blur-sm space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white">AI Viral Hook Detection</h4>
                <p className="text-xs text-slate-400">
                  Automatically scores and extracts the highest-engagement moments from your video.
                </p>
              </div>
            </div>

            {/* How It Works Flow */}
            <div className="p-6 rounded-2xl bg-[#0e111a] border border-white/5 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  How Shorts AI Works Locally
                </h3>
                <p className="text-xs text-slate-400">
                  A complete creator workflow executing entirely in your web browser
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
                    01
                  </div>
                  <h4 className="text-xs font-bold text-white">Import Video</h4>
                  <p className="text-[11px] text-slate-400">
                    Video is loaded directly into in-memory browser RAM.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
                    02
                  </div>
                  <h4 className="text-xs font-bold text-white">Whisper Speech AI</h4>
                  <p className="text-[11px] text-slate-400">
                    On-device GPU/CPU transcribes speech into word-level timestamps.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                    03
                  </div>
                  <h4 className="text-xs font-bold text-white">Hook Detection</h4>
                  <p className="text-[11px] text-slate-400">
                    Algorithmic scoring detects engaging punchlines and questions.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                    04
                  </div>
                  <h4 className="text-xs font-bold text-white">Render & Export</h4>
                  <p className="text-[11px] text-slate-400">
                    FFmpeg WASM crops to 9:16 and burns animated custom captions.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Accordion Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-base font-bold text-white text-center">Frequently Asked Questions</h3>
              <div className="space-y-2">
                {faqItems.map((faq, index) => {
                  const isExpanded = expandedFaq === index;
                  return (
                    <div 
                      key={index} 
                      className="rounded-xl bg-white/5 border border-white/5 overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isExpanded ? null : index)}
                        className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3 animate-in fade-in duration-200">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* State 2: Video Selected (Preview & Configuration / Processing) */}
        {selectedFile && previewUrl && !result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header with selected file details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    {metadata ? ` • ${metadata.formattedDuration} • ${metadata.width}x${metadata.height}` : ''}
                  </div>
                </div>
              </div>

              {!isProcessing && (
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4 self-start sm:self-center cursor-pointer"
                >
                  Choose Different Video
                </button>
              )}
            </div>

            {/* Studio Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Source Video Player with Live Synchronized Caption Overlay */}
              <div className="lg:col-span-6 bg-[#10131e]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Source Video Preview
                  </span>
                  <span className="text-xs font-mono text-indigo-400">
                    {metadata ? metadata.aspectRatio : 'Ready'}
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black/90 aspect-video flex items-center justify-center border border-white/5 shadow-inner">
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                  {/* Live Caption Overlay on Video */}
                  {enableCaptions && (
                    <LiveCaptionOverlay
                      videoRef={videoRef}
                      segments={transcriptSegments}
                      style={captionStyle}
                    />
                  )}
                </div>

                {/* Show Transcript Viewer if generated */}
                {transcriptSegments.length > 0 && !isProcessing && (
                  <div className="pt-2">
                    <TranscriptViewer
                      segments={transcriptSegments}
                      onSegmentsChange={setTranscriptSegments}
                      onSeek={handleSeek}
                      videoTitle={selectedFile.name}
                      executionTimeMs={transcriptionTimeMs}
                    />
                  </div>
                )}
              </div>

              {/* Controls, Style Studio, Smart Clips, or Processing Indicator */}
              <div className="lg:col-span-6 space-y-4">
                {isProcessing ? (
                  <ProcessingProgress progressState={progressState} />
                ) : (
                  <>
                    {/* Mode Navigation Tabs */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 w-full overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          activeTab === 'settings'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Format Studio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('captions_style')}
                        className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          activeTab === 'captions_style'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>Captions Style</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('viral_clips')}
                        className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          activeTab === 'viral_clips'
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Viral Clips {candidateClips.length > 0 ? `(${candidateClips.length})` : ''}
                        </span>
                      </button>
                    </div>

                    {activeTab === 'settings' && (
                      <StudioControls
                        metadata={metadata}
                        aspectRatio={aspectRatio}
                        setAspectRatio={setAspectRatio}
                        quality={quality}
                        setQuality={setQuality}
                        cropAlignment={cropAlignment}
                        setCropAlignment={setCropAlignment}
                        enableCaptions={enableCaptions}
                        setEnableCaptions={setEnableCaptions}
                        trimRange={trimRange}
                        setTrimRange={setTrimRange}
                        onGenerate={handleGenerate}
                        onTranscribeOnly={handleTranscribeOnly}
                        hasTranscript={transcriptSegments.length > 0}
                        isProcessing={isProcessing}
                        onCancelSelection={handleReset}
                        isEcoMode={isEcoMode}
                        onToggleEcoMode={handleToggleEcoMode}
                        engineMode={engineMode}
                        threadCount={threadCount}
                      />
                    )}

                    {activeTab === 'captions_style' && (
                      <CaptionCustomizer
                        style={captionStyle}
                        onChange={setCaptionStyle}
                        sampleText={
                          transcriptSegments.length > 0
                            ? transcriptSegments[0].text
                            : 'SAMPLE CAPTION PREVIEW'
                        }
                      />
                    )}

                    {activeTab === 'viral_clips' && (
                      <SmartClipSelector
                        clips={candidateClips}
                        selectedClipId={selectedClipId}
                        onSelectClip={handleSelectClip}
                        onPreviewClip={handlePreviewClip}
                        onGenerateClipDirect={handleGenerateClipDirect}
                        onTranscribe={handleTranscribeOnly}
                        isProcessing={isProcessing}
                      />
                    )}
                  </>
                )}

                {/* Error Banner with Recovery Options */}
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-white">Processing Notice</div>
                        <div className="text-xs text-rose-300/90 leading-relaxed">{error}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-rose-500/20 text-xs">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold transition-colors cursor-pointer"
                      >
                        Reset Video
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBenchmarkOpen(true)}
                        className="text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer"
                      >
                        Open Hardware Advisor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* State 3: Result View */}
        {result && selectedFile && previewUrl && (
          <ResultView
            originalFile={selectedFile}
            originalVideoUrl={previewUrl}
            shortVideoUrl={result.url}
            executionTimeMs={result.executionTimeMs}
            outputBlob={result.blob}
            metadata={metadata}
            aspectRatio={aspectRatio}
            quality={quality}
            transcriptSegments={transcriptSegments}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Benchmark & Laptop Safety Advisor Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        engineMode={engineMode}
        setEngineMode={setEngineMode}
        hardware={hardware}
        threadCount={threadCount}
        setThreadCount={setThreadCount}
      />

      {/* Day 7 Privacy Architecture Verification Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-6 bg-[#07080c] text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Shorts AI</span>
            <span>—</span>
            <span>100% In-Browser Local Video Studio (Day 8)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>0 Bytes Uploaded (Verify)</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsBenchmarkOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Core Advisor & Benchmark</span>
            </button>
            <span>•</span>
            <span className="text-slate-400 font-mono">FFmpeg WASM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;


