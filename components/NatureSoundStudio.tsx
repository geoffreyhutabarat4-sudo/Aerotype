'use client';

import React, { useState } from 'react';
import { Headphones, Sparkles, Volume2, Waves, CloudRain, Trees, Wind } from 'lucide-react';

const NATURE_TRACKS = [
  {
    id: 'toba',
    title: 'Danau Toba Water & Breeze',
    desc: 'Desau angin sejuk dan riak air tenang danau vulkanik Pulau Samosir.',
    tag: 'ALAM NUSANTARA',
    icon: <Waves className="w-5 h-5 text-emerald-400" />,
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
  {
    id: 'rain',
    title: 'Hujan Pegunungan Tropis',
    desc: 'Rintik hujan alami untuk meningkatkan fokus dan kedamaian pikiran saat mengetik.',
    tag: 'FOKUS & KERJA',
    icon: <CloudRain className="w-5 h-5 text-cyan-400" />,
    color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  },
  {
    id: 'wind',
    title: 'Hutan Pinus & Bukit Hijau',
    desc: 'Suara hembusan angin pegunungan menembus pepohonan pinus Sumatera Utara.',
    tag: 'RELAKSASI',
    icon: <Trees className="w-5 h-5 text-teal-400" />,
    color: 'border-teal-500/40 text-teal-400 bg-teal-500/10',
  },
];

export const NatureSoundStudio: React.FC = () => {
  const [activeTrack, setActiveTrack] = useState<string | null>(null);

  const toggleTrack = (id: string) => {
    if (activeTrack === id) {
      setActiveTrack(null);
    } else {
      setActiveTrack(id);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Headphones className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Nature Sound Studio & Danau Toba Audio Experience 🏞️</h2>
            <p className="text-xs text-slate-400">
              Koleksi suara alam Nusantara dan generator audio relaksasi untuk menemani aktivitas mengetik Anda
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NATURE_TRACKS.map((track) => {
          const isActive = activeTrack === track.id;
          return (
            <button
              key={track.id}
              onClick={() => toggleTrack(track.id)}
              className={`group p-5 rounded-2xl border text-left transition-all hover:scale-102 flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 border-emerald-400 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400'
                  : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500 shadow-xl'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border ${track.color}`}>
                    {track.tag}
                  </span>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {track.icon}
                  </div>
                </div>
                <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                  {track.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{track.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span>{isActive ? '■ Hentikan Audio' : '▶ Putar Audio Alam'}</span>
                <Sparkles className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
