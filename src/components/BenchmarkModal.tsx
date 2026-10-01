import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  Activity, 
  CheckCircle2, 
  X, 
  HardDrive, 
  RotateCcw, 
  Layers, 
  ShieldCheck, 
  Play, 
  AlertTriangle,
  Leaf,
  Clock,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { 
  runRealHardwareBenchmark, 
  getCachedBenchmark, 
  type BenchmarkResult, 
  type DeviceInfo, 
  getDetailedDeviceInfo 
} from '../services/benchmarkService';
import type { HardwareStatus } from '../services/hardwareService';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineMode: 'auto' | 'webgpu' | 'wasm' | 'wasm-eco';
  setEngineMode: (mode: 'auto' | 'webgpu' | 'wasm' | 'wasm-eco') => void;
  hardware?: HardwareStatus | null;
  threadCount?: number;
  setThreadCount?: (threads: number) => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  engineMode,
  setEngineMode,
  hardware,
  threadCount = 2,
  setThreadCount,
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    getDetailedDeviceInfo().then(setDeviceInfo);
    const cached = getCachedBenchmark();
    if (cached) setBenchmark(cached);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setProgressPercent(10);
    setStatusMessage('Preparing hardware benchmark test...');

    try {
      const res = await runRealHardwareBenchmark((status, percent) => {
        setStatusMessage(status);
        setProgressPercent(percent);
      });
      setBenchmark(res);
    } catch (err) {
      console.error('Benchmark execution error:', err);
      setStatusMessage('Benchmark encountered an error.');
    } finally {
      setIsRunning(false);
    }
  };

  const rec = hardware?.recommendation;
  const totalCores = hardware?.cores || deviceInfo?.cpuCores || 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1018] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Hardware & Laptop Safety Advisor</span>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Eco & Benchmark
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Core optimization, thermal safety recommendations, and real-time GPU vs CPU diagnostics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Laptop Core Usage Safety & Recommendation Banner */}
        {rec && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-black/40 border border-emerald-500/30 space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Leaf className="w-4 h-4" />
                <span>Laptop Safety Recommendation</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Est: {rec.estimatedProcessingTime}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
              <div className="font-bold text-white flex items-center gap-2">
                <span>Suggested Core Allocation:</span>
                <span className="text-emerald-300 font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded">
                  {rec.suggestedThreads} of {totalCores} Cores
                </span>
              </div>
              <p className="text-slate-400 text-[11px] pt-1">
                {rec.safetyExplanation}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                Prevents laptop fan spin-up, thermal throttling, and browser tab freezing.
              </span>
            </div>
          </div>
        )}

        {/* 2. Device Hardware Diagnostics Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" /> GPU Device
            </div>
            <div className="text-xs font-bold text-white truncate" title={deviceInfo?.gpuName || hardware?.gpuName}>
              {deviceInfo?.gpuName || hardware?.gpuName || 'Detecting...'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
              <Cpu className="w-3 h-3 text-violet-400" /> CPU Threads
            </div>
            <div className="text-xs font-bold text-white font-mono">
              {totalCores} Logical Cores
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-emerald-400" /> RAM Memory
            </div>
            <div className="text-xs font-bold text-white font-mono">
              {deviceInfo?.memoryGb || hardware?.memoryGb ? `${deviceInfo?.memoryGb || hardware?.memoryGb} GB Available` : 'Browser Standard'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-pink-400" /> WebGPU Status
            </div>
            <div className="text-xs font-bold font-mono">
              {deviceInfo?.isWebGpuSupported || hardware?.webGpuSupported ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> WASM Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Engine Mode & Power Profile Selector */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Power Profile & Model Engine</label>
            <span className="text-[10px] text-slate-400">Choose safety level for your hardware</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Eco Safe 8-bit */}
            <button
              type="button"
              onClick={() => {
                setEngineMode('wasm-eco');
                if (setThreadCount) setThreadCount(2);
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                engineMode === 'wasm-eco'
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>🌿 Eco Safe</span>
              </div>
              <div className="text-[10px] text-emerald-400/80 font-normal mt-0.5">8-Bit • 2 Cores</div>
            </button>

            {/* Auto Detect */}
            <button
              type="button"
              onClick={() => setEngineMode('auto')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                engineMode === 'auto'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div>⚡ Auto</div>
              <div className="text-[10px] opacity-70 font-normal mt-0.5">Recommended</div>
            </button>

            {/* Force WebGPU */}
            <button
              type="button"
              onClick={() => setEngineMode('webgpu')}
              disabled={!deviceInfo?.isWebGpuSupported && !hardware?.webGpuSupported}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center disabled:opacity-40 ${
                engineMode === 'webgpu'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div>🏎️ WebGPU</div>
              <div className="text-[10px] opacity-70 font-normal mt-0.5">GPU Direct</div>
            </button>

            {/* Standard WASM */}
            <button
              type="button"
              onClick={() => setEngineMode('wasm')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                engineMode === 'wasm'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div>💻 WASM CPU</div>
              <div className="text-[10px] opacity-70 font-normal mt-0.5">Full Threads</div>
            </button>
          </div>

          {/* Thread Limit Slider */}
          {setThreadCount && (
            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>CPU Cores Limit: {threadCount} of {totalCores}</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  {threadCount <= 2 
                    ? 'Safe for all laptops: Low heat & zero lag' 
                    : threadCount <= 4 
                    ? 'Balanced performance for multi-tasking' 
                    : 'Maximum power (fans may spin up)'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 4, Math.min(totalCores, 8)].filter((v, i, a) => a.indexOf(v) === i && v <= totalCores).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setThreadCount(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      threadCount === val
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400'
                    }`}
                  >
                    {val === 2 ? `${val} (Safe)` : `${val} Cores`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Benchmark Comparison (CPU vs GPU) */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Measured Hardware Benchmark
            </h4>
            {benchmark && (
              <span className="text-[11px] font-mono text-slate-500">
                Last run: {benchmark.testedAt}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CPU Mode Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-violet-400" />
                  <span>CPU Mode (WASM SIMD)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                  {threadCount} Threads
                </span>
              </div>
              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {benchmark ? `${benchmark.cpuTimeMs} ms` : '—'}
                </span>
                <span className="text-xs text-slate-400">per 4s audio batch</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Universal compatibility on all browsers & hardware.
              </div>
            </div>

            {/* WebGPU Mode Card */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-indigo-900/20 to-black/40 border border-indigo-500/30 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>GPU Mode (WebGPU)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                  Hardware Accelerated
                </span>
              </div>
              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {benchmark?.gpuTimeMs ? `${benchmark.gpuTimeMs} ms` : 'WASM Mode Active'}
                </span>
                {benchmark?.speedupMultiplier && (
                  <span className="text-xs font-bold text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    ⚡ {benchmark.speedupMultiplier}x Faster
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Direct compute shader pipeline for ultra-fast AI inference.
              </div>
            </div>
          </div>
        </div>

        {/* 5. Progress State during Live Benchmark */}
        {isRunning && (
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-indigo-300 font-bold">{statusMessage}</span>
              <span className="text-white font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 rounded-full transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 6. Modal Footer Action */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% on-device processing • 0 data sent to servers</span>
          </div>

          <button
            type="button"
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isRunning ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Benchmarking Hardware...' : 'Run Live Benchmark'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

