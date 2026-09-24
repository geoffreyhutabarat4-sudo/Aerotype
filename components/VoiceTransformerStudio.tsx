'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Mic,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Download,
  Headphones,
  Square,
  Activity,
  Layers,
  Wand2,
  Cpu,
} from 'lucide-react';

interface VoiceEffectPreset {
  id: string;
  name: string;
  description: string;
  iconName: string;
  lowGain: number; // dB
  midGain: number; // dB
  highGain: number; // dB
  pitchShiftSemis: number;
  reverbDecay: number;
  distortionAmount: number;
}

const VOICE_PRESETS: VoiceEffectPreset[] = [
  {
    id: 'studio-clarity',
    name: '🎙️ Studio Clarity (Pembersih Vokal)',
    description: 'Menghilangkan gemuruh rendah dan meningkatkan kejernihan vokal profesional.',
    iconName: 'Sparkles',
    lowGain: -6,
    midGain: 3,
    highGain: 6,
    pitchShiftSemis: 0,
    reverbDecay: 0.1,
    distortionAmount: 0,
  },
  {
    id: 'deep-podcast',
    name: '📻 Deep Broadcaster (Penyiar Podcast)',
    description: 'Menebalkan frekuensi rendah untuk resonansi suara maskulin dan berwibawa.',
    iconName: 'Radio',
    lowGain: 9,
    midGain: 2,
    highGain: 3,
    pitchShiftSemis: -2,
    reverbDecay: 0.3,
    distortionAmount: 0,
  },
  {
    id: 'toba-reverb',
    name: '🌊 Danau Toba Cave Reverb (Spasial Danau)',
    description: 'Efek gema akustik tebing kaldera Danau Toba yang megah dan luas.',
    iconName: 'Layers',
    lowGain: 0,
    midGain: 2,
    highGain: 4,
    pitchShiftSemis: 0,
    reverbDecay: 2.8,
    distortionAmount: 0,
  },
  {
    id: 'cyber-robot',
    name: '🤖 Cyber Vocoder & Robot (Sintetik)',
    description: 'Modulasi frekuensi suara menyerupai robot dan karakter AI futuristik.',
    iconName: 'Cpu',
    lowGain: -3,
    midGain: 8,
    highGain: 5,
    pitchShiftSemis: 4,
    reverbDecay: 0.5,
    distortionAmount: 18,
  },
  {
    id: 'bright-female',
    name: '✨ Bright & Sweet (Feminim / Renyah)',
    description: 'Menaikkan nada vokal dan formant atas untuk artikulasi yang renyah.',
    iconName: 'Wand2',
    lowGain: -4,
    midGain: 4,
    highGain: 8,
    pitchShiftSemis: 3,
    reverbDecay: 0.4,
    distortionAmount: 0,
  },
];

