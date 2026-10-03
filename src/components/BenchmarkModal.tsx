import React from 'react';
import {
  Cpu,
  Zap,
  X,
  ShieldCheck,
  Leaf,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { HardwareStatus } from '../services/hardwareService';

interface HardwareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineMode: 'auto' | 'webgpu' | 'wasm' | 'wasm-eco';
  setEngineMode: (mode: 'auto' | 'webgpu' | 'wasm' | 'wasm-eco') => void;
  hardware?: HardwareStatus | null;
  threadCount?: number;
  setThreadCount?: (threads: number) => void;
}

/**
 * Lightweight Hardware Settings modal.
 * Replaces the old BenchmarkModal — no actual benchmark (no Whisper/FFmpeg loaded here).
 * Only reads already-detected hardware info and lets the user configure processing mode.
 */
export const BenchmarkModal: React.FC<HardwareSettingsModalProps> = ({
  isOpen,
  onClose,
  engineMode,
  setEngineMode,
  hardware,
  threadCount = 2,
  setThreadCount,
}) => {
  if (!isOpen) return null;

  const rec = hardware?.recommendation;
  const totalCores = hardware?.cores || 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1018] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Processing Settings
              </h3>
              <p className="text-xs text-slate-400">
                Hardware detected — configure CPU/GPU mode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hardware info row */}
        <div className="grid grid-cols-3 gap-2.5 relative z-10">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
              <Cpu className="w-3 h-3 text-violet-400" /> CPU Cores
            </div>
            <div className="text-xs font-bold text-white font-mono">
              {totalCores} Logical
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" /> WebGPU
            </div>
            <div className="text-xs font-bold font-mono">
              {hardware?.webGpuSupported ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> WASM Only
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Est. Export
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono">
              {rec?.estimatedProcessingTime || '10–20s / clip'}
            </div>
          </div>
        </div>

        {/* Safety recommendation banner */}
        {rec && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-black/40 border border-emerald-500/30 space-y-2 relative z-10">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Leaf className="w-4 h-4" />
              <span>{rec.safetyTitle}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {rec.safetyExplanation}
            </p>
          </div>
        )}

        {/* Engine mode selector */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 relative z-10">
          <label className="text-xs font-bold text-slate-300">Processing Engine</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Eco Safe 8-bit */}
            <button
              type="button"
              onClick={() => {
                setEngineMode('wasm-eco');
                if (setThreadCount) setThreadCount(2);
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                engineMode === 'wasm-eco'
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-400" />
                <span>🌿 Eco</span>
              </div>
              <div className="text-[10px] text-emerald-400/80 font-normal mt-0.5">8-Bit • 2 Cores</div>
            </button>

            {/* Auto */}
            <button
              type="button"
              onClick={() => setEngineMode('auto')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                engineMode === 'auto'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div>⚡ Auto</div>
              <div className="text-[10px] opacity-70 font-normal mt-0.5">Recommended</div>
            </button>

            {/* WebGPU */}
            <button
              type="button"
              onClick={() => setEngineMode('webgpu')}
              disabled={!hardware?.webGpuSupported}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center disabled:opacity-40 cursor-pointer ${
                engineMode === 'webgpu'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div>🏎️ GPU</div>
              <div className="text-[10px] opacity-70 font-normal mt-0.5">WebGPU</div>
            </button>

            {/* WASM CPU */}
            <button
              type="button"
              onClick={() => setEngineMode('wasm')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                engineMode === 'wasm'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div>💻 CPU</div>
              <div className="text-[10px] opacity-70 font-normal mt-0.5">WASM</div>
            </button>
          </div>

          {/* Thread Limit */}
          {setThreadCount && (
            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>CPU Core Limit: {threadCount} of {totalCores}</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  {threadCount <= 2
                    ? 'Safe for all laptops — low heat & zero lag'
                    : threadCount <= 4
                    ? 'Balanced performance for multi-tasking'
                    : 'Maximum power (fans may spin up)'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 4, Math.min(totalCores, 8)]
                  .filter((v, i, a) => a.indexOf(v) === i && v <= totalCores)
                  .map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setThreadCount(val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        threadCount === val
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400'
                      }`}
                    >
                      {val === 2 ? `${val} (Safe)` : `${val}`}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% on-device • 0 bytes sent to servers</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
