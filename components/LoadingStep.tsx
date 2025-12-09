import React, { useEffect, useState } from 'react';

interface LoadingStepProps {
  customMessage?: string | null;
}

const FACTS = [
  "DID YOU KNOW? 79% of marketing leads never convert into sales due to a lack of lead nurturing.",
  "AI INSIGHT: 90% of the world's data was generated in the last two years alone.",
  "FUNNEL FACT: The concept of the 'Purchase Funnel' was developed in 1898 by St. Elmo Lewis.",
  "TECH TRIVIA: The first website is still online. It was published in 1991 by CERN.",
  "SPEED MATTERS: A 1-second delay in page load time yields 11% fewer page views and 7% loss in conversions.",
  "AI INSIGHT: Google's AI algorithms now prioritize 'Helpful Content' over keyword stuffing.",
  "DID YOU KNOW? It takes about 0.05 seconds for users to form an opinion about your website.",
  "GROWTH HACK: Personalized emails deliver 6x higher transaction rates.",
  "TECH TRIVIA: The average person touches their phone 2,617 times a day.",
  "AI INSIGHT: Generative AI is expected to add $4.4 trillion to the global economy annually."
];

export const LoadingStep: React.FC<LoadingStepProps> = ({ customMessage }) => {
  const [text, setText] = useState("Initializing Core Systems");
  const [elapsed, setElapsed] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  
  const phases = [
    "Establishing Secure Connection...",
    "Scanning Digital Footprint...",
    "Analyzing Brand Architecture...",
    "Measuring Market Resonance...",
    "Detecting Perception Gaps...",
    "Synthesizing Strategic Report...",
    "Finalizing Momentum Score..."
  ];

  // Phase Rotation
  useEffect(() => {
    if (customMessage) return;
    let i = 0;
    const interval = setInterval(() => {
      setText(phases[i % phases.length]);
      i++;
    }, 1800);
    return () => clearInterval(interval);
  }, [customMessage]);

  // Timer Logic
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 37); // ~30fps update for visual smoothness without lag
    return () => clearInterval(interval);
  }, []);

  // Fact Rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FACTS.length);
    }, 4500); // Change fact every 4.5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10); // 2 digits
    return `${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto animate-fade-in relative">
      
      {/* 1. Spinner & Timer */}
      <div className="relative mb-12">
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 border border-zinc-800 rounded-full"></div>
          {/* Spinning Arcs */}
          <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
          <div className="absolute inset-4 border-r-2 border-zinc-600 rounded-full animate-spin-slow"></div>
          
          {/* Timer in center */}
          <div className="font-mono text-2xl font-bold tracking-tighter tabular-nums text-white">
            {formatTime(elapsed)}
          </div>
        </div>
      </div>
      
      {/* 2. Status Message */}
      <div className="space-y-2 text-center mb-12">
        <h2 className="text-xl font-bold tracking-[0.2em] text-white animate-pulse">
          {customMessage ? "SECURE LOAD" : "AUDITING SYSTEM"}
        </h2>
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
          {customMessage || text}
        </p>
      </div>

      {/* 3. Trivia Module */}
      {!customMessage && (
        <div className="w-full px-6 max-w-lg">
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-md relative overflow-hidden min-h-[120px] flex items-center justify-center text-center">
            {/* Corner Markers for "Tech" feel */}
            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-zinc-500"></div>
            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-zinc-500"></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-zinc-500"></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-zinc-500"></div>

            <p key={factIndex} className="text-sm text-zinc-300 font-medium leading-relaxed animate-fade-in">
              {FACTS[factIndex]}
            </p>
          </div>
        </div>
      )}

      {/* 4. Warning Footer */}
      {!customMessage && (
        <div className="absolute bottom-0 pt-12 pb-4 text-center">
           <p className="text-red-600 text-[10px] font-bold tracking-[0.2em] uppercase animate-pulse">
             Do not close this window
           </p>
           <p className="text-zinc-700 text-[10px] mt-2 font-mono">
             Forensic analysis in progress...
           </p>
        </div>
      )}
    </div>
  );
};