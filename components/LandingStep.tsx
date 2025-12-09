import React from 'react';
import { Button } from './Button';

interface LandingStepProps {
  onStart: () => void;
}

const ArrowDown = () => (
  <svg className="w-5 h-5 animate-bounce text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const IconScan = () => (
  <svg className="w-8 h-8 text-white mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const IconAnalysis = () => (
  <svg className="w-8 h-8 text-white mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const IconReport = () => (
  <svg className="w-8 h-8 text-white mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export const LandingStep: React.FC<LandingStepProps> = ({ onStart }) => {
  return (
    <div className="w-full bg-black text-white font-sans selection:bg-white selection:text-black">
      
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-4 md:px-6 pt-20">
        <div className="z-10 flex flex-col items-center max-w-5xl mx-auto">
          
          <h1 className="text-6xl md:text-9xl font-bold tracking-tighter leading-[0.85] mb-8 text-white">
            BRAND<br/>
            <span className="text-zinc-600">SCORE</span>
          </h1>

          <p className="max-w-xl text-lg md:text-xl text-zinc-400 font-light leading-relaxed mb-12">
            Stop guessing. We analyze your website and strategy to find out exactly what's holding your business back.
          </p>

          <div className="w-full max-w-xs mb-16">
            <Button onClick={onStart} fullWidth className="h-16 text-lg hover:bg-zinc-200 transition-colors">
              Start Audit Now
            </Button>
            <p className="mt-4 text-[10px] text-zinc-600 uppercase tracking-widest">
              Takes approx 2 minutes
            </p>
          </div>
        </div>

        <div className="absolute bottom-10 animate-bounce">
          <ArrowDown />
        </div>
      </section>


      {/* --- THE PROBLEM / WHY --- */}
      <section className="relative z-10 py-24 md:py-32 px-6 border-t border-zinc-900 bg-black">
        <div className="max-w-4xl mx-auto text-center md:text-left">
           <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-8 leading-tight">
             GUESSWORK IS <br/>
             <span className="text-zinc-600">COSTING YOU MONEY.</span>
           </h2>
           <div className="grid md:grid-cols-2 gap-12 text-lg text-zinc-400 font-light leading-relaxed">
             <p>
               Looking good isn't enough. Your website needs to work, your ads need to convert, and your strategy needs to be solid to actually grow.
             </p>
             <p>
               We built a tool that checks your business across 6 key areas to show you exactly where you can improve and how to fix it.
             </p>
           </div>
        </div>
      </section>


      {/* --- METHODOLOGY --- */}
      <section className="relative z-10 py-24 px-6 border-t border-zinc-900 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">The Methodology</h2>
                <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Two-Step Analysis</h3>
              </div>
              <Button onClick={onStart} variant="outline" className="px-8">
                Start Audit Now
              </Button>
           </div>

           <div className="grid md:grid-cols-2 gap-8">
              {/* Card 1 */}
              <div className="p-8 border border-zinc-800 bg-black hover:border-zinc-600 transition-colors duration-500 group">
                 <div className="text-6xl font-thin text-zinc-800 mb-6 group-hover:text-white transition-colors">01</div>
                 <h4 className="text-xl font-bold text-white uppercase tracking-wide mb-4">Technical Check</h4>
                 <p className="text-zinc-400 leading-relaxed">
                   We automatically scan your website to see how fast it loads, if it works well on mobile, and if it's built correctly for Google.
                 </p>
              </div>

              {/* Card 2 */}
              <div className="p-8 border border-zinc-800 bg-black hover:border-zinc-600 transition-colors duration-500 group">
                 <div className="text-6xl font-thin text-zinc-800 mb-6 group-hover:text-white transition-colors">02</div>
                 <h4 className="text-xl font-bold text-white uppercase tracking-wide mb-4">Strategy Check</h4>
                 <p className="text-zinc-400 leading-relaxed">
                   We ask you a few simple questions about your marketing and sales to see if your internal systems are actually set up for growth.
                 </p>
              </div>
           </div>
        </div>
      </section>


      {/* --- HOW IT WORKS --- */}
      <section className="relative z-10 py-24 px-6 border-t border-zinc-900 bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 border border-zinc-800 rounded-full flex items-center justify-center mb-6 bg-zinc-900">
                <IconScan />
              </div>
              <h4 className="text-lg font-bold text-white uppercase tracking-widest mb-3">Scan</h4>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Enter your website URL. We instantly check if your site is fast and healthy.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 border border-zinc-800 rounded-full flex items-center justify-center mb-6 bg-zinc-900">
                <IconAnalysis />
              </div>
              <h4 className="text-lg font-bold text-white uppercase tracking-widest mb-3">Quiz</h4>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Answer a few yes/no questions about how you run your marketing.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 border border-zinc-800 rounded-full flex items-center justify-center mb-6 bg-zinc-900">
                <IconReport />
              </div>
              <h4 className="text-lg font-bold text-white uppercase tracking-widest mb-3">Results</h4>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Get your Brand Score and a simple list of things to fix right away.
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* --- FINAL CTA --- */}
      <section className="relative z-10 py-32 px-6 border-t border-zinc-900 flex flex-col items-center text-center bg-zinc-950">
         <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 text-white">
            GET YOUR<br/>BRAND SCORE
         </h2>
         <p className="text-zinc-400 max-w-lg mb-12 text-lg font-light">
            The audit is free. The insights are powerful. <br/>
            See how you stack up.
         </p>
         <div className="w-full max-w-sm">
            <Button onClick={onStart} fullWidth className="h-16 text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)]">
               Start Audit Now
            </Button>
         </div>
      </section>

    </div>
  );
};