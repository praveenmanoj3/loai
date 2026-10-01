export type CaptionPreset = 'classic' | 'bold_impact' | 'neon_pop' | 'minimal_box' | 'tiktok_fire' | 'podcast_clean';
export type CaptionPosition = 'bottom' | 'middle' | 'top';

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
  highlightColor?: string;
  boxPadding?: number;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  preset: 'bold_impact',
  fontFamily: 'Impact',
  fontSize: 56,
  textColor: '#FFE600',       // Vibrant Yellow
  strokeColor: '#000000',     // Bold Black Outline
  strokeWidth: 4,
  backgroundColor: 'transparent',
  position: 'bottom',
  textTransform: 'uppercase',
  highlightColor: '#FFFFFF',
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
  },
  bold_impact: {
    preset: 'bold_impact',
    fontFamily: 'Impact',
    fontSize: 56,
    textColor: '#FFE600',
    strokeColor: '#000000',
    strokeWidth: 4,
    backgroundColor: 'transparent',
    position: 'bottom',
    textTransform: 'uppercase',
  },
  neon_pop: {
    preset: 'neon_pop',
    fontFamily: 'Trebuchet MS',
    fontSize: 52,
    textColor: '#00FFFF', // Neon Cyan
    strokeColor: '#090A0F',
    strokeWidth: 4,
    backgroundColor: 'transparent',
    position: 'middle',
    textTransform: 'uppercase',
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
  },
  tiktok_fire: {
    preset: 'tiktok_fire',
    fontFamily: 'Impact',
    fontSize: 58,
    textColor: '#FF4500',    // TikTok Fire Orange-Red
    strokeColor: '#000000',
    strokeWidth: 5,
    backgroundColor: 'transparent',
    position: 'middle',
    textTransform: 'uppercase',
    highlightColor: '#FFE600',
  },
  podcast_clean: {
    preset: 'podcast_clean',
    fontFamily: 'Inter, sans-serif',
    fontSize: 44,
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 0,
    backgroundColor: 'rgba(10, 12, 24, 0.85)',
    position: 'bottom',
    textTransform: 'none',
    boxPadding: 10,
    highlightColor: '#818CF8', // Indigo accent
  },
};

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

  const header = `[Script Info]
Title: Shorts AI Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},${primaryAssColor},&H000000FF,${outlineAssColor},${backAssColor},${bold},0,0,0,100,100,0,0,${borderStyle},${outline},1,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formatAssTime = (seconds: number) => {
    const pad = (n: number, z: number = 2) => n.toString().padStart(z, '0');
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(cs)}`;
  };

  const events = segments
    .map((seg) => {
      const start = formatAssTime(seg.start);
      const end = formatAssTime(seg.end);
      let text = seg.text.trim();
      if (style.textTransform === 'uppercase') {
        text = text.toUpperCase();
      }
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return header + events;
}
