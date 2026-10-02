import { pipeline, env } from '@huggingface/transformers';
import { fetchFile } from '@ffmpeg/util';
import { ffmpegService } from './ffmpegService';
import { type CaptionSegment, computeWordTimings, generateSrt, generateVtt } from './subtitleUtils';

// Configure transformers.js for reliable client-side execution & caching
env.allowLocalModels = false;
env.useBrowserCache = true;

// Configure ONNX WASM paths for CPU fallback
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = typeof navigator !== 'undefined' ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
}

export interface TranscriptionProgress {
  status: string;
  progress: number; // 0 to 100
  phase: 'extracting_audio' | 'loading_model' | 'transcribing' | 'completed' | 'error';
}

export interface TranscriptionResult {
  text: string;
  segments: CaptionSegment[];
  srt: string;
  vtt: string;
  executionTimeMs: number;
}

class WhisperService {
  private transcriber: any = null;
  private isModelLoading = false;

  private async checkWebGpuAvailability(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('gpu' in navigator) || !(navigator as any).gpu) {
      return false;
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  async loadModel(
    onProgress?: (progress: TranscriptionProgress) => void,
    engineMode: 'auto' | 'webgpu' | 'wasm' | 'wasm-eco' = 'auto',
    threadCount: number = 2
  ): Promise<any> {
    if (this.transcriber) return this.transcriber;
    if (this.isModelLoading) {
      while (this.isModelLoading) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return this.transcriber;
    }

    this.isModelLoading = true;
    if (onProgress) {
      onProgress({
        status: `Checking hardware & initializing ${engineMode === 'wasm-eco' ? 'Eco-Light (8-bit)' : 'Whisper'} AI...`,
        progress: 10,
        phase: 'loading_model',
      });
    }

    // Set ONNX WASM thread limit to keep laptop cool
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(threadCount, 4));
    }

    const isWebGpuReady = (engineMode === 'auto' || engineMode === 'webgpu') 
      ? await this.checkWebGpuAvailability() 
      : false;
    const modelName = 'onnx-community/whisper-tiny.en';

    const progressCallback = (info: any) => {
      if (info.status === 'progress' && onProgress) {
        const p = Math.round((info.loaded / (info.total || 1)) * 100);
        onProgress({
          status: `Downloading local AI weights: ${info.file?.slice(-25) || 'model'} (${p}%)`,
          progress: Math.min(60, 10 + Math.round(p * 0.5)),
          phase: 'loading_model',
        });
      }
    };

    // If Eco mode or WASM mode requested, prioritize lightweight 8-bit quantized CPU WASM
    if (engineMode === 'wasm-eco' || engineMode === 'wasm' || !isWebGpuReady) {
      try {
        if (onProgress) {
          onProgress({
            status: `Loading 8-bit Quantized Whisper AI (${env.backends?.onnx?.wasm?.numThreads || 2} CPU threads)...`,
            progress: 25,
            phase: 'loading_model',
          });
        }

        this.transcriber = await pipeline(
          'automatic-speech-recognition',
          modelName,
          {
            device: 'wasm',
            dtype: 'q8', // 8-bit quantized for ultra-low memory & heat
            progress_callback: progressCallback,
          }
        );

        this.isModelLoading = false;
        return this.transcriber;
      } catch (wasmErr: any) {
        console.warn('Eco quantized WASM failed, falling back to standard WASM:', wasmErr);
      }
    }

    // Attempt WebGPU if requested and available
    if (isWebGpuReady && engineMode !== 'wasm-eco') {
      try {
        if (onProgress) {
          onProgress({
            status: 'Loading Whisper model with WebGPU acceleration...',
            progress: 20,
            phase: 'loading_model',
          });
        }
        this.transcriber = await pipeline(
          'automatic-speech-recognition',
          modelName,
          {
            device: 'webgpu',
            dtype: 'fp32',
            progress_callback: progressCallback,
          }
        );
        this.isModelLoading = false;
        return this.transcriber;
      } catch (gpuErr) {
        console.warn('WebGPU pipeline failed, switching to WASM CPU engine:', gpuErr);
      }
    }

