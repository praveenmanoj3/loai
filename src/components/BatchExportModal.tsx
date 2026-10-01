import React, { useState } from 'react';
import { 
  Download, 
  Archive, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Flame, 
  X, 
  Play, 
  Clock, 
  Zap, 
  Copy, 
  Check
} from 'lucide-react';
import type { BatchOverallProgress, BatchItem } from '../services/batchExportService';
import { formatSrtTimestamp } from '../services/subtitleUtils';

interface BatchExportModalProps {
  isOpen: boolean;
  progress: BatchOverallProgress | null;
  onClose: () => void;
  onCancel: () => void;
  onDownloadZip: () => void;
  videoFileName: string;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  progress,
  onClose,
  onCancel,
  onDownloadZip,
  videoFileName,
}) => {
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [copiedStats, setCopiedStats] = useState(false);

  if (!isOpen || !progress) return null;

  const {
    totalClips,
    completedClips,
    failedClips,
    overallPercent,
    items,
    isDone,
    zipSizeFormatted,
  } = progress;

  const handleDownloadSingleClip = (item: BatchItem) => {
    if (!item.outputBlob) return;
    const cleanBase = `Short_${item.clip.rank}_${item.clip.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25)}.mp4`;
    const url = URL.createObjectURL(item.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanBase;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleCopySummary = () => {
    const summary = [
      `🔥 Shorts AI Batch Export: ${completedClips} Viral Clips`,
      `Source: ${videoFileName}`,
      '',
      ...items
        .filter((i) => i.status === 'completed')
        .map(
          (i) =>
            `• #${i.clip.rank} (${i.clip.score}% Virality): ${i.clip.title} [${formatSrtTimestamp(i.clip.start).slice(3, 8)} - ${formatSrtTimestamp(i.clip.end).slice(3, 8)}]`
        ),
      '',
      '#viral #shorts #reels #tiktok #moneytalks #ondeviceAI',
    ].join('\n');

    navigator.clipboard.writeText(summary);
    setCopiedStats(true);
    setTimeout(() => setCopiedStats(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl rounded-3xl bg-[#0e111a] border border-indigo-500/30 p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 space-y-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              isDone 
                ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-indigo-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isDone ? <CheckCircle2 className="w-6 h-6" /> : <Flame className="w-6 h-6 animate-pulse" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>{isDone ? 'Batch Export Complete!' : 'Batch Rendering Viral Shorts'}</span>
                {isDone && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                    All Ready
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isDone 
                  ? `Successfully rendered ${completedClips} of ${totalClips} shorts in high quality.`
                  : `Sequential on-device rendering (${completedClips}/${totalClips} finished)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={isDone ? onClose : onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            title={isDone ? 'Close' : 'Cancel Batch'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Progress Section */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Overall Batch Progress</span>
            </span>
            <span className="font-mono font-extrabold text-indigo-400 text-sm">
              {overallPercent}%
            </span>
          </div>

          {/* Master Progress Bar */}
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDone
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600'
              }`}
              style={{ width: `${overallPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {completedClips} of {totalClips} clips finished {failedClips > 0 ? `(${failedClips} failed)` : ''}
            </span>
            <span className="font-mono">
              {isDone ? 'Packaging complete' : 'Rendering on-device via FFmpeg WASM'}
            </span>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="space-y-2.5 max-h-64 sm:max-h-72 overflow-y-auto pr-1 relative z-10">
          {items.map((item, idx) => {
            const isCurrent = item.status === 'rendering';
            const isFinished = item.status === 'completed';
            const isFailed = item.status === 'failed' || item.status === 'cancelled';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                    : isFinished
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : isFailed
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : 'bg-black/30 border-white/5 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {isCurrent && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                      {isFinished && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {isFailed && <AlertCircle className="w-4 h-4 text-rose-400" />}
                      {item.status === 'queued' && (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-500">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono">
                          #{item.clip.rank}
                        </span>
                        <h5 className="text-xs font-bold text-white truncate">
                          {item.clip.title}
                        </h5>
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                          {item.clip.score}% virality
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.statusMessage}
                      </p>
                    </div>
                  </div>

                  {/* Right actions / progress */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isCurrent && (
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {item.progress}%
                      </span>
                    )}

                    {isFinished && item.outputBlob && (
                      <div className="flex items-center gap-1.5">
                        {item.renderTimeMs && (
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                            {(item.renderTimeMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (item.outputUrl) setActivePreviewUrl(item.outputUrl);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          title="Preview clip"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleClip(item)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Download this MP4"
                        >
                          <Download className="w-3 h-3" />
                          <span className="hidden sm:inline">MP4</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub progress bar if currently rendering */}
                {isCurrent && (
                  <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Video Preview Popup if triggered */}
        {activePreviewUrl && (
          <div className="p-4 rounded-2xl bg-black/80 border border-indigo-500/30 space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-indigo-400" />
                <span>Rendered Clip Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setActivePreviewUrl(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close Preview
              </button>
            </div>
            <div className="aspect-[9/16] max-h-72 mx-auto rounded-xl overflow-hidden bg-black border border-white/10">
              <video
                src={activePreviewUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          {!isDone ? (
            <>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Keep this tab open while rendering completes...</span>
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel Batch Render
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  {copiedStats ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStats ? 'Summary Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Back to Studio
                </button>
              </div>

              <button
                type="button"
                onClick={onDownloadZip}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                <span>DOWNLOAD ALL AS ZIP {zipSizeFormatted ? `(${zipSizeFormatted})` : ''}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
