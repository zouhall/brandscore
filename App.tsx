import React, { useState, useEffect } from 'react';
import { AppStep, BrandInfo, UserResponse, AuditResult, LeadInfo } from './types';
import { LandingStep } from './components/LandingStep';
import { InputStep } from './components/InputStep';
import { QuizStep } from './components/QuizStep';
import { LoadingStep } from './components/LoadingStep';
import { LeadFormStep } from './components/LeadFormStep';
import { DashboardStep } from './components/DashboardStep';
import { performBrandAudit } from './services/geminiService';
import { saveToSupabase, getAuditById } from './services/supabaseService';
import { generateMagicLink } from './services/utils';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.LANDING);
  const [brandData, setBrandData] = useState<BrandInfo | null>(null);
  const [quizResponses, setQuizResponses] = useState<UserResponse[]>([]);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  // Check for ID-based Link (Supabase) OR Legacy Magic Link on Mount
  useEffect(() => {
    const fetchReport = async () => {
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('id'); // New Short URL format
      const legacyData = params.get('r'); // Old Base64 format

      if (reportId) {
        setStep(AppStep.ANALYZING);
        setLoadingMessage("Retrieving Secure Report...");
        const data = await getAuditById(reportId);
        if (data) {
          setBrandData(data.brand);
          setAuditResult(data.result);
          setLeadInfo(data.lead);
          setStep(AppStep.DASHBOARD);
        } else {
          // Fallback or error
          setStep(AppStep.LANDING);
        }
      } else if (legacyData) {
        // ... (Legacy handling code) ...
        try {
          const jsonString = decodeURIComponent(escape(atob(legacyData)));
          const parsed = JSON.parse(jsonString);
          if (parsed.brand && parsed.result) {
            setBrandData(parsed.brand);
            setAuditResult(parsed.result);
            setLeadInfo({ 
               firstName: 'Visitor', lastName: '', position: 'Guest', email: '', phone: '', fullName: 'Visitor'
            }); 
            setStep(AppStep.DASHBOARD);
          }
        } catch (e) {
          console.error("Failed to parse legacy link", e);
        }
      }
    };

    fetchReport();
  }, []);

  // --- ANALYSIS EFFECT ---
  useEffect(() => {
    let isMounted = true;

    const runAudit = async () => {
      if (!brandData || !leadInfo) {
        // Prevent running if we just loaded dashboard from ID
        if (step === AppStep.ANALYZING && !auditResult) {
            console.error("Missing data for audit");
            setStep(AppStep.INPUT);
        }
        return;
      }

      // If we already have a result (e.g. from ID load), don't re-run
      if (auditResult) return;

      try {
        console.log("Starting Audit...");
        // 1. Run AI Audit
        const result = await performBrandAudit(brandData, quizResponses);
        
        if (isMounted) {
          setAuditResult(result);
          
          // 2. Save to Supabase (Includes CRM Data Generation)
          console.log("Saving to DB...");
          await saveToSupabase(brandData, leadInfo, result, quizResponses);
          
          // 4. Show Dashboard
          setStep(AppStep.DASHBOARD);
        }
      } catch (e) {
        console.error("Audit workflow failed", e);
        if (isMounted) setStep(AppStep.INPUT);
      }
    };

    if (step === AppStep.ANALYZING && !auditResult) { // Only run if no result yet
      runAudit();
    }

    return () => { isMounted = false; };
  }, [step, brandData, leadInfo, quizResponses, auditResult]);

  // --- HANDLERS ---

  const handleLandingStart = () => {
    setStep(AppStep.INPUT);
  };

  const handleInputComplete = (info: BrandInfo) => {
    setBrandData(info);
    setStep(AppStep.QUIZ);
  };

  const handleQuizComplete = (responses: UserResponse[]) => {
    setQuizResponses(responses);
    setStep(AppStep.LEAD_FORM);
  };

  const handleLeadFormComplete = (info: LeadInfo) => {
    setLeadInfo(info);
    setStep(AppStep.ANALYZING);
  };

  const handleRestart = () => {
    setBrandData(null);
    setQuizResponses([]);
    setLeadInfo(null);
    setAuditResult(null);
    setStep(AppStep.LANDING);
    window.history.pushState(null, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-white selection:text-black">
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
        {step === AppStep.LEAD_FORM && <LeadFormStep onComplete={handleLeadFormComplete} />}
        {step === AppStep.ANALYZING && <LoadingStep customMessage={loadingMessage} />}
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