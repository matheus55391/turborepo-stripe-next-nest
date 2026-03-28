import { api } from "@/lib/api";
import { ApiRoute } from "@repo/shared/routes";
import type { PlanInfo, SubscriptionInfo } from "@repo/shared/types";

export async function fetchPlans(): Promise<PlanInfo[]> {
  const { data } = await api.get<{ plans: PlanInfo[] }>(
    ApiRoute.SUBSCRIPTION_PLANS,
  );
  return data.plans;
}

export async function fetchSubscription(): Promise<SubscriptionInfo> {
  const { data } = await api.get<SubscriptionInfo>(ApiRoute.SUBSCRIPTION);
  return data;
}

export async function createCheckout(params: {
  priceId: string;
}): Promise<string> {
  const { data } = await api.post<{ url: string }>(
    ApiRoute.SUBSCRIPTION_CHECKOUT,
    {
      priceId: params.priceId,
      successUrl: `${window.location.origin}/dashboard?checkout=success`,
      cancelUrl: `${window.location.origin}/dashboard?checkout=cancel`,
    },
  );
  return data.url;
}

export async function createPortalSession(): Promise<string> {
  const { data } = await api.post<{ url: string }>(
    ApiRoute.SUBSCRIPTION_PORTAL,
    {
      returnUrl: `${window.location.origin}/dashboard`,
    },
  );
  return data.url;
}

export async function cancelSubscription(immediate = false): Promise<void> {
  await api.post(ApiRoute.SUBSCRIPTION_CANCEL, { immediate });
}
