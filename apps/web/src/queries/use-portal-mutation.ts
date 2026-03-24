import { useMutation } from "@tanstack/react-query";
import { API_URL } from "@/services/api";

async function createPortalSession(): Promise<string> {
  const res = await fetch(`${API_URL}/subscription/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      returnUrl: `${window.location.origin}/dashboard`,
    }),
  });
  if (!res.ok) throw new Error("Erro ao abrir portal de cobrança");
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function usePortalMutation() {
  return useMutation({
    mutationFn: createPortalSession,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
