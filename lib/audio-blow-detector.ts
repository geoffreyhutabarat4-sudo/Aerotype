/**
 * AeroType Web Audio API Blowing Detection DSP Engine
 * Analyzes real-time microphone FFT frequency spectrum & low-frequency air rumble
 * to distinguish physical mouth blowing ("Fuuuh") from regular speech and room chatter.
 */

import { AudioSensorState, BlowEvent } from '@/types';

export class BlowDetectorEngine {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;

  private freqData: Uint8Array = new Uint8Array(0);
  private timeData: Uint8Array = new Uint8Array(0);

  private sensitivity = 65; // 1 to 100
  private isCurrentlyBlowing = false;
  private blowStartTime = 0;
  private onStateChange: ((state: AudioSensorState) => void) | null = null;
  private onBlowTrigger: ((event: BlowEvent) => void) | null = null;

  constructor(sensitivity = 65) {
    this.sensitivity = sensitivity;
  }

  public setSensitivity(val: number) {
    this.sensitivity = Math.max(1, Math.min(100, val));
  }

  public async start(): Promise<boolean> {
    try {
      if (this.isRunning) return true;

      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Disable browser aggressive noise suppression/AGC to capture physical wind turbulence
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.mediaStream = stream;
      const source = this.audioCtx.createMediaStreamSource(stream);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;

      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.freqData = new Uint8Array(bufferLength);
      this.timeData = new Uint8Array(bufferLength);

      this.isRunning = true;
      this.processLoop();
      return true;
    } catch (err) {
      console.error('Failed to start microphone audio stream:', err);
      return false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  public onUpdate(callback: (state: AudioSensorState) => void) {
    this.onStateChange = callback;
  }

  public onBlow(callback: (event: BlowEvent) => void) {
    this.onBlowTrigger = callback;
  }

  /**
   * Manual blow trigger for simulation fallback (e.g. spacebar / tap button)
   */
  public simulateBlow(intensity = 0.9, durationMs = 300) {
    if (this.onBlowTrigger) {
      this.onBlowTrigger({
        intensity,
        durationMs,
        timestamp: Date.now(),
      });
    }
  }

  private processLoop = () => {
    if (!this.isRunning || !this.analyser) return;

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    // 1. Calculate RMS Volume in Decibels
    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);
    const volumeDb = rms > 0.0001 ? 20 * Math.log10(rms) : -100;
    const volumeNormalized = Math.min(1.0, Math.max(0, (volumeDb + 60) / 60));

    // 2. Frequency Spectrum Energy Decomposition:
    // Sample rate ~44.1kHz or 48kHz. Bin size = 48000 / 512 = ~93.75 Hz per bin.
    // Low Frequency Rumble (20Hz - 280Hz): Bins 0 to 3
    let lowEnergySum = 0;
    const lowBinsCount = 4;
    for (let i = 0; i < lowBinsCount; i++) {
      lowEnergySum += this.freqData[i];
    }
    const avgLowEnergy = lowEnergySum / lowBinsCount; // 0 to 255

    // Mid-High Frequency Speech (350Hz - 3500Hz): Bins 4 to 36
    let midHighEnergySum = 0;
    const midHighStart = 4;
    const midHighEnd = Math.min(38, this.freqData.length);
    for (let i = midHighStart; i < midHighEnd; i++) {
      midHighEnergySum += this.freqData[i];
    }
    const avgMidHighEnergy = midHighEnergySum / (midHighEnd - midHighStart);

    // 3. Blowing Detection Algorithm
    // Physical wind breath onto microphone produces strong low-frequency turbulence
    // where low energy drastically exceeds mid-high speech energy.
    const dynamicThreshold = 180 - (this.sensitivity / 100) * 120; // range 60 to 180
    const ratio = avgLowEnergy / (avgMidHighEnergy + 8);

    const isBlowDetected =
      avgLowEnergy >= dynamicThreshold &&
      (ratio >= 1.45 || (avgLowEnergy > 210 && volumeNormalized > 0.45));

    const blowIntensity = Math.min(
      1.0,
      Math.max(0, (avgLowEnergy - dynamicThreshold) / (255 - dynamicThreshold))
    );

    const now = Date.now();

    // Trigger state transitions
    if (isBlowDetected) {
      if (!this.isCurrentlyBlowing) {
        this.isCurrentlyBlowing = true;
        this.blowStartTime = now;
      }
      if (this.onBlowTrigger) {
        this.onBlowTrigger({
          intensity: blowIntensity,
          durationMs: now - this.blowStartTime,
          timestamp: now,
        });
      }
    } else {
      if (this.isCurrentlyBlowing) {
        this.isCurrentlyBlowing = false;
      }
    }

    // Broadcast state for visualizer and UI
    if (this.onStateChange) {
      this.onStateChange({
        isListening: this.isRunning,
        permissionGranted: true,
        volumeDb: Number(volumeDb.toFixed(1)),
        volumeNormalized: Number(volumeNormalized.toFixed(2)),
        lowFreqEnergy: Number(avgLowEnergy.toFixed(1)),
        midHighFreqEnergy: Number(avgMidHighEnergy.toFixed(1)),
        blowIntensity: Number(blowIntensity.toFixed(2)),
        isBlowing: isBlowDetected,
        sensitivity: this.sensitivity,
        frequencyData: this.freqData,
      });
    }

    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };
}
