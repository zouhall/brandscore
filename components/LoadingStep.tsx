import React, { useEffect, useState } from 'react';

export const LoadingStep: React.FC = () => {
  const [text, setText] = useState("Initializing Core Systems");
  
  const phases = [
    "Establishing Secure Connection...",
    "Scanning Digital Footprint...",
    "Analyzing Brand Architecture...",
    "Measuring Market Resonance...",
    "Detecting Perception Gaps...",
    "Synthesizing Strategic Report...",
    "Finalizing Momentum Score..."
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(phases[i % phases.length]);
      i++;
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-8 animate-fade-in">
      <div className="relative w-24 h-24">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-2 border-zinc-800 rounded-full"></div>
        {/* Spinning Arcs */}
        <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-r-2 border-zinc-500 rounded-full animate-spin-slow"></div>
      </div>
      
      <div className="space-y-3 text-center">
        <h2 className="text-xl font-bold tracking-[0.2em] text-white animate-pulse">
          AUDITING
        </h2>
        <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">
          {text}
        </p>
      </div>
    </div>
  );
};