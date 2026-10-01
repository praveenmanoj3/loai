import JSZip from 'jszip';
import { ffmpegService, type AspectRatioType, type QualityType, type CropAlignment } from './ffmpegService';
import type { CandidateClip } from './clipSelector';
import type { CaptionStyle } from './captionStyles';
import { generateSrt, formatSrtTimestamp } from './subtitleUtils';

export interface BatchItem {
  id: string;
  clip: CandidateClip;
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  statusMessage: string;
  outputBlob?: Blob;
  outputUrl?: string;
  renderTimeMs?: number;
  srtContent?: string;
  error?: string;
}

export interface BatchOverallProgress {
  totalClips: number;
  completedClips: number;
  failedClips: number;
  currentClipIndex: number;
  overallPercent: number;
  items: BatchItem[];
  isDone: boolean;
  zipBlob?: Blob;
  zipSizeFormatted?: string;
}

export interface BatchExportOptions {
  aspectRatio: AspectRatioType;
  quality: QualityType;
  cropAlignment: CropAlignment;
  enableCaptions: boolean;
  captionStyle: CaptionStyle;
  threadCount: number;
  videoFileName: string;
  abortSignal?: AbortSignal;
  onProgress?: (progress: BatchOverallProgress) => void;
}

export class BatchExportService {
  /**
   * Runs sequential export for candidate clips, then packages into a single ZIP archive.
   */
  async runBatchExport(
    videoFile: File,
    clips: CandidateClip[],
    options: BatchExportOptions
  ): Promise<{ zipBlob: Blob; items: BatchItem[] }> {
    const {
      aspectRatio,
      quality,
      cropAlignment,
      enableCaptions,
      captionStyle,
      threadCount,
      videoFileName,
      abortSignal,
      onProgress,
    } = options;

    const items: BatchItem[] = clips.map((clip) => ({
      id: clip.id,
      clip,
      status: 'queued',
      progress: 0,
      statusMessage: 'Waiting in queue...',
    }));

    const updateState = (currentIdx: number, isDone: boolean = false, zipBlob?: Blob) => {
      const completed = items.filter((i) => i.status === 'completed').length;
      const failed = items.filter((i) => i.status === 'failed' || i.status === 'cancelled').length;
      
      // Calculate overall weighted percentage
      const totalItems = items.length;
      const totalItemProgress = items.reduce((acc, curr) => acc + curr.progress, 0);
      const overallPercent = totalItems > 0 ? Math.min(100, Math.round(totalItemProgress / totalItems)) : 0;

      let zipSizeFormatted: string | undefined;
      if (zipBlob) {
        zipSizeFormatted = (zipBlob.size / (1024 * 1024)).toFixed(2) + ' MB';
      }

      onProgress?.({
        totalClips: totalItems,
        completedClips: completed,
        failedClips: failed,
        currentClipIndex: currentIdx,
        overallPercent,
        items: [...items],
        isDone,
        zipBlob,
        zipSizeFormatted,
      });
    };

    updateState(0);

    const zip = new JSZip();
    const cleanBaseName = videoFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = zip.folder(`ShortsAI_Clips_${cleanBaseName}`) || zip;

    // Process each clip sequentially
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check abort signal
      if (abortSignal?.aborted) {
        item.status = 'cancelled';
        item.statusMessage = 'Batch export cancelled by user.';
        item.progress = 0;
        continue;
      }

      item.status = 'rendering';
      item.statusMessage = `Starting render (${aspectRatio}, ${quality})...`;
      item.progress = 5;
      updateState(i);

      try {
        // Adjust segments timestamps relative to the trimmed clip start
        const clipStart = item.clip.start;
        const clipEnd = item.clip.end;
        
        const relativeSegments = item.clip.segments.map((seg) => ({
          ...seg,
          start: Math.max(0, seg.start - clipStart),
          end: Math.max(0, seg.end - clipStart),
        }));

        // Generate SRT content
        const srtText = generateSrt(relativeSegments);
        item.srtContent = srtText;

        // Render clip with FFmpeg WASM
        const rendered = await ffmpegService.convertToVerticalShort(videoFile, {
          aspectRatio,
          quality,
          cropAlignment,
          threads: threadCount,
          trimRange: { start: clipStart, end: clipEnd },
          enableCaptions,
          captionSegments: relativeSegments,
          captionStyle,
          onProgress: (pState) => {
            if (abortSignal?.aborted) return;
            item.progress = pState.progress;
            item.statusMessage = pState.statusMessage;
            updateState(i);
          },
        });

        if (abortSignal?.aborted) {
          item.status = 'cancelled';
          item.statusMessage = 'Cancelled during finalization.';
          updateState(i);
          continue;
        }

        item.outputBlob = rendered.blob;
        item.outputUrl = rendered.url;
        item.renderTimeMs = rendered.executionTimeMs;
        item.status = 'completed';
        item.progress = 100;
        item.statusMessage = `Done in ${(rendered.executionTimeMs / 1000).toFixed(1)}s!`;

        // Add MP4 and SRT to ZIP
        const clipFileNameBase = `Clip_${String(item.clip.rank).padStart(2, '0')}_Score${item.clip.score}_${item.clip.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}`;
        
        folder.file(`${clipFileNameBase}.mp4`, rendered.blob);
        folder.file(`${clipFileNameBase}_subtitles.srt`, srtText);

        updateState(i);
      } catch (err: any) {
        console.error(`Error exporting clip #${item.clip.rank}:`, err);
        item.status = 'failed';
        item.error = err?.message || 'Failed to render short';
        item.statusMessage = `Failed: ${err?.message || 'Render error'}`;
        updateState(i);
      }
    }

