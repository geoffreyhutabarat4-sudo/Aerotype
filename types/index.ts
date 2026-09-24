export type AppMode =
  | 'editor'
  | 'voice-clone'
  | 'transformer'
  | 'soundboard'
  | 'flute'
  | 'transcriber'
  | 'vocal-health';

export type BlowActionType = 'backspace' | 'space' | 'clear' | 'newline' | 'dictation' | 'tts';

export interface AudioSensorState {
  isListening: boolean;
  permissionGranted: boolean | null;
  volumeDb: number; // -100 to 0 dB
  volumeNormalized: number; // 0.0 to 1.0
  lowFreqEnergy: number; // 20Hz - 250Hz energy
  midHighFreqEnergy: number; // 300Hz - 4000Hz energy
  blowIntensity: number; // 0.0 to 1.0
  isBlowing: boolean;
  sensitivity: number; // 1 to 100 slider
  frequencyData: Uint8Array;
}

export interface BlowEvent {
  intensity: number;
  durationMs: number;
  timestamp: number;
}

export interface VoiceProfile {
  id: string;
  name: string;
  createdDate: string;
  basePitchHz: number;
  pitchRateMultiplier: number;
  formantShift: number; // -12 to +12 semitones
  bassBoostGain: number; // dB
  trebleClarityGain: number; // dB
  vibratoDepth: number;
  breathiness: number;
  targetVoiceType: 'male' | 'female' | 'custom';
}

export interface TranscriptionItem {
  id: string;
  timestamp: string;
  speaker: string;
  text: string;
}

export interface TranscriptionSummary {
  fullText: string;
  summary: string[];
  actionItems: string[];
  keywords: string[];
  wordCount: number;
  durationSeconds: number;
}

export interface VocalHealthMetrics {
  currentPitchHz: number;
  detectedNote: string;
  stabilityScore: number; // 0 - 100%
  vocalStrainLevel: 'Optimal' | 'Mild Strain' | 'High Fatigue';
  peakDecibels: number;
  isClipping: boolean;
}
