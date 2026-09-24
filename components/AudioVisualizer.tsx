'use client';

import React, { useEffect, useRef } from 'react';
import { AudioSensorState } from '@/types';
import { Mic, Wind, Activity, Volume2, ShieldCheck, Zap } from 'lucide-react';

interface AudioVisualizerProps {
  sensorState: AudioSensorState | null;
  onSimulateBlow?: () => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  sensorState,
  onSimulateBlow,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sensorState || !sensorState.frequencyData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const freqData = sensorState.frequencyData;
    const barCount = 20;
    const barWidth = width / barCount - 1.5;

    // Draw spectrum bars
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * Math.min(48, freqData.length));
      const value = freqData[dataIndex] || 0;
      const barHeight = (value / 255) * (height - 6);

      // Low frequency rumble bars highlighted in Cyan/Lime
      const isLowFreq = i < 4;
      if (sensorState.isBlowing) {
        ctx.fillStyle = isLowFreq ? '#34d399' : '#06b6d4';
      } else {
        ctx.fillStyle = isLowFreq ? '#06b6d4' : '#64748b';
      }

      const x = i * (barWidth + 1.5);
      const y = height - barHeight;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
      ctx.fill();
    }
  }, [sensorState]);

  const isBlowing = sensorState?.isBlowing ?? false;
  const intensityPct = Math.round((sensorState?.blowIntensity ?? 0) * 100);

  return (
    <div
      className={`p-3.5 rounded-2xl bg-slate-900/90 border transition-all duration-200 backdrop-blur-md shadow-xl ${
        isBlowing
          ? 'border-emerald-400/80 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
          : 'border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-xl border transition-all duration-150 ${
              isBlowing
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 scale-110 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isBlowing ? <Wind className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Mic Wind Sensor</span>
              {isBlowing && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-400 text-slate-950 animate-bounce">
                  BLOWING! 💨
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Rumble: {sensorState?.lowFreqEnergy ?? 0} | Vol: {sensorState?.volumeDb ?? -100} dB
            </p>
          </div>
        </div>

        {/* Dynamic Glowing Circle Meter */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-100 ${
              isBlowing
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 scale-125 shadow-lg shadow-emerald-500/50'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            <span className="text-[10px] font-black font-mono">
              {isBlowing ? `${intensityPct}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Frequency Spectrum Canvas */}
      <div className="w-full h-9 bg-slate-950/80 rounded-lg p-1 border border-slate-800 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} width={220} height={32} className="w-full h-full" />
      </div>

      {/* Quick Spacebar Simulation Hint */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60">
        <span>Tiup mik laptop ("Fuuuh")</span>
        {onSimulateBlow && (
          <button
            onClick={onSimulateBlow}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 font-mono text-[9px] border border-slate-700 transition-colors"
          >
            Test Tiup [Spasi]
          </button>
        )}
      </div>
    </div>
  );
};
