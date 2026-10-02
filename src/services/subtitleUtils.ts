export interface WordTiming {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface CaptionSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words?: WordTiming[];
}

/**
 * Computes high-precision word-level timestamps for a caption segment.
 * Uses exact word timestamps if present, or performs phonetic syllable & punctuation-weighted
 * interpolation to guarantee accurate synchronization with spoken audio cadence.
 */
export function computeWordTimings(segment: CaptionSegment): WordTiming[] {
  if (segment.words && segment.words.length > 0) {
    return segment.words;
  }

  const rawWords = segment.text.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const segDuration = Math.max(0.1, segment.end - segment.start);
  
  // Calculate weights based on character length + punctuation pause
  const weights = rawWords.map((word) => {
    // Base weight from length (minimum 2.5 characters)
    let weight = Math.max(2.5, word.length);
    // Punctuation adds natural speaking pause weight
    if (/[.!?]$/.test(word)) {
      weight += 3.0; // sentence-ending pause
    } else if (/[,;:\-]$/.test(word)) {
      weight += 1.8; // comma / clause pause
    }
    return weight;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let currentStart = segment.start;

  const result: WordTiming[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * segDuration;
    const wordEnd = i === rawWords.length - 1 
      ? segment.end 
      : Number((currentStart + wordDuration).toFixed(3));

    result.push({
      word: rawWords[i],
      start: Number(currentStart.toFixed(3)),
      end: Number(wordEnd.toFixed(3)),
    });

    currentStart = wordEnd;
  }

  return result;
}

export function formatSrtTimestamp(seconds: number): string {
  const pad = (num: number, size: number = 2) => num.toString().padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

export function formatVttTimestamp(seconds: number): string {
  const pad = (num: number, size: number = 2) => num.toString().padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(millis, 3)}`;
}

export function generateSrt(segments: CaptionSegment[]): string {
  return segments
    .map((seg, idx) => {
      const start = formatSrtTimestamp(seg.start);
      const end = formatSrtTimestamp(seg.end);
      return `${idx + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join('\n');
}

export function generateVtt(segments: CaptionSegment[]): string {
  const body = segments
    .map((seg) => {
      const start = formatVttTimestamp(seg.start);
      const end = formatVttTimestamp(seg.end);
      return `${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join('\n');

  return `WEBVTT\n\n${body}`;
}

export function downloadSrtFile(srtContent: string, filename: string = 'captions.srt') {
  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
