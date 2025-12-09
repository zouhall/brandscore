import React, { useState } from 'react';
import { Question, UserResponse } from '../types';
import { QUESTIONS } from '../constants';
import { Button } from './Button';

interface QuizStepProps {
  onComplete: (responses: UserResponse[]) => void;
}

export const QuizStep: React.FC<QuizStepProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);

  const currentQuestion: Question = QUESTIONS[currentIndex];

  const handleAnswer = (answer: number) => {
    const newResponses = [
      ...responses,
      { questionId: currentQuestion.id, answer }
    ];

    if (currentIndex < QUESTIONS.length - 1) {
      setResponses(newResponses);
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(newResponses);
    }
  };

  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] flex flex-col justify-center">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 h-1 bg-white transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />

      <div className="space-y-12">
        <div className="space-y-4">
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            Query {currentIndex + 1} / {QUESTIONS.length} — {currentQuestion.category}
          </span>
          <h2 className="text-3xl md:text-4xl font-light leading-tight text-white">
            {currentQuestion.text}
          </h2>
        </div>

        <div className="grid gap-4 pt-8">
          {currentQuestion.type === 'boolean' ? (
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handleAnswer(0)} variant="secondary" className="h-32 text-xl">
                No
              </Button>
              <Button onClick={() => handleAnswer(1)} variant="outline" className="h-32 text-xl hover:bg-white hover:text-black">
                Yes
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between text-xs uppercase tracking-widest text-gray-500">
                <span>Poor</span>
                <span>Exceptional</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <Button 
                    key={val} 
                    onClick={() => handleAnswer(val)} 
                    variant="outline"
                    className="h-24 text-2xl font-light"
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};