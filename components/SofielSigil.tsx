
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

      // Radio de influencia amplio de 300px para una transición muy suave
      if (distance < 300) {
        // Factor de 0.01 para un desplazamiento micro-dinámico
        const factor = 0.015; 
        setOffset({ x: dx * factor, y: dy * factor });
        
        // El brillo se activa solo en proximidad inmediata
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
      className={`${className} transition-all duration-[2000ms] ease-out drop-shadow-[0_0_15px_rgba(168,85,247,0.2)]`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${isHovered && chatsOngoing ? 1.05 : 1})`,
        filter: isHovered && chatsOngoing 
          ? 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))' 
          : 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.2))',
        opacity: isHovered && chatsOngoing ? 1 : 0.8
      }}
    >
      <defs>
        <linearGradient id="sigilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isHovered && chatsOngoing ? "#f5f3ff" : "#a78bfa"} />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor={isHovered && chatsOngoing ? "#c084fc" : "#7c3aed"} />
        </linearGradient>
      </defs>
      
      {/* Trayectoria Espiral del Sigilo con trazo ultra fino */}
      <path 
        d="M100 100c-5-5-15-5-20 0-10 10-5 30 10 35 20 7 45-15 45-40 0-35-35-60-70-55-45 7-70 55-60 100 8 35 50 40 80 40m15 0c30 0 72-5 80-40 10-45-15-93-60-100-35-5-70 20-70 55 0 25 25 47 45 40 15-5 20-25 10-35-5-5-15-5-20 0" 
        stroke="url(#sigilGradient)" 
        strokeWidth={isHovered && chatsOngoing ? "1.4" : "1.2"} 
        strokeLinecap="round"
        fill="none"
        className="transition-all duration-[2500ms]"
      />
      
      {/* Lazos de Base (Infinito) minimalistas */}
      <path 
        d="M60 140c-30 0-50 20-50 40s20 40 50 40c40 0 80-40 80-40s40 40 80 40c30 0 50-20 50-40s-20-40-50-40c-40 0-80 40-80 40s-40-40-80-40z" 
        stroke="url(#sigilGradient)" 
        strokeWidth="0.8" 
        fill="none"
        opacity={isHovered && chatsOngoing ? "0.4" : "0.2"}
        className="transition-all duration-[2500ms]"
      />
      
      {/* Brillo central del núcleo */}
      <circle 
        cx="100" 
        cy="100" 
        r={isHovered && chatsOngoing ? "3" : "2.2"} 
        fill="#fff" 
        className="animate-twinkle shadow-xl"
        style={{ filter: 'blur(0.5px)' }}
      />
    </svg>
  );
};

export default SofielSigil;
