import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import type { LoginForm, UserMe } from "@/schemas/auth";

export function useLoginMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(body.message)
          ? body.message.join(", ")
          : (body.message ?? res.statusText);
        throw new Error(msg);
      }
      return res.json() as Promise<UserMe>;
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
  });
}
