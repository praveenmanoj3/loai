import React from 'react';
import { ShieldCheck, Lock, Database, ServerOff, X, Check } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1018] border border-emerald-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>100% On-Device Privacy Architecture</span>
              </h3>
              <p className="text-xs text-emerald-400/80">
                Verified: Your video and audio never leave your device
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

        {/* Architecture Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
          {/* Traditional Cloud Tool */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Traditional Video Tools</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Uploads gigabytes of video to remote cloud servers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Videos stored in third-party databases</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Queues, watermark paywalls, expensive cloud bills</span>
              </li>
            </ul>
          </div>

          {/* Shorts AI Local First */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Shorts AI (Our Architecture)</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>0 bytes uploaded:</strong> Video stays in browser RAM</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Local Whisper AI:</strong> Speech transcribed on your CPU/GPU</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>FFmpeg WASM:</strong> Video rendering executed locally</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Guarantee Details */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 text-xs text-slate-300 relative z-10 leading-relaxed">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>How We Ensure Complete Privacy</span>
          </h4>
          <p>
            When you drop a video file, it is loaded into an in-memory <code>ArrayBuffer</code> inside your browser. 
            All AI inferences (Whisper AI speech-to-text) and video transformations (FFmpeg WebAssembly) execute inside local Web Workers.
          </p>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 font-mono text-[11px] text-slate-400">
            Browser Memory ➔ WebAssembly Core ➔ On-Device GPU/CPU ➔ Exported MP4 Blob
          </div>
          <p className="text-[11px] text-slate-400 italic">
            You can verify this anytime by opening your browser's Developer Tools (F12) ➔ Network tab. You will see 0 media upload requests during processing.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 relative z-10">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <ServerOff className="w-4 h-4" />
            <span>Zero Server Processing Required</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
