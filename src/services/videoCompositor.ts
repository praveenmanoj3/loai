import type { CaptionSegment } from './subtitleUtils';
import type { CaptionStyle } from './captionStyles';
import { ffmpegService } from './ffmpegService';
import { fetchFile } from '@ffmpeg/util';

export interface BurnOptions {
  width: number;
  height: number;
  aspectRatio: '9:16' | '1:1' | '4:5';
  cropAlignment?: 'center' | 'left' | 'right';
  onProgress?: (progress: number, message: string) => void;
}

/**
 * In-browser Canvas Video Compositor
 * Takes the raw video, renders each frame to a 2D canvas with high-DPI custom styled captions,
 * captures the composited video stream with original audio, and encodes via FFmpeg into a final MP4.
 */
export async function burnCaptionsOnCanvas(
  videoFile: File | Blob,
  segments: CaptionSegment[],
  style: CaptionStyle,
  options: BurnOptions
): Promise<Blob> {
  const { width, height, onProgress } = options;

  return new Promise(async (resolve, reject) => {
    try {
      if (onProgress) onProgress(10, 'Preparing canvas compositor and audio stream...');

      const video = document.createElement('video');
      video.muted = false;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      const videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;

      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error('Failed to load video into compositor'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not initialize 2D canvas context');

      // Calculate source crop dimensions for target aspect ratio
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const targetRatio = width / height;

      let sw = vw;
      let sh = vh;
      let sx = 0;
      let sy = 0;

      const sourceRatio = vw / vh;
      if (sourceRatio > targetRatio) {
        // Source is wider than target: crop width
        sw = vh * targetRatio;
        if (options.cropAlignment === 'left') {
          sx = 0;
        } else if (options.cropAlignment === 'right') {
          sx = vw - sw;
        } else {
          sx = (vw - sw) / 2;
        }
      } else {
        // Source is taller than target: crop height
        sh = vw / targetRatio;
        sy = (vh - sh) / 2;
      }

      // Audio track capture
      const stream = canvas.captureStream(30);

      // Try to capture audio from video element
      let audioTrack: MediaStreamTrack | null = null;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(video);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioCtx.destination);
        if (destination.stream.getAudioTracks().length > 0) {
          audioTrack = destination.stream.getAudioTracks()[0];
          stream.addTrack(audioTrack);
        }
      } catch (e) {
        console.warn('Direct audio routing notice:', e);
      }

      // MediaRecorder options
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 8000000, // 8 Mbps high quality
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(videoUrl);
        reject(e);
      };

      const duration = video.duration || 1;

      const drawFrame = () => {
        if (video.paused || video.ended) return;

        // Draw cropped video frame
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

        // Find active caption segment
        const currentTime = video.currentTime;
        const activeSeg = segments.find((s) => currentTime >= s.start && currentTime <= s.end);

        if (activeSeg) {
          let text = activeSeg.text.trim();
          if (style.textTransform === 'uppercase') {
            text = text.toUpperCase();
          }

          ctx.save();
          ctx.font = `900 ${style.fontSize}px "${style.fontFamily}", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Y-coordinate based on position
          let textY = height - 260; // Bottom (default)
          if (style.position === 'middle') {
            textY = height / 2;
          } else if (style.position === 'top') {
            textY = 260;
          }

          const textX = width / 2;

          // Background box if enabled
          if (style.backgroundColor && style.backgroundColor !== 'transparent') {
            const metrics = ctx.measureText(text);
            const padX = 24;
            const padY = 14;
            const boxWidth = metrics.width + padX * 2;
            const boxHeight = style.fontSize + padY * 2;

            ctx.fillStyle = style.backgroundColor;
            ctx.beginPath();
            ctx.roundRect(textX - boxWidth / 2, textY - boxHeight / 2, boxWidth, boxHeight, 16);
            ctx.fill();
          }

          // Stroke outline
          if (style.strokeWidth > 0) {
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.strokeWidth * 2;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(text, textX, textY);
          }

          // Text Fill
          ctx.fillStyle = style.textColor;
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = style.strokeWidth > 0 ? 0 : 8;
          ctx.shadowOffsetY = 3;
          ctx.fillText(text, textX, textY);

          ctx.restore();
        }

        const percent = Math.min(95, Math.round((video.currentTime / duration) * 80) + 10);
        if (onProgress) {
          onProgress(percent, `Burning custom captions to video frames (${percent}%)...`);
        }

        requestAnimationFrame(drawFrame);
      };

      recorder.onstop = async () => {
        URL.revokeObjectURL(videoUrl);
        const webmBlob = new Blob(chunks, { type: 'video/webm' });

        try {
          if (onProgress) onProgress(90, 'Remuxing final MP4 with local FFmpeg WASM...');
          
          // Remux the composited WebM with FFmpeg to guarantee clean MP4 container & audio sync
          const ffmpeg = await ffmpegService.getEngine();
          const webmData = await fetchFile(webmBlob);
          await ffmpeg.writeFile('composite.webm', webmData);

          await ffmpeg.exec([
            '-i', 'composite.webm',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '20',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            'captioned_output.mp4',
          ]);

          const finalData = await ffmpeg.readFile('captioned_output.mp4');
          const rawBytes = finalData instanceof Uint8Array ? finalData : new Uint8Array(finalData as unknown as ArrayBuffer);
          const finalMp4Blob = new Blob([rawBytes as unknown as BlobPart], { type: 'video/mp4' });

          await ffmpeg.deleteFile('composite.webm').catch(() => {});
          await ffmpeg.deleteFile('captioned_output.mp4').catch(() => {});

          if (onProgress) onProgress(100, 'Captioned video ready!');
          resolve(finalMp4Blob);
        } catch (ffmpegErr) {
          console.warn('FFmpeg remux fallback, returning composited video:', ffmpegErr);
          resolve(webmBlob);
        }
      };

      video.currentTime = 0;
      await video.play();
      recorder.start();
      drawFrame();

      video.onended = () => {
        setTimeout(() => {
          recorder.stop();
        }, 300);
      };
    } catch (err) {
      reject(err);
    }
  });
}
