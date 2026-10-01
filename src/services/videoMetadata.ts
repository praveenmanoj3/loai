export interface VideoMetadata {
  duration: number; // in seconds
  formattedDuration: string;
  width: number;
  height: number;
  aspectRatio: string;
  hasAudio: boolean;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}${ms > 0 ? `.${ms}` : ''}`;
}

export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      
      let aspectRatio = 'Unknown';
      if (width > 0 && height > 0) {
        const ratio = width / height;
        if (Math.abs(ratio - 16 / 9) < 0.05) aspectRatio = '16:9 (Landscape)';
        else if (Math.abs(ratio - 9 / 16) < 0.05) aspectRatio = '9:16 (Vertical)';
        else if (Math.abs(ratio - 1) < 0.05) aspectRatio = '1:1 (Square)';
        else if (Math.abs(ratio - 4 / 3) < 0.05) aspectRatio = '4:3 (Standard)';
        else aspectRatio = `${width}:${height}`;
      }

      // Detect audio track presence if available in webkit or moz
      const hasAudio = Boolean(
        (video as any).mozHasAudio ||
        (video as any).webkitAudioDecodedByteCount > 0 ||
        Boolean((video as any).audioTracks && (video as any).audioTracks.length > 0) ||
        true // default assume audio present for general video files
      );

      resolve({
        duration,
        formattedDuration: formatTime(duration),
        width,
        height,
        aspectRatio,
        hasAudio,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = objectUrl;
  });
}
