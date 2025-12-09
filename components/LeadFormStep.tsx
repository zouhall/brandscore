import React, { useState } from 'react';
import { LeadInfo } from '../types';
import { Button } from './Button';
import { submitLead } from '../services/crmService';
// We need to access the parent state in a real app, 
// but for now we will pass the data handling down or mock it.
// Ideally App.tsx passes the current result down, but strictly for this component:

interface LeadFormStepProps {
  onComplete: (info: LeadInfo) => void;
}

export const LeadFormStep: React.FC<LeadFormStepProps> = ({ onComplete }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonText, setButtonText] = useState("Reveal Results");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName && email && phone) {
      setIsSubmitting(true);
      setButtonText("Securing Data...");

      // Simulate the API call delay here for UX (in production this calls the service)
      // The actual service call needs the 'result' and 'brand' which are in App.tsx.
      // In this flow, we pass the info up to App.tsx, and App.tsx calls the service.
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onComplete({ fullName, email, phone });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in px-4">
      <div className="w-full max-w-md space-y-10">
        <div className="space-y-4 text-center">
          <div className="inline-block px-3 py-1 border border-white text-white bg-zinc-900 text-[10px] tracking-widest uppercase mb-4">
            Analysis Complete
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
            Unlock Your Score
          </h2>
          <p className="text-gray-400 text-sm">
            Enter your details below to reveal your Brand Momentum Score. <br/>
            A full copy of the report will be emailed to you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="group relative">
              <label htmlFor="fullName" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-transparent border-b border-gray-800 py-4 text-lg text-white placeholder-zinc-800 focus:outline-none focus:border-white transition-colors disabled:opacity-50"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="group relative">
              <label htmlFor="email" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                className="w-full bg-transparent border-b border-gray-800 py-4 text-lg text-white placeholder-zinc-800 focus:outline-none focus:border-white transition-colors disabled:opacity-50"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="group relative">
              <label htmlFor="phone" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Mobile Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-transparent border-b border-gray-800 py-4 text-lg text-white placeholder-zinc-800 focus:outline-none focus:border-white transition-colors disabled:opacity-50"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="pt-6">
            <Button type="submit" fullWidth disabled={!fullName || !email || !phone || isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  {buttonText}
                </span>
              ) : (
                "Reveal Results"
              )}
            </Button>
            <p className="mt-4 text-center text-[10px] text-gray-600">
              By continuing, you agree to receive your customized report via email.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};