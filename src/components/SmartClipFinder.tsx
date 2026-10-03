import React, { useRef, useEffect } from 'react';
import {
  Scissors,
  Play,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Bot,
  AlertCircle,
  Sliders,
  Flame,
  Tag,
} from 'lucide-react';
import type { ClipSuggestion } from '../services/smartClipFinder';
import { formatSrtTimestamp } from '../services/subtitleUtils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SmartClipFinderProps {
  /** Suggested clips from the smartClipFinder service */
  clips: ClipSuggestion[];
  /** Whether Whisper transcription has been run yet */
  hasTranscript: boolean;
  /** Clip currently being previewed */
  previewingClipId: string | null;
  /** Clip loaded into the editor */
  selectedClipId: string | null;
  /** Trigger transcription + clip analysis */
  onTranscribe: () => void;
  /** Seek video to clip start, play, auto-stop at clip end */
  onPreviewClip: (clip: ClipSuggestion) => void;
  /** Load clip into editor (sets trim range, switches to Format Studio tab) */
  onUseClip: (clip: ClipSuggestion) => void;
  /** Open manual trim controls */
  onManualClip: () => void;
  isProcessing: boolean;
}

// ─── Rank colors ──────────────────────────────────────────────────────────────

const RANK_STYLES: Record<number, { pill: string; glow: string; label: string }> = {
  1: {
    pill: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white',
    glow: 'shadow-amber-500/10',
    label: 'Top Pick',
  },
  2: {
    pill: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white',
    glow: 'shadow-indigo-500/10',
    label: 'Strong Pick',
  },
  3: {
    pill: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
    glow: 'shadow-emerald-500/10',
    label: 'Good Pick',
  },
};

function getRankStyle(rank: number) {
  return RANK_STYLES[rank] ?? RANK_STYLES[3];
}

// ─── Reason tag colours ───────────────────────────────────────────────────────

