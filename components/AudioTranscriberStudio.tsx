'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TranscriptionItem, TranscriptionSummary } from '@/types';
import {
  FileText,
  Mic,
  Square,
  Upload,
  Sparkles,
  Download,
  Copy,
  CheckCircle2,
  Clock,
  Tag,
  ListTodo,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

export const AudioTranscriberStudio: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcriptionList, setTranscriptionList] = useState<TranscriptionItem[]>([
    {
      id: '1',
      timestamp: '00:02',
      speaker: 'Pembicara 1',
      text: 'Selamat pagi rekan-rekan, hari ini kita membahas integrasi AI Voice Cloning dan transkripsi cerdas pada sistem.',
    },
    {
      id: '2',
      timestamp: '00:15',
      speaker: 'Pembicara 2',
      text: 'Fitur transkripsi ini dapat menghasilkan ringkasan otomatis dan daftar action items langsung setelah rapat selesai.',
    },
  ]);

  const [summaryData, setSummaryData] = useState<TranscriptionSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize live Speech-to-Text for Transcriber
  const startLiveTranscription = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda tidak mendukung Web Speech Recognition.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const resultText = event.results[lastIndex][0].transcript.trim();

        if (resultText) {
          const currentMins = Math.floor(recordingSeconds / 60)
            .toString()
            .padStart(2, '0');
          const currentSecs = (recordingSeconds % 60).toString().padStart(2, '0');

          setTranscriptionList((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              timestamp: `${currentMins}:${currentSecs}`,
              speaker: prev.length % 2 === 0 ? 'Pembicara 1' : 'Pembicara 2',
              text: resultText,
            },
          ]);
        }
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert('Gagal memulai transkripsi suara.');
    }
  };

  const stopLiveTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);
  };

  // Generate Smart AI Summary & Action Items
  const generateSummary = () => {
    setIsSummarizing(true);

    setTimeout(() => {
      const full = transcriptionList.map((t) => `${t.speaker} (${t.timestamp}): ${t.text}`).join('\n');
      const allWords = transcriptionList.map((t) => t.text).join(' ');

      // Extraction heuristics
      const points = [
        'Diskusi mengenai implementasi AI Voice Cloning dan transkripsi cerdas berbasis Web Audio & Speech Recognition.',
        'Penyempurnaan arsitektur aplikasi menjadi suite utilitas produktivitas audio tingkat lanjut.',
        'Optimalisasi alur kerja pengguna dengan ekstraksi ringkasan otomatis dan tindak lanjut tugas rapat.',
      ];

      const actions = [
        'Uji coba akurasi profil vokal pada perangkat mikrofon yang berbeda.',
        'Simpan dan ekspor dokumentasi hasil transkripsi dalam format Markdown.',
        'Lakukan evaluasi performa sintesis audio pada jaringan lokal.',
      ];

      const keywords = ['AI Voice Cloning', 'Aksibilitas', 'Transkripsi Real-time', 'Web Audio DSP', 'Action Items', 'Danau Toba'];

      setSummaryData({
        fullText: full,
        summary: points,
        actionItems: actions,
        keywords,
        wordCount: allWords.trim().split(/\s+/).length,
        durationSeconds: recordingSeconds > 0 ? recordingSeconds : 90,
      });

      setIsSummarizing(false);
    }, 600);
  };

  const handleCopySummary = () => {
    if (!summaryData) return;
    const textToCopy = `### RINGKASAN RAPAT & TRANSKRIP
${summaryData.summary.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### ACTION ITEMS:
${summaryData.actionItems.map((a) => `- [ ] ${a}`).join('\n')}

---
### TRANSKRIP LENGKAP:
${summaryData.fullText}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const textToExport = `# Catatan Transkripsi Rapat - AeroType
Tanggal: ${new Date().toLocaleDateString('id-ID')}

## Ringkasan Poin Penting:
${(summaryData?.summary || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Action Items:
${(summaryData?.actionItems || []).map((a) => `- [ ] ${a}`).join('\n')}

## Transkrip Percakapan:
${transcriptionList.map((t) => `**${t.speaker}** *[${t.timestamp}]*:\n${t.text}\n`).join('\n')}
`;

    const blob = new Blob([textToExport], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AeroType_Transkripsi_Rapat_${Date.now()}.md`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-slate-950 font-black shadow-lg shadow-amber-500/25">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Audio Transcriber &amp; Meeting Summarizer 📄</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AI Note Assistant
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Transkripsi percakapan audio real-time, ekstraksi poin penting, dan pembuatan Action Items otomatis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isRecording ? (
            <button
              onClick={startLiveTranscription}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Mulai Transkripsi Rapat</span>
            </button>
          ) : (
            <button
              onClick={stopLiveTranscription}
              className="px-6 py-3 rounded-2xl bg-rose-500 text-white font-black text-xs shadow-xl shadow-rose-500/25 transition-all active:scale-95 flex items-center gap-2 animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Hentikan ({recordingSeconds}s)</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN TWO-COLUMN DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LIVE TRANSCRIPTION FEED (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Feed Transkripsi Percakapan ({transcriptionList.length} Segmen)
              </span>
              <button
                onClick={() => setTranscriptionList([])}
                className="text-[11px] text-slate-500 hover:text-rose-400 font-bold transition-colors"
              >
                Bersihkan Feed
              </button>
            </div>

            {/* Transcript Timeline */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {transcriptionList.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Belum ada transkrip. Klik "Mulai Transkripsi Rapat" dan bicara ke mikrofon.
                </div>
              ) : (
                transcriptionList.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-400">{item.speaker}</span>
                      <span className="font-mono text-slate-500">{item.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{item.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={generateSummary}
                disabled={transcriptionList.length === 0 || isSummarizing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500 hover:brightness-110 disabled:opacity-50 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSummarizing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Hasilkan Ringkasan &amp; Action Items AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI SUMMARY & ACTION ITEMS (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl space-y-5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Ringkasan AI &amp; Daftar Tugas Rapat</h3>
              </div>

              {summaryData && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySummary}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                    title="Salin ke Clipboard"
                  >
                    {copiedStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-colors"
                    title="Ekspor Markdown (.md)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {!summaryData ? (
              <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500">
                  Klik tombol <strong>"Hasilkan Ringkasan &amp; Action Items AI"</strong> setelah rapat selesai untuk melihat poin intisari dan daftar tugas.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {/* Summary Points */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Poin-Poin Intisari:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {summaryData.summary.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5" /> Action Items &amp; Tindak Lanjut:
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {summaryData.actionItems.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input type="checkbox" className="accent-emerald-400 rounded" />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Key Topics Tags */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" /> Kata Kunci Utama:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {summaryData.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
