export type HardwareProfile = 'low-spec-safe' | 'balanced' | 'turbo-gpu';

export interface HardwareRecommendation {
  profile: HardwareProfile;
  suggestedThreads: number;
  suggestedEngine: 'auto' | 'wasm-eco' | 'webgpu';
  suggestedQuality: '720p' | '1080p';
  estimatedProcessingTime: string; // e.g. "10–20 sec for a 30s Short"
  safetyTitle: string;
  safetyExplanation: string;
  isLaptopRecommendedSafe: boolean;
}

export interface HardwareStatus {
  webAssemblySupported: boolean;
  sharedArrayBufferSupported: boolean;
  webGpuSupported: boolean;
  cores: number;
  memoryGb?: number;
  isReady: boolean;
  gpuName?: string;
  recommendation: HardwareRecommendation;
}

export function computeHardwareRecommendation(
  cores: number,
  webGpuSupported: boolean,
  memoryGb?: number
): HardwareRecommendation {
  // Low-spec / Safe Laptop mode condition
  if (!webGpuSupported || cores <= 4 || (memoryGb && memoryGb <= 4)) {
    return {
      profile: 'low-spec-safe',
      suggestedThreads: Math.min(2, Math.max(1, cores - 1)),
      suggestedEngine: 'wasm-eco',
      suggestedQuality: '720p',
      estimatedProcessingTime: '15–28s per 30s clip',
      safetyTitle: 'Recommended for Low-Spec Laptops (Eco Mode)',
      safetyExplanation:
        'Uses only 2 CPU threads & 8-bit quantized AI. Leaves remaining CPU cores free so your browser never freezes, fans stay quiet, and your laptop remains cool.',
      isLaptopRecommendedSafe: true,
    };
  }

  // Turbo / High-performance condition
  if (webGpuSupported && cores >= 8 && (!memoryGb || memoryGb >= 8)) {
    return {
      profile: 'turbo-gpu',
      suggestedThreads: Math.min(6, cores - 2),
      suggestedEngine: 'webgpu',
      suggestedQuality: '1080p',
      estimatedProcessingTime: '4–10s per 30s clip',
      safetyTitle: 'High-Performance WebGPU Mode',
      safetyExplanation:
        'Leverages your dedicated graphics card and multi-core acceleration for lightning fast exports.',
      isLaptopRecommendedSafe: false,
    };
  }

  // Balanced Profile
  return {
    profile: 'balanced',
    suggestedThreads: Math.min(4, Math.max(2, Math.floor(cores / 2))),
    suggestedEngine: 'auto',
    suggestedQuality: '720p',
    estimatedProcessingTime: '8–16s per 30s clip',
    safetyTitle: 'Balanced Everyday Profile',
    safetyExplanation:
      'Uses half of your laptop cores for processing while keeping the other half free for smooth multitasking.',
    isLaptopRecommendedSafe: true,
  };
}

export async function detectHardwareCapabilities(): Promise<HardwareStatus> {
  const webAssemblySupported = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  const sharedArrayBufferSupported = typeof SharedArrayBuffer !== 'undefined';
  
  let webGpuSupported = false;
  let gpuName: string | undefined = undefined;

  if ('gpu' in navigator && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        webGpuSupported = true;
        if (adapter.info) {
          gpuName = adapter.info.description || adapter.info.architecture || 'WebGPU Device';
        }
      }
    } catch {
      webGpuSupported = false;
    }
  }

  const cores = navigator.hardwareConcurrency || 4;
  const memoryGb = (navigator as any).deviceMemory || undefined;

  const recommendation = computeHardwareRecommendation(cores, webGpuSupported, memoryGb);

  return {
    webAssemblySupported,
    sharedArrayBufferSupported,
    webGpuSupported,
    cores,
    memoryGb,
    isReady: webAssemblySupported,
    gpuName,
    recommendation,
  };
}

