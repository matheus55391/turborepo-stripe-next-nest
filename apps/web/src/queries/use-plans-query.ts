import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/services/api";

export type PlanInfo = {
  key: "FREE" | "STARTER";
  name: string;
  price: number;
  priceId?: string;
  features: string[];
};

async function fetchPlans(): Promise<PlanInfo[]> {
  const res = await fetch(`${API_URL}/subscription/plans`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao buscar planos");
  const data = (await res.json()) as { plans: PlanInfo[] };
  return data.plans;
}

export function usePlansQuery() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  });
}
