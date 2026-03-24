import { useMutation } from "@tanstack/react-query";
import { API_URL } from "@/services/api";

type CheckoutParams = {
  priceId: string;
};

async function createCheckout(params: CheckoutParams): Promise<string> {
  const res = await fetch(`${API_URL}/subscription/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      priceId: params.priceId,
      successUrl: `${window.location.origin}/dashboard?checkout=success`,
      cancelUrl: `${window.location.origin}/dashboard?checkout=cancel`,
    }),
  });
  if (!res.ok) throw new Error("Erro ao criar sessão de checkout");
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function useCheckoutMutation() {
  return useMutation({
    mutationFn: createCheckout,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
