import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { cancelSubscription } from "@/services/subscription";

export function useCancelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SUBSCRIPTION] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROFILE] });
    },
  });
}
