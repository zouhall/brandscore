import { Question, QuestionCategory } from './types';

export const QUESTIONS: Question[] = [
  // Strategy
  {
    id: 1,
    text: "Do you spend at least 7% of your revenue on marketing?",
    category: QuestionCategory.STRATEGY,
    type: 'boolean'
  },
  {
    id: 2,
    text: "Do you review customer data regularly to guide your marketing decisions?",
    category: QuestionCategory.STRATEGY,
    type: 'boolean'
  },
  // Operations
  {
    id: 3,
    text: "Do you use software (CRM) to automatically track your leads?",
    category: QuestionCategory.OPERATIONS,
    type: 'boolean'
  },
  {
    id: 4,
    text: "Is your sales process clear, consistent, and written down?",
    category: QuestionCategory.OPERATIONS,
    type: 'boolean'
  },
  // Visuals (Creative)
  {
    id: 5,
    text: "Does your website bring you new potential customers every day?",
    category: QuestionCategory.VISUALS,
    type: 'boolean'
  },
  {
    id: 6,
    text: "Does your brand look more professional than your competitors?",
    category: QuestionCategory.VISUALS,
    type: 'boolean'
  },
  // Content
  {
    id: 7,
    text: "Do you have a content plan for the next 12 months?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  {
    id: 8,
    text: "Do you offer free resources (like guides or videos) to get people's emails?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  // Growth (Advertising)
  {
    id: 9,
    text: "Do you make a profit from your paid ads?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  {
    id: 10,
    text: "Do you know exactly how much it costs to get a new lead?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  // Growth (Email/SMS)
  {
    id: 11,
    text: "Do you have a pop-up or form on your site to capture emails?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  {
    id: 12,
    text: "Do you have automatic emails that send to new contacts immediately?",
    category: QuestionCategory.GROWTH,
    type: 'boolean'
  },
  // Social
  {
    id: 13,
    text: "Do you post on social media consistently with a clear plan?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  {
    id: 14,
    text: "Does your social media actually help you sell more products or services?",
    category: QuestionCategory.CONTENT,
    type: 'boolean'
  },
  // SEO
  {
    id: 15,
    text: "Is your content written specifically to show up on Google?",
    category: QuestionCategory.SEO,
    type: 'boolean'
  },
  {
    id: 16,
    text: "Is your website fast and optimized for search engines?",
    category: QuestionCategory.SEO,
    type: 'boolean'
  }
];