function getReasonColor(reason: string): string {
  if (/hook|opener|opening/i.test(reason)) return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  if (/question|retention/i.test(reason)) return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
  if (/energy|exclamation/i.test(reason)) return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
  if (/length|short|long/i.test(reason)) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (/keyword|topic|focus/i.test(reason)) return 'bg-violet-500/10 text-violet-300 border-violet-500/20';
  if (/ending|start|natural|clean/i.test(reason)) return 'bg-teal-500/10 text-teal-300 border-teal-500/20';
  return 'bg-white/5 text-slate-300 border-white/10';
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyNoTranscript({
  onTranscribe,
  isProcessing,
}: {
  onTranscribe: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="w-full bg-[#0e111a] border border-indigo-500/20 rounded-2xl p-8 text-center space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/15 to-indigo-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
        <Flame className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-xs mx-auto">
        <h4 className="text-sm font-bold text-white">Smart Clip Finder</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Generate captions first — the clip finder will automatically score and
          rank the best moments in your video.
        </p>
      </div>

      <button
        type="button"
        onClick={onTranscribe}
        disabled={isProcessing}
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-rose-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        <Bot className="w-4 h-4" />
        <span>Generate Captions &amp; Find Clips</span>
      </button>

      <p className="text-[10px] text-slate-600 font-mono">
        100% on-device • 0 bytes uploaded
      </p>
    </div>
  );
}

function EmptyTooShort() {
  return (
    <div className="w-full bg-[#0e111a] border border-white/10 rounded-2xl p-6 text-center space-y-3">
      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
      <p className="text-sm font-bold text-white">Not enough content</p>
      <p className="text-xs text-slate-400">
        Not enough transcript content to suggest clips. Try a longer video or use manual trimming.
      </p>
    </div>
  );
}

function EmptyNoStrongClips({ onManualClip }: { onManualClip: () => void }) {
  return (
    <div className="w-full bg-[#0e111a] border border-white/10 rounded-2xl p-6 text-center space-y-4">
      <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
      <div className="space-y-1">
        <p className="text-sm font-bold text-white">No strong automatic clips found</p>
        <p className="text-xs text-slate-400">
          No strong automatic clips found. Try selecting a clip manually.
        </p>
      </div>
      <button
        type="button"
        onClick={onManualClip}
        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 mx-auto transition-colors cursor-pointer"
      >
        <Sliders className="w-3.5 h-3.5" />
        <span>Create Manual Clip</span>
      </button>
    </div>
  );
}

// ─── Clip card ────────────────────────────────────────────────────────────────

function ClipCard({
  clip,
  isPreviewing,
  isSelected,
  onPreview,
  onUse,
}: {
  clip: ClipSuggestion;
  isPreviewing: boolean;
  isSelected: boolean;
  onPreview: () => void;
  onUse: () => void;
}) {
  const rankStyle = getRankStyle(clip.rank);
  const startStr = formatSrtTimestamp(clip.start).slice(3, 8); // mm:ss
  const endStr = formatSrtTimestamp(clip.end).slice(3, 8);

  return (
    <div
      className={`rounded-xl border transition-colors duration-150 overflow-hidden ${
        isSelected
          ? 'bg-indigo-600/12 border-indigo-500/70 ring-1 ring-indigo-500/40'
          : isPreviewing
          ? 'bg-emerald-900/10 border-emerald-500/40'
          : 'bg-black/30 hover:bg-black/50 border-white/8 hover:border-white/15'
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Top row: rank + meta */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${rankStyle.pill}`}
          >
            #{clip.rank} {rankStyle.label}
          </span>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-slate-400 text-[11px] font-mono">
            <Clock className="w-3 h-3" />
            {clip.formattedDuration}
          </span>

          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            {startStr} → {endStr}
          </span>

          {isPreviewing && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold animate-pulse">
              ▶ Previewing
            </span>
          )}
          {isSelected && !isPreviewing && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
              ✓ In Editor
            </span>
          )}
        </div>

        {/* Title + snippet */}
        <div className="space-y-1">
          <h5 className="text-sm font-bold text-white leading-snug line-clamp-2">
            {clip.title}
          </h5>
          <p className="text-[11px] text-slate-400 leading-relaxed italic line-clamp-2">
            "{clip.snippet}"
          </p>
        </div>

        {/* Reason tags */}
        {clip.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {clip.reasons.slice(0, 4).map((reason, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getReasonColor(reason)}`}
              >
                <Tag className="w-2.5 h-2.5" />
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onPreview}
            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isPreviewing
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
            }`}
          >
            <Play className={`w-3 h-3 ${isPreviewing ? 'fill-emerald-300 text-emerald-300' : 'fill-indigo-400 text-indigo-400'}`} />
            <span>{isPreviewing ? 'Playing…' : 'Preview'}</span>
          </button>

          <button
            type="button"
            onClick={onUse}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isSelected
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 active:scale-[0.98]'
            }`}
          >
            <Scissors className="w-3 h-3" />
            <span>{isSelected ? 'Editing…' : 'Use Clip'}</span>
            {!isSelected && <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SmartClipFinder: React.FC<SmartClipFinderProps> = ({
  clips,
  hasTranscript,
  previewingClipId,
  selectedClipId,
  onTranscribe,
  onPreviewClip,
  onUseClip,
  onManualClip,
  isProcessing,
}) => {
  // Track if we've shown clips before (for the "no strong clips" message)
  const hasCheckedRef = useRef(false);
  useEffect(() => {
    if (hasTranscript) hasCheckedRef.current = true;
  }, [hasTranscript]);

  // ── Empty states ──
  if (!hasTranscript) {
    return <EmptyNoTranscript onTranscribe={onTranscribe} isProcessing={isProcessing} />;
  }

  if (hasTranscript && clips.length === 0 && !hasCheckedRef.current) {
    return <EmptyTooShort />;
  }

  if (hasTranscript && clips.length === 0) {
    return <EmptyNoStrongClips onManualClip={onManualClip} />;
  }

  // ── Clips found ──
  return (
    <div className="w-full bg-[#0e111a]/90 border border-indigo-500/25 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-white tracking-tight">
                Smart Clip Finder
              </h4>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded font-semibold">
                {clips.length} clips
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ranked by hook strength, keyword density &amp; natural boundaries
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onManualClip}
          title="Switch to manual trim controls"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <Sliders className="w-3 h-3" />
          <span className="hidden sm:inline">Manual</span>
        </button>
      </div>

      {/* Clip list */}
      <div className="p-4 space-y-3">
        {clips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            isPreviewing={previewingClipId === clip.id}
            isSelected={selectedClipId === clip.id}
            onPreview={() => onPreviewClip(clip)}
            onUse={() => onUseClip(clip)}
          />
        ))}
      </div>

      {/* Footer — transcript info + manual option */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400/60" />
          <span>Analysed from on-device transcript — no extra AI model</span>
        </div>

        <button
          type="button"
          onClick={onTranscribe}
          disabled={isProcessing}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer disabled:opacity-40 transition-colors shrink-0"
        >
          Re-analyse
        </button>
      </div>
    </div>
  );
};
