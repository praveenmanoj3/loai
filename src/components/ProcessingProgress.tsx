import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Cpu, Disc3 } from 'lucide-react';
import type { ProgressState } from '../services/ffmpegService';

interface ProcessingProgressProps {
  progressState: ProgressState;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ progressState }) => {
  const [showLogs, setShowLogs] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [progressState.logs, showLogs]);

  // Meaningful state titles matching Day 2 requirements
  const getPhaseTitle = () => {
    switch (progressState.phase) {
      case 'preparing_video':
        return 'Preparing video...';
      case 'processing':
        return 'Processing...';
      case 'encoding':
        return 'Encoding...';
      case 'finalizing':
        return 'Finalizing...';
      case 'completed':
        return 'Ready!';
      case 'error':
        return 'Processing Encountered an Error';
      default:
        return 'Preparing video...';
    }
  };

  const steps = [
    { id: 'preparing_video', label: 'Preparing video' },
    { id: 'processing', label: 'Processing' },
    { id: 'encoding', label: 'Encoding' },
    { id: 'finalizing', label: 'Finalizing' },
  ];

  const getCurrentStepIndex = () => {
    switch (progressState.phase) {
      case 'preparing_video': return 0;
      case 'processing': return 1;
      case 'encoding': return 2;
      case 'finalizing': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = getCurrentStepIndex();

  return (
    <div className="w-full bg-[#10131e]/90 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden space-y-6">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with status */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            {progressState.phase === 'completed' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : progressState.phase === 'error' ? (
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            ) : (
              <Disc3 className="w-6 h-6 animate-spin text-indigo-400" />
            )}
          </div>
          <div>
            <h4 className="text-lg font-extrabold text-white tracking-tight">
              {getPhaseTitle()}
            </h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {progressState.statusMessage || 'Processing on your local hardware...'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-3xl font-black font-mono tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            {progressState.progress}%
          </span>
        </div>
      </div>

      {/* Meaningful Stage Indicators */}
      <div className="grid grid-cols-4 gap-2 pt-2 relative z-10">
        {steps.map((step, idx) => {
          const isDone = currentStepIdx > idx;
          const isCurrent = currentStepIdx === idx;

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                isCurrent
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                  : isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/[0.02] border-white/5 text-slate-500'
              }`}
            >
              <div className="text-[10px] font-mono uppercase font-bold tracking-wider">
                Step {idx + 1}
              </div>
              <div className="text-xs font-semibold mt-0.5 truncate">{step.label}</div>
            </div>
          );
        })}
      </div>

      {/* Accurate Progress Bar */}
      <div className="space-y-2 relative z-10">
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 rounded-full transition-all duration-300 relative"
            style={{ width: `${Math.max(5, progressState.progress)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
        
        <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" /> WebAssembly In-Browser Processing
          </span>
          <span>100% Private (No Cloud Upload)</span>
        </div>
      </div>

      {/* Live FFmpeg Log Drawer */}
      <div className="pt-2 border-t border-white/5 relative z-10">
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono py-1"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>{showLogs ? 'Hide Engine Logs' : 'Show Engine Logs'}</span>
          {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showLogs && (
          <div
            ref={logContainerRef}
            className="mt-3 p-3 bg-black/70 border border-white/10 rounded-xl max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 shadow-inner"
          >
            {progressState.logs.length === 0 ? (
              <span className="text-slate-500">Waiting for engine output...</span>
            ) : (
              progressState.logs.map((log, i) => (
                <div key={i} className="leading-relaxed text-slate-400">
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
