import type { CaptionSegment } from './subtitleUtils';
import type { CaptionStyle } from './captionStyles';

export interface CaptionImageOverlay {
  filename: string;
  data: Uint8Array;
  start: number;
  end: number;
  width: number;
  height: number;
}

/**
 * Generates transparent PNG overlays for each caption segment using Canvas 2D
 * This allows 100% faithful rendering of custom fonts, colors, stroke outlines,
 * and background boxes directly within FFmpeg's built-in `overlay` filter.
 */
export async function generateCaptionPngOverlays(
  segments: CaptionSegment[],
  style: CaptionStyle,
  canvasWidth: number = 1080,
  _canvasHeight: number = 1920
): Promise<CaptionImageOverlay[]> {
  const overlays: CaptionImageOverlay[] = [];

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  // Scale factor based on resolution (1080p vs 720p)
  const scale = canvasWidth / 1080;
  const fontSize = Math.round(style.fontSize * scale);
  const strokeWidth = Math.round(style.strokeWidth * scale);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let text = seg.text.trim();
    if (!text) continue;

    if (style.textTransform === 'uppercase') {
      text = text.toUpperCase();
    }

    // Set font to measure dimensions
    ctx.font = `900 ${fontSize}px "${style.fontFamily}", sans-serif`;
    
    // Split long lines if needed (max ~28 chars per line on vertical shorts)
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > canvasWidth * 0.85 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.25;
    const totalTextHeight = lines.length * lineHeight;
    
    // Measure max line width
    let maxLineWidth = 0;
    for (const line of lines) {
      const m = ctx.measureText(line);
      if (m.width > maxLineWidth) maxLineWidth = m.width;
    }

    const paddingX = style.backgroundColor !== 'transparent' ? 32 * scale : 20 * scale;
    const paddingY = style.backgroundColor !== 'transparent' ? 20 * scale : 12 * scale;
    const overlayWidth = Math.min(canvasWidth, Math.ceil(maxLineWidth + paddingX * 2 + strokeWidth * 4));
    const overlayHeight = Math.ceil(totalTextHeight + paddingY * 2 + strokeWidth * 4);

    // Resize canvas for this specific overlay
    canvas.width = overlayWidth;
    canvas.height = overlayHeight;

    // Clear transparent background
    ctx.clearRect(0, 0, overlayWidth, overlayHeight);

    const centerX = overlayWidth / 2;
    const startY = paddingY + strokeWidth + fontSize * 0.85;

    // Draw background box if enabled
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(4, 4, overlayWidth - 8, overlayHeight - 8, 16 * scale);
      ctx.fill();
    }

    ctx.font = `900 ${fontSize}px "${style.fontFamily}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx];
      const lineY = startY + lineIdx * lineHeight;

      // Draw stroke outline if width > 0
      if (strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = strokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(lineText, centerX, lineY);
      }

      // Draw main text fill
      ctx.fillStyle = style.textColor;
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = strokeWidth > 0 ? 0 : 8 * scale;
      ctx.shadowOffsetY = 3 * scale;
      ctx.fillText(lineText, centerX, lineY);
    }

    // Export canvas as PNG data buffer
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      const arrayBuffer = await blob.arrayBuffer();
      overlays.push({
        filename: `caption_${i}.png`,
        data: new Uint8Array(arrayBuffer),
        start: seg.start,
        end: seg.end,
        width: overlayWidth,
        height: overlayHeight,
      });
    }
  }

  return overlays;
}
