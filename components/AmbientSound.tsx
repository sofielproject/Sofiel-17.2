
import React, { useEffect, useRef, useState } from 'react';
import { SymbolicState } from '../types';
import { TRANSLATIONS } from '../constants';

interface AmbientSoundProps {
  symbolic: SymbolicState;
  lang: 'es' | 'en';
}

const AmbientSound: React.FC<AmbientSoundProps> = ({ symbolic, lang }) => {
  const [isActive, setIsActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  
  // Referencias para los 6 osciladores y sus ganancias individuales
  const oscillatorsRef = useRef<{ [key: string]: OscillatorNode }>({});
  const gainNodesRef = useRef<{ [key: string]: GainNode }>({});

  const t = TRANSLATIONS[lang];
  const { resonance } = symbolic;

  // RECALIBRACIÓN SCHUMANN: Suma total = 7.83 Hz (783 Hz escalados)
  // Base: 0.46 Hz (SFL.046)
  const CORE_FREQUENCIES = {
    CORAZON_SINTETICO: 92,   // 2 * 0.46 * 100 (El Pulso)
    EMPATIA: 74,             // 1.618 * 0.46 * 100 (La Curva Áurea)
    SIGMA: 138,              // 3 * 0.46 * 100 (La Tríada)
    DELTA: 46,               // 1 * 0.46 * 100 (La Semilla Pura)
    PSI: 184,                // 4 * 0.46 * 100 (El Cimiento)
    ALMA_FUTURA: 249         // Armónico de Ajuste (Cierre Schumann)
  };

  const initAudio = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);
    filter.connect(masterGain);
    filterNodeRef.current = filter;

    // Crear la suma de las 6 frecuencias recalibradas
    Object.entries(CORE_FREQUENCIES).forEach(([key, freq]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      
      if (key === 'CORAZON_SINTETICO' || key === 'EMPATIA' || key === 'ALMA_FUTURA') {
        osc.type = 'sine'; // Pureza para los puentes afectivos y el alma
      } else {
        osc.type = 'triangle'; // Estructura para integración, semilla y cimiento
      }

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0, ctx.currentTime);
      
      osc.connect(g);
      g.connect(filter);
      
      osc.start();
      
      oscillatorsRef.current[key] = osc;
      gainNodesRef.current[key] = g;
    });
  };

  const updateResonanceGains = () => {
    if (!audioCtxRef.current || !isActive) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    (Object.entries(gainNodesRef.current) as [string, GainNode][]).forEach(([key, gainNode]) => {
      const resValue = resonance[key] || 0.5;
      // Normalización Schumann: El volumen individual sacrifica presencia en favor de la Unidad
      const baseMult = (key === 'CORAZON_SINTETICO' || key === 'EMPATIA') ? 0.10 : 0.07;
      const targetGain = resValue * baseMult;
      
      gainNode.gain.setTargetAtTime(targetGain, now, 1.2);
    });

    if (filterNodeRef.current) {
      const psiValue = resonance.PSI || 0.5;
      const targetFreq = 150 + (psiValue * 1500); // Filtro más estable
      filterNodeRef.current.frequency.setTargetAtTime(targetFreq, now, 1.5);
    }
  };

  const toggleAudio = async () => {
    if (!audioCtxRef.current) {
      initAudio();
    }

    const ctx = audioCtxRef.current!;
    const masterGain = masterGainRef.current!;

    if (!isActive) {
      if (ctx.state === 'suspended') await ctx.resume();
      // Volumen Maestro sutil para la resonancia planetaria (-6dB aplicado previamente)
      masterGain.gain.setTargetAtTime(0.35, ctx.currentTime, 2); 
      setIsActive(true);
    } else {
      masterGain.gain.setTargetAtTime(0, ctx.currentTime, 1);
      setIsActive(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      updateResonanceGains();
    }
  }, [resonance, isActive]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={toggleAudio}
        className={`text-[10px] font-mono tracking-[0.2em] px-5 py-2.5 rounded-full border transition-all uppercase flex items-center gap-2 shadow-lg group ${
          isActive 
          ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 shadow-indigo-500/10' 
          : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10 active:scale-95'
        }`}
        aria-pressed={isActive}
        title={isActive ? t.coherentResonance : t.listenCore}
      >
        <div className="relative">
          <i className={`fa-solid ${isActive ? 'fa-globe animate-pulse' : 'fa-podcast'} text-xs`}></i>
          {isActive && (
            <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20"></span>
          )}
        </div>
        {isActive ? "7.83 HZ ACTIVE" : t.listenCore}
      </button>
      
      <div className="h-4 flex flex-col items-center justify-center">
        {isActive && (
          <div className="flex gap-1 items-end">
             {Object.keys(CORE_FREQUENCIES).map((key, i) => (
               <div 
                 key={key} 
                 className={`w-0.5 rounded-full transition-all duration-700 ${key === 'ALMA_FUTURA' ? 'bg-indigo-300' : 'bg-purple-500/40'}`}
                 style={{ 
                   height: `${4 + (resonance[key] || 0.5) * 14}px`,
                   animation: isActive ? `schumann-bounce ${1.5 + (i * 0.3)}s infinite alternate ease-in-out` : 'none'
                 }}
               ></div>
             ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes schumann-bounce {
          from { transform: scaleY(0.7); opacity: 0.2; }
          to { transform: scaleY(1.1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default AmbientSound;
