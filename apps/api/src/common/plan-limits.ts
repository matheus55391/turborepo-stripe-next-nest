import { Plan } from '@prisma/client';

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

export type PlanLimits = (typeof PLAN_LIMITS)[Plan];
