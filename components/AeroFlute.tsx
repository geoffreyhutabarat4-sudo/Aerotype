'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, RotateCcw, Volume2, Sparkles, Wind, CheckCircle2 } from 'lucide-react';

interface NoteInfo {
  note: string;
  name: string;
  freq: number;
  key: string;
}

const DIATONIC_NOTES: NoteInfo[] = [
  { note: 'C4', name: 'Do (1)', freq: 261.63, key: '1' },
  { note: 'D4', name: 'Re (2)', freq: 293.66, key: '2' },
  { note: 'E4', name: 'Mi (3)', freq: 329.63, key: '3' },
  { note: 'F4', name: 'Fa (4)', freq: 349.23, key: '4' },
  { note: 'G4', name: 'Sol (5)', freq: 392.00, key: '5' },
  { note: 'A4', name: 'La (6)', freq: 440.00, key: '6' },
  { note: 'B4', name: 'Si (7)', freq: 493.88, key: '7' },
  { note: 'C5', name: 'Do\' (i)', freq: 523.25, key: '8' },
];

const BATAK_FOLK_NOTES: NoteInfo[] = [
  { note: 'C4', name: 'Do', freq: 261.63, key: '1' },
  { note: 'D4', name: 'Re', freq: 293.66, key: '2' },
  { note: 'E4', name: 'Mi', freq: 329.63, key: '3' },
  { note: 'G4', name: 'Sol', freq: 392.00, key: '4' },
  { note: 'A4', name: 'La', freq: 440.00, key: '5' },
  { note: 'C5', name: 'Do\'', freq: 523.25, key: '6' },
];

const TUTORIAL_SONG = [
  { note: 'C4', label: 'Do', duration: 600 },
  { note: 'C4', label: 'Do', duration: 600 },
  { note: 'G4', label: 'Sol', duration: 600 },
  { note: 'G4', label: 'Sol', duration: 600 },
  { note: 'A4', label: 'La', duration: 600 },
  { note: 'A4', label: 'La', duration: 600 },
  { note: 'G4', label: 'Sol', duration: 1200 },
  { note: 'F4', label: 'Fa', duration: 600 },
  { note: 'F4', label: 'Fa', duration: 600 },
  { note: 'E4', label: 'Mi', duration: 600 },
  { note: 'E4', label: 'Mi', duration: 600 },
  { note: 'D4', label: 'Re', duration: 600 },
  { note: 'D4', label: 'Re', duration: 600 },
  { note: 'C4', label: 'Do', duration: 1200 },
];

interface AeroFluteProps {
  blowIntensity: number;
  isBlowing: boolean;
}

