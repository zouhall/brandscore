import React, { useState, useEffect } from 'react';
import { AppStep, BrandInfo, UserResponse, AuditResult, LeadInfo } from './types';
import { LandingStep } from './components/LandingStep';
import { InputStep } from './components/InputStep';
import { QuizStep } from './components/QuizStep';
import { LoadingStep } from './components/LoadingStep';
import { LeadFormStep } from './components/LeadFormStep';
import { DashboardStep } from './components/DashboardStep';
import { performBrandAudit } from './services/geminiService';
import { submitLead } from './services/crmService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.LANDING);
  const [brandData, setBrandData] = useState<BrandInfo | null>(null);
  const [quizResponses, setQuizResponses] = useState<UserResponse[]>([]);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  // Check for Magic Link on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportData = params.get('r');

    if (reportData) {
      try {
        const jsonString = decodeURIComponent(escape(atob(reportData)));
        const parsed = JSON.parse(jsonString);
        
        if (parsed.brand && parsed.result) {
          setBrandData(parsed.brand);
          setAuditResult(parsed.result);
          // Pre-fill dummy lead info if accessing via link, or leave null
          setLeadInfo({ fullName: 'Visitor', email: '', phone: '' }); 
          setStep(AppStep.DASHBOARD);
        }
      } catch (e) {
        console.error("Failed to parse report link", e);
        // Remove invalid param from URL cleanly
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleLandingStart = () => {
    setStep(AppStep.INPUT);
  };

  const handleInputComplete = (info: BrandInfo) => {
    setBrandData(info);
    setStep(AppStep.QUIZ);
  };

  const handleQuizComplete = async (responses: UserResponse[]) => {
    setQuizResponses(responses);
    setStep(AppStep.ANALYZING);

    if (!brandData) {
      console.error("Critical: Brand data missing");
      setStep(AppStep.INPUT);
      return;
    }

    try {
      const result = await performBrandAudit(brandData, responses);
      setAuditResult(result);
      setStep(AppStep.LEAD_FORM);
    } catch (e) {
      console.error("Audit process failed completely", e);
      setStep(AppStep.INPUT);
    }
  };

  const handleLeadFormComplete = async (info: LeadInfo) => {
    setLeadInfo(info);
    
    if (brandData && auditResult) {
      submitLead(info, brandData, auditResult, quizResponses).catch(err => console.error("Background submission failed", err));
    }

    setStep(AppStep.DASHBOARD);
  };

  const handleRestart = () => {
    setBrandData(null);
    setQuizResponses([]);
    setLeadInfo(null);
    setAuditResult(null);
    setStep(AppStep.LANDING);
    // Clean URL if we were on a magic link
    window.history.pushState(null, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-white selection:text-black">
      {/* Navigation / Logo Area */}
      <nav className="fixed top-6 left-6 md:left-12 z-50 mix-blend-difference no-print">
        <a href="#" onClick={(e) => {e.preventDefault(); handleRestart();}} className="block">
          <div className="flex items-center">
            <img 
              src="https://i.imgur.com/B4r2q3r.png" 
              alt="Zouhall" 
              className="h-8 w-auto object-contain"
            />
          </div>
        </a>
      </nav>

      <main className="pt-16 md:pt-12 mx-auto max-w-7xl">
        {step === AppStep.LANDING && <LandingStep onStart={handleLandingStart} />}
        {step === AppStep.INPUT && <InputStep onNext={handleInputComplete} />}
        {step === AppStep.QUIZ && <QuizStep onComplete={handleQuizComplete} />}
        {step === AppStep.ANALYZING && <LoadingStep />}
        {step === AppStep.LEAD_FORM && <LeadFormStep onComplete={handleLeadFormComplete} />}
        {step === AppStep.DASHBOARD && auditResult && brandData && (
          <DashboardStep 
            result={auditResult} 
            brand={brandData}
            lead={leadInfo}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
};

export default App;