
import React from 'react';
import { SymbolicState } from '../types';
import { SYMBOLS_CONFIG } from '../constants';

interface SymbolGridProps {
  state: SymbolicState;
  // Added lang prop to support localized labels and fix ReactNode error
  lang: 'es' | 'en';
}

const SymbolGrid: React.FC<SymbolGridProps> = ({ state, lang }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Object.entries(SYMBOLS_CONFIG).map(([key, config]) => {
        const resonance = state.resonance[key] || 0;
        return (
          <div key={key} className="flex flex-col items-center p-2 rounded-lg bg-black/30 border border-white/5">
            <span className={`text-xl mb-1 ${config.color}`}>{config.icon}</span>
            {/* Fix: Access the localized string label instead of the entire label object */}
            <span className="text-[10px] uppercase text-gray-500 mb-1">{(config.label as any)[lang]}</span>
            <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-current ${config.color} transition-all duration-700`}
                style={{ width: `${resonance * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SymbolGrid;
