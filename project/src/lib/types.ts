export type Difficulty = 'easy' | 'medium' | 'hard';
export type TestStatus = 'draft' | 'published';
export type AttemptStatus = 'in_progress' | 'submitted';

export type QuestionType = 'single' | 'multiple' | 'integer' | 'numerical' | 'true_false' | 'fill_blank';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  isPremium: boolean;
  blocked: boolean;
  coins: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: Date | null;
}

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referredUid: string;
  referredName: string;
  referredEmail: string;
  coinsAwarded: number;
  createdAt: Date | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
}

export interface Test {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  instructions: string;
  language: string;
  difficulty: Difficulty;
  isPaid: boolean;
  status: TestStatus;
  questionCount: number;
  createdAt: Date | null;
}

export interface Question {
  id: string;
  section: string;
  text: string;
  imageUrl: string;
  options: string[];
  questionType: QuestionType;
  correctAnswer: string;
  tolerance: number | null;
  explanation: string;
  topic: string;
  marks: number;
  negativeMarks: number | null;
  order: number;
}

export interface CategoryStat {
  correct: number;
  wrong: number;
  skipped: number;
}

export type AnswerValue = number | string | number[];

export interface Attempt {
  id: string;
  uid: string;
  testId: string;
  testTitle: string;
  totalMarks: number;
  attemptNo: number;
  startedAt: Date | null;
  submittedAt: Date | null;
  status: AttemptStatus;
  answers: Record<string, AnswerValue>;
  markedForReview: string[];
  timeSpent: Record<string, number>;
  score: number | null;
  correctCount: number | null;
  wrongCount: number | null;
  skippedCount: number | null;
  topicStats: Record<string, CategoryStat>;
  sectionStats: Record<string, CategoryStat>;
  wrongQuestionIds: string[];
  violations: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  photoURL: string | null;
  score: number;
  accuracy: number;
  timeTaken: number;
}

export interface Bookmark {
  id: string;
  uid: string;
  testId: string;
  questionId: string;
}

export type CoinTxType = 'referral' | 'daily_bonus' | 'premium_purchase' | 'coupon_redeem';

export interface CoinTransaction {
  id: string;
  uid: string;
  amount: number;
  type: CoinTxType;
  description: string;
  createdAt: Date | null;
}

export type PlanStatus = 'active' | 'expired' | 'disabled';

export interface PremiumPlan {
  id: string;
  name: string;
  description: string;
  coinCost: number;
  couponCode: string;
  status: PlanStatus;
  maxRedemptions: number;
  redemptionCount: number;
  validUntil: Date | null;
  createdAt: Date | null;
}
