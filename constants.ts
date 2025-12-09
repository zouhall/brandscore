import { Question, QuestionCategory } from './types';

export const QUESTIONS: Question[] = [
  // Strategy
  {
    id: 1,
    text: "Do you allocate a significant portion (7%+) of revenue specifically to marketing growth?",
    category: QuestionCategory.STRATEGY,
    type: 'boolean'
  },
  {
    id: 2,
    text: "Is your marketing strategy guided by regular data reviews and customer behavior analysis?",
    category: QuestionCategory.STRATEGY,
    type: 'boolean'
  },
  // Operations
  {
    id: 3,
    text: "Is your lead management process fully automated with a CRM tracking every touchpoint?",
    category: QuestionCategory.OPERATIONS,
    type: 'boolean'
  },
  {
    id: 4,
    text: "Is your sales pipeline clearly defined, predictable, and free of friction?",
    category: QuestionCategory.OPERATIONS,
    type: 'boolean'
  },
  // Visuals (Creative)
  {
    id: 5,
    text: "Does your website engage visitors and generate a consistent flow of leads on autopilot?",
    category: QuestionCategory.VISUALS,
    type: 'boolean'
  },
  {
    id: 6,
    text: "Does your visual brand identity distinctively stand out as a market leader?",
    category: QuestionCategory.VISUALS,
    type: 'boolean'
  },
  // Content
  {
    id: 7,
    text: "Is your content roadmap clearly mapped out for the next 12 months?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  {
    id: 8,
    text: "Do you deploy high-value assets (videos, guides, tools) that consistently capture leads?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  // Growth (Advertising)
  {
    id: 9,
    text: "Are your paid acquisition channels profitable, scalable, and clearly understood?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  {
    id: 10,
    text: "Do you have real-time visibility into your Cost Per Lead (CPL) across all channels?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  // Growth (Email/SMS)
  {
    id: 11,
    text: "Do you actively utilize 'Lead Magnets' (free value) to capture prospect data?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  {
    id: 12,
    text: "Are your follow-up nurture sequences (Email/SMS) fully automated?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  // Social
  {
    id: 13,
    text: "Is your social media presence active, strategic, and consistent (not just noise)?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  {
    id: 14,
    text: "Does your social output directly support wider business objectives?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  // SEO
  {
    id: 15,
    text: "Is your content strategy specifically engineered to dominate Google Search rankings?",
    category: QuestionCategory.SEO,
    type: 'boolean'
  },
  {
    id: 16,
    text: "Is your website performance (speed, technical SEO) optimized for maximum visibility?",
    category: QuestionCategory.SEO,
    type: 'boolean'
  }
];