    // Final fallback: standard WASM
    try {
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        modelName,
        {
          device: 'wasm',
          dtype: 'q8',
          progress_callback: progressCallback,
        }
      );
      this.isModelLoading = false;
      return this.transcriber;
    } catch (finalErr: any) {
      this.isModelLoading = false;
      console.error('All Whisper AI backends failed:', finalErr);
      throw new Error(
        `Could not initialize local speech engine: ${finalErr?.message || 'WASM initialization error'}`
      );
    }
  }

  async extractAudio(
    videoFile: File,
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<Float32Array> {
    if (onProgress) {
      onProgress({
        status: 'Extracting audio stream locally with FFmpeg WASM...',
        progress: 15,
        phase: 'extracting_audio',
      });
    }

    const ffmpeg = await ffmpegService.getEngine();
    const videoData = await fetchFile(videoFile);
    await ffmpeg.writeFile('audio_input.mp4', videoData);

    // Extract 16kHz mono PCM WAV
    await ffmpeg.exec([
      '-i', 'audio_input.mp4',
      '-vn',
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      'extracted_audio.wav',
    ]);

    const wavData = await ffmpeg.readFile('extracted_audio.wav');
    const rawBytes = wavData instanceof Uint8Array ? wavData : new Uint8Array(wavData as unknown as ArrayBuffer);
    
    // Clean up virtual files
    await ffmpeg.deleteFile('audio_input.mp4').catch(() => {});
    await ffmpeg.deleteFile('extracted_audio.wav').catch(() => {});

    // Decode WAV array buffer into Float32Array at 16kHz
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(rawBytes.buffer.slice(0) as ArrayBuffer);
    const float32Audio = audioBuffer.getChannelData(0);
    await audioContext.close();

    return float32Audio;
  }

  async transcribeVideo(
    videoFile: File,
    onProgress?: (progress: TranscriptionProgress) => void,
    engineMode: 'auto' | 'webgpu' | 'wasm' | 'wasm-eco' = 'auto',
    threadCount: number = 2
  ): Promise<TranscriptionResult> {
    const startTime = performance.now();

    // Step 1: Extract 16kHz Audio
    const audioData = await this.extractAudio(videoFile, onProgress);

    // Step 2: Load Whisper Model (with proactive WebGPU adapter check & WASM fallback)
    const model = await this.loadModel(onProgress, engineMode, threadCount);

    if (onProgress) {
      onProgress({
        status: `Running local speech-to-text inference (${engineMode === 'wasm-eco' ? 'Eco 8-Bit CPU' : 'Whisper AI'})...`,
        progress: 65,
        phase: 'transcribing',
      });
    }

    // Step 3: Run Speech-to-Text with timestamp chunks
    let output: any;
    try {
      // Attempt word-level timestamps first
      output = await model(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: 'word',
      });
    } catch {
      // Fallback to standard chunk timestamps
      output = await model(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });
    }

    if (onProgress) {
      onProgress({
        status: 'Structuring transcript and generating word-synced captions...',
        progress: 95,
        phase: 'transcribing',
      });
    }

    // Structure segments with high-accuracy word timestamps
    const segments: CaptionSegment[] = [];

    if (output.chunks && Array.isArray(output.chunks) && output.chunks.length > 0) {
      // Check if output chunks are word-level (average words per chunk <= 2)
      const avgWordsPerChunk = output.chunks.reduce((acc: number, c: any) => acc + (c.text?.trim().split(/\s+/).length || 0), 0) / output.chunks.length;
      const isWordLevel = avgWordsPerChunk <= 2;

      if (isWordLevel) {
        // Group word-level chunks into natural phrases of 4-7 words (~1.8-3.2 seconds)
        let currentWords: Array<{ word: string; start: number; end: number }> = [];
        let segStart = 0;
        let segId = 1;

        for (let idx = 0; idx < output.chunks.length; idx++) {
          const chunk = output.chunks[idx];
          const wText = chunk.text?.trim();
          if (!wText) continue;

          const wStart = Number((chunk.timestamp[0] ?? (currentWords.length > 0 ? currentWords[currentWords.length - 1].end : 0)).toFixed(2));
          const wEnd = Number((chunk.timestamp[1] ?? (wStart + 0.35)).toFixed(2));

          if (currentWords.length === 0) {
            segStart = wStart;
          }

          currentWords.push({ word: wText, start: wStart, end: wEnd });

          const isPunctuationEnd = /[.!?]$/.test(wText);
          const isDurationLong = (wEnd - segStart) >= 2.8;
          const isWordLimit = currentWords.length >= 6;

          if (isPunctuationEnd || isDurationLong || isWordLimit || idx === output.chunks.length - 1) {
            const combinedText = currentWords.map((w) => w.word).join(' ');
            const segEnd = wEnd;

            segments.push({
              id: segId++,
              start: segStart,
              end: segEnd,
              text: combinedText,
              words: [...currentWords],
            });

            currentWords = [];
          }
        }
      } else {
        // Standard phrase-level chunks: attach character/punctuation-weighted word timings
        output.chunks.forEach((chunk: any, index: number) => {
          const start = chunk.timestamp[0] ?? 0;
          const end = chunk.timestamp[1] ?? (start + 2.5);
          const text = chunk.text?.trim() || '';
          if (text) {
            const seg: CaptionSegment = {
              id: index + 1,
              start: Number(start.toFixed(2)),
              end: Number(end.toFixed(2)),
              text,
            };
            seg.words = computeWordTimings(seg);
            segments.push(seg);
          }
        });
      }
    } else if (output.text && output.text.trim()) {
      // Fallback single chunk
      const singleSeg: CaptionSegment = {
        id: 1,
        start: 0,
        end: 5.0,
        text: output.text.trim(),
      };
      singleSeg.words = computeWordTimings(singleSeg);
      segments.push(singleSeg);
    }

    const srt = generateSrt(segments);
    const vtt = generateVtt(segments);
    const totalTime = Math.round(performance.now() - startTime);

    if (onProgress) {
      onProgress({
        status: `Local transcription complete in ${(totalTime / 1000).toFixed(1)}s!`,
        progress: 100,
        phase: 'completed',
      });
    }

    return {
      text: output.text || '',
      segments,
      srt,
      vtt,
      executionTimeMs: totalTime,
    };
  }
}

export const whisperService = new WhisperService();
