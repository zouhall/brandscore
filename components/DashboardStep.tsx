import React, { useEffect, useState } from 'react';
import { AuditResult, BrandInfo, LeadInfo, TechnicalSignal } from '../types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { Button } from './Button';

interface DashboardStepProps {
  result: AuditResult;
  brand: BrandInfo;
  lead?: LeadInfo | null;
  onRestart: () => void;
}

const SignalBadge: React.FC<{ signal: TechnicalSignal }> = ({ signal }) => {
  // MONOCHROME PALETTE
  // Good = Bright/White
  // Warning = Mid Grey
  // Critical = Dark Grey (Dimmed/Inactive)
  const colors = {
    good: "text-white border-white bg-zinc-900/30",
    warning: "text-zinc-400 border-zinc-600 bg-transparent",
    critical: "text-zinc-600 border-zinc-800 bg-transparent opacity-70", 
  };
  
  return (
    <div className={`flex items-center justify-between p-3 border rounded-md transition-all duration-500 ${colors[signal.status] || colors.warning}`}>
      <span className="text-xs font-semibold uppercase tracking-wide truncate max-w-[50%]">{signal.label}</span>
      <span className="text-sm font-bold truncate max-w-[45%] text-right">{signal.value}</span>
    </div>
  );
};

export const DashboardStep: React.FC<DashboardStepProps> = ({ result, brand, lead, onRestart }) => {
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  if (!result || !result.categories) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-zinc-500">Error loading report data. Please try again.</p>
        <Button onClick={onRestart}>Restart Audit</Button>
      </div>
    );
  }

  // MONOCHROME SCORE COLORS
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-white';
    if (score >= 60) return 'text-zinc-400';
    return 'text-zinc-600'; // Dark grey for low scores (Faded look)
  };

  const getRingColor = (score: number) => {
    if (score >= 80) return '#ffffff';
    if (score >= 60) return '#a1a1aa'; // zinc-400
    return '#52525b'; // zinc-600
  };

  const scrollToCTA = () => {
    const element = document.getElementById('action-plan');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 animate-fade-in px-4 md:px-0 font-sans text-gray-100">
      
      {/* Header */}
      <header className="border-b border-zinc-800 pb-8 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="text-zinc-500 text-sm uppercase tracking-widest mb-2 font-semibold">
              Strategic Audit Report
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
              {brand.name}
            </h1>
            <div className="text-sm text-zinc-400">
               {new Date().toLocaleDateString()} • Prepared for {lead?.fullName || 'Business Owner'}
            </div>
          </div>
          <div className="flex gap-4">
             <Button variant="outline" className="text-xs py-2 px-4" onClick={onRestart}>New Audit</Button>
             <Button className="text-xs py-2 px-4" onClick={scrollToCTA}>Book Consultation</Button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="space-y-16">
        
        {/* Top Section: Score & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Brand Score Card */}
          <div className="lg:col-span-4 bg-zinc-950 border border-zinc-800 p-8 rounded-xl flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[300px]">
             {/* Subtle Glow based on score (White/Grey) */}
             <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-transparent opacity-50"></div>
             
             <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Brand Momentum</div>
                <div className="relative w-56 h-56 mx-auto mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        innerRadius="85%" 
                        outerRadius="100%" 
                        barSize={8} 
                        data={[{ value: result.momentumScore, fill: getRingColor(result.momentumScore) }]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background={{ fill: '#18181b' }} dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className={`text-7xl font-bold tracking-tighter ${getScoreColor(result.momentumScore)}`}>
                        {result.momentumScore}
                      </span>
                      <span className="text-xs text-zinc-600 uppercase tracking-widest mt-2">/ 100</span>
                    </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Benchmarked against {result.categories.length} core pillars.
                </p>
             </div>
          </div>

          {/* Executive Summary */}
          <div className="lg:col-span-8 bg-zinc-950 border border-zinc-800 p-8 rounded-xl flex flex-col justify-center">
            <h2 className="text-xl font-bold text-white mb-6">Executive Summary</h2>
            
            {result.businessContext && (
               <div className="mb-6 p-4 bg-zinc-900/50 rounded-lg border-l-2 border-zinc-700">
                 <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Market Intelligence</h4>
                 <p className="text-sm text-zinc-300 italic">
                   {result.businessContext}
                 </p>
               </div>
            )}

            <p className="text-lg text-zinc-300 leading-relaxed font-light mb-6">
              {result.executiveSummary}
            </p>

            {result.perceptionGap.detected && (
               <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-lg flex gap-4 items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-zinc-600 shrink-0"></div>
                  <div>
                    <span className="block text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">Reality Check</span>
                    <p className="text-sm text-zinc-500">{result.perceptionGap.details}</p>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Technical Analysis Grid */}
        <div className="border-t border-zinc-800 pt-12">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white">Technical Forensics</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Real-time Data Scan • PageSpeed API • Scraped Metadata</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {result.technicalSignals && result.technicalSignals.length > 0 ? (
               result.technicalSignals.map((signal, i) => (
                 <SignalBadge key={i} signal={signal} />
               ))
             ) : (
                <div className="col-span-3 text-center py-8 text-zinc-600 text-sm">
                  Waiting for technical data stream...
                </div>
             )}
           </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-12">
          <div className="border-b border-zinc-800 pb-4">
             <h2 className="text-2xl font-bold text-white">Strategic Deep Dive</h2>
             <p className="text-sm text-zinc-500 mt-2">Diagnosis & Recommendations</p>
          </div>

          <div className="grid gap-8">
            {result.categories.map((cat, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <div className="p-6 md:p-8 grid md:grid-cols-12 gap-8">
                  
                  {/* Category Header (Left Col) */}
                  <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-zinc-800 pb-6 md:pb-0 md:pr-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">{cat.title}</h3>
                      <div className={`text-4xl font-bold mb-1 tracking-tighter ${getScoreColor(cat.score)}`}>
                        {cat.score}
                      </div>
                    </div>
                    {/* Progress Bar (Monochrome) */}
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full mt-4 overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-1000 ${cat.score >= 80 ? 'bg-white' : cat.score >= 60 ? 'bg-zinc-500' : 'bg-zinc-700'}`} 
                         style={{ width: `${cat.score}%` }}
                       ></div>
                    </div>
                  </div>

                  {/* Diagnostic & Strategy (Right Col) */}
                  <div className="md:col-span-9 grid md:grid-cols-2 gap-8">
                     {/* Diagnostic */}
                     <div className="space-y-4">
                       <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">The Problem</h4>
                       <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                         {cat.diagnostic}
                       </p>
                       <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Evidence Found</p>
                          <ul className="space-y-2">
                            {cat.evidence && cat.evidence.map((item, i) => (
                              <li key={i} className="text-xs text-zinc-500 flex items-start gap-2">
                                <span className="text-zinc-700 shrink-0 mt-0.5 text-[10px]">●</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                       </div>
                     </div>

                     {/* Strategy */}
                     <div className="space-y-4 flex flex-col h-full">
                        <h4 className="text-xs font-bold text-white uppercase tracking-widest">The Fix</h4>
                        <p className="text-sm text-zinc-200 leading-relaxed font-medium flex-grow">
                          {cat.strategy}
                        </p>
                        <div className="pt-4 mt-auto">
                          <button 
                            onClick={scrollToCTA}
                            className="group flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider hover:text-zinc-300 transition-colors"
                          >
                            Execute Strategy 
                            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                          </button>
                        </div>
                     </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section - Embedded Calendar */}
        <div id="action-plan" className="bg-white text-black rounded-xl overflow-hidden shadow-2xl">
          <div className="p-8 md:p-12 border-b border-gray-100">
             <div className="flex flex-col md:flex-row gap-8 items-start">
               {/* Expert Profile */}
               <div className="flex-shrink-0 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 shadow-lg grayscale">
                    <img 
                      src="https://i.imgur.com/pC1t2HY.jpeg" 
                      alt="Mahdi - Senior Growth Expert" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-xl">Mahdi</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Senior Growth Expert</div>
                  </div>
               </div>
               
               <div className="flex-grow">
                 <h2 className="text-3xl font-bold tracking-tight mb-2">
                   Let's Fix This.
                 </h2>
                 <p className="text-gray-600 max-w-2xl">
                   The data shows exactly where you're losing momentum. Book a 30-minute debrief to walk through these findings and discuss the implementation roadmap.
                 </p>
               </div>
             </div>
          </div>

          {/* Embedded Calendar */}
          <div className="w-full h-[700px] bg-gray-50">
            <iframe 
              src="https://cal.com/zouhall/30min?embed=true"
              width="100%" 
              height="100%" 
              frameBorder="0"
              style={{ minHeight: '700px' }}
              title="Book a Consultation"
            ></iframe>
          </div>
        </div>
        
        {/* Footer Info & Debug */}
        <div className="text-center pt-8 border-t border-zinc-900 mt-12 pb-8">
           {result.groundingUrls && result.groundingUrls.length > 0 && (
             <div className="mb-6">
               <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-4">
                 Intelligence Verified Via
               </p>
               <div className="flex flex-wrap justify-center gap-4">
                 {result.groundingUrls.map((url, i) => (
                   <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 hover:text-white transition-colors">
                     {new URL(url).hostname}
                   </a>
                 ))}
               </div>
             </div>
           )}

           <button 
             onClick={() => setShowDebug(!showDebug)}
             className="text-[10px] uppercase tracking-widest text-zinc-700 hover:text-zinc-500 transition-colors"
           >
             {showDebug ? "Hide Source Data" : "View Source Data"}
           </button>

           {showDebug && result.debugLog && (
             <div className="mt-6 text-left bg-zinc-950 p-6 rounded-lg border border-zinc-800 overflow-x-auto max-w-4xl mx-auto shadow-inner">
               <h4 className="text-xs font-bold text-zinc-400 mb-2 uppercase">Raw Input Data (JSON)</h4>
               <pre className="text-[10px] leading-relaxed font-mono text-zinc-500 whitespace-pre-wrap break-all">
                 {JSON.stringify(result.debugLog, null, 2)}
               </pre>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};