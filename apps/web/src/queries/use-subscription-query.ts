import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/services/api";

export type SubscriptionInfo = {
  plan: "FREE" | "STARTER";
  subscription: {
    id: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "INCOMPLETE";
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
};

async function fetchSubscription(): Promise<SubscriptionInfo> {
  const res = await fetch(`${API_URL}/subscription`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao buscar assinatura");
  return res.json() as Promise<SubscriptionInfo>;
}

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
  });
}
