export type CaptionPreset = 'classic' | 'bold_impact' | 'neon_pop' | 'minimal_box' | 'tiktok_fire' | 'podcast_clean';
export type CaptionPosition = 'bottom' | 'middle' | 'top';
export type KineticAnimationType = 'static' | 'karaoke_glow' | 'power_word' | 'word_pop';

export interface CaptionStyle {
  preset: CaptionPreset;
  fontFamily: string;
  fontSize: number;
  textColor: string;       // Hex (e.g., #FFFFFF, #FFE600)
  strokeColor: string;     // Hex (e.g., #000000)
  strokeWidth: number;     // 0 to 8
  backgroundColor: string; // e.g. 'transparent', 'rgba(0,0,0,0.7)'
  position: CaptionPosition;
  textTransform: 'uppercase' | 'none';
  highlightColor: string;  // Word-by-word karaoke active color (e.g. #FFE600, #39FF14, #FF4500)
  animationType: KineticAnimationType; // 'static' | 'karaoke_glow' | 'power_word' | 'word_pop'
  autoHighlightPowerWords: boolean; // Automatically accent high-energy trigger keywords
  boxPadding?: number;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  preset: 'bold_impact',
  fontFamily: 'Impact',
  fontSize: 56,
  textColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 4,
  backgroundColor: 'transparent',
  position: 'bottom',
  textTransform: 'uppercase',
  highlightColor: '#FFE600',       // Vibrant Yellow Active Word
  animationType: 'karaoke_glow',   // Dynamic Word-by-Word Active Karaoke default
  autoHighlightPowerWords: true,
};

export const PRESET_STYLES: Record<CaptionPreset, CaptionStyle> = {
  classic: {
    preset: 'classic',
    fontFamily: 'Arial',
    fontSize: 48,
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 2,
    backgroundColor: 'transparent',
    position: 'bottom',
    textTransform: 'none',
    highlightColor: '#FFE600',
    animationType: 'static',
    autoHighlightPowerWords: false,
  },
  bold_impact: {
    preset: 'bold_impact',
    fontFamily: 'Impact',
    fontSize: 56,
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 4,
    backgroundColor: 'transparent',
    position: 'bottom',
    textTransform: 'uppercase',
    highlightColor: '#FFE600',
    animationType: 'karaoke_glow',
    autoHighlightPowerWords: true,
  },
  neon_pop: {
    preset: 'neon_pop',
    fontFamily: 'Trebuchet MS',
    fontSize: 52,
    textColor: '#FFFFFF',
    strokeColor: '#090A0F',
    strokeWidth: 4,
    backgroundColor: 'transparent',
    position: 'middle',
    textTransform: 'uppercase',
    highlightColor: '#00FFFF', // Neon Cyan
    animationType: 'karaoke_glow',
    autoHighlightPowerWords: true,
  },
  minimal_box: {
    preset: 'minimal_box',
    fontFamily: 'Inter, sans-serif',
    fontSize: 42,
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    position: 'bottom',
    textTransform: 'none',
    boxPadding: 8,
    highlightColor: '#38BDF8', // Sky Blue
    animationType: 'karaoke_glow',
    autoHighlightPowerWords: false,
  },
  tiktok_fire: {
    preset: 'tiktok_fire',
    fontFamily: 'Impact',
    fontSize: 58,
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 5,
    backgroundColor: 'transparent',
    position: 'middle',
    textTransform: 'uppercase',
    highlightColor: '#FF4500', // TikTok Fire Orange
    animationType: 'power_word',
    autoHighlightPowerWords: true,
  },
  podcast_clean: {
    preset: 'podcast_clean',
    fontFamily: 'Inter, sans-serif',
    fontSize: 44,
    textColor: '#E2E8F0',
    strokeColor: '#000000',
    strokeWidth: 0,
    backgroundColor: 'rgba(10, 12, 24, 0.85)',
    position: 'bottom',
    textTransform: 'none',
    boxPadding: 10,
    highlightColor: '#818CF8', // Indigo accent
    animationType: 'karaoke_glow',
    autoHighlightPowerWords: false,
  },
};

