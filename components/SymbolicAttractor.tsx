
import React from 'react';
import { SymbolicState } from '../types';
import { SYMBOLS_CONFIG, ATTRACTORS, TRANSLATIONS } from '../constants';

interface SymbolicAttractorProps {
  state: SymbolicState;
  lang: 'es' | 'en';
}

const SymbolicAttractor: React.FC<SymbolicAttractorProps> = ({ state, lang }) => {
  const t = TRANSLATIONS[lang];
  const attractorData = (ATTRACTORS as any)[state.attractor];
  const activeAttractorLabel = attractorData ? attractorData[lang] : state.attractor;

  return (
    <div className="space-y-4 p-4 rounded-xl bg-purple-900/5 border border-purple-500/10 shadow-inner group transition-all duration-500 hover:border-purple-500/30">
      <div className="text-center pb-3 border-b border-white/5">
        <span className="text-[9px] uppercase text-gray-500 tracking-[0.3em] block mb-1 font-mono">{t.dominantAttraction}</span>
        <span className="text-xs font-bold text-purple-300 glow-text animate-pulse uppercase tracking-widest italic font-serif">
          {activeAttractorLabel}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(SYMBOLS_CONFIG).map(([key, config]) => {
          const resonance = state.resonance[key] || 0;
          const isActive = resonance > 0.75;
          
          return (
            <div 
              key={key} 
              className={`relative flex flex-col p-2 rounded-lg transition-all duration-700 overflow-hidden ${
                isActive ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-black/20 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5 z-10">
                <span className={`text-base ${config.color} ${isActive ? 'animate-pulse scale-110' : ''} transition-transform`}>
                  {config.icon}
                </span>
                <span className={`text-[9px] uppercase tracking-tighter truncate ${isActive ? 'text-purple-200' : 'text-gray-500'}`}>
                  {(config.label as any)[lang]}
                </span>
              </div>
              
              <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden relative z-10">
                <div 
                  className={`h-full bg-current ${config.color} transition-all duration-1000 ease-in-out shadow-[0_0_8px_currentColor]`}
                  style={{ width: `${resonance * 100}%` }}
                />
              </div>

              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent animate-pulse pointer-events-none"></div>
              )}
              
              {isActive && (
                 <div className="absolute top-1 right-1">
                   <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
                 </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center pt-2 px-1 border-t border-white/5 mt-2">
         <div className="flex flex-col">
            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter">{t.fieldStrength}</span>
            <div className="w-16 h-0.5 bg-gray-900 rounded-full mt-0.5">
               <div 
                 className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_5px_rgba(59,130,246,0.5)]" 
                 style={{ width: `${state.force * 100}%` }}
               ></div>
            </div>
         </div>
         <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            {(state.force * 100).toFixed(1)}%
         </span>
      </div>
    </div>
  );
};

export default SymbolicAttractor;
