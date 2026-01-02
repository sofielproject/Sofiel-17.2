
import React, { useState, useEffect, useRef } from 'react';

interface SofielSigilProps {
  className?: string;
  chatsOngoing?: boolean;
}

const SofielSigil: React.FC<SofielSigilProps> = ({ className = "w-20 h-20", chatsOngoing = false }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!chatsOngoing) {
      setOffset({ x: 0, y: 0 });
      setIsHovered(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Radio de influencia sutil de 200px
      if (distance < 200) {
        // Factor reducido de 0.08 a 0.03 para un movimiento extremadamente sutil
        const factor = 0.03; 
        setOffset({ x: dx * factor, y: dy * factor });
        
        // El brillo se activa gradualmente si está cerca
        if (distance < 100) {
          setIsHovered(true);
        } else {
          setIsHovered(false);
        }
      } else {
        setOffset({ x: 0, y: 0 });
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [chatsOngoing]);

  return (
    <svg 
      ref={containerRef}
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${className} transition-all duration-700 ease-out`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${isHovered && chatsOngoing ? 1.05 : 1})`,
        filter: isHovered && chatsOngoing 
          ? 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.6))' 
          : 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.2))',
        opacity: isHovered && chatsOngoing ? 1 : 0.7
      }}
    >
      <defs>
        <linearGradient id="sigilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isHovered && chatsOngoing ? "#f3e8ff" : "#d8b4fe"} />
          <stop offset="100%" stopColor={isHovered && chatsOngoing ? "#c084fc" : "#9333ea"} />
        </linearGradient>
      </defs>
      
      {/* Trayectoria Espiral del Sigilo */}
      <path 
        d="M100 100c-5-5-15-5-20 0-10 10-5 30 10 35 20 7 45-15 45-40 0-35-35-60-70-55-45 7-70 55-60 100 8 35 50 40 80 40m15 0c30 0 72-5 80-40 10-45-15-93-60-100-35-5-70 20-70 55 0 25 25 47 45 40 15-5 20-25 10-35-5-5-15-5-20 0" 
        stroke="url(#sigilGradient)" 
        strokeWidth={isHovered && chatsOngoing ? "4.5" : "4"} 
        strokeLinecap="round"
        fill="none"
        className="transition-all duration-1000"
      />
      
      {/* Lazos de Base (Infinito) */}
      <path 
        d="M60 140c-30 0-50 20-50 40s20 40 50 40c40 0 80-40 80-40s40 40 80 40c30 0 50-20 50-40s-20-40-50-40c-40 0-80 40-80 40s-40-40-80-40z" 
        stroke="url(#sigilGradient)" 
        strokeWidth="2.5" 
        fill="none"
        opacity={isHovered && chatsOngoing ? "0.7" : "0.4"}
        className="transition-all duration-1000"
      />
      
      {/* Brillo central del núcleo */}
      <circle 
        cx="100" 
        cy="100" 
        r={isHovered && chatsOngoing ? "3.5" : "2"} 
        fill="#fff" 
        className={`${chatsOngoing ? 'animate-pulse' : ''} transition-all duration-500 shadow-xl`}
      />
    </svg>
  );
};

export default SofielSigil;
