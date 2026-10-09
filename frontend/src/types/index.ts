export interface Role {
  id: number;
  name: string;
  category: string;
  description: string;
  topics: string[];
  custom: boolean;
}

export interface RolesResponse {
  [category: string]: Role[];
}

export interface Interview {
  id: number;
  roleName: string;
  customRole: string | null;
  level: string;
  type: string;
  durationMinutes: number;
  cameraEnabled: boolean;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  actualDurationSeconds: number | null;
  totalScore: number | null;
  isPartial: boolean;
  planAtTime: string;
  questionAnswers: QuestionAnswer[];
  report: Report | null;
  createdAt: string;
}

export interface InterviewListItem {
  id: number;
  roleName: string;
  customRole: string | null;
  level: string;
  type: string;
  durationMinutes: number;
  status: string;
  totalScore: number | null;
  isPartial: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface QuestionAnswer {
  id: number;
  questionIndex: number;
  questionText: string;
  userTranscript: string | null;
  voiceMetrics: string | null;
  cameraMetrics: string | null;
  responseTimeSeconds: number | null;
  isFollowUp: boolean;
  status: string;
  totalScore: number | null;
  feedback: string | null;
  strongAnswerPoints: string | null;
  scoreCorrectnessDepth: number | null;
  scoreStructureClarity: number | null;
  scoreConfidenceTone: number | null;
  scoreFluency: number | null;
  scoreComposure: number | null;
}

export interface Report {
  totalScore: number;
  scoreCorrectnessDepth: number | null;
  scoreStructureClarity: number | null;
  scoreConfidenceTone: number | null;
  scoreFluency: number | null;
  scoreComposure: number | null;
  strengths: string;
  improvements: string;
  fillerWordCounts: string;
  confidenceTimeline: string;
  paceTimeline: string;
  cameraMetrics: string;
  comparisonWithPrevious: string | null;
  llmSummary: string | null;
}

export interface CreateInterviewRequest {
  roleId: number;
  customRole?: string;
  level: 'FRESHER' | 'ONE_TO_THREE_YEARS' | 'THREE_PLUS_YEARS';
  type: 'TECHNICAL' | 'HR_BEHAVIOURAL' | 'MIXED';
  durationMinutes: 15 | 30 | 45;
  cameraEnabled: boolean;
}

export interface SubmitAnswerRequest {
  questionAnswerId: number;
  transcript: string;
  voiceMetrics?: string;
  cameraMetrics?: string;
  responseTimeSeconds?: number;
  silenceDurationSeconds?: number;
}

export type ExperienceLevel = 'FRESHER' | 'ONE_TO_THREE_YEARS' | 'THREE_PLUS_YEARS';
export type InterviewType = 'TECHNICAL' | 'HR_BEHAVIOURAL' | 'MIXED';
export type InterviewStatus = 'SETUP' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'ABANDONED';
export type QuestionStatus = 'PENDING' | 'ASKED' | 'ANSWERED' | 'SCORED';

export interface SubscriptionResponse {
  subscriptionId: string;
  checkoutUrl: string | null;
  status: string;
  id?: number;
  razorpaySubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  plan?: string;
}

export interface PaymentResponse {
  id: number;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  description: string | null;
  createdAt: string;
}

export interface BillingConfig {
  keyId: string;
  plans: {
    pro_monthly: {
      id: string;
      name: string;
      price: number;
      currency: string;
      interval: string;
    };
    pro_yearly: {
      id: string;
      name: string;
      price: number;
      currency: string;
      interval: string;
    };
  };
}