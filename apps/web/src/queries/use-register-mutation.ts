import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import type { RegisterForm, UserMe } from "@/schemas/auth";

export function useRegisterMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: RegisterForm) => {
      const body = {
        email: data.email,
        password: data.password,
        ...(data.name && data.name.length > 0 ? { name: data.name } : {}),
      };
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(err.message)
          ? err.message.join(", ")
          : (err.message ?? res.statusText);
        throw new Error(msg);
      }
      return res.json() as Promise<UserMe>;
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
  });
}
