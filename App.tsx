import React, { useState } from 'react';
import { AppStep, BrandInfo, UserResponse, AuditResult, LeadInfo } from './types';
import { InputStep } from './components/InputStep';
import { QuizStep } from './components/QuizStep';
import { LoadingStep } from './components/LoadingStep';
import { LeadFormStep } from './components/LeadFormStep';
import { DashboardStep } from './components/DashboardStep';
import { performBrandAudit } from './services/geminiService';
import { submitLead } from './services/crmService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [brandData, setBrandData] = useState<BrandInfo | null>(null);
  const [quizResponses, setQuizResponses] = useState<UserResponse[]>([]);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  const handleInputComplete = (info: BrandInfo) => {
    setBrandData(info);
    setStep(AppStep.QUIZ);
  };

  const handleQuizComplete = async (responses: UserResponse[]) => {
    setQuizResponses(responses);
    setStep(AppStep.ANALYZING);

    if (!brandData) {
      // Safety check: if brandData is lost, restart to prevent getting stuck
      console.error("Critical: Brand data missing");
      setStep(AppStep.INPUT);
      return;
    }

    try {
      // Trigger AI Analysis with safety fallback
      const result = await performBrandAudit(brandData, responses);
      setAuditResult(result);
      // Automatically advance to Lead Form when analysis completes
      setStep(AppStep.LEAD_FORM);
    } catch (e) {
      console.error("Audit process failed completely", e);
      // Even if performBrandAudit throws (it shouldn't), we recover
      setStep(AppStep.INPUT);
    }
  };

  const handleLeadFormComplete = async (info: LeadInfo) => {
    setLeadInfo(info);
    
    // Background Submission to CRM / Database
    if (brandData && auditResult) {
      // Pass quizResponses to the submission service
      submitLead(info, brandData, auditResult, quizResponses).catch(err => console.error("Background submission failed", err));
    }

    setStep(AppStep.DASHBOARD);
  };

  const handleRestart = () => {
    setBrandData(null);
    setQuizResponses([]);
    setLeadInfo(null);
    setAuditResult(null);
    setStep(AppStep.INPUT);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-white selection:text-black">
      {/* Navigation / Logo Area */}
      <nav className="fixed top-6 left-6 md:left-12 z-50 mix-blend-difference">
        <a href="#" onClick={(e) => {e.preventDefault(); handleRestart();}} className="block">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white"></div>
            <span className="font-bold tracking-tight text-white uppercase text-sm hidden md:block">
              Zouhall
            </span>
          </div>
        </a>
      </nav>

      <main className="pt-16 md:pt-12 mx-auto max-w-7xl">
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