# 🎬 MONEYTALKS — What We've Built So Far

> A browser-based AI video tool that turns long videos into short-form vertical content.  
> Everything runs on **the user's own device** — no server-side GPU, no video uploads to our backend.

---

## 🧠 The Core Idea

The fundamental insight driving this project:

- Traditional video tools → expensive GPU servers → huge infrastructure cost
- Our approach → user's browser does the heavy lifting via **FFmpeg/WASM** + **WebGPU** + **local AI models**

**Business model:** Free tool → viral/SEO traffic → ads + optional premium later.  
**Privacy principle:** *"Your video is processed on your device."* — only claim what's technically true.

---

## 📋 The Plan (`plan.txt`)

A full 7-day Week 1 sprint was mapped out:

| Day | Goal |
|-----|------|
| Day 1 | React + Vite project, FFmpeg/WASM pipeline, 9:16 crop, local video → download |
| Day 2 | Proper UI — drag & drop upload, file validation, preview, settings, progress states |
| Day 3 | Local speech-to-text (Whisper) — video → audio → transcript → `.srt` captions |
| Day 4 | Caption rendering — burn captions into video with 2–3 styles (Classic, Bold, Highlight) |
| Day 5 | AI-ish clip selection — score transcript segments for interesting moments |
| Day 6 | WebGPU benchmarking — measure CPU vs GPU performance, document real numbers |
| Day 7 | Polish + deployment — landing page, error handling, privacy messaging, mobile layout |

---

## 🏗️ Tech Stack

- **Framework:** React + Vite (TypeScript)
- **Video processing:** FFmpeg via WebAssembly (`@ffmpeg/ffmpeg`)
- **AI transcription:** Whisper running locally in the browser
- **GPU acceleration:** WebGPU (with CPU fallback)
- **Deployment:** Vercel (static-ish web app, no heavy backend)

---

## 📁 What Was Actually Built

### Core App
- `src/App.tsx` — Main application shell, orchestrates the entire processing pipeline and all UI state

### Components (`src/components/`)

| File | Purpose |
|------|---------|
| `Dropzone.tsx` | Drag & drop + file picker for video upload, with validation |
| `Header.tsx` | App header / branding bar |
| `ProcessingProgress.tsx` | Real processing state display (no fake percentages) |
| `ResultView.tsx` | Shows the finished short with download button |
| `TranscriptViewer.tsx` | Displays the generated transcript/captions |
| `CaptionCustomizer.tsx` | UI for choosing caption style, font, color, position |
| `StudioControls.tsx` | Full editing controls — aspect ratio, quality, trim, etc. |
| `SmartClipSelector.tsx` | AI-scored segment picker — shows candidate clips from long video |
| `LiveCaptionOverlay.tsx` | Real-time caption overlay on the video preview |
| `BatchExportModal.tsx` | Export multiple clips at once |
| `BenchmarkModal.tsx` | Shows real CPU vs WebGPU benchmark results for the user's device |
| `PrivacyModal.tsx` | Explains exactly how local processing works — honest privacy messaging |

### Services (`src/services/`)

| File | Purpose |
|------|---------|
| `ffmpegService.ts` | Loads FFmpeg/WASM, handles crop, trim, encode, and format conversion |
| `whisperService.ts` | Runs Whisper locally in the browser for speech-to-text transcription |
| `videoMetadata.ts` | Reads duration, resolution, codec info from the uploaded video |
| `captionStyles.ts` | Defines caption style presets (Classic, Bold, Highlight, etc.) |
| `captionOverlayGenerator.ts` | Renders captions onto video frames (canvas / FFmpeg filter approach) |
| `subtitleUtils.ts` | SRT parsing, timing adjustment, word-level segment splitting |
| `clipSelector.ts` | Scores transcript segments to surface the most "interesting" clips |
| `videoCompositor.ts` | Composites video + captions + overlays into the final output |
| `hardwareService.ts` | Detects WebGPU / WASM support, RAM, and recommends a processing mode |
| `benchmarkService.ts` | Runs CPU vs GPU timing benchmarks and returns real measurements |
| `batchExportService.ts` | Handles queuing and exporting multiple clips in sequence |

---

## 🔑 Key Design Decisions

1. **No server-side video processing** — FFmpeg runs in the browser via WASM
2. **No fake progress bars** — UI only shows real processing states
3. **Honest privacy claims** — `PrivacyModal` explains what is and isn't sent anywhere
4. **Hardware-aware** — app detects WebGPU support and falls back to CPU gracefully
5. **Modular services** — UI code and video-processing code are kept strictly separate
6. **No backend needed for MVP** — deployable as a static Vercel app

---

## 🚫 Explicitly Not Built Yet

- ❌ YouTube URL input / downloader
- ❌ Login / accounts
- ❌ Database
- ❌ Payments / subscriptions
- ❌ Ads
- ❌ Cloud GPU
- ❌ Desktop executable
- ❌ Mobile app
- ❌ Admin panel

---

## 🗺️ What's Next (Post Week 1)

- **Week 2:** YouTube URL → local transcript → AI clip selection → 3–5 Shorts
- **Week 3:** Performance polish, broader browser compatibility
- **Week 4:** Launch to real users, measure funnel (visits → processed → downloaded → returning)
- **Later:** Ads, optional premium tier (~₹199–₹499/month), more tools (Remove Silence, Compress, Thumbnail Generator, etc.)

---

---

## ⚡ Performance Overhaul (October 2026)

A full architecture pass to reduce CPU/GPU/RAM usage and browser lag.

### What changed

| Area | Before | After |
|------|--------|-------|
| **Whisper service** | Imported eagerly at startup, ran ONNX env config on module load | Lazy-imported only when user triggers transcription |
| **BenchmarkModal** | Loaded & ran the full Whisper pipeline + FFmpeg just to measure speed | Replaced with a lightweight hardware settings panel — no model loading |
| **benchmarkService** | Called `pipeline()` to benchmark, consuming full AI model resources | Stubbed out — capability info comes from `hardwareService` instead |
| **LiveCaptionOverlay** | `requestAnimationFrame` loop at 60fps while video plays | `timeupdate` event listener (~4x/sec), word timings pre-computed once |
| **BatchExportModal** | Always rendered in DOM, always loaded | Disabled from UI temporarily |
| **WebGPU detection** | `requestAdapter()` called on every page mount (expensive driver query) | Only runs when user explicitly opens settings modal |
| **Result Blob** | Stored in React state (triggers re-renders on every byte) | Stored in a `useRef` outside React state |
| **BenchmarkModal import** | Eagerly bundled into main JS chunk | Lazy chunk (7.6 kB) — loaded only when modal is opened |
| **PrivacyModal import** | Eagerly bundled into main JS chunk | Lazy chunk (6.2 kB) — loaded only when modal is opened |

### Bundle sizes after overhaul

| Chunk | Size (gzip) |
|-------|-------------|
| `index.js` (app shell) | 102 kB |
| `whisperService.js` | 156 kB — **lazy, not in initial load** |
| `BenchmarkModal.js` | 2.0 kB — **lazy** |
| `PrivacyModal.js` | 2.0 kB — **lazy** |

*Last updated: October 2026*
