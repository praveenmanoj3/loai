import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Type, 
  Sparkles, 
  MoveVertical, 
  Check, 
  Zap, 
  Flame, 
  Activity
} from 'lucide-react';
import type { CaptionStyle, CaptionPreset, CaptionPosition, KineticAnimationType } from '../services/captionStyles';
import { PRESET_STYLES, isPowerWord } from '../services/captionStyles';

interface CaptionCustomizerProps {
  style: CaptionStyle;
  onChange: (newStyle: CaptionStyle) => void;
  sampleText?: string;
}

const COLOR_PALETTES = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Yellow', hex: '#FFE600' },
  { name: 'Neon Green', hex: '#39FF14' },
  { name: 'Cyan', hex: '#00F0FF' },
  { name: 'Hot Pink', hex: '#FF1493' },
  { name: 'Orange', hex: '#FF6B00' },
];

const HIGHLIGHT_PALETTES = [
  { name: 'Vibrant Yellow', hex: '#FFE600' },
  { name: 'TikTok Orange', hex: '#FF4500' },
  { name: 'Electric Green', hex: '#39FF14' },
  { name: 'Neon Cyan', hex: '#00F0FF' },
  { name: 'Hot Pink', hex: '#FF1493' },
  { name: 'Indigo Accent', hex: '#818CF8' },
];

const STROKE_PALETTES = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark Gray', hex: '#1E293B' },
  { name: 'Deep Navy', hex: '#090A0F' },
  { name: 'White', hex: '#FFFFFF' },
];

const FONT_OPTIONS = [
  { label: 'Impact (Viral Shorts Standard)', value: 'Impact' },
  { label: 'Inter (Modern & Clean)', value: 'Inter, sans-serif' },
  { label: 'Arial (Classic Sans)', value: 'Arial, sans-serif' },
  { label: 'Trebuchet MS (Dynamic)', value: 'Trebuchet MS, sans-serif' },
  { label: 'Courier (Monospace)', value: 'Courier New, monospace' },
];

