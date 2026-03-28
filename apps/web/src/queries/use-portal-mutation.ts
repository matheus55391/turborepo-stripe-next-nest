import { useMutation } from "@tanstack/react-query";
import { createPortalSession } from "@/services/subscription";

export function usePortalMutation() {
  return useMutation({
    mutationFn: createPortalSession,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
