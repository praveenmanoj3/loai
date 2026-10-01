import React, { useState } from 'react';
import { Download, RotateCcw, CheckCircle2, Smartphone, Film, Subtitles, Copy, Check } from 'lucide-react';
import type { AspectRatioType, QualityType } from '../services/ffmpegService';
import type { VideoMetadata } from '../services/videoMetadata';
import type { CaptionSegment } from '../services/subtitleUtils';
import { downloadSrtFile, generateSrt, formatSrtTimestamp } from '../services/subtitleUtils';

interface ResultViewProps {
  originalFile: File;
  originalVideoUrl: string;
  shortVideoUrl: string;
  executionTimeMs: number;
  outputBlob: Blob;
  metadata: VideoMetadata | null;
  aspectRatio: AspectRatioType;
  quality: QualityType;
  transcriptSegments?: CaptionSegment[];
  onReset: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  originalFile,
  originalVideoUrl,
  shortVideoUrl,
  executionTimeMs,
  outputBlob,
  metadata,
  aspectRatio,
  quality,
  transcriptSegments = [],
  onReset,
}) => {
  const [copiedSrt, setCopiedSrt] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'transcript'>('video');
  const [shareStatsCopied, setShareStatsCopied] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadVideo = () => {
    const a = document.createElement('a');
    a.href = shortVideoUrl;
    const originalNameWithoutExt = originalFile.name.replace(/\.[^/.]+$/, '');
    const suffix = aspectRatio.replace(':', 'x');
    a.download = `${originalNameWithoutExt}-short-${suffix}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSrt = () => {
    if (!transcriptSegments || transcriptSegments.length === 0) return;
    const srt = generateSrt(transcriptSegments);
    const originalNameWithoutExt = originalFile.name.replace(/\.[^/.]+$/, '');
    downloadSrtFile(srt, `${originalNameWithoutExt}-captions.srt`);
  };

  const handleCopySrt = () => {
    if (!transcriptSegments || transcriptSegments.length === 0) return;
    const srt = generateSrt(transcriptSegments);
    navigator.clipboard.writeText(srt);
    setCopiedSrt(true);
    setTimeout(() => setCopiedSrt(false), 2000);
  };

  const handleCopyShareStats = () => {
    const lines = [
      `✅ Just created a ${aspectRatio} Short — 100% on my device!`,
      `⚡ Rendered in ${(executionTimeMs / 1000).toFixed(1)}s`,
      `🧠 ${transcriptSegments.length} captions transcribed via Whisper AI`,
      `📦 Output: ${formatBytes(outputBlob.size)} (${quality})`,
      `🔒 0 bytes uploaded — fully private browser processing`,
      ``,
      `Made with Shorts AI — https://shortsai.app`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setShareStatsCopied(true);
    setTimeout(() => setShareStatsCopied(false), 2500);
  };

  const getAspectClass = () => {
    if (aspectRatio === '1:1') return 'aspect-square max-h-[420px]';
    if (aspectRatio === '4:5') return 'aspect-[4/5] max-h-[460px]';
    return 'aspect-[9/16] max-h-[480px]';
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Success Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg">Your {aspectRatio} Short is Ready!</h3>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Processed 100% locally on your device in {(executionTimeMs / 1000).toFixed(1)}s • 0 bytes uploaded
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onReset}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-300 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Process Another</span>
          </button>
          
          <button
            onClick={handleDownloadVideo}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download Video</span>
          </button>
        </div>
      </div>

      {/* Creator Share Stats Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0d0f1a] via-[#10131e] to-[#0d0f1a] border border-indigo-500/20 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            <div className="text-center p-3 rounded-xl bg-black/30 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Render Time</div>
              <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{(executionTimeMs / 1000).toFixed(1)}s</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-black/30 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Output Size</div>
              <div className="text-sm font-extrabold text-white font-mono mt-0.5">{formatBytes(outputBlob.size)}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-black/30 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Captions</div>
              <div className="text-sm font-extrabold text-indigo-300 font-mono mt-0.5">{transcriptSegments.length} lines</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-black/30 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Privacy</div>
              <div className="text-sm font-extrabold text-white font-mono mt-0.5">0 bytes sent</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyShareStats}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              shareStatsCopied
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {shareStatsCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{shareStatsCopied ? 'Stats Copied!' : 'Copy Share Stats'}</span>
          </button>
        </div>
      </div>

      {/* Tabs for Video vs Transcript View */}
      {transcriptSegments.length > 0 && (
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'video'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Shorts Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'transcript'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Subtitles className="w-4 h-4" />
            <span>Captions & SRT ({transcriptSegments.length})</span>
          </button>
        </div>
      )}

      {/* Main View Grid */}
      {activeTab === 'video' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Original Video Preview */}
          <div className="lg:col-span-6 bg-[#10131e]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Source Video
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {formatBytes(originalFile.size)} {metadata ? `• ${metadata.formattedDuration}` : ''}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black/80 aspect-video flex items-center justify-center border border-white/5 shadow-inner">
              <video
                src={originalVideoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>

            <div className="text-xs text-slate-400 truncate flex items-center justify-between">
              <span className="truncate max-w-[280px]">{originalFile.name}</span>
              {metadata && <span className="font-mono text-slate-500">{metadata.width}x{metadata.height}</span>}
            </div>
          </div>

          {/* Formatted Short Result Preview */}
          <div className="lg:col-span-6 bg-[#10131e]/90 border border-indigo-500/30 rounded-2xl p-5 backdrop-blur-xl flex flex-col space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  {aspectRatio} Formatted Short
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-semibold">
                {formatBytes(outputBlob.size)} ({quality})
              </span>
            </div>

            {/* Formatted video player container */}
            <div className={`relative rounded-xl overflow-hidden bg-black/90 ${getAspectClass()} mx-auto flex items-center justify-center border border-indigo-500/20 shadow-xl`}>
              <video
                src={shortVideoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 relative z-10 text-center">
              <div className="p-2 rounded-lg bg-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Aspect Ratio</div>
                <div className="text-xs font-bold text-indigo-300 font-mono">{aspectRatio}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Render Time</div>
                <div className="text-xs font-bold text-emerald-300 font-mono">{(executionTimeMs / 1000).toFixed(1)}s</div>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Security</div>
                <div className="text-xs font-bold text-white font-mono">100% Local</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Captions & SRT Viewer Tab */
        <div className="bg-[#10131e]/90 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Subtitles className="w-5 h-5 text-indigo-400" />
                <span>Generated Subtitles & Timestamps (captions.srt)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Transcribed locally via Whisper AI without sending audio outside your browser
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySrt}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
              >
                {copiedSrt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSrt ? 'Copied to Clipboard' : 'Copy SRT'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSrt}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download captions.srt</span>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-2">
            {transcriptSegments.map((seg) => (
              <div
                key={seg.id}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-4"
              >
                <div className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-bold shrink-0">
                  {formatSrtTimestamp(seg.start).slice(3, 8)} ➔ {formatSrtTimestamp(seg.end).slice(3, 8)}
                </div>
                <div className="text-sm text-slate-200 leading-relaxed font-medium">
                  {seg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
