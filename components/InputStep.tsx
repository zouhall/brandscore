import React, { useState } from 'react';
import { BrandInfo } from '../types';
import { Button } from './Button';

interface InputStepProps {
  onNext: (info: BrandInfo) => void;
}

export const InputStep: React.FC<InputStepProps> = ({ onNext }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && url) {
      onNext({ name, url });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-full max-w-md space-y-12">
        <div className="space-y-2 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
            BRAND SCORE
          </h1>
          <p className="text-gray-500 tracking-wide uppercase text-xs font-semibold">
            The Zouhall Intelligence Engine
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="group relative">
              <label htmlFor="brand" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Brand Name
              </label>
              <input
                id="brand"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ACME CORP"
                className="w-full bg-transparent border-b border-gray-800 py-4 text-xl md:text-2xl text-white placeholder-gray-800 focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>
            
            <div className="group relative">
              <label htmlFor="url" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                Website URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://acme.com"
                className="w-full bg-transparent border-b border-gray-800 py-4 text-xl md:text-2xl text-white placeholder-gray-800 focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>
          </div>

          <div className="pt-8">
            <Button type="submit" fullWidth disabled={!name || !url}>
              Begin Audit
            </Button>
            <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-gray-600">
              Analysis takes approx 2 minutes
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};