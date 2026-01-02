
import React from 'react';

interface TraitBarProps {
  label: string;
  value: number;
}

const TraitBar: React.FC<TraitBarProps> = ({ label, value }) => {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="uppercase tracking-wider text-gray-400">{label}</span>
        <span className="text-purple-400 font-mono">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-600 to-blue-400 transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default TraitBar;
