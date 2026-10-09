import { api } from './api';
import type { Interview, InterviewListItem, CreateInterviewRequest, SubmitAnswerRequest, QuestionAnswer, RolesResponse, Role, SubscriptionResponse, PaymentResponse, BillingConfig } from '../types';

export const interviewApi = {
  create: (data: CreateInterviewRequest) => api.post<Interview>('/interviews', data),
  list: () => api.get<InterviewListItem[]>('/interviews'),
  get: (id: number) => api.get<Interview>(`/interviews/${id}`),
  start: (id: number) => api.post<Interview>(`/interviews/${id}/start`),
  submitAnswer: (id: number, data: SubmitAnswerRequest) => api.post<QuestionAnswer>(`/interviews/${id}/answer`, data),
  nextQuestion: (id: number) => api.post<QuestionAnswer>(`/interviews/${id}/next-question`),
  complete: (id: number) => api.post<Interview>(`/interviews/${id}/complete`),
  delete: (id: number) => api.delete(`/interviews/${id}`),

  // Billing
  getBillingConfig: () => api.get<BillingConfig>('/billing/config'),
  getSubscription: () => api.get<SubscriptionResponse>('/billing/subscription'),
  getPayments: () => api.get<PaymentResponse[]>('/billing/payments'),
  createSubscription: (planId: string) => api.post<SubscriptionResponse>('/billing/create-subscription', { planId }),
  cancelSubscription: (subscriptionId: string) => api.post(`/billing/subscription/${subscriptionId}/cancel`),
};

export const rolesApi = {
  list: () => api.get<RolesResponse>('/roles'),
  listCustom: () => api.get<Role[]>('/roles/custom'),
  createCustom: (data: { name: string; description: string; topics: string[] }) => api.post<Role>('/roles/custom', data),
  get: (id: number) => api.get<Role>(`/roles/${id}`),
};