export interface VoicePrintConfig {
  enabled: boolean;
  targetFrequency: number;
  toleranceHz: number;
  minMatchRatio: number;
}

export interface VoicePrintResult {
  matched: boolean;
  averageFrequency: number;
  matchRatio: number;
}

export const DEFAULT_VOICE_PRINT_CONFIG: VoicePrintConfig = {
  enabled: true,
  targetFrequency: 150,
  toleranceHz: 40,
  minMatchRatio: 0.55,
};

export class VoicePrintAnalyzer {
  private readonly ctx: AudioContext;
  private readonly analyser: AnalyserNode;
  private readonly dataArray: Float32Array;
  private readonly sampleRate: number;
  private readonly enabled: boolean;

  constructor(config?: Partial<VoicePrintConfig>) {
    const cfg = { ...DEFAULT_VOICE_PRINT_CONFIG, ...(config ?? {}) };
    this.enabled = cfg.enabled;

    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API không được hỗ trợ.');
    }

    this.ctx = new AudioContextClass();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.sampleRate = this.ctx.sampleRate;
    this.dataArray = new Float32Array(this.analyser.fftSize);
  }

  async start(): Promise<void> {
    if (!this.enabled) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.ctx.createMediaStreamSource(stream);
    source.connect(this.analyser);
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  private autoconcorrelate(buffer: Float32Array): number {
    const SIZE = buffer.length;
    const maxOffset = Math.floor(SIZE / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let found = false;

    for (let offset = 10; offset < maxOffset; offset++) {
      let correlation = 0;
      for (let i = 0; i < SIZE - offset; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - correlation / (SIZE - offset);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
        found = true;
      }
    }

    if (!found) return 0;
    const frequency = this.sampleRate / bestOffset;
    if (frequency < 60 || frequency > 1000) return 0;
    return frequency;
  }

  analyze(): VoicePrintResult {
    if (!this.enabled) {
      return { matched: true, averageFrequency: 0, matchRatio: 1 };
    }

    this.analyser.getFloatTimeDomainData(this.dataArray);

    const detected: number[] = [];
    const chunkSize = 512;
    const chunk = new Float32Array(chunkSize);

    for (let start = 0; start < this.dataArray.length - chunkSize; start += chunkSize) {
      chunk.set(this.dataArray.slice(start, start + chunkSize));
      const freq = this.autoconcorrelate(chunk);
      if (freq > 0) detected.push(freq);
    }

    if (detected.length === 0) {
      return { matched: false, averageFrequency: 0, matchRatio: 0 };
    }

    const averageFrequency =
      detected.reduce((sum, value) => sum + value, 0) / detected.length;

    const cfg = DEFAULT_VOICE_PRINT_CONFIG;
    const matches = detected.filter(
      (freq) => Math.abs(freq - cfg.targetFrequency) <= cfg.toleranceHz
    ).length;
    const matchRatio = matches / detected.length;

    return {
      matched: matchRatio >= cfg.minMatchRatio,
      averageFrequency: Math.round(averageFrequency),
      matchRatio: Math.round(matchRatio * 100) / 100,
    };
  }

  dispose(): void {
    try {
      void this.ctx.close();
    } catch {
      // Bỏ qua nếu AudioContext đã đóng.
    }
  }
}
