import React, { useState } from 'react';
import { 
  Sparkles, 
  Smartphone, 
  Square, 
  Layers, 
  Settings2, 
  ShieldCheck, 
  Clock, 
  Scissors, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Subtitles, 
  Check,
  Bot,
  Leaf,
  Gauge
} from 'lucide-react';
import type { AspectRatioType, QualityType, CropAlignment } from '../services/ffmpegService';
import type { VideoMetadata } from '../services/videoMetadata';
import { formatTime } from '../services/videoMetadata';

interface StudioControlsProps {
  metadata: VideoMetadata | null;
  aspectRatio: AspectRatioType;
  setAspectRatio: (ratio: AspectRatioType) => void;
  quality: QualityType;
  setQuality: (quality: QualityType) => void;
  cropAlignment: CropAlignment;
  setCropAlignment: (align: CropAlignment) => void;
  enableCaptions: boolean;
  setEnableCaptions: (enable: boolean) => void;
  trimRange: { start: number; end: number };
  setTrimRange: (range: { start: number; end: number }) => void;
  onGenerate: () => void;
  onTranscribeOnly?: () => void;
  hasTranscript?: boolean;
  isProcessing: boolean;
  onCancelSelection: () => void;
  isEcoMode?: boolean;
  onToggleEcoMode?: (enabled: boolean) => void;
  engineMode?: string;
  threadCount?: number;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  metadata,
  aspectRatio,
  setAspectRatio,
  quality,
  setQuality,
  cropAlignment,
  setCropAlignment,
  enableCaptions,
  setEnableCaptions,
  trimRange,
  setTrimRange,
  onGenerate,
  onTranscribeOnly,
  hasTranscript,
  isProcessing,
  onCancelSelection,
  isEcoMode = false,
  onToggleEcoMode,
  engineMode = 'auto',
  threadCount = 2,
}) => {
  const [isTrimming, setIsTrimming] = useState(false);
  const totalDuration = metadata?.duration || 0;

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val < trimRange.end) {
      setTrimRange({ ...trimRange, start: Math.max(0, val) });
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > trimRange.start) {
      setTrimRange({ ...trimRange, end: Math.min(totalDuration, val) });
    }
  };

  const clipDuration = isTrimming 
    ? Math.max(1, trimRange.end - trimRange.start) 
    : (totalDuration || 30);

  // Dynamic estimated processing time calculation
  const estimatedSeconds = Math.max(
    4,
    Math.round(
      clipDuration * 
      (isEcoMode ? 0.35 : engineMode === 'webgpu' ? 0.15 : 0.5) * 
      (quality === '540p' ? 0.6 : quality === '720p' ? 0.9 : 1.4)
    )
  );

  return (
    <div className="w-full bg-[#10131e]/90 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-xl space-y-6">
      {/* Header with Title and File Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <span>Video Studio & AI Formatting</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure mobile aspect ratios, framing, and Whisper AI captions
          </p>
        </div>

        <button
          onClick={onCancelSelection}
          disabled={isProcessing}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-2 self-start sm:self-center cursor-pointer"
        >
          Change Video File
        </button>
      </div>

      {/* 1-Click Laptop Safe Eco Mode Banner */}
      {onToggleEcoMode && (
        <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isEcoMode 
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
            : 'bg-white/5 border-white/5 text-slate-400'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2 rounded-lg ${isEcoMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Laptop Safe Eco Mode</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isEcoMode 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {isEcoMode ? 'ACTIVE (2 Cores • 8-Bit)' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Caps CPU cores to 2 and uses 8-bit model to keep laptop cool and fans quiet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleEcoMode(!isEcoMode)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
              isEcoMode
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isEcoMode ? '✓ Safe Mode Enabled' : 'Enable Safe Mode'}
          </button>
        </div>
      )}

      {/* Video Stats & Live Estimate Bar */}
      {metadata && (
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Duration</div>
            <div className="text-xs font-bold text-slate-200 font-mono flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              {metadata.formattedDuration}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Original Ratio</div>
            <div className="text-xs font-bold text-slate-200 font-mono truncate">
              {metadata.aspectRatio}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Est. Export Time</div>
            <div className="text-xs font-bold text-emerald-400 font-mono flex items-center justify-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-400" />
              ~{estimatedSeconds}s
            </div>
          </div>
        </div>
      )}

      {/* Control Grid: Aspect Ratio & Quality */}
      <div className="space-y-4">
        {/* 1. Aspect Ratio Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Format & Aspect Ratio</label>
            <span className="text-[10px] font-mono text-indigo-400 font-semibold">
              {aspectRatio === '9:16' ? 'Recommended for Shorts/Reels/TikTok' : ''}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAspectRatio('9:16')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                aspectRatio === '9:16'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <Smartphone className={`w-5 h-5 ${aspectRatio === '9:16' ? 'text-indigo-400' : ''}`} />
              <div>
                <div className="text-xs font-bold">9:16 Vertical</div>
                <div className="text-[10px] opacity-70">Shorts / Reels</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAspectRatio('1:1')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                aspectRatio === '1:1'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <Square className={`w-5 h-5 ${aspectRatio === '1:1' ? 'text-indigo-400' : ''}`} />
              <div>
                <div className="text-xs font-bold">1:1 Square</div>
                <div className="text-[10px] opacity-70">Feed Post</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAspectRatio('4:5')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                aspectRatio === '4:5'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <Layers className={`w-5 h-5 ${aspectRatio === '4:5' ? 'text-indigo-400' : ''}`} />
              <div>
                <div className="text-xs font-bold">4:5 Portrait</div>
                <div className="text-[10px] opacity-70">Instagram Feed</div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Crop Framing Alignment & Quality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Crop Alignment */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-300">Crop Focus</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setCropAlignment('left')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  cropAlignment === 'left'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" /> Left
              </button>
              <button
                type="button"
                onClick={() => setCropAlignment('center')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  cropAlignment === 'center'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" /> Center
              </button>
              <button
                type="button"
                onClick={() => setCropAlignment('right')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  cropAlignment === 'right'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" /> Right
              </button>
            </div>
          </div>

          {/* Quality Switcher with 540p Eco option */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-300">Output Quality</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setQuality('540p')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  quality === '540p'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-black/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                540p (Eco)
              </button>
              <button
                type="button"
                onClick={() => setQuality('720p')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  quality === '720p'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                720p (Fast)
              </button>
              <button
                type="button"
                onClick={() => setQuality('1080p')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  quality === '1080p'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                1080p (HD)
              </button>
            </div>
          </div>
        </div>

        {/* 3. Captions & Whisper Speech-to-Text */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Subtitles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>AI Captions & SRT</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isEcoMode 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {isEcoMode ? 'Whisper (8-Bit Eco)' : 'Whisper AI'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Transcribe speech directly on your machine into standard captions.srt
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnableCaptions(!enableCaptions)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                enableCaptions
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border border-white/10 text-slate-400'
              }`}
            >
              {enableCaptions ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{enableCaptions ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Direct Transcribe Quick-Action */}
          {onTranscribeOnly && (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {hasTranscript ? 'Transcript generated!' : 'Transcribe audio before encoding'}
              </span>
              <button
                type="button"
                onClick={onTranscribeOnly}
                disabled={isProcessing}
                className="px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Bot className="w-3 h-3" />
                <span>{hasTranscript ? 'Re-run Whisper AI' : 'Extract & Transcribe SRT'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Optional Clip / Trim Slider */}
        {totalDuration > 3 && (
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTrimming(!isTrimming)}
                className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isTrimming ? 'Trim / Clip Range Active' : 'Trim Video Clip (Fastest Export)'}</span>
              </button>

              <span className="text-xs font-mono text-indigo-300 font-bold">
                {isTrimming ? `${formatTime(clipDuration)} Clip` : 'Full Video'}
              </span>
            </div>

            {isTrimming && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Start: {formatTime(trimRange.start)}</span>
                  <span>End: {formatTime(trimRange.end)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400">Start Time (sec)</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, trimRange.end - 1)}
                      step={0.5}
                      value={trimRange.start}
                      onChange={handleStartTimeChange}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">End Time (sec)</span>
                    <input
                      type="range"
                      min={trimRange.start + 1}
                      max={totalDuration}
                      step={0.5}
                      value={trimRange.end}
                      onChange={handleEndTimeChange}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isProcessing}
          className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-600 to-pink-500 p-[1px] shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 py-4 px-6 rounded-[11px] flex items-center justify-center gap-3 text-white font-extrabold text-base tracking-wide transition-all group-hover:bg-opacity-90">
            <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
            <span>GENERATE {aspectRatio} SHORT {enableCaptions ? '+ CAPTIONS' : ''}</span>
          </div>
        </button>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Local WASM + Whisper AI • {threadCount} Cores • 100% On-Device</span>
        </div>
      </div>
    </div>
  );
};