    // Build batch summary report
    const summaryText = this.buildBatchSummary(items, options);
    folder.file('BATCH_EXPORT_SUMMARY.txt', summaryText);

    // Build JSON metadata
    const metadataJson = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        sourceVideo: videoFileName,
        aspectRatio,
        quality,
        totalClips: items.length,
        successfulClips: items.filter((i) => i.status === 'completed').length,
        clips: items.map((i) => ({
          rank: i.clip.rank,
          viralityScore: i.clip.score,
          title: i.clip.title,
          hookType: i.clip.hookType,
          startTime: formatSrtTimestamp(i.clip.start),
          endTime: formatSrtTimestamp(i.clip.end),
          durationSeconds: Math.round(i.clip.end - i.clip.start),
          renderDurationMs: i.renderTimeMs,
          status: i.status,
        })),
      },
      null,
      2
    );
    folder.file('metadata.json', metadataJson);

    // Generate ZIP Blob
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 4 },
    });

    updateState(items.length, true, zipBlob);

    return { zipBlob, items };
  }

  /**
   * Helper to trigger browser download of the ZIP file
   */
  downloadZip(zipBlob: Blob, baseName: string = 'ShortsAI_Batch') {
    const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanName}_Viral_Shorts.zip`;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /**
   * Formats a clean creator report for social media captions & tracking
   */
  private buildBatchSummary(items: BatchItem[], options: BatchExportOptions): string {
    const completed = items.filter((i) => i.status === 'completed');
    const lines = [
      '===========================================================',
      ' 🔥 SHORTS AI - BATCH EXPORT SUMMARY & CREATOR REPORT 🔥',
      '===========================================================',
      `Export Date : ${new Date().toLocaleString()}`,
      `Source Video: ${options.videoFileName}`,
      `Format Ratio: ${options.aspectRatio} (${options.quality})`,
      `Successful  : ${completed.length} of ${items.length} clips`,
      '-----------------------------------------------------------',
      '',
    ];

    completed.forEach((item) => {
      lines.push(`🎬 CLIP #${item.clip.rank}: ${item.clip.title}`);
      lines.push(`   • Virality Score : ${item.clip.score}%`);
      lines.push(`   • Hook Angle     : ${item.clip.hookType.toUpperCase()} (${item.clip.reasoning})`);
      lines.push(`   • Time Range     : ${formatSrtTimestamp(item.clip.start)} ➔ ${formatSrtTimestamp(item.clip.end)}`);
      lines.push(`   • Render Time    : ${( (item.renderTimeMs || 0) / 1000 ).toFixed(1)}s`);
      lines.push(`   • Hook Line      : "${item.clip.snippet}"`);
      lines.push('');
    });

    lines.push('-----------------------------------------------------------');
    lines.push('Generated 100% locally on-device by Shorts AI Studio');
    lines.push('Zero cloud server uploads • 100% Data Privacy');
    lines.push('===========================================================');

    return lines.join('\n');
  }
}

export const batchExportService = new BatchExportService();
