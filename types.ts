export enum QuestionCategory {
  STRATEGY = 'Strategy',
  VISUALS = 'Visuals',
  GROWTH = 'Growth',
  CONTENT = 'Content',
  OPERATIONS = 'Operations',
  SEO = 'SEO'
}

export interface Question {
  id: number;
  text: string;
  category: QuestionCategory;
  type: 'boolean' | 'scale'; // Yes/No or 1-5
}

export interface UserResponse {
  questionId: number;
  answer: number; // 0 for No, 1 for Yes, or 1-5 for scale
}

export interface BrandInfo {
  name: string;
  url: string;
}

export interface LeadInfo {
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  revenue: string;      // New Field
  companySize: string;  // New Field
  fullName?: string; // Derived for backward compatibility if needed
}

export interface TechnicalSignal {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
}

export interface CategoryAnalysis {
  title: string;
  score: number; // 0-100
  diagnostic: string; // The "What is wrong" (Technical)
  evidence: string[]; // Bullet points of "proof" (e.g. "Missing Pixel", "Low text-to-html ratio")
  strategy: string; // The "How to fix" (Strategic)
}

export interface AuditResult {
  momentumScore: number;
  businessContext: string; // New field: "We identified [Brand] as a [Type] business..."
  executiveSummary: string;
  technicalSignals: TechnicalSignal[];
  categories: CategoryAnalysis[];
  perceptionGap: {
    detected: boolean;
    verdict: string;
    details: string;
  };
  groundingUrls?: string[];
  debugLog?: {
    psiData: any;
    formattedUserAnswers: string;
    generatedAt: string;
  };
}

export enum AppStep {
  LANDING = 'LANDING',
  INPUT = 'INPUT',
  QUIZ = 'QUIZ',
  ANALYZING = 'ANALYZING',
  LEAD_FORM = 'LEAD_FORM',
  DASHBOARD = 'DASHBOARD',
}