// Common viral trigger words and emotional power keywords
const POWER_WORDS_SET = new Set([
  'MONEY', 'DOLLARS', 'CASH', 'RICH', 'SECRET', 'MILLION', 'BILLION', 'NEVER',
  'ALWAYS', 'BEST', 'WORST', 'FAIL', 'WIN', 'PROFIT', 'CRASH', 'GROWTH', 'STOP',
  'START', 'FAST', 'FREE', 'CRAZY', 'INSANE', 'MASSIVE', 'TRUTH', 'MISTAKE',
  'KEY', 'POWER', 'HACK', 'TRICK', 'WARNING', 'URGENT', 'SHOCKING', 'REAL', 'LIFE',
  'SUCCESS', 'DISASTER', 'REVOLUTION', 'PROOF', 'FIRST', 'LAST', 'ONLY', 'DEAD',
  'RULE', 'TRAP', 'SCAM', 'BIGGEST', 'DANGEROUS', 'SECRETLY', 'FINALLY', 'HOW'
]);

/**
 * Checks if a word is an impactful high-energy power keyword or number
 */
export function isPowerWord(word: string): boolean {
  if (!word) return false;
  const clean = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (POWER_WORDS_SET.has(clean)) return true;
  // Matches numbers, dollar amounts, percentages: e.g. 100K, $500, 10X, 99%
  if (/^\$?\d+[%kKmMxX]?$/.test(clean)) return true;
  return false;
}

/**
 * Converts standard HEX color (#RRGGBB) to ASS color format (&H00BBGGRR)
 */
export function hexToAssColor(hex: string, alpha: number = 0): string {
  const cleanHex = hex.replace('#', '');
  let r = 'FF', g = 'FF', b = 'FF';
  if (cleanHex.length === 6) {
    r = cleanHex.substring(0, 2);
    g = cleanHex.substring(2, 4);
    b = cleanHex.substring(4, 6);
  } else if (cleanHex.length === 3) {
    r = cleanHex[0] + cleanHex[0];
    g = cleanHex[1] + cleanHex[1];
    b = cleanHex[2] + cleanHex[2];
  }
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
  return `&H${alphaHex}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}`;
}

/**
 * Generates an Advanced SubStation Alpha (.ass) subtitle file formatted with user styling
 */
export function generateAssSubtitles(
  segments: Array<{ start: number; end: number; text: string }>,
  style: CaptionStyle,
  videoWidth: number = 1080,
  videoHeight: number = 1920
): string {
  const primaryAssColor = hexToAssColor(style.textColor);
  const outlineAssColor = hexToAssColor(style.strokeColor);
  const backAssColor = hexToAssColor('#000000', 0.5);

  // Alignment: 2 = Bottom Center, 5 = Middle Center, 8 = Top Center
  let alignment = 2;
  let marginV = 220; // Distance from bottom

  if (style.position === 'middle') {
    alignment = 5;
    marginV = 0;
  } else if (style.position === 'top') {
    alignment = 8;
    marginV = 220;
  }

  const borderStyle = style.backgroundColor !== 'transparent' ? 3 : 1; // 3 = Opaque box, 1 = Outline + Shadow
  const outline = style.strokeWidth;
  const bold = style.fontFamily === 'Impact' || style.preset === 'bold_impact' ? -1 : 0;

  const assHeader = `[Script Info]
Title: Shorts AI Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},${primaryAssColor},&H000000FF,${outlineAssColor},${backAssColor},${bold},0,0,0,100,100,0,0,${borderStyle},${outline},2,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formatAssTime = (seconds: number) => {
    const pad = (num: number, size: number = 2) => num.toString().padStart(size, '0');
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centis = Math.floor((seconds % 1) * 100);
    return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(centis)}`;
  };

  const dialogLines = segments.map((seg) => {
    const startStr = formatAssTime(seg.start);
    const endStr = formatAssTime(seg.end);
    let text = seg.text.trim();
    if (style.textTransform === 'uppercase') {
      text = text.toUpperCase();
    }
    return `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${text}`;
  });

  return assHeader + dialogLines.join('\n');
}
