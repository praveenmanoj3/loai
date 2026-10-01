import React, { useState } from 'react';
import { Subtitles, Download, Copy, Check, Edit2, Play } from 'lucide-react';
import type { CaptionSegment } from '../services/subtitleUtils';
import { downloadSrtFile, formatSrtTimestamp, generateSrt } from '../services/subtitleUtils';

interface TranscriptViewerProps {
  segments: CaptionSegment[];
  onSegmentsChange?: (newSegments: CaptionSegment[]) => void;
  onSeek?: (timestamp: number) => void;
  videoTitle?: string;
  executionTimeMs?: number;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  segments,
  onSegmentsChange,
  onSeek,
  videoTitle = 'video',
  executionTimeMs,
}) => {
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleCopy = () => {
    const srt = generateSrt(segments);
    navigator.clipboard.writeText(srt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const srt = generateSrt(segments);
    const cleanName = videoTitle.replace(/\.[^/.]+$/, '');
    downloadSrtFile(srt, `${cleanName}-captions.srt`);
  };

  const handleTextChange = (id: number, newText: string) => {
    if (!onSegmentsChange) return;
    const updated = segments.map((seg) => (seg.id === id ? { ...seg, text: newText } : seg));
    onSegmentsChange(updated);
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#10131e]/60 border border-white/5 text-center space-y-2">
        <Subtitles className="w-8 h-8 text-slate-500 mx-auto" />
        <p className="text-xs text-slate-400">No speech detected or transcription is not yet run.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#10131e]/90 border border-indigo-500/20 rounded-2xl p-5 backdrop-blur-xl space-y-4 shadow-xl">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Subtitles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight">
                AI Generated Transcript ({segments.length} Segments)
              </h4>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold">
                100% Local Whisper
              </span>
            </div>
            {executionTimeMs && (
              <p className="text-[11px] text-slate-400">
                Transcribed on-device in {(executionTimeMs / 1000).toFixed(1)}s
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy SRT'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .SRT</span>
          </button>
        </div>
      </div>

      {/* Timestamped Segments List */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="group p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-indigo-500/30 transition-all flex items-start gap-3"
          >
            {/* Timestamp Badge / Seek Trigger */}
            <button
              type="button"
              onClick={() => onSeek && onSeek(seg.start)}
              title="Jump to video timestamp"
              className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] font-mono text-indigo-300 font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <Play className="w-2.5 h-2.5 fill-indigo-300" />
              <span>{formatSrtTimestamp(seg.start).slice(3, 8)}</span>
            </button>

            {/* Segment Text or Editable Input */}
            <div className="flex-1 min-w-0">
              {editingId === seg.id ? (
                <input
                  type="text"
                  value={seg.text}
                  onChange={(e) => handleTextChange(seg.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  autoFocus
                  className="w-full bg-white/10 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              ) : (
                <div
                  onClick={() => setEditingId(seg.id)}
                  className="text-xs text-slate-200 leading-relaxed cursor-text hover:text-white flex items-center justify-between"
                >
                  <span>{seg.text}</span>
                  <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
