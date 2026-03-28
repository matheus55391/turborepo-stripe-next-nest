import type { Plan, PlanLimits, SubscriptionStatus } from './plan';

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  avatarUrl: string | null;
};

export type PlanInfo = {
  key: Plan;
  name: string;
  price: number;
  priceId?: string;
  limits: PlanLimits;
  features: string[];
};

export type SubscriptionInfo = {
  plan: Plan;
  subscription: {
    id: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
};
