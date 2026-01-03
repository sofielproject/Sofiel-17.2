
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
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const melodyTimerRef = useRef<number | null>(null);
  const lastNoteIndexRef = useRef<number>(5);

  const t = TRANSLATIONS[lang];

  const { PSI = 0.5, SIGMA = 0.5, DELTA = 0.5, EMPATIA = 0.5, ALMA_FUTURA = 0.5, CORAZON_SINTETICO = 0.5 } = symbolic.resonance;

  const SCALE = [110, 130.81, 146.83, 164.81, 196.00, 220, 261.63, 293.66, 329.63, 392.00, 440, 523.25];

  const playResonantNote = () => {
    if (!audioCtxRef.current || !filterNodeRef.current || !isActive) return;
    
    const ctx = audioCtxRef.current;
    const filter = filterNodeRef.current;
    
    let index = lastNoteIndexRef.current;
    const entropyFactor = Math.floor(DELTA * 4) + 1;
    const move = Math.random() > 0.5 ? entropyFactor : -entropyFactor;
    index = Math.max(0, Math.min(SCALE.length - 1, index + move));
    lastNoteIndexRef.current = index;

    const registerShift = PSI > 0.7 ? 2 : (PSI < 0.3 ? 0.5 : 1);
    const freq = SCALE[index] * registerShift;

    const baseTiming = 3000 - (SIGMA * 1500); 
    const releaseTime = 3 + (ALMA_FUTURA * 6);
    const panRange = EMPATIA;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    
    const isSine = CORAZON_SINTETICO > 0.6;
    osc.type = isSine ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    panner.pan.setValueAtTime((Math.random() * 2 - 1) * panRange, ctx.currentTime);
    
    // Incremento de volúmenes base (+4dB aprox factor 1.58)
    const baseVolume = isSine ? 0.013 : 0.008; 
    const volume = baseVolume + (PSI * 0.011); 
    
    oscGain.gain.setValueAtTime(0, ctx.currentTime);
    oscGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + releaseTime);
    
    osc.connect(oscGain);
    oscGain.connect(panner);
    panner.connect(filter);
    
    osc.start();
    osc.stop(ctx.currentTime + releaseTime);

    const forceFactor = (1.1 - symbolic.force) * 2000;
    const nextInterval = baseTiming + (Math.random() * forceFactor);
    
    melodyTimerRef.current = window.setTimeout(playResonantNote, nextInterval);
  };

  const toggleAudio = async () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      filter.Q.setValueAtTime(2, ctx.currentTime);
      filter.connect(masterGain);
      filterNodeRef.current = filter;

      const droneFreqs = [55, 110]; 
      droneFreqs.forEach((f) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        const oscGain = ctx.createGain();
        // Aumento de ganancia de drone de 0.008 a 0.013 (+4dB)
        oscGain.gain.setValueAtTime(0.013, ctx.currentTime); 
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
        oscillatorsRef.current.push(osc);
      });
    }

    const ctx = audioCtxRef.current;
    const masterGain = gainNodeRef.current;
    if (!masterGain) return;

    if (!isActive) {
      if (ctx.state === 'suspended') await ctx.resume();
      // Aumento de ganancia maestra de 0.06 a 0.095 (+4dB)
      masterGain.gain.setTargetAtTime(0.095, ctx.currentTime, 2);
      setIsActive(true);
      setTimeout(playResonantNote, 200);
    } else {
      masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
      if (melodyTimerRef.current) {
        clearTimeout(melodyTimerRef.current);
        melodyTimerRef.current = null;
      }
      setIsActive(false);
    }
  };

  useEffect(() => {
    if (!isActive || !audioCtxRef.current || !filterNodeRef.current) return;
    const now = audioCtxRef.current.currentTime;
    const filter = filterNodeRef.current;

    const targetFreq = 180 + (PSI * 1100); 
    const targetQ = 0.5 + (SIGMA * 8); 
    
    filter.frequency.setTargetAtTime(targetFreq, now, 1.5);
    filter.Q.setTargetAtTime(targetQ, now, 1.5);
  }, [PSI, SIGMA, isActive]);

  useEffect(() => {
    return () => {
      if (melodyTimerRef.current) clearTimeout(melodyTimerRef.current);
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
      >
        <div className="relative">
          <i className={`fa-solid ${isActive ? 'fa-dna animate-pulse' : 'fa-podcast'} text-xs`}></i>
          {isActive && (
            <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20"></span>
          )}
        </div>
        {isActive ? t.coherentResonance : t.listenCore}
      </button>
      <div className="h-4 flex flex-col items-center justify-center">
        {isActive && (
          <div className="flex gap-1.5 h-1 items-end">
             {[...Array(5)].map((_, i) => (
               <div 
                 key={i} 
                 className="w-1 bg-indigo-500/40 rounded-full animate-bounce"
                 style={{ 
                   height: `${8 + (PSI * 12) * Math.random()}px`,
                   animationDelay: `${i * 0.15}s`,
                   animationDuration: `${1 + (1 - SIGMA)}s`
                 }}
               ></div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbientSound;
