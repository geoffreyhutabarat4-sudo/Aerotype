'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VocalHealthMetrics } from '@/types';
import {
  Activity,
  Mic,
  Square,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Volume2,
} from 'lucide-react';

const NOTE_STRINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteFromPitch(frequency: number): string {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  const rounded = Math.round(noteNum) + 69;
  const noteName = NOTE_STRINGS[rounded % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${noteName}${octave}`;
}

const WARMUP_EXERCISES = [
  {
    title: '1. Lip Trill / Humming (Dengungan Lembut)',
    desc: 'Bersenandung lembut ("Mmm...") pada nada tengah untuk mengalirkan getaran tanpa membebani pita suara.',
    duration: 30,
    targetHz: '130 - 180 Hz',
  },
  {
    title: '2. Siren Glide (Glissando Vokal Rendah ke Tinggi)',
    desc: 'Ucapkan bunyi "Ooo..." meluncur dari nada rendah ke tinggi secara bertahap dan halus.',
    duration: 45,
    targetHz: '100 - 350 Hz',
  },
  {
    title: '3. Articulation & Tongue Twister',
    desc: 'Latih kelenturan artikulasi dengan melafalkan konsonan dinamis ("Pa-Ta-Ka-La").',
    duration: 30,
    targetHz: 'Artikulasi Luwes',
  },
];

export const VocalHealthMonitor: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<VocalHealthMetrics>({
    currentPitchHz: 0,
    detectedNote: '--',
    stabilityScore: 92,
    vocalStrainLevel: 'Optimal',
    peakDecibels: -40,
    isClipping: false,
  });

  // Pitch History for graph
  const [pitchHistory, setPitchHistory] = useState<number[]>([]);

  // Vocal Warm-up Session
  const [activeExerciseIdx, setActiveExerciseIdx] = useState<number>(0);
  const [exerciseTimer, setExerciseTimer] = useState<number>(30);
  const [isExerciseRunning, setIsExerciseRunning] = useState<boolean>(false);

  // Web Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Autocorrelation Pitch Detection
  const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
    let size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / size);
    if (rms < 0.015) return -1; // Not enough signal

    let r1 = 0, r2 = size - 1, thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
    }

    const bufTrim = buf.slice(r1, r2);
    size = bufTrim.length;

    const c = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) {
        c[i] = c[i] + bufTrim[j] * bufTrim[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }

    let T0 = maxpos;
    return sampleRate / T0;
  };

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsActive(true);
      processVocalLoop();
    } catch {
      alert('Tidak dapat mengakses mikrofon untuk pemantauan kesehatan vokal.');
    }
  };

  const stopMonitoring = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsActive(false);
  };

  const processVocalLoop = () => {
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    if (!analyser || !ctx) return;

    const floatBuffer = new Float32Array(analyser.fftSize);

    const update = () => {
      analyser.getFloatTimeDomainData(floatBuffer);
      const pitch = autoCorrelate(floatBuffer, ctx.sampleRate);

      if (pitch > 60 && pitch < 1200) {
        const roundedHz = Math.round(pitch);
        const note = noteFromPitch(roundedHz);

        setMetrics((prev) => {
          const jitter = Math.abs(prev.currentPitchHz - roundedHz);
          const strain = jitter > 45 ? 'High Fatigue' : jitter > 20 ? 'Mild Strain' : 'Optimal';
          const stability = Math.max(70, Math.min(99, 100 - jitter));
          return {
            currentPitchHz: roundedHz,
            detectedNote: note,
            stabilityScore: stability,
            vocalStrainLevel: strain,
            peakDecibels: Math.round(20 * Math.log10(Math.max(0.01, floatBuffer[0]))),
            isClipping: Math.abs(floatBuffer[0]) > 0.95,
          };
        });

        setPitchHistory((prev) => [...prev.slice(-30), roundedHz]);
      } else {
        setMetrics((prev) => ({ ...prev, currentPitchHz: 0, detectedNote: '--' }));
      }

      drawPitchCanvas();
      if (isActive) {
        animFrameRef.current = requestAnimationFrame(update);
      }
    };

    update();
  };

  const drawPitchCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for standard vocal ranges
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    [100, 200, 300, 400].forEach((hz) => {
      const y = canvas.height - (hz / 500) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    });

    if (pitchHistory.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const step = canvas.width / 30;
      pitchHistory.forEach((hz, idx) => {
        const x = idx * step;
        const y = canvas.height - (Math.min(500, hz) / 500) * canvas.height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  };

  // Warm-up Exercise Countdown
  useEffect(() => {
    if (!isExerciseRunning) return;
    const interval = setInterval(() => {
      setExerciseTimer((t) => {
        if (t <= 1) {
          setIsExerciseRunning(false);
          return WARMUP_EXERCISES[activeExerciseIdx].duration;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExerciseRunning, activeExerciseIdx]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Vocal Bio-Feedback &amp; Health Monitor 📊</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Speech Therapy &amp; Ergonomics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pantau kestabilan pita suara, deteksi nada real-time, dan lakukan panduan latihan pemanasan vokal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isActive ? (
            <button
              onClick={startMonitoring}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Mulai Pantau Suara</span>
            </button>
          ) : (
            <button
              onClick={stopMonitoring}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 font-black text-xs shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-rose-400" />
              <span>Hentikan Pemantauan</span>
            </button>
          )}
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">FREKUENSI NADA (PITCH)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-cyan-400">
              {metrics.currentPitchHz > 0 ? metrics.currentPitchHz : '--'}
            </span>
            <span className="text-xs text-slate-400 font-bold">Hz</span>
          </div>
          <span className="text-[11px] font-bold text-slate-300">Notasi: {metrics.detectedNote}</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">KESTABILAN VOKAL</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-emerald-400">{metrics.stabilityScore}%</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-300">Resonansi Baik</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">TINGKAT BEBAN VOKAL</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-black font-sans ${
                metrics.vocalStrainLevel === 'Optimal'
                  ? 'text-emerald-400'
                  : metrics.vocalStrainLevel === 'Mild Strain'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {metrics.vocalStrainLevel}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Pita Suara Sehat</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">KEAMANAN INTENSITAS</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-purple-400">
              {metrics.peakDecibels > -90 ? `${metrics.peakDecibels} dB` : '--'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-purple-300">Tingkat Aman</span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LIVE PITCH GRAPH (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Grafik Kontur Nada &amp; Fluktuasi Frekuensi Suara
              </span>
              <span className="text-[10px] font-mono text-slate-500">Rentang Vokal: 60Hz - 500Hz</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-52">
              <canvas ref={canvasRef} width={650} height={208} className="w-full h-full block" />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-medium">
                  Klik "Mulai Pantau Suara" untuk melihat kontur nada vokal Anda
                </div>
              )}
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Bass (100Hz)</span>
              <span>Baritone (150Hz)</span>
              <span>Tenor (250Hz)</span>
              <span>Soprano (400Hz+)</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SPEECH THERAPY & WARM-UP (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Panduan Pemanasan Vokal &amp; Terapi
              </span>
            </div>

            {/* Exercise Selector */}
            <div className="space-y-2">
              {WARMUP_EXERCISES.map((ex, idx) => {
                const isSelected = idx === activeExerciseIdx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveExerciseIdx(idx);
                      setExerciseTimer(ex.duration);
                      setIsExerciseRunning(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <h4 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {ex.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug">{ex.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Countdown & Start Button */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">DURASI SESI</span>
                <span className="text-2xl font-black font-mono text-emerald-400">{exerciseTimer}s</span>
              </div>

              {!isExerciseRunning ? (
                <button
                  onClick={() => setIsExerciseRunning(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Mulai Latihan</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsExerciseRunning(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-400" />
                  <span>Jeda</span>
                </button>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
