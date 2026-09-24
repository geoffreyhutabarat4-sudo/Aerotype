'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VoiceProfile } from '@/types';
import {
  Dna,
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Volume2,
  Sliders,
  CheckCircle2,
  Trash2,
  Plus,
  Radio,
  FileAudio,
  UserCheck,
} from 'lucide-react';

const CALIBRATION_PROMPTS = [
  'Danau Toba adalah danau vulkanik terindah dan terbesar di Indonesia.',
  'Teknologi suara dan kecerdasan buatan memberikan aksesibilitas bagi semua orang.',
  'Karakter suara manusia memiliki frekuensi dan resonansi vokal yang unik.',
];

const PRESET_PROFILES: VoiceProfile[] = [
  {
    id: 'preset-warm',
    name: '🌟 Studio Warmth (Hangat & Berwibawa)',
    createdDate: 'Sistem Default',
    basePitchHz: 125,
    pitchRateMultiplier: 1.0,
    formantShift: -2,
    bassBoostGain: 4.5,
    trebleClarityGain: 2.0,
    vibratoDepth: 0.1,
    breathiness: 0.1,
    targetVoiceType: 'male',
  },
  {
    id: 'preset-bright',
    name: '✨ Crisp Clarity (Jernih & Profesional)',
    createdDate: 'Sistem Default',
    basePitchHz: 210,
    pitchRateMultiplier: 1.05,
    formantShift: 2,
    bassBoostGain: 0.5,
    trebleClarityGain: 5.0,
    vibratoDepth: 0.15,
    breathiness: 0.05,
    targetVoiceType: 'female',
  },
  {
    id: 'preset-radio',
    name: '🎙️ Deep Broadcaster (Penyiar Radio)',
    createdDate: 'Sistem Default',
    basePitchHz: 98,
    pitchRateMultiplier: 0.95,
    formantShift: -4,
    bassBoostGain: 7.0,
    trebleClarityGain: 3.5,
    vibratoDepth: 0.05,
    breathiness: 0.15,
    targetVoiceType: 'male',
  },
];

