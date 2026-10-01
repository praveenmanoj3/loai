import React from 'react';
import { ShieldCheck, Zap, Activity } from 'lucide-react';
import type { HardwareStatus } from '../services/hardwareService';

interface HeaderProps {
  hardware: HardwareStatus | null;
  engineMode?: 'auto' | 'webgpu' | 'wasm' | 'wasm-eco';
  onOpenBenchmark?: () => void;
  onOpenPrivacy?: () => void;
  isEcoMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  hardware, 
  engineMode = 'auto', 
  onOpenBenchmark,
  onOpenPrivacy,
  isEcoMode = false
}) => {
  return (
    <header className="w-full border-b border-white/5 bg-[#090a0f]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0d0f17] rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SHORTS AI
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                Week 1 • Local MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">100% On-Device In-Browser Video Studio</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Privacy Guarantee Pill (Interactive) */}
          <button
            type="button"
            onClick={onOpenPrivacy}
            title="Click to view zero-upload privacy verification"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 text-xs font-medium transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">0 Bytes Uploaded • 100% Local</span>
            <span className="sm:hidden font-mono">100% Local</span>
          </button>

          {/* Interactive Hardware & Benchmark Pill */}
          <button
            type="button"
            onClick={onOpenBenchmark}
            title="Click to open Hardware & Laptop Core Safety Advisor"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 text-xs text-slate-300 transition-all cursor-pointer shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono">
              {hardware?.webAssemblySupported ? (
                <span className="text-emerald-400">WASM ✓</span>
              ) : (
                <span className="text-amber-400">Checking...</span>
              )}
            </span>
            {hardware?.cores && (
              <span className="text-slate-500 hidden md:inline">| {hardware.cores} Cores</span>
            )}
            <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border font-mono ${
              engineMode === 'wasm-eco' || isEcoMode
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}>
              {engineMode === 'wasm-eco' || isEcoMode ? '🌿 Eco' : engineMode === 'webgpu' ? 'GPU' : engineMode === 'wasm' ? 'CPU' : 'Auto'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