export const CaptionCustomizer: React.FC<CaptionCustomizerProps> = ({
  style,
  onChange,
  sampleText = 'YOU HAVE TO START TODAY TO WIN BIG',
}) => {
  const [activeWordPreviewIdx, setActiveWordPreviewIdx] = useState(0);

  const words = sampleText.trim().split(/\s+/);

  // Animate the active word in the customizer preview
  useEffect(() => {
    if (style.animationType === 'static') return;
    const interval = setInterval(() => {
      setActiveWordPreviewIdx((prev) => (prev + 1) % words.length);
    }, 450);
    return () => clearInterval(interval);
  }, [words.length, style.animationType]);

  const handlePresetSelect = (preset: CaptionPreset) => {
    onChange({ ...PRESET_STYLES[preset] });
  };

  return (
    <div className="w-full bg-[#10131e]/90 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              Kinetic Subtitle & Typography Studio
            </h4>
            <p className="text-[11px] text-slate-400">
              Word-by-word active highlighting, dynamic karaoke styles, and viral presets
            </p>
          </div>
        </div>
      </div>

      {/* Live Kinetic Preview Card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#0f111a] via-[#0b0d14] to-[#08090d] border border-indigo-500/30 p-6 flex flex-col items-center justify-center min-h-[120px] text-center shadow-inner">
        <div className="absolute top-2.5 left-3.5 flex items-center gap-1.5 text-[10px] font-mono text-indigo-400/80 uppercase tracking-wider font-bold">
          <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>Live Kinetic Preview ({style.animationType.replace('_', ' ')})</span>
        </div>

        {style.animationType === 'word_pop' ? (
          <div
            style={{
              fontFamily: style.fontFamily,
              fontSize: `${Math.min(36, style.fontSize * 0.6)}px`,
              color: isPowerWord(words[activeWordPreviewIdx]) ? '#FF4500' : style.highlightColor,
              WebkitTextStroke: style.strokeWidth > 0 ? `${style.strokeWidth}px ${style.strokeColor}` : undefined,
              textShadow: `0 0 20px ${style.highlightColor}, 0 2px 10px rgba(0,0,0,0.9)`,
              textTransform: style.textTransform,
            }}
            className="font-black select-none transition-all duration-150 transform scale-110 tracking-wider"
          >
            {words[activeWordPreviewIdx] || words[0]}
          </div>
        ) : (
          <div
            style={{
              fontFamily: style.fontFamily,
              fontSize: `${Math.min(26, style.fontSize * 0.45)}px`,
              backgroundColor: style.backgroundColor,
              padding: style.backgroundColor !== 'transparent' ? '4px 14px' : undefined,
              borderRadius: style.backgroundColor !== 'transparent' ? '8px' : undefined,
              textTransform: style.textTransform,
              letterSpacing: style.fontFamily === 'Impact' ? '1px' : 'normal',
            }}
            className="font-extrabold select-none transition-all duration-200 inline-flex flex-wrap justify-center gap-x-2 gap-y-1"
          >
            {words.map((word, idx) => {
              const isCurrent = style.animationType !== 'static' && idx === activeWordPreviewIdx;
              const isPower = style.autoHighlightPowerWords && isPowerWord(word);

              let color = style.textColor;
              let transform = 'scale(1)';
              let shadow = style.strokeWidth > 0 ? `0 2px 8px rgba(0,0,0,0.8)` : '0 2px 4px rgba(0,0,0,0.6)';

              if (isCurrent) {
                color = isPower ? '#FF4500' : style.highlightColor || '#FFE600';
                shadow = `0 0 16px ${color}, 0 2px 8px rgba(0,0,0,0.9)`;
                transform = 'scale(1.15)';
              } else if (isPower && style.animationType !== 'static') {
                color = '#FF8A00';
              }

              return (
                <span
                  key={idx}
                  style={{
                    color,
                    transform,
                    WebkitTextStroke: style.strokeWidth > 0 ? `${style.strokeWidth}px ${style.strokeColor}` : undefined,
                    textShadow: shadow,
                    transition: 'color 0.15s ease, transform 0.15s ease, text-shadow 0.15s ease',
                  }}
                  className="inline-block"
                >
                  {word}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. Kinetic Animation Mode */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Kinetic Animation Mode</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Day 10 Kinetic Subtitles</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              id: 'karaoke_glow' as KineticAnimationType,
              label: '🔥 Active Karaoke',
              desc: 'Spoken word lights up',
            },
            {
              id: 'word_pop' as KineticAnimationType,
              label: '⚡ 1-Word Pop',
              desc: 'Alex Hormozi rapid fire',
            },
            {
              id: 'power_word' as KineticAnimationType,
              label: '💥 Power Word',
              desc: 'Fiery keyword accent',
            },
            {
              id: 'static' as KineticAnimationType,
              label: '⏹️ Static Classic',
              desc: 'Full phrase steady',
            },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange({ ...style, animationType: mode.id })}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                style.animationType === mode.id
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>{mode.label}</span>
                {style.animationType === mode.id && <Check className="w-3 h-3 text-indigo-400" />}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Active Word Highlight Color & Power Word Detection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Highlight Color */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Spoken Word Color</span>
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={style.highlightColor || '#FFE600'}
                onChange={(e) => onChange({ ...style, highlightColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-[10px] font-mono text-slate-400">{style.highlightColor}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {HIGHLIGHT_PALETTES.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => onChange({ ...style, highlightColor: c.hex })}
                style={{ backgroundColor: c.hex }}
                title={c.name}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  (style.highlightColor || '').toUpperCase() === c.hex.toUpperCase()
                    ? 'border-white scale-110 shadow-md ring-2 ring-indigo-500/40'
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Auto Power Word Toggle */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Auto-Highlight Power Words</span>
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Auto-accents triggers (Money, $100, Win, Secret, 10X)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...style, autoHighlightPowerWords: !style.autoHighlightPowerWords })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                style.autoHighlightPowerWords
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {style.autoHighlightPowerWords ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="text-[10px] font-mono text-indigo-400/80">
            {style.autoHighlightPowerWords ? '✓ Fiery accent enabled on emotional triggers' : 'Standard uniform color'}
          </div>
        </div>
      </div>

      {/* 3. Style Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Preset Templates</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handlePresetSelect('bold_impact')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              style.preset === 'bold_impact'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between text-[#FFE600]">
              <span>Bold Impact</span>
              {style.preset === 'bold_impact' && <Check className="w-3 h-3 text-indigo-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">MrBeast Kinetic</div>
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('tiktok_fire')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              style.preset === 'tiktok_fire'
                ? 'bg-rose-600/20 border-rose-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between text-[#FF4500]">
              <span>🔥 TikTok Fire</span>
              {style.preset === 'tiktok_fire' && <Check className="w-3 h-3 text-rose-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">High-impact middle</div>
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('podcast_clean')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              style.preset === 'podcast_clean'
                ? 'bg-violet-600/20 border-violet-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between text-violet-300">
              <span>🎙 Podcast Clean</span>
              {style.preset === 'podcast_clean' && <Check className="w-3 h-3 text-violet-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Pro interview look</div>
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('classic')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              style.preset === 'classic'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between text-white">
              <span>Classic White</span>
              {style.preset === 'classic' && <Check className="w-3 h-3 text-indigo-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Clean Subtitles</div>
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('neon_pop')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              style.preset === 'neon_pop'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between text-[#00FFFF]">
              <span>Neon Pop</span>
              {style.preset === 'neon_pop' && <Check className="w-3 h-3 text-indigo-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">High Energy Cyan</div>
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('minimal_box')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              style.preset === 'minimal_box'
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between text-slate-200">
              <span>Minimal Box</span>
              {style.preset === 'minimal_box' && <Check className="w-3 h-3 text-indigo-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Pill Background</div>
          </button>
        </div>
      </div>

      {/* 4. Base Color & Stroke Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Base Text Color */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Base Text Color</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => onChange({ ...style, textColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-[10px] font-mono text-slate-400">{style.textColor}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {COLOR_PALETTES.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => onChange({ ...style, textColor: c.hex })}
                style={{ backgroundColor: c.hex }}
                title={c.name}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  style.textColor.toUpperCase() === c.hex.toUpperCase()
                    ? 'border-white scale-110 shadow-md'
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stroke / Outline Color */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Stroke Outline</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={style.strokeColor}
                onChange={(e) => onChange({ ...style, strokeColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-[10px] font-mono text-slate-400">{style.strokeWidth}px</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {STROKE_PALETTES.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => onChange({ ...style, strokeColor: c.hex })}
                style={{ backgroundColor: c.hex }}
                title={c.name}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  style.strokeColor.toUpperCase() === c.hex.toUpperCase()
                    ? 'border-indigo-400 scale-110 shadow-md'
                    : 'border-white/20 opacity-80 hover:opacity-100'
                }`}
              />
            ))}
            <div className="ml-auto flex items-center gap-1">
              {[0, 2, 4, 6].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onChange({ ...style, strokeWidth: w })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                    style.strokeWidth === w
                      ? 'bg-indigo-600 text-white'
                      : 'bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Typography & Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Font Family */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            <span>Font Family</span>
          </span>
          <select
            value={style.fontFamily}
            onChange={(e) => onChange({ ...style, fontFamily: e.target.value })}
            className="w-full bg-[#0d0e14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Position on Screen */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <MoveVertical className="w-3.5 h-3.5 text-indigo-400" />
            <span>Vertical Placement</span>
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(['top', 'middle', 'bottom'] as CaptionPosition[]).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChange({ ...style, position: pos })}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  style.position === pos
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/30 text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Fine-Tuning: Font Size & Text Case */}
      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span>Font Size</span>
            <span className="font-mono text-indigo-400">{style.fontSize}px</span>
          </div>
          <input
            type="range"
            min={32}
            max={76}
            step={2}
            value={style.fontSize}
            onChange={(e) => onChange({ ...style, fontSize: parseInt(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...style,
                textTransform: style.textTransform === 'uppercase' ? 'none' : 'uppercase',
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              style.textTransform === 'uppercase'
                ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
                : 'bg-black/30 text-slate-400 hover:text-white'
            }`}
          >
            {style.textTransform === 'uppercase' ? 'ALL CAPS [ON]' : 'ALL CAPS [OFF]'}
          </button>
        </div>
      </div>
    </div>
  );
};
