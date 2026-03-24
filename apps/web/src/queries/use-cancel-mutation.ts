import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/services/api";

async function cancelSubscription(immediate = false): Promise<void> {
  const res = await fetch(`${API_URL}/subscription/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ immediate }),
  });
  if (!res.ok) throw new Error("Erro ao cancelar assinatura");
}

export function useCancelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