export const AeroFlute: React.FC<AeroFluteProps> = ({ blowIntensity, isBlowing }) => {
  const [scaleMode, setScaleMode] = useState<'diatonic' | 'batak'>('diatonic');
  const [selectedNote, setSelectedNote] = useState<NoteInfo>(DIATONIC_NOTES[0]);
  const [isPlayingTutorial, setIsPlayingTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [notesPlayedCount, setNotesPlayedCount] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  const activeNotes = scaleMode === 'diatonic' ? DIATONIC_NOTES : BATAK_FOLK_NOTES;

  // Initialize synthesizer
  useEffect(() => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle'; // Rich flute body
    osc2.type = 'sine';     // Pure flute fundamental

    osc1.frequency.setValueAtTime(selectedNote.freq, ctx.currentTime);
    osc2.frequency.setValueAtTime(selectedNote.freq * 2, ctx.currentTime); // 1 octave overtone

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    osc1Ref.current = osc1;
    osc2Ref.current = osc2;
    filterNodeRef.current = filter;
    gainNodeRef.current = gain;

    return () => {
      try {
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch (e) {}
    };
  }, []);

  // Update frequency when selected note changes
  useEffect(() => {
    if (!audioCtxRef.current || !osc1Ref.current || !osc2Ref.current) return;
    const now = audioCtxRef.current.currentTime;
    osc1Ref.current.frequency.setTargetAtTime(selectedNote.freq, now, 0.03);
    osc2Ref.current.frequency.setTargetAtTime(selectedNote.freq * 2, now, 0.03);
  }, [selectedNote]);

  // Modulate volume and harmonics with physical mic blowing
  useEffect(() => {
    if (!audioCtxRef.current || !gainNodeRef.current || !filterNodeRef.current) return;
    const now = audioCtxRef.current.currentTime;

    if (isBlowing && blowIntensity > 0.05) {
      const targetGain = Math.min(0.4, blowIntensity * 0.38);
      const targetFilter = 1200 + blowIntensity * 3200; // Breath opens filter for airy sound
      gainNodeRef.current.gain.setTargetAtTime(targetGain, now, 0.04);
      filterNodeRef.current.frequency.setTargetAtTime(targetFilter, now, 0.04);

      setNotesPlayedCount(prev => prev + 1);

      // Advance tutorial if matching note
      if (isPlayingTutorial) {
        const expected = TUTORIAL_SONG[tutorialStep];
        if (expected && expected.note === selectedNote.note) {
          setTutorialStep(prev => (prev + 1) % TUTORIAL_SONG.length);
        }
      }
    } else {
      gainNodeRef.current.gain.setTargetAtTime(0, now, 0.05);
    }
  }, [blowIntensity, isBlowing, isPlayingTutorial, selectedNote, tutorialStep]);

  // Keyboard shortcut listener for note keys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const match = activeNotes.find(n => n.key === e.key);
      if (match) {
        setSelectedNote(match);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeNotes]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              Aero Flute: Seruling Danau Toba 🎵
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                Breath Synthesizer
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Pilih tuts nada di bawah &amp; <strong>tiup mikrofon laptop Anda</strong> untuk meniup seruling secara langsung!
            </p>
          </div>
        </div>

        {/* Scale Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setScaleMode('diatonic')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              scaleMode === 'diatonic'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Skala Diatonik (Do-Re-Mi)
          </button>
          <button
            onClick={() => setScaleMode('batak')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              scaleMode === 'batak'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌿 Etnik Danau Toba
          </button>
        </div>
      </div>

      {/* Main Instrument Interactive Stage */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/95 border-2 border-cyan-500/30 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden">
        
        {/* Glow ambient circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Status Display: Current Note & Breath Dynamics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10 text-center">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Nada Terpilih</span>
            <span className="text-2xl font-black text-cyan-400 font-mono">{selectedNote.note} ({selectedNote.name})</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{selectedNote.freq.toFixed(1)} Hz</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Intensitas Tiupan Mikrofon</span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Wind className={`w-5 h-5 ${isBlowing ? 'text-emerald-400 animate-bounce' : 'text-slate-600'}`} />
              <span className={`text-2xl font-black font-mono ${isBlowing ? 'text-emerald-400' : 'text-slate-500'}`}>
                {Math.round(blowIntensity * 100)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isBlowing ? '💨 SERULING BERBUNYI!' : 'Tiup mikrofon untuk meniup suara'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Panduan Tutorial Lagu</span>
            <button
              onClick={() => {
                setIsPlayingTutorial(!isPlayingTutorial);
                setTutorialStep(0);
              }}
              className={`mt-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 mx-auto ${
                isPlayingTutorial
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
              }`}
            >
              {isPlayingTutorial ? 'Hentikan Tutorial' : '▶ Mainkan Lagu "Bintang Kecil"'}
            </button>
            <span className="text-[10px] text-slate-400 block mt-1">
              {isPlayingTutorial ? `Langkah: ${tutorialStep + 1} / ${TUTORIAL_SONG.length}` : 'Ikuti tuts nada yang menyala'}
            </span>
          </div>
        </div>

        {/* Flute Keys (Do - Re - Mi - Fa - Sol - La - Si - Do) */}
        <div className="relative z-10 space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 text-center">
            Papan Tuts Seruling Digital (Tekan Tombol / Angka Keyboard 1-8):
          </label>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {activeNotes.map((item, idx) => {
              const isSelected = selectedNote.note === item.note;
              const isTutorialTarget = isPlayingTutorial && TUTORIAL_SONG[tutorialStep]?.note === item.note;

              return (
                <button
                  key={item.note}
                  onClick={() => setSelectedNote(item)}
                  className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-between gap-3 text-center active:scale-95 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-xl shadow-cyan-500/20 scale-105'
                      : isTutorialTarget
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 animate-pulse scale-105'
                      : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
                    Tombol [{item.key}]
                  </span>

                  <div>
                    <strong className="text-xl font-black block text-white">{item.name}</strong>
                    <span className="text-xs font-mono text-cyan-400">{item.note}</span>
                  </div>

                  {/* Hole Indicator */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      isSelected && isBlowing
                        ? 'bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-400/50 scale-125'
                        : isSelected
                        ? 'bg-cyan-500 border-cyan-400'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Tutorial Active Melody Banner */}
        {isPlayingTutorial && (
          <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>
                Target Nada Sekarang: <strong className="text-white font-black text-sm">{TUTORIAL_SONG[tutorialStep]?.label} ({TUTORIAL_SONG[tutorialStep]?.note})</strong> — Tiup mikrofon sekarang!
              </span>
            </div>
            <button
              onClick={() => setTutorialStep(prev => (prev + 1) % TUTORIAL_SONG.length)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold"
            >
              Lewati Nada ❯
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
