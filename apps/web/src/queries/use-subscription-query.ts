import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { fetchSubscription } from "@/services/subscription";

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: [QueryKey.SUBSCRIPTION],
    queryFn: fetchSubscription,
    staleTime: 5 * 60 * 1000,
  });
}
