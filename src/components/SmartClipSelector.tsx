import React from 'react';
import { 
  Flame, 
  Sparkles, 
  Play, 
  Scissors, 
  Clock, 
  TrendingUp, 
  Zap, 
  HelpCircle,
  Sliders,
  Bot
} from 'lucide-react';
import type { CandidateClip } from '../services/clipSelector';
import { formatSrtTimestamp } from '../services/subtitleUtils';

interface SmartClipSelectorProps {
  clips: CandidateClip[];
  selectedClipId: string | null;
  onSelectClip: (clip: CandidateClip) => void;
  onPreviewClip: (clip: CandidateClip) => void;
  onGenerateClipDirect: (clip: CandidateClip) => void;
  onTranscribe?: () => void;
  isProcessing: boolean;
}

export const SmartClipSelector: React.FC<SmartClipSelectorProps> = ({
  clips,
  selectedClipId,
  onSelectClip,
  onPreviewClip,
  onGenerateClipDirect,
  onTranscribe,
  isProcessing,
}) => {
  if (!clips || clips.length === 0) {
    return (
      <div className="w-full bg-[#10131e]/90 border border-indigo-500/20 rounded-2xl p-8 backdrop-blur-xl text-center space-y-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
          <Flame className="w-7 h-7" />
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <h4 className="text-base font-bold text-white tracking-tight">
            AI Viral Clip Detector
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Whisper AI will transcribe speech on your device, analyze your sentences, and automatically extract the top 3–4 viral moments & hooks.
          </p>
        </div>

        {onTranscribe && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onTranscribe}
              disabled={isProcessing}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-rose-500/20 transition-all scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              <span>TRANSCRIPT & DETECT VIRAL MOMENTS NOW</span>
            </button>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              100% on-device Whisper AI execution • 0 bytes uploaded
            </p>
          </div>
        )}
      </div>
    );
  }

  const getBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-amber-500/20';
      case 2:
        return 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-indigo-500/20';
      case 3:
      default:
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20';
    }
  };

  const getHookIcon = (type: CandidateClip['hookType']) => {
    switch (type) {
      case 'question':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'high_energy':
        return <Zap className="w-3.5 h-3.5 text-rose-400" />;
      case 'insight':
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="w-full bg-[#10131e]/90 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 backdrop-blur-xl space-y-5 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-white tracking-tight">
                AI Viral Moments Detected ({clips.length} Candidate Shorts)
              </h4>
              <span className="text-[10px] uppercase font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                AI Powered
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ranked by hook strength, virality keywords, speech pacing, and sentence boundaries
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Clips List */}
      <div className="space-y-3 relative z-10">
        {clips.map((clip) => {
          const isSelected = selectedClipId === clip.id;

          return (
            <div
              key={clip.id}
              className={`p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                isSelected
                  ? 'bg-indigo-600/15 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                  : 'bg-black/40 hover:bg-black/60 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left Side: Rank, Title, Reasoning */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Rank Pill */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${getBadgeColor(
                        clip.rank
                      )}`}
                    >
                      <Flame className="w-3 h-3" />
                      <span>#{clip.rank} Viral Pick</span>
                    </span>

                    {/* Virality Score */}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{clip.score}% Virality Score</span>
                    </span>

                    {/* Duration */}
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-xs font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{clip.formattedDuration}</span>
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                    {clip.title}
                  </h5>

                  {/* Snippet Preview */}
                  <p className="text-xs text-slate-300 leading-relaxed italic line-clamp-2">
                    "{clip.snippet}"
                  </p>

                  {/* AI Reasoning Tag */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 font-medium">
                    {getHookIcon(clip.hookType)}
                    <span className="text-indigo-300 font-semibold">{clip.reasoning}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-slate-400">
                      {formatSrtTimestamp(clip.start).slice(3, 8)} ➔ {formatSrtTimestamp(clip.end).slice(3, 8)}
                    </span>
                  </div>

                  {/* Animated Virality Score Bar */}
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider">Virality Score</span>
                      <span className={`font-mono font-bold ${
                        clip.score >= 80 ? 'text-emerald-400' :
                        clip.score >= 65 ? 'text-amber-400' : 'text-slate-400'
                      }`}>{clip.score}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          clip.score >= 80
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                            : clip.score >= 65
                            ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                            : 'bg-gradient-to-r from-indigo-400 to-violet-400'
                        }`}
                        style={{ width: `${clip.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => onPreviewClip(clip)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectClip(clip)}
                      title="Load range into timeline trim controls"
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onGenerateClipDirect(clip)}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all scale-[1.02] active:scale-[0.98] w-full"
                  >
                    <Scissors className="w-3 h-3" />
                    <span>Export Short</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
