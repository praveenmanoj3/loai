import { type CaptionSegment, computeWordTimings } from './subtitleUtils';
import { type CaptionStyle, isPowerWord } from './captionStyles';

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
 * Supports both static phrases and dynamic word-by-word kinetic/karaoke active highlights.
 */
export async function generateCaptionPngOverlays(
  segments: CaptionSegment[],
  style: CaptionStyle,
  canvasWidth: number = 1080,
  _canvasHeight: number = 1920
): Promise<CaptionImageOverlay[]> {
  const overlays: CaptionImageOverlay[] = [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const scale = canvasWidth / 1080;
  const fontSize = Math.round(style.fontSize * scale);
  const strokeWidth = Math.round(style.strokeWidth * scale);
  let overlayCounter = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let text = seg.text.trim();
    if (!text) continue;

    if (style.textTransform === 'uppercase') {
      text = text.toUpperCase();
    }

    const words = text.split(/\s+/);
    if (words.length === 0) continue;

    const wordTimings = computeWordTimings(seg);
    const isKinetic = style.animationType !== 'static';

    // Measure and wrap words into lines
    ctx.font = `900 ${fontSize}px "${style.fontFamily}", sans-serif`;
    const lines: Array<{ words: Array<{ text: string; wordIdx: number }> }> = [];
    let currentLineWords: Array<{ text: string; wordIdx: number }> = [];
    let currentLineWidth = 0;

    const spaceWidth = ctx.measureText(' ').width;

    for (let w = 0; w < words.length; w++) {
      const wText = words[w];
      const wMetrics = ctx.measureText(wText);
      const testWidth = currentLineWidth === 0 ? wMetrics.width : currentLineWidth + spaceWidth + wMetrics.width;

      if (testWidth > canvasWidth * 0.85 && currentLineWords.length > 0) {
        lines.push({ words: currentLineWords });
        currentLineWords = [{ text: wText, wordIdx: w }];
        currentLineWidth = wMetrics.width;
      } else {
        currentLineWords.push({ text: wText, wordIdx: w });
        currentLineWidth = testWidth;
      }
    }
    if (currentLineWords.length > 0) {
      lines.push({ words: currentLineWords });
    }

    const lineHeight = fontSize * 1.25;
    const totalTextHeight = lines.length * lineHeight;

    // Find max width of all lines
    let maxLineWidth = 0;
    lines.forEach((line) => {
      let lWidth = 0;
      line.words.forEach((lw, idx) => {
        lWidth += ctx.measureText(lw.text).width;
        if (idx < line.words.length - 1) lWidth += spaceWidth;
      });
      if (lWidth > maxLineWidth) maxLineWidth = lWidth;
    });

    const paddingX = style.backgroundColor !== 'transparent' ? 32 * scale : 20 * scale;
    const paddingY = style.backgroundColor !== 'transparent' ? 20 * scale : 12 * scale;
    const overlayWidth = Math.min(canvasWidth, Math.ceil(maxLineWidth + paddingX * 2 + strokeWidth * 4));
    const overlayHeight = Math.ceil(totalTextHeight + paddingY * 2 + strokeWidth * 4);

    // If Word Pop mode: generate single word pop frames
    if (style.animationType === 'word_pop') {
      for (let w = 0; w < wordTimings.length; w++) {
        const timing = wordTimings[w];
        const activeWord = timing.word;
        const isPower = style.autoHighlightPowerWords && isPowerWord(activeWord);
        const wStart = timing.start;
        const wEnd = timing.end;

        const popFontSize = Math.round(fontSize * 1.3);
        ctx.font = `900 ${popFontSize}px "${style.fontFamily}", sans-serif`;
        const popMetrics = ctx.measureText(activeWord);
        const popWidth = Math.min(canvasWidth, Math.ceil(popMetrics.width + paddingX * 2 + strokeWidth * 4));
        const popHeight = Math.ceil(popFontSize * 1.3 + paddingY * 2 + strokeWidth * 4);

        canvas.width = popWidth;
        canvas.height = popHeight;
        ctx.clearRect(0, 0, popWidth, popHeight);

        if (style.backgroundColor && style.backgroundColor !== 'transparent') {
          ctx.fillStyle = style.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(4, 4, popWidth - 8, popHeight - 8, 16 * scale);
          ctx.fill();
        }

        ctx.font = `900 ${popFontSize}px "${style.fontFamily}", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cX = popWidth / 2;
        const cY = popHeight / 2;

        if (strokeWidth > 0) {
          ctx.strokeStyle = style.strokeColor;
          ctx.lineWidth = strokeWidth * 2.2;
          ctx.lineJoin = 'round';
          ctx.strokeText(activeWord, cX, cY);
        }

        ctx.fillStyle = isPower ? '#FF4500' : style.highlightColor || '#FFE600';
        ctx.shadowColor = isPower ? 'rgba(255, 69, 0, 0.8)' : 'rgba(255, 230, 0, 0.8)';
        ctx.shadowBlur = 12 * scale;
        ctx.fillText(activeWord, cX, cY);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          overlays.push({
            filename: `caption_${overlayCounter++}.png`,
            data: new Uint8Array(arrayBuffer),
            start: wStart,
            end: wEnd,
            width: popWidth,
            height: popHeight,
          });
        }
      }
      continue;
    }

    // Number of frames to generate for this segment
    const numSubFrames = isKinetic ? wordTimings.length : 1;

    for (let f = 0; f < numSubFrames; f++) {
      const activeWordIdx = isKinetic ? f : -1;
      const fStart = isKinetic ? wordTimings[f].start : seg.start;
      const fEnd = isKinetic ? wordTimings[f].end : seg.end;

      canvas.width = overlayWidth;
      canvas.height = overlayHeight;
      ctx.clearRect(0, 0, overlayWidth, overlayHeight);

      // Draw background box if enabled
      if (style.backgroundColor && style.backgroundColor !== 'transparent') {
        ctx.fillStyle = style.backgroundColor;
        ctx.beginPath();
        ctx.roundRect(4, 4, overlayWidth - 8, overlayHeight - 8, 16 * scale);
        ctx.fill();
      }

      ctx.font = `900 ${fontSize}px "${style.fontFamily}", sans-serif`;
      ctx.textBaseline = 'alphabetic';

      const startY = paddingY + strokeWidth + fontSize * 0.85;

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const lineY = startY + lineIdx * lineHeight;

        // Calculate line start X to center the line
        let totalLWidth = 0;
        line.words.forEach((lw, idx) => {
          totalLWidth += ctx.measureText(lw.text).width;
          if (idx < line.words.length - 1) totalLWidth += spaceWidth;
        });

        let curX = (overlayWidth - totalLWidth) / 2;

        for (let wIdx = 0; wIdx < line.words.length; wIdx++) {
          const lw = line.words[wIdx];
          const isCurrentActive = lw.wordIdx === activeWordIdx;
          const isPower = style.autoHighlightPowerWords && isPowerWord(lw.text);

          let wordColor = style.textColor;
          if (isCurrentActive) {
            wordColor = isPower ? '#FF4500' : style.highlightColor || '#FFE600';
          } else if (isPower && isKinetic) {
            wordColor = '#FF8A00'; // Warm highlight for power words
          }

          const wWidth = ctx.measureText(lw.text).width;

          // Stroke
          if (strokeWidth > 0) {
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = strokeWidth * 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(lw.text, curX, lineY);
          }

          // Fill
          ctx.fillStyle = wordColor;
          ctx.shadowColor = isCurrentActive ? wordColor : 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = isCurrentActive ? 12 * scale : 4 * scale;
          ctx.shadowOffsetY = 2 * scale;
          ctx.fillText(lw.text, curX, lineY);

          curX += wWidth + spaceWidth;
        }
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        overlays.push({
          filename: `caption_${overlayCounter++}.png`,
          data: new Uint8Array(arrayBuffer),
          start: fStart,
          end: fEnd,
          width: overlayWidth,
          height: overlayHeight,
        });
      }
    }
  }

  return overlays;
}
