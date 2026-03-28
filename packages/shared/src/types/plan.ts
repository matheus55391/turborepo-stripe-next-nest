export const Plan = {
  FREE: 'FREE',
  STARTER: 'STARTER',
} as const;

export type Plan = (typeof Plan)[keyof typeof Plan];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  PAST_DUE: 'PAST_DUE',
  INCOMPLETE: 'INCOMPLETE',
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PLAN_LIMITS = {
  [Plan.FREE]: {
    maxPages: 1,
    maxLinksPerPage: 3,
  },
  [Plan.STARTER]: {
    maxPages: 5,
    maxLinksPerPage: 10,
  },
} as const;

export type PlanLimits = {
  maxPages: number;
  maxLinksPerPage: number;
};
