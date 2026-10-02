import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { CaptionSegment } from './subtitleUtils';
import type { CaptionStyle } from './captionStyles';
import { generateCaptionPngOverlays } from './captionOverlayGenerator';

export type ProcessingPhase = 
  | 'idle'
  | 'preparing_video'
  | 'processing'
  | 'encoding'
  | 'finalizing'
  | 'completed'
  | 'error';

export interface ProgressState {
  phase: ProcessingPhase;
  progress: number; // 0 to 100
  statusMessage: string;
  logs: string[];
}

export type AspectRatioType = '9:16' | '1:1' | '4:5';
export type QualityType = '1080p' | '720p' | '540p';
export type CropAlignment = 'center' | 'left' | 'right';
export type DynamicZoomType = 'none' | 'punch_in' | 'slow_zoom' | 'pulse';
export type ZoomIntensityType = 'subtle' | 'medium' | 'intense';

export interface ConvertOptions {
  aspectRatio?: AspectRatioType;
  quality?: QualityType;
  cropAlignment?: CropAlignment;
  dynamicZoom?: DynamicZoomType;
  zoomIntensity?: ZoomIntensityType;
  threads?: number;
  trimRange?: {
    start: number; // in seconds
    end: number;   // in seconds
  };
  enableCaptions?: boolean;
  captionSegments?: CaptionSegment[];
  captionStyle?: CaptionStyle;
  onProgress?: (state: ProgressState) => void;
}

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded: boolean = false;
  private logs: string[] = [];

  private log(message: string, onProgress?: (state: ProgressState) => void, phase?: ProcessingPhase, progress?: number) {
    this.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    if (this.logs.length > 100) this.logs.shift();
    
    if (onProgress && phase) {
      onProgress({
        phase,
        progress: progress ?? 0,
        statusMessage: message,
        logs: [...this.logs],
      });
    }
  }

  async getEngine(onProgress?: (state: ProgressState) => void): Promise<FFmpeg> {
    if (this.ffmpeg && this.isLoaded) {
      return this.ffmpeg;
    }

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      this.logs.push(`[FFmpeg] ${message}`);
      if (this.logs.length > 150) this.logs.shift();
    });

    this.log('Preparing FFmpeg WASM core into browser memory...', onProgress, 'preparing_video', 10);

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    try {
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      this.isLoaded = true;
      this.log('WASM video processing core ready.', onProgress, 'preparing_video', 25);
      return this.ffmpeg;
    } catch (err: any) {
      console.error('Failed to load FFmpeg WASM:', err);
      this.log(`Error loading FFmpeg: ${err?.message || 'Unknown error'}`, onProgress, 'error', 0);
      throw new Error(`Failed to load in-browser FFmpeg: ${err?.message || 'WASM load failure'}`);
    }
  }

  async convertToVerticalShort(
    videoFile: File,
    options: ConvertOptions = {}
  ): Promise<{ blob: Blob; url: string; executionTimeMs: number }> {
    const startTime = performance.now();
    const { 
      onProgress, 
      quality = '1080p', 
      aspectRatio = '9:16', 
      cropAlignment = 'center',
      trimRange,
      enableCaptions,
      captionSegments,
      captionStyle
    } = options;

    const ffmpeg = await this.getEngine(onProgress);

    this.log('Preparing video: Reading file into local memory...', onProgress, 'preparing_video', 30);
    const videoData = await fetchFile(videoFile);
    await ffmpeg.writeFile('input.mp4', videoData);

    this.log('Processing: Configuring aspect ratio and crop pipeline...', onProgress, 'processing', 40);

    // Setup FFmpeg progress listener
    const progressHandler = ({ progress }: { progress: number }) => {
      const normalizedPercent = Math.min(Math.round(40 + progress * 55), 95);
      if (onProgress) {
        onProgress({
          phase: normalizedPercent > 80 ? 'encoding' : 'processing',
          progress: normalizedPercent,
          statusMessage: normalizedPercent > 80 
            ? `Encoding frames with burned captions (${normalizedPercent}%)...` 
            : `Processing video transform (${normalizedPercent}%)...`,
          logs: [...this.logs],
        });
      }
    };

    ffmpeg.on('progress', progressHandler);

    // Determine dimensions & crop math based on aspect ratio
    let targetWidth = 1080;
    let targetHeight = 1920;
    let ratioCrop = "'min(iw,ih*9/16)':'min(ih,iw*16/9)'";

    if (aspectRatio === '1:1') {
      targetWidth = quality === '540p' ? 540 : quality === '720p' ? 720 : 1080;
      targetHeight = quality === '540p' ? 540 : quality === '720p' ? 720 : 1080;
      ratioCrop = "'min(iw,ih)':'min(iw,ih)'";
    } else if (aspectRatio === '4:5') {
      targetWidth = quality === '540p' ? 540 : quality === '720p' ? 720 : 1080;
      targetHeight = quality === '540p' ? 675 : quality === '720p' ? 900 : 1350;
      ratioCrop = "'min(iw,ih*4/5)':'min(ih,iw*5/4)'";
    } else {
      // 9:16
      targetWidth = quality === '540p' ? 540 : quality === '720p' ? 720 : 1080;
      targetHeight = quality === '540p' ? 960 : quality === '720p' ? 1280 : 1920;
      ratioCrop = "'min(iw,ih*9/16)':'min(ih,iw*16/9)'";
    }

    // Crop horizontal alignment: center, left, or right
    let xOffset = '(iw-ow)/2';
    if (cropAlignment === 'left') {
      xOffset = '0';
    } else if (cropAlignment === 'right') {
      xOffset = 'iw-ow';
    }
    const yOffset = '(ih-oh)/2';

    // Day 11: Dynamic Punch-in & Auto-Zoom Calculations
    const dynamicZoom = options.dynamicZoom || 'none';
    const zoomIntensity = options.zoomIntensity || 'medium';
    const zoomMultiplier = zoomIntensity === 'subtle' ? 1.08 : zoomIntensity === 'intense' ? 1.25 : 1.15;

    let baseWExpr = 'min(iw,ih*9/16)';
    let baseHExpr = 'min(ih,iw*16/9)';

    if (aspectRatio === '1:1') {
      baseWExpr = 'min(iw,ih)';
      baseHExpr = 'min(iw,ih)';
    } else if (aspectRatio === '4:5') {
      baseWExpr = 'min(iw,ih*4/5)';
      baseHExpr = 'min(ih,iw*5/4)';
    }

    let finalCropFilter = `crop=${ratioCrop}:${xOffset}:${yOffset}`;

    if (dynamicZoom === 'punch_in') {
      // 3.5-second rhythmic punch cut: alternates 1.0x <-> zoomMultiplier
      const wDynamic = `if(mod(floor(t/3.5),2),${baseWExpr}/${zoomMultiplier},${baseWExpr})`;
      const hDynamic = `if(mod(floor(t/3.5),2),${baseHExpr}/${zoomMultiplier},${baseHExpr})`;
      finalCropFilter = `crop=w='${wDynamic}':h='${hDynamic}':x='${xOffset}':y='${yOffset}'`;
    } else if (dynamicZoom === 'slow_zoom') {
      // Continuous 5.0-second slow push in
      const delta = (zoomMultiplier - 1.0).toFixed(3);
      const wDynamic = `${baseWExpr}*(1-${delta}*mod(t,5)/5)`;
      const hDynamic = `${baseHExpr}*(1-${delta}*mod(t,5)/5)`;
      finalCropFilter = `crop=w='${wDynamic}':h='${hDynamic}':x='${xOffset}':y='${yOffset}'`;
    } else if (dynamicZoom === 'pulse') {
      // Energetic 2.5-second pulse
      const wDynamic = `if(lt(mod(t,2.5),0.4),${baseWExpr}/${zoomMultiplier},${baseWExpr})`;
      const hDynamic = `if(lt(mod(t,2.5),0.4),${baseHExpr}/${zoomMultiplier},${baseHExpr})`;
      finalCropFilter = `crop=w='${wDynamic}':h='${hDynamic}':x='${xOffset}':y='${yOffset}'`;
    }

    // Check if we need to burn captions
    const shouldBurnCaptions = Boolean(
      enableCaptions && 
      captionSegments && 
      captionSegments.length > 0 && 
      captionStyle
    );

    const execArgs: string[] = [];

    // Thread limit to prevent laptop thermal throttling
    if (options.threads && options.threads > 0) {
      execArgs.push('-threads', `${options.threads}`);
    }

    // Optional Trim Range
    if (trimRange && trimRange.start >= 0 && trimRange.end > trimRange.start) {
      execArgs.push('-ss', `${trimRange.start}`);
      execArgs.push('-to', `${trimRange.end}`);
    }

    execArgs.push('-i', 'input.mp4');

    const generatedOverlays: string[] = [];

    if (shouldBurnCaptions && captionSegments && captionStyle) {
      this.log('Rendering custom styled caption overlays (fonts, colors, stroke)...', onProgress, 'processing', 45);

      const overlays = await generateCaptionPngOverlays(
        captionSegments,
        captionStyle,
        targetWidth,
        targetHeight
      );

      // Write each caption PNG into virtual memory & add as input
      for (const ov of overlays) {
        await ffmpeg.writeFile(ov.filename, ov.data);
        generatedOverlays.push(ov.filename);
        execArgs.push('-i', ov.filename);
      }

      // Calculate vertical Y position
      const scaleFactor = targetWidth / 1080;
      let yPosition = `H-h-${Math.round(220 * scaleFactor)}`;
      if (captionStyle.position === 'middle') {
        yPosition = `(H-h)/2`;
      } else if (captionStyle.position === 'top') {
        yPosition = `${Math.round(220 * scaleFactor)}`;
      }

      // Build filter_complex chaining overlays
      let filterComplex = `[0:v]${finalCropFilter},scale=${targetWidth}:${targetHeight}[v0]`;

      if (overlays.length > 0) {
        filterComplex += ';';
        let lastLabel = 'v0';

        for (let i = 0; i < overlays.length; i++) {
          const ov = overlays[i];
          const isLast = i === overlays.length - 1;
          const nextLabel = isLast ? 'vout' : `v${i + 1}`;
          const inputIndex = i + 1; // input 0 is input.mp4, 1..N are caption pngs

          filterComplex += `[${lastLabel}][${inputIndex}:v]overlay=(W-w)/2:${yPosition}:enable='between(t,${ov.start},${ov.end})'[${nextLabel}]`;
          if (!isLast) filterComplex += ';';
          lastLabel = nextLabel;
        }

        execArgs.push(
          '-filter_complex', filterComplex,
          '-map', '[vout]',
          '-map', '0:a?'
        );
      } else {
        execArgs.push(
          '-filter_complex', filterComplex + ';[v0]null[vout]',
          '-map', '[vout]',
          '-map', '0:a?'
        );
      }
    } else {
      // Standard video crop without captions
      const filterString = `${finalCropFilter},scale=${targetWidth}:${targetHeight}`;
      execArgs.push(
        '-vf', filterString,
        '-map', '0:v',
        '-map', '0:a?'
      );
    }

    execArgs.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '22',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      'output.mp4'
    );

    this.log(`Encoding: Rendering ${aspectRatio} format at ${quality}...`, onProgress, 'encoding', 50);

    try {
      await ffmpeg.exec(execArgs);

      this.log('Finalizing: Assembling MP4 file...', onProgress, 'finalizing', 98);

      const data = await ffmpeg.readFile('output.mp4');
      const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
      const outputBlob = new Blob([rawBytes as unknown as BlobPart], { type: 'video/mp4' });
      const outputUrl = URL.createObjectURL(outputBlob);

      // Clean up virtual files
      await ffmpeg.deleteFile('input.mp4').catch(() => {});
      await ffmpeg.deleteFile('output.mp4').catch(() => {});
      for (const fn of generatedOverlays) {
        await ffmpeg.deleteFile(fn).catch(() => {});
      }

      const totalTime = Math.round(performance.now() - startTime);
      this.log(`Finalizing: Completed in ${(totalTime / 1000).toFixed(1)}s!`, onProgress, 'completed', 100);

      return {
        blob: outputBlob,
        url: outputUrl,
        executionTimeMs: totalTime,
      };
    } catch (err: any) {
      console.error('FFmpeg execution error:', err);
      // Clean up generated overlay files on error
      for (const fn of generatedOverlays) {
        await ffmpeg.deleteFile(fn).catch(() => {});
      }
      this.log(`Conversion error: ${err?.message || 'FFmpeg failed'}`, onProgress, 'error', 0);
      throw err;
    } finally {
      ffmpeg.off('progress', progressHandler);
    }
  }
}

export const ffmpegService = new FFmpegService();