export const VoiceTransformerStudio: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('studio-clarity');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isMonitoringMuted, setIsMonitoringMuted] = useState<boolean>(true);
  const [inputVolumeDb, setInputVolumeDb] = useState<number>(-100);

  // Custom Slider Overrides
  const [lowGain, setLowGain] = useState<number>(-6);
  const [midGain, setMidGain] = useState<number>(3);
  const [highGain, setHighGain] = useState<number>(6);
  const [reverbAmount, setReverbAmount] = useState<number>(0.1);

  // Recording transformed output state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Web Audio DSP Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Apply Preset
  const handleSelectPreset = (preset: VoiceEffectPreset) => {
    setSelectedPresetId(preset.id);
    setLowGain(preset.lowGain);
    setMidGain(preset.midGain);
    setHighGain(preset.highGain);
    setReverbAmount(preset.reverbDecay);

    if (lowFilterRef.current) lowFilterRef.current.gain.value = preset.lowGain;
    if (midFilterRef.current) midFilterRef.current.gain.value = preset.midGain;
    if (highFilterRef.current) highFilterRef.current.gain.value = preset.highGain;
    if (delayFeedbackRef.current) delayFeedbackRef.current.gain.value = Math.min(0.7, preset.reverbDecay * 0.25);
  };

  // Start Real-Time Voice DSP Engine
  const startLiveDSP = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      micStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // 3-Band Parametric EQ Filters
      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = 'lowshelf';
      lowFilter.frequency.value = 250;
      lowFilter.gain.value = lowGain;
      lowFilterRef.current = lowFilter;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1500;
      midFilter.Q.value = 1.0;
      midFilter.gain.value = midGain;
      midFilterRef.current = midFilter;

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'highshelf';
      highFilter.frequency.value = 4000;
      highFilter.gain.value = highGain;
      highFilterRef.current = highFilter;

      // Spatial Delay & Echo Simulation
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.18;
      delayNodeRef.current = delay;

      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = Math.min(0.7, reverbAmount * 0.25);
      delayFeedbackRef.current = delayFeedback;

      delay.connect(delayFeedback);
      delayFeedback.connect(delay);

      // Analyser Node for Visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      // Monitor Gain (Headphones feedback control to avoid feedback loops)
      const monitorGain = ctx.createGain();
      monitorGain.gain.value = isMonitoringMuted ? 0 : 0.85;
      monitorGainRef.current = monitorGain;

      // Destination node for recording
      const dest = ctx.createMediaStreamDestination();
      destNodeRef.current = dest;

      // Connect Signal Chain
      source.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);

      highFilter.connect(analyser);
      highFilter.connect(delay);
      delay.connect(analyser);

      analyser.connect(monitorGain);
      monitorGain.connect(ctx.destination);
      analyser.connect(dest);

      setIsLiveActive(true);
      drawLiveVisualizer();
    } catch {
      alert('Tidak dapat mengaktifkan mikrofon untuk Voice Transformer.');
    }
  };

  const stopLiveDSP = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsLiveActive(false);
  };

  const toggleMonitoring = () => {
    const nextMuted = !isMonitoringMuted;
    setIsMonitoringMuted(nextMuted);
    if (monitorGainRef.current && audioCtxRef.current) {
      monitorGainRef.current.gain.setValueAtTime(
        nextMuted ? 0 : 0.85,
        audioCtxRef.current.currentTime
      );
    }
  };

  // Start Recording Transformed Audio
  const startRecording = () => {
    if (!destNodeRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(destNodeRef.current.stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedAudioUrl(url);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Visualizer Animation
  const drawLiveVisualizer = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteFrequencyData(dataArray);

      // Volume db estimation
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength;
      setInputVolumeDb(avg > 2 ? Math.round(20 * Math.log10(avg / 255)) : -100);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bars = 36;
      const barWidth = canvas.width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const val = dataArray[i * 4] || 0;
        const barHeight = (val / 255) * (canvas.height - 8);

        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(0.6, '#38bdf8');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = grad;
        ctx.fillRect(i * (barWidth + 2), canvas.height - barHeight, barWidth, barHeight);
      }

      if (isLiveActive) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 text-white font-black shadow-lg shadow-purple-600/25">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Real-Time Voice Transformer &amp; DSP Studio 🎙️</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                DSP Audio Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Modulasi suara mikrofon real-time dengan filter parametrik studio, efek spasial, dan pembersih vokal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isLiveActive ? (
            <button
              onClick={startLiveDSP}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:brightness-110 text-white font-black text-xs shadow-xl shadow-purple-600/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Aktifkan Transformer Live</span>
            </button>
          ) : (
            <button
              onClick={stopLiveDSP}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 font-black text-xs shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-rose-400" />
              <span>Nonaktifkan Live DSP</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN STUDIO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PRESETS SELECTION (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3.5 backdrop-blur-md">
            <span className="text-xs font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Layers className="w-4 h-4 text-purple-400" />
              Preset Efek Suara Studio ({VOICE_PRESETS.length})
            </span>

            <div className="space-y-2.5">
              {VOICE_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-950/80 to-slate-900 border-purple-400 shadow-lg shadow-purple-600/25 ring-1 ring-purple-400/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {preset.name}
                      </h4>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{preset.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE DSP CONTROLS & VISUALIZER (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl space-y-5 backdrop-blur-md">
            
            {/* Live FFT Spectrogram */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Live Output Spectrum Analyzer
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {isLiveActive ? `${inputVolumeDb} dB` : 'OFFLINE'}
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-28">
                <canvas ref={canvasRef} width={650} height={112} className="w-full h-full block" />
                {!isLiveActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-medium">
                    Klik "Aktifkan Transformer Live" untuk memproses audio mikrofon
                  </div>
                )}
              </div>
            </div>

            {/* Manual Parametric EQ Sliders */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 text-xs">
              <span className="font-bold text-slate-300 block">Kustomisasi Frekuensi &amp; Resonansi:</span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Low Bass:</span>
                    <strong className="text-cyan-400 font-mono">{lowGain > 0 ? `+${lowGain}` : lowGain}dB</strong>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={lowGain}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLowGain(val);
                      if (lowFilterRef.current) lowFilterRef.current.gain.value = val;
                    }}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Mid Presence:</span>
                    <strong className="text-purple-400 font-mono">{midGain > 0 ? `+${midGain}` : midGain}dB</strong>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={midGain}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMidGain(val);
                      if (midFilterRef.current) midFilterRef.current.gain.value = val;
                    }}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>High Air:</span>
                    <strong className="text-emerald-400 font-mono">{highGain > 0 ? `+${highGain}` : highGain}dB</strong>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={highGain}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setHighGain(val);
                      if (highFilterRef.current) highFilterRef.current.gain.value = val;
                    }}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Monitoring & Recording Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                onClick={toggleMonitoring}
                disabled={!isLiveActive}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  isMonitoringMuted
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isMonitoringMuted ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4 text-emerald-400" />}
                <span>{isMonitoringMuted ? 'Monitor Headset (Muted)' : 'Monitor Headset (Aktif)'}</span>
              </button>

              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!isLiveActive}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    <span>Rekam Suara Efek</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-4 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black transition-all flex items-center gap-2 animate-pulse"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Hentikan Rekaman</span>
                  </button>
                )}

                {recordedAudioUrl && (
                  <a
                    href={recordedAudioUrl}
                    download="AeroType_Voice_Transformed.webm"
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Audio</span>
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
