/**
 * benchmarkService.ts — DISABLED
 *
 * The live CPU/GPU benchmark was removed as part of the performance overhaul.
 * Reason: Running a Whisper pipeline + FFmpeg just to measure performance costs
 * more resources than the actual user workflow for most users.
 *
 * Hardware capability detection is still available via hardwareService.ts.
 * That service reads navigator.hardwareConcurrency and a lightweight WebGPU adapter
 * check to infer the best processing profile without loading AI models.
 */

export interface DeviceInfo {
  gpuName: string;
  gpuVendor: string;
  isWebGpuSupported: boolean;
  cpuCores: number;
  memoryGb?: number;
  isWasmSimdSupported: boolean;
  isSharedArrayBufferSupported: boolean;
}

export interface BenchmarkResult {
  deviceInfo: DeviceInfo;
  cpuTimeMs: number;
  gpuTimeMs?: number;
  speedupMultiplier?: number;
  ffmpegFps: number;
  recommendedMode: 'webgpu' | 'wasm';
  testedAt: string;
}

/** Returns basic device info without running a benchmark. */
export async function getDetailedDeviceInfo(): Promise<DeviceInfo> {
  const isWasmSimdSupported = typeof WebAssembly === 'object';
  const isSharedArrayBufferSupported = typeof SharedArrayBuffer !== 'undefined';
  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const memoryGb = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : undefined;

  let isWebGpuSupported = false;
  let gpuName = 'GPU info unavailable';
  let gpuVendor = 'Unknown';

  if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        isWebGpuSupported = true;
        if (adapter.info) {
          gpuName = adapter.info.description || adapter.info.device || 'WebGPU Device';
          gpuVendor = adapter.info.vendor || 'Hardware GPU';
        }
      }
    } catch {
      isWebGpuSupported = false;
    }
  }

  return {
    gpuName,
    gpuVendor,
    isWebGpuSupported,
    cpuCores,
    memoryGb,
    isWasmSimdSupported,
    isSharedArrayBufferSupported,
  };
}

/** Benchmark is disabled. Returns null. */
export async function runRealHardwareBenchmark(
  _onProgress?: (status: string, percent: number) => void
): Promise<BenchmarkResult | null> {
  console.warn('[benchmarkService] Live benchmark is disabled. Use hardwareService for capability detection.');
  return null;
}

/** Returns cached benchmark if it exists. */
export function getCachedBenchmark(): BenchmarkResult | null {
  try {
    const raw = localStorage.getItem('shorts_ai_benchmark');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
