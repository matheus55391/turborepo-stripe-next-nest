import { useMutation } from "@tanstack/react-query";
import { createCheckout } from "@/services/subscription";

export function useCheckoutMutation() {
  return useMutation({
    mutationFn: createCheckout,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
