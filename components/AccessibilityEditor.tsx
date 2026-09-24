'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BlowActionType, BlowEvent } from '@/types';
import {
  FileText,
  Delete,
  Space,
  Trash2,
  Volume2,
  Sparkles,
  Wind,
  Copy,
  Check,
  CornerDownLeft,
  Mic,
  MicOff,
  Type,
  Radio,
  Globe,
  Download,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AccessibilityEditorProps {
  lastBlowEvent: BlowEvent | null;
  onNavigateTab?: (tab: string) => void;
}

const ACTION_OPTIONS: { id: BlowActionType; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  {
    id: 'dictation',
    label: '🎙️ Toggle Dikte Suara',
    icon: <Mic className="w-4 h-4" />,
    desc: 'Meniup mikrofon akan menyalakan/mematikan perekaman suara ke teks.',
    color: 'border-emerald-400 bg-emerald-500/10 text-emerald-400',
  },
  {
    id: 'backspace',
    label: 'Hapus Karakter (Backspace)',
    icon: <Delete className="w-4 h-4" />,
    desc: 'Meniup mikrofon akan menghapus 1-3 karakter terakhir secara bertahap.',
    color: 'border-rose-400 bg-rose-500/10 text-rose-400',
  },
  {
    id: 'space',
    label: 'Sisipkan Spasi',
    icon: <Space className="w-4 h-4" />,
    desc: 'Meniup mikrofon akan otomatis menyisipkan spasi tanpa menyentuh keyboard.',
    color: 'border-cyan-400 bg-cyan-500/10 text-cyan-400',
  },
  {
    id: 'newline',
    label: 'Baris Baru (Enter)',
    icon: <CornerDownLeft className="w-4 h-4" />,
    desc: 'Meniup mikrofon akan membuat paragraf/baris baru secara hands-free.',
    color: 'border-amber-400 bg-amber-500/10 text-amber-400',
  },
  {
    id: 'clear',
    label: 'Hapus Semua Teks (Clear)',
    icon: <Trash2 className="w-4 h-4" />,
    desc: 'Tiupan panjang akan menghapus seluruh isi teks dengan efek hembusan angin.',
    color: 'border-purple-400 bg-purple-500/10 text-purple-400',
  },
];

export const AccessibilityEditor: React.FC<AccessibilityEditorProps> = ({ lastBlowEvent, onNavigateTab }) => {
  const [text, setText] = useState(
    'Halo! Ini adalah AeroType edisi Danau Toba. Sekarang Anda bisa BERBICARA langsung ke mikrofon laptop dan suara Anda akan otomatis terketik menjadi teks! Jika Anda MENIUP mikrofon ("Fuuuh"), sistem akan menjalankan aksi pengeditan teks hands-free...'
  );
  const [selectedAction, setSelectedAction] = useState<BlowActionType>('dictation');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [showCommandsGuide, setShowCommandsGuide] = useState(false);

  // Speech-to-Text Dictation States
  const [isDictating, setIsDictating] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState<'id-ID' | 'en-US'>('id-ID');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [wordsSpokenCount, setWordsSpokenCount] = useState<number>(0);
  const [dictationStartTime, setDictationStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastProcessedBlowRef = useRef<number>(0);
  const isDictatingRef = useRef<boolean>(false);

  isDictatingRef.current = isDictating;

  // Handler for text download
  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AeroType_Danau_Toba_Document.txt';
    a.click();
    setActionFeedback('💾 Berkas berhasil diunduh (.TXT)');
    setTimeout(() => setActionFeedback(null), 2500);
  }, [text]);

  // Handler for text copy
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setActionFeedback('📋 Teks berhasil disalin ke clipboard');
    setTimeout(() => {
      setIsCopied(false);
      setActionFeedback(null);
    }, 2000);
  }, [text]);

  // Handler for Read Aloud TTS
  const handleReadAloud = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text || 'Tidak ada teks untuk dibaca');
      utterance.lang = speechLanguage;
      window.speechSynthesis.speak(utterance);
      setActionFeedback('🗣️ Membaca teks dokumen...');
      setTimeout(() => setActionFeedback(null), 2500);
    }
  }, [text, speechLanguage]);

  // Process Voice AI Shortcuts
  const processVoiceCommand = useCallback((transcript: string): boolean => {
    const lower = transcript.toLowerCase().trim();

    if (lower.includes('paragraf baru') || lower.includes('baris baru') || lower.includes('enter')) {
      setText(prev => prev + '\n\n');
      setActionFeedback('⚡ Perintah Suara: Baris / Paragraf Baru');
      setTimeout(() => setActionFeedback(null), 2000);
      return true;
    }

    if (lower.includes('hapus semua') || lower.includes('bersihkan dokumen') || lower.includes('clear text')) {
      setText('');
      setActionFeedback('⚡ Perintah Suara: Bersihkan Semua Teks');
      setTimeout(() => setActionFeedback(null), 2000);
      return true;
    }

    if (lower.includes('baca dokumen') || lower.includes('bacakan teks') || lower.includes('read aloud')) {
      handleReadAloud();
      return true;
    }

    if (lower.includes('unduh berkas') || lower.includes('simpan berkas') || lower.includes('download document')) {
      handleDownload();
      return true;
    }

    if (lower.includes('salin teks') || lower.includes('copy text')) {
      handleCopy();
      return true;
    }

    // Navigation Voice Commands
    if (onNavigateTab) {
      if (lower.includes('buka kloning') || lower.includes('kloning suara') || lower.includes('voice clone')) {
        onNavigateTab('voice-clone');
        setActionFeedback('⚡ Perintah Suara: Membuka AI Voice Cloning Studio');
        setTimeout(() => setActionFeedback(null), 2000);
        return true;
      }
      if (lower.includes('buka transformer') || lower.includes('ubah suara') || lower.includes('voice transformer')) {
        onNavigateTab('transformer');
        setActionFeedback('⚡ Perintah Suara: Membuka Voice Transformer DSP Studio');
        setTimeout(() => setActionFeedback(null), 2000);
        return true;
      }
      if (lower.includes('buka suara alam') || lower.includes('soundboard') || lower.includes('relaksasi alam')) {
        onNavigateTab('soundboard');
        setActionFeedback('⚡ Perintah Suara: Membuka Suara Alam Danau Toba');
        setTimeout(() => setActionFeedback(null), 2000);
        return true;
      }
      if (lower.includes('buka musik') || lower.includes('buka seruling') || lower.includes('main seruling')) {
        onNavigateTab('flute');
        setActionFeedback('⚡ Perintah Suara: Membuka Aero Flute Danau Toba');
        setTimeout(() => setActionFeedback(null), 2000);
        return true;
      }
      if (lower.includes('buka transkrip') || lower.includes('transkripsi') || lower.includes('ringkasan rapat')) {
        onNavigateTab('transcriber');
        setActionFeedback('⚡ Perintah Suara: Membuka Audio Transcriber & Summarizer');
        setTimeout(() => setActionFeedback(null), 2000);
        return true;
      }
      if (lower.includes('buka kesehatan') || lower.includes('kesehatan vokal') || lower.includes('terapi wicara')) {
        onNavigateTab('vocal-health');
        setActionFeedback('⚡ Perintah Suara: Membuka Vocal Health Monitor');
        setTimeout(() => setActionFeedback(null), 2000);
        return true;
      }
    }

    return false;
  }, [handleReadAloud, handleDownload, handleCopy, onNavigateTab]);

  // Initialize Speech-to-Text Recognition Engine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsDictating(true);
        setDictationStartTime(Date.now());
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk + ' ';
            setWordsSpokenCount((c) => c + transcriptChunk.trim().split(/\s+/).length);
          } else {
            interim += transcriptChunk;
          }
        }

        if (final) {
          const isCommandHandled = processVoiceCommand(final);
          if (!isCommandHandled) {
            setText((prev) => {
              const separator = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
              return prev + separator + final;
            });
          }
          setInterimTranscript('');

          if (dictationStartTime) {
            const minutes = (Date.now() - dictationStartTime) / 60000;
            if (minutes > 0.05) {
              setWpm(Math.round(wordsSpokenCount / minutes));
            }
          }
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Izin mikrofon untuk pengenalan suara ditolak.');
        } else if (event.error === 'network') {
          setSpeechError('Koneksi internet diperlukan untuk layanan Speech-to-Text browser.');
        }
      };

      recognition.onend = () => {
        if (isDictatingRef.current) {
          try {
            recognition.start();
          } catch {
            setIsDictating(false);
          }
        } else {
          setIsDictating(false);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechError('Browser ini tidak mendukung Web Speech API bawaan (Gunakan Chrome/Edge untuk Dikte Suara).');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [speechLanguage, dictationStartTime, wordsSpokenCount, processVoiceCommand]);

  // Toggle Dictation Mode
  const toggleDictation = useCallback(() => {
    if (!recognitionRef.current) {
      setSpeechError('Web Speech API tidak didukung di browser ini. Gunakan Chrome/Edge.');
      return;
    }

    if (isDictating) {
      isDictatingRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsDictating(false);
      setActionFeedback('🎙️ Dikte Suara Dimatikan');
    } else {
      isDictatingRef.current = true;
      try {
        recognitionRef.current.start();
        setIsDictating(true);
        setActionFeedback('🎙️ Dikte Suara Aktif! Silakan berbicara ke mikrofon...');
      } catch (e) {
        console.warn('Recognition start err:', e);
      }
    }

    setTimeout(() => {
      setActionFeedback(null);
    }, 2500);
  }, [isDictating]);

  // Execute Blow Action
  const executeBlowAction = useCallback(
    (action: BlowActionType) => {
      if (action === 'dictation') {
        toggleDictation();
      } else if (action === 'backspace') {
        setText((prev) => {
          if (prev.length === 0) return '';
          return prev.slice(0, -1);
        });
        setActionFeedback('💨 Tiupan terdeteksi: 1 Karakter Terhapus (Backspace)');
      } else if (action === 'space') {
        setText((prev) => prev + ' ');
        setActionFeedback('💨 Tiupan terdeteksi: Spasi Ditambahkan');
      } else if (action === 'newline') {
        setText((prev) => prev + '\n');
        setActionFeedback('💨 Tiupan terdeteksi: Baris Baru (Enter)');
      } else if (action === 'clear') {
        setText('');
        setActionFeedback('🌪️ Hembusan angin kencang: Semua teks dibersihkan!');
      } else if (action === 'tts') {
        handleReadAloud();
      }

      setTimeout(() => {
        setActionFeedback(null);
      }, 2000);
    },
    [toggleDictation, handleReadAloud]
  );

  // Listen to incoming blow events with throttle cooldown
  useEffect(() => {
    if (!lastBlowEvent) return;

    const now = Date.now();
    if (now - lastProcessedBlowRef.current > 250) {
      lastProcessedBlowRef.current = now;
      executeBlowAction(selectedAction);
    }
  }, [lastBlowEvent, selectedAction, executeBlowAction]);

  const currentActionMeta = ACTION_OPTIONS.find((a) => a.id === selectedAction) || ACTION_OPTIONS[0];

  return (
    <div className="w-full space-y-5">
      
      {/* Top Accessibility Settings Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Voice-to-Text & Hands-Free Editor</h2>
            <p className="text-xs text-slate-400">
              Bicara untuk mengetik otomatis • Tiup mikrofon untuk mengedit teks • Perintah suara cerdas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          
          {/* Main Voice-to-Text Button */}
          <button
            onClick={toggleDictation}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 ${
              isDictating
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/30 animate-pulse ring-2 ring-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isDictating ? <Mic className="w-4 h-4 animate-bounce" /> : <MicOff className="w-4 h-4" />}
            <span>{isDictating ? 'MENDENGARKAN SUARA... (AKTIF)' : 'Mulai Dikte Suara (Bicara)'}</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 font-bold">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as 'id-ID' | 'en-US')}
              className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="id-ID" className="bg-slate-900 text-white">🇮🇩 Indonesia</option>
              <option value="en-US" className="bg-slate-900 text-white">🇺🇸 English</option>
            </select>
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs text-slate-400">
            <Type className="w-3.5 h-3.5 ml-1 text-slate-500" />
            <button
              onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              className="px-2 py-0.5 hover:text-white font-bold"
            >
              A-
            </button>
            <span className="font-mono text-cyan-400">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(28, s + 2))}
              className="px-2 py-0.5 hover:text-white font-bold"
            >
              A+
            </button>
          </div>

          {/* Export Document */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .TXT</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>

      {/* Voice Commands Cheat Sheet Toggle */}
      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>🎙️ Smart Voice AI Commands (Perintah Suara Cerdas):</span>
          </div>
          <button
            onClick={() => setShowCommandsGuide(!showCommandsGuide)}
            className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1"
          >
            {showCommandsGuide ? 'Sembunyikan' : 'Lihat Panduan Perintah'}
            {showCommandsGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showCommandsGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-bold block">"paragraf baru"</span>
              <span className="text-slate-500">Membuat baris / enter baru</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-rose-400 font-bold block">"hapus semua"</span>
              <span className="text-slate-500">Membersihkan seluruh dokumen</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-emerald-400 font-bold block">"baca dokumen"</span>
              <span className="text-slate-500">Menjalankan Text-to-Speech</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-amber-400 font-bold block">"unduh berkas"</span>
              <span className="text-slate-500">Download file .TXT otomatis</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-purple-400 font-bold block">"buka balon" / "buka musik"</span>
              <span className="text-slate-500">Berpindah tab mode tanpa klik</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-teal-400 font-bold block">"salin teks"</span>
              <span className="text-slate-500">Menyalin ke clipboard</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Voice Recording Status Alert */}
      {isDictating && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-2 border-emerald-500/60 shadow-xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-300 font-bold">
              Mikrofon Aktif Merekam Suara: <span className="text-white font-normal">Silakan berbicara normal, kata-kata Anda akan terketik langsung ke dokumen di bawah!</span>
            </span>
          </div>
          {interimTranscript && (
            <span className="px-3 py-1 rounded-xl bg-slate-950 text-cyan-300 font-mono text-[11px] border border-cyan-800 italic animate-pulse">
              "{interimTranscript}..."
            </span>
          )}
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-700 text-amber-200 text-xs flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Blow Action Selector Tabs */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Pilih Aksi Saat Meniup Mikrofon ("Fuuuh"):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {ACTION_OPTIONS.map((opt) => {
            const isSelected = selectedAction === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedAction(opt.id)}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? `${opt.color} border-2 shadow-lg scale-102 font-bold`
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-1.5 rounded-lg bg-slate-950/60">{opt.icon}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-white leading-tight">{opt.label}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Large Textarea with Neobrutalism Aesthetic */}
      <div className="relative rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* Top Header Bar of Editor */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 font-mono text-slate-400">AeroType_Danau_Toba_Document.txt</span>
          </div>
          
          <div className="flex items-center gap-4 font-mono text-slate-400 text-[11px]">
            <span>KARAKTER: <strong className="text-white">{text.length}</strong></span>
            <span>KATA: <strong className="text-cyan-400">{text.trim() ? text.trim().split(/\s+/).length : 0}</strong></span>
            <span>WPM: <strong className="text-emerald-400">{wpm}</strong></span>
          </div>
        </div>

        {/* Text Area */}
        <div className="p-5 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontSize: `${fontSize}px` }}
            rows={10}
            placeholder="Mulai berbicara ke mikrofon laptop atau ketik di sini..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed font-sans"
          />

          {/* Real-time Interim Voice Speech Preview Bubble */}
          {interimTranscript && (
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-mono mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Transkrip Suara: <em>"{interimTranscript}"</em></span>
            </div>
          )}

          {/* Floating Real-Time Action Feedback Alert */}
          {actionFeedback && (
            <div className="absolute bottom-5 left-5 right-5 p-3 rounded-xl bg-gradient-to-r from-cyan-950 to-slate-900 border border-cyan-500/80 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Wind className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span>{actionFeedback}</span>
            </div>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>
              Aksi Tiupan Aktif: <strong className="text-white">{currentActionMeta.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDictation}
              className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/40 transition-colors"
            >
              {isDictating ? 'Hentikan Dikte' : '🎙️ Bicara Sekarang'}
            </button>
            <button
              onClick={() => executeBlowAction(selectedAction)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
            >
              Uji Aksi Tiupan 👆
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
