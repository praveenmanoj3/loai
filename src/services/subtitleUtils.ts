export interface CaptionSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
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