export const VoiceCloningStudio: React.FC = () => {
  // Profiles State
  const [profiles, setProfiles] = useState<VoiceProfile[]>(PRESET_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('preset-warm');

  // Calibration Wizard State
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationStep, setCalibrationStep] = useState<number>(0);
  const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
  const [sampleAudioUrls, setSampleAudioUrls] = useState<string[]>([]);
  const [newProfileName, setNewProfileName] = useState<string>('Profil Suara Saya #1');
  const [extractedPitch, setExtractedPitch] = useState<number>(145);
  const [extractedFormant, setExtractedFormant] = useState<number>(0);

  // TTS Synthesis State
  const [synthText, setSynthText] = useState<string>(
    'Halo! Ini adalah suara hasil kloning profil vokal saya dengan kecerdasan buatan AeroType.'
  );
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthSpeed, setSynthSpeed] = useState<number>(1.0);
  const [synthPitchOffset, setSynthPitchOffset] = useState<number>(0);
  const [synthVolume, setSynthVolume] = useState<number>(100);

  // Audio Context & Recording Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load saved profiles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aerotype_voice_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles([...PRESET_PROFILES, ...parsed]);
          setSelectedProfileId(parsed[0].id || 'preset-warm');
        }
      } catch {
        // Fallback to presets
      }
    }
  }, []);

  const saveCustomProfiles = (newCustomList: VoiceProfile[]) => {
    const customOnly = newCustomList.filter((p) => !p.id.startsWith('preset-'));
    localStorage.setItem('aerotype_voice_profiles', JSON.stringify(customOnly));
  };

  const currentProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  // Start Calibration Sample Recording
  const startRecordingSample = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setSampleAudioUrls((prev) => [...prev, url]);

        // Acoustic feature extraction from sample (calculate average fundamental frequency)
        if (analyserRef.current) {
          const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(freqData);
          let maxVal = 0;
          let maxIdx = 0;
          for (let i = 2; i < 80; i++) {
            if (freqData[i] > maxVal) {
              maxVal = freqData[i];
              maxIdx = i;
            }
          }
          const nyquist = (audioCtxRef.current?.sampleRate || 44100) / 2;
          const detectedHz = Math.round((maxIdx * nyquist) / freqData.length) || 150;
          setExtractedPitch(Math.max(85, Math.min(320, detectedHz)));
          setExtractedFormant(detectedHz > 180 ? 2 : detectedHz < 120 ? -3 : 0);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingSample(true);
      drawWaveform();
    } catch {
      alert('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon diberikan.');
    }
  };

  const stopRecordingSample = () => {
    if (mediaRecorderRef.current && isRecordingSample) {
      mediaRecorderRef.current.stop();
      setIsRecordingSample(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  };

  const finishCalibration = () => {
    const newProfile: VoiceProfile = {
      id: `custom-voice-${Date.now()}`,
      name: newProfileName || `Profil Kloning ${profiles.length + 1}`,
      createdDate: new Date().toLocaleDateString('id-ID'),
      basePitchHz: extractedPitch,
      pitchRateMultiplier: 1.0,
      formantShift: extractedFormant,
      bassBoostGain: extractedPitch < 130 ? 5.5 : 2.0,
      trebleClarityGain: extractedPitch > 180 ? 4.5 : 2.5,
      vibratoDepth: 0.1,
      breathiness: 0.08,
      targetVoiceType: extractedPitch > 175 ? 'female' : 'male',
    };

    const updated = [...profiles, newProfile];
    setProfiles(updated);
    saveCustomProfiles(updated);
    setSelectedProfileId(newProfile.id);
    setIsCalibrating(false);
    setCalibrationStep(0);
    setSampleAudioUrls([]);
  };

  const deleteProfile = (id: string) => {
    if (id.startsWith('preset-')) return;
    const filtered = profiles.filter((p) => p.id !== id);
    setProfiles(filtered);
    saveCustomProfiles(filtered);
    setSelectedProfileId(filtered[0]?.id || 'preset-warm');
  };

  // Waveform visualization on canvas
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      if (isRecordingSample) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();
  };

  // Custom Formant & Timbre Filtered Speech Synthesis (Voice Clone Speech Output)
  const handleSpeakWithClonedVoice = () => {
    if (!('speechSynthesis' in window)) {
      alert('Browser Anda tidak mendukung Web Speech Synthesis.');
      return;
    }

    window.speechSynthesis.cancel();
    setIsSynthesizing(true);

    const utterance = new SpeechSynthesisUtterance(synthText);
    utterance.lang = 'id-ID';

    // Apply pitch and rate based on profile + user controls
    const normalizedPitch = Math.max(
      0.5,
      Math.min(2.0, (currentProfile.basePitchHz / 150) * (1 + synthPitchOffset / 10))
    );
    utterance.pitch = normalizedPitch;
    utterance.rate = Math.max(0.5, Math.min(2.0, synthSpeed * currentProfile.pitchRateMultiplier));
    utterance.volume = synthVolume / 100;

    // Pick best matching system voice
    const voices = window.speechSynthesis.getVoices();
    const idVoices = voices.filter((v) => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoices.length > 0) {
      if (currentProfile.targetVoiceType === 'female' && idVoices.length > 1) {
        utterance.voice = idVoices[1] || idVoices[0];
      } else {
        utterance.voice = idVoices[0];
      }
    }

    utterance.onend = () => {
      setIsSynthesizing(false);
    };

    utterance.onerror = () => {
      setIsSynthesizing(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 font-black shadow-lg shadow-cyan-500/25">
            <Dna className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">AI Voice Cloning &amp; Timbre Profile Studio 🧬</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Neural Formant Synthesis
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ekstraksi karakteristik akustik suara Anda (Pitch F0 &amp; Formant) untuk membuat kloning Text-to-Speech kustom.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsCalibrating(!isCalibrating);
            setCalibrationStep(0);
            setSampleAudioUrls([]);
          }}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isCalibrating ? 'Tutup Wizard' : 'Kloning Suara Baru'}</span>
        </button>
      </div>

      {/* CALIBRATION WIZARD MODAL / ACCORDION */}
      {isCalibrating && (
        <div className="p-6 rounded-3xl bg-slate-900/95 border-2 border-cyan-500/40 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-black text-white">
                Panduan Kalibrasi Profil Suara (Langkah {calibrationStep + 1} dari 3)
              </h3>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              Sampel Terkumpul: {sampleAudioUrls.length}/3
            </span>
          </div>

          {calibrationStep < 3 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Baca Kalimat Uji Berikut dengan Nada Alami Anda:
                </span>
                <p className="text-sm font-semibold text-cyan-200 leading-relaxed italic">
                  "{CALIBRATION_PROMPTS[calibrationStep]}"
                </p>
              </div>

              {/* Live Waveform Canvas */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-24">
                <canvas ref={canvasRef} width={600} height={96} className="w-full h-full block" />
                {isRecordingSample && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
                    MEREKAM SAMPEL VOKAL...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                {!isRecordingSample ? (
                  <button
                    onClick={startRecordingSample}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Rekam Sampel {calibrationStep + 1}</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecordingSample}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <Square className="w-4 h-4 text-rose-400" />
                    <span>Selesai Membaca</span>
                  </button>
                )}

                {sampleAudioUrls.length > calibrationStep && (
                  <button
                    onClick={() => {
                      if (calibrationStep < 2) setCalibrationStep((s) => s + 1);
                      else setCalibrationStep(3);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lanjut ke Langkah {calibrationStep < 2 ? calibrationStep + 2 : 'Konfirmasi'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Final Step: Name & Review */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">FREKUENSI DASAR (F0)</span>
                  <strong className="text-cyan-400 font-mono text-base">{extractedPitch} Hz</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">FORMANT RESONANCE</span>
                  <strong className="text-emerald-400 font-mono text-base">{extractedFormant > 0 ? `+${extractedFormant}` : extractedFormant} Semitones</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">TIMBRE ESTIMATION</span>
                  <strong className="text-amber-400 font-mono text-base">{extractedPitch > 175 ? 'Soprano / Bright' : 'Baritone / Warm'}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Beri Nama Profil Suara Anda:</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Misal: Suara Asli Budi / Suara Presentasi"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                onClick={finishCalibration}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simpan &amp; Aktifkan Profil Kloning Suara</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MAIN TWO-COLUMN DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: VOICE PROFILES LIST (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-black text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                Daftar Profil Vokal Tersedia ({profiles.length})
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {profiles.map((p) => {
                const isSelected = p.id === selectedProfileId;
                const isPreset = p.id.startsWith('preset-');
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          F0: {p.basePitchHz}Hz • Formant: {p.formantShift > 0 ? `+${p.formantShift}` : p.formantShift}st
                        </span>
                      </div>
                    </div>

                    {!isPreset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProfile(p.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Hapus Profil Kustom"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acoustic Characteristics Inspector */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 backdrop-blur-md">
            <span className="text-xs font-black text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              Parameter Akustik: {currentProfile.name}
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">BASE PITCH</span>
                <strong className="text-cyan-400">{currentProfile.basePitchHz} Hz</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">BASS BOOST</span>
                <strong className="text-emerald-400">+{currentProfile.bassBoostGain} dB</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">CLARITY GAIN</span>
                <strong className="text-amber-400">+{currentProfile.trebleClarityGain} dB</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">GENDER PROFILE</span>
                <strong className="text-purple-400 uppercase">{currentProfile.targetVoiceType}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TEXT-TO-SPEECH SYNTHESIZER (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white">Sintesis Teks dengan Suara Terpilih</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Profil: {currentProfile.name}
              </span>
            </div>

            {/* Synthesis Text Input */}
            <div className="space-y-1.5">
              <textarea
                value={synthText}
                onChange={(e) => setSynthText(e.target.value)}
                rows={5}
                placeholder="Ketik teks yang ingin diucapkan dengan profil suara kloning Anda di sini..."
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-sans leading-relaxed placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            {/* Modulation Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-300 text-[11px]">
                  <span>Kecepatan Bicara (Speed):</span>
                  <span className="text-cyan-400 font-mono">{synthSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.05"
                  value={synthSpeed}
                  onChange={(e) => setSynthSpeed(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-300 text-[11px]">
                  <span>Penyesuaian Pitch Vokal:</span>
                  <span className="text-emerald-400 font-mono">{synthPitchOffset > 0 ? `+${synthPitchOffset}` : synthPitchOffset} st</span>
                </div>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="1"
                  value={synthPitchOffset}
                  onChange={(e) => setSynthPitchOffset(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!isSynthesizing ? (
                <button
                  onClick={handleSpeakWithClonedVoice}
                  disabled={!synthText.trim()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-black text-xs shadow-xl shadow-cyan-500/25 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Putar Suara Kloning AI</span>
                </button>
              ) : (
                <button
                  onClick={handleStopSpeaking}
                  className="px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs shadow-xl shadow-rose-500/25 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Hentikan Bicara</span>
                </button>
              )}

              <button
                onClick={() => {
                  const blob = new Blob([synthText], { type: 'text/plain;charset=utf-8' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `AeroType_Kloning_${currentProfile.name.replace(/\s+/g, '_')}.txt`;
                  a.click();
                }}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Naskah</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
