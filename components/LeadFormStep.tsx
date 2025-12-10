
import React, { useState } from 'react';
import { LeadInfo } from '../types';
import { Button } from './Button';

interface LeadFormStepProps {
  onComplete: (info: LeadInfo) => void;
}

const POSITIONS = [
  "Owner / Founder",
  "CEO / President",
  "CMO / Marketing Director",
  "Product Manager",
  "Sales Director",
  "Other"
];

const REVENUE_RANGES = [
  "Pre-Revenue",
  "$0 - $100k",
  "$100k - $500k",
  "$500k - $1M",
  "$1M - $5M",
  "$5M - $10M",
  "$10M+"
];

const COMPANY_SIZES = [
  "1-5 Employees",
  "6-20 Employees",
  "21-50 Employees",
  "51-200 Employees",
  "200+ Employees"
];

export const LeadFormStep: React.FC<LeadFormStepProps> = ({ onComplete }) => {
  const [formStep, setFormStep] = useState<1 | 2>(1);
  
  // Step 1 Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  
  // Step 2 Fields
  const [revenue, setRevenue] = useState('');
  const [companySize, setCompanySize] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName && lastName && email && phone && position) {
      setFormStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revenue && companySize) {
      setIsSubmitting(true);
      onComplete({ 
        firstName, 
        lastName, 
        position, 
        revenue,
        companySize,
        email, 
        phone,
        fullName: `${firstName} ${lastName}` 
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in px-4 py-8">
      <div className="w-full max-w-lg space-y-8">
        
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div className="inline-block px-3 py-1 border border-white text-white bg-zinc-900 text-[10px] tracking-widest uppercase mb-4">
            Analysis Ready
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
            {formStep === 1 ? "Who are you?" : "About the Business"}
          </h2>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
            {formStep === 1 
              ? "We need to know who to address the forensic report to." 
              : "This helps us benchmark your score against similar sized companies."}
          </p>
        </div>

        {/* --- STEP 1: CONTACT INFO --- */}
        {formStep === 1 && (
          <form onSubmit={handleNext} className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 gap-6">
              <div className="group relative">
                <label htmlFor="firstName" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full bg-transparent border-b border-gray-800 py-3 text-lg text-white placeholder-zinc-800 focus:outline-none focus:border-white transition-colors"
                  required
                />
              </div>
              <div className="group relative">
                <label htmlFor="lastName" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-transparent border-b border-gray-800 py-3 text-lg text-white placeholder-zinc-800 focus:outline-none focus:border-white transition-colors"
                  required
                />
              </div>
            </div>

            <div className="group relative">
              <label htmlFor="position" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Position
              </label>
              <div className="relative">
                <select
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-black border-b border-gray-800 py-3 text-lg text-white appearance-none focus:outline-none focus:border-white transition-colors cursor-pointer"
                  required
                >
                  <option value="" disabled className="text-zinc-700">Select your role</option>
                  {POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
                <div className="absolute right-0 top-4 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            <div className="group relative">
              <label htmlFor="email" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full bg-transparent border-b border-gray-800 py-3 text-lg text-white placeholder-zinc-800 focus:outline-none focus:border-white transition-colors"
                required
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
                className="w-full bg-transparent border-b border-gray-800 py-3 text-lg text-white placeholder-zinc-800 focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>

            <div className="pt-4">
              <Button type="submit" fullWidth disabled={!firstName || !lastName || !position || !email || !phone}>
                Next Step &rarr;
              </Button>
            </div>
          </form>
        )}

        {/* --- STEP 2: COMPANY INFO --- */}
        {formStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 gap-8">
                <div className="group relative">
                    <label htmlFor="revenue" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Annual Revenue
                    </label>
                    <div className="relative">
                    <select
                        id="revenue"
                        value={revenue}
                        onChange={(e) => setRevenue(e.target.value)}
                        className="w-full bg-black border-b border-gray-800 py-3 text-lg text-white appearance-none focus:outline-none focus:border-white transition-colors cursor-pointer"
                        required
                        disabled={isSubmitting}
                    >
                        <option value="" disabled className="text-zinc-700">Select Revenue</option>
                        {REVENUE_RANGES.map(range => (
                        <option key={range} value={range}>{range}</option>
                        ))}
                    </select>
                    <div className="absolute right-0 top-4 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    </div>
                    </div>
                </div>

                <div className="group relative">
                    <label htmlFor="companySize" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Company Size
                    </label>
                    <div className="relative">
                    <select
                        id="companySize"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full bg-black border-b border-gray-800 py-3 text-lg text-white appearance-none focus:outline-none focus:border-white transition-colors cursor-pointer"
                        required
                        disabled={isSubmitting}
                    >
                        <option value="" disabled className="text-zinc-700">Select Size</option>
                        {COMPANY_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                    <div className="absolute right-0 top-4 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    </div>
                    </div>
                </div>
              </div>

              <div className="pt-8">
                <Button type="submit" fullWidth disabled={!revenue || !companySize || isSubmitting}>
                  {isSubmitting ? "Generating Report..." : "Get My Score"}
                </Button>
                <div className="mt-4 flex justify-between items-center text-[10px] text-zinc-600">
                   <button 
                     type="button" 
                     onClick={() => setFormStep(1)} 
                     className="underline hover:text-white"
                     disabled={isSubmitting}
                   >
                     &larr; Back
                   </button>
                   <span>Forensic Audit v1.0</span>
                </div>
              </div>
          </form>
        )}
      </div>
    </div>
  );
};
