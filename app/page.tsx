'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppMode, AudioSensorState, BlowEvent } from '@/types';
import { BlowDetectorEngine } from '@/lib/audio-blow-detector';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { AccessibilityEditor } from '@/components/AccessibilityEditor';
import { VoiceCloningStudio } from '@/components/VoiceCloningStudio';
import { VoiceTransformerStudio } from '@/components/VoiceTransformerStudio';
import { NatureSoundStudio } from '@/components/NatureSoundStudio';
import { AeroFlute } from '@/components/AeroFlute';
import { AudioTranscriberStudio } from '@/components/AudioTranscriberStudio';
import { VocalHealthMonitor } from '@/components/VocalHealthMonitor';
import {
  Wind,
  FileText,
  Dna,
  Mic,
  Sliders,
  Sparkles,
  AlertTriangle,
  Headphones,
  Music,
  HeartPulse,
  Activity,
  Layers,
} from 'lucide-react';

export default function AeroTypeDashboard() {
  const [currentMode, setCurrentMode] = useState<AppMode>('editor');
  const [sensorState, setSensorState] = useState<AudioSensorState | null>(null);
  const [lastBlowEvent, setLastBlowEvent] = useState<BlowEvent | null>(null);
  const [sensitivity, setSensitivity] = useState<number>(65);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Background Controls
  const [bgOpacity, setBgOpacity] = useState<number>(0.45);
  const [isBgBlur, setIsBgBlur] = useState<boolean>(true);

  const detectorRef = useRef<BlowDetectorEngine | null>(null);

  useEffect(() => {
    const engine = new BlowDetectorEngine(sensitivity);

    engine.onUpdate((state) => {
      setSensorState(state);
    });

    engine.onBlow((event) => {
      setLastBlowEvent(event);
    });

    detectorRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    if (detectorRef.current) {
      detectorRef.current.setSensitivity(val);
    }
  };

  const handleStartMic = async () => {
    if (!detectorRef.current) return;
    setPermissionError(null);
    const success = await detectorRef.current.start();
    if (success) {
      setIsMicActive(true);
    } else {
      setPermissionError(
        'Izin akses mikrofon tidak diizinkan. Gunakan tombol [Spasi] untuk menguji tiupan.'
      );
    }
  };

  const handleSimulateBlow = () => {
    if (detectorRef.current) {
      detectorRef.current.simulateBlow(0.9, 250);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleSimulateBlow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans overflow-x-hidden">
      
      {/* Background Danau Toba Layer */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-fixed transition-all duration-300 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/danau_toba_bg.jpg')",
          opacity: bgOpacity,
          filter: isBgBlur ? 'blur(2px)' : 'none',
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/95 pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-40 w-full bg-slate-900/85 backdrop-blur-xl border-b border-slate-800 sticky top-0 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <Wind className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  AeroType
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950">
                  🌄 AI Voice &amp; Speech Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                AI Voice Typing, Voice Cloning Studio, Transformer DSP, Transcriber &amp; Speech Health
              </p>
            </div>
          </div>

          {/* 7 Productive Mode Tabs Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setCurrentMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentMode === 'editor'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Voice Editor</span>
            </button>

            <button
              onClick={() => setCurrentMode('voice-clone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentMode === 'voice-clone'
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 font-black shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dna className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Voice Cloning 🧬</span>
            </button>

            <button
              onClick={() => setCurrentMode('transformer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentMode === 'transformer'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>3. Transformer 🎙️</span>
            </button>

            <button
              onClick={() => setCurrentMode('soundboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentMode === 'soundboard'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Suara Alam 🍃</span>
            </button>

            <button
              onClick={() => setCurrentMode('flute')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentMode === 'flute'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              <span>5. Seruling Toba 🎵</span>
            </button>

            <button
              onClick={() => setCurrentMode('transcriber')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentMode === 'transcriber'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>6. Transkrip &amp; AI 📄</span>
            </button>

            <button
              onClick={() => setCurrentMode('vocal-health')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                currentMode === 'vocal-health'
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>7. Kesehatan Vokal 📊</span>
            </button>
          </div>

          {/* Wallpaper Controls */}
          <div className="flex items-center gap-2 self-end lg:self-auto text-xs text-slate-400">
            <span className="text-[11px] font-semibold">Danau Toba:</span>
            <input
              type="range"
              min="10"
              max="85"
              value={Math.round(bgOpacity * 100)}
              onChange={(e) => setBgOpacity(Number(e.target.value) / 100)}
              className="w-16 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <button
              onClick={() => setIsBgBlur(!isBgBlur)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700"
            >
              Blur
            </button>
          </div>

        </div>
      </header>

      {/* Main Dashboard */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Permission Banner */}
        {!isMicActive && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-900 border-2 border-cyan-500/40 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                <Mic className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Aktifkan Sensor Suara &amp; Tiupan Mikrofon Laptop
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Bicara untuk mengetik otomatis • Kloning profil suara • Modulasi vokal DSP • Transkripsi rapat!
                </p>
              </div>
            </div>

            <button
              onClick={handleStartMic}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/30 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Izinkan Mikrofon Sekarang</span>
            </button>
          </div>
        )}

        {/* Error Notice */}
        {permissionError && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Top Controls Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Sensitivitas Tiupan &amp; Suara</h3>
                  <p className="text-[11px] text-slate-400">
                    Membedakan suara bicara biasa dengan tiupan angin fisik ("Fuuuh")
                  </p>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-cyan-400 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
                {sensitivity}%
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="range"
                min="10"
                max="95"
                step="1"
                value={sensitivity}
                onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>Ruangan Ramai (Rendah)</span>
                <span>Optimal (65%)</span>
                <span>Tiupan Lembut (Tinggi)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800 text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">LOW RUMBLE</span>
                <strong className="text-cyan-400">{sensorState?.lowFreqEnergy ?? 0}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">SPEECH BAND</span>
                <strong className="text-slate-300">{sensorState?.midHighFreqEnergy ?? 0}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">STATUS SENSOR</span>
                <strong className={sensorState?.isBlowing ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {sensorState?.isBlowing ? 'BLOWING 💨' : 'IDLE'}
                </strong>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <AudioVisualizer
              sensorState={sensorState}
              onSimulateBlow={handleSimulateBlow}
            />
          </div>
        </section>

        {/* Dynamic Productive Mode Views */}
        <section className="animate-in fade-in duration-200">
          {currentMode === 'editor' && (
            <AccessibilityEditor
              lastBlowEvent={lastBlowEvent}
              onNavigateTab={(t) => setCurrentMode(t as any)}
            />
          )}
          {currentMode === 'voice-clone' && <VoiceCloningStudio />}
          {currentMode === 'transformer' && <VoiceTransformerStudio />}
          {currentMode === 'soundboard' && <NatureSoundStudio />}
          {currentMode === 'flute' && (
            <AeroFlute
              blowIntensity={sensorState?.blowIntensity ?? 0}
              isBlowing={sensorState?.isBlowing ?? false}
            />
          )}
          {currentMode === 'transcriber' && <AudioTranscriberStudio />}
          {currentMode === 'vocal-health' && <VocalHealthMonitor />}
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-900 bg-slate-950/90 py-5 text-center text-xs text-slate-500">
        <p>© 2026 AeroType. Edisi Alam Danau Toba • AI Speech-to-Text, Voice Cloning, DSP Transformer &amp; Speech Health Suite.</p>
      </footer>
    </div>
  );
}
