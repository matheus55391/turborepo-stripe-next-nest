import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { fetchPlans } from "@/services/subscription";

export function usePlansQuery() {
  return useQuery({
    queryKey: [QueryKey.PLANS],
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  });
}
