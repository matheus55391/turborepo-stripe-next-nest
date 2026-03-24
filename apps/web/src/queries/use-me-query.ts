import { useSuspenseQuery } from "@tanstack/react-query";
import { API_URL } from "@/services/api";
import type { UserMe } from "@/schemas/auth";

async function fetchMe(): Promise<UserMe> {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Não autorizado");
  }
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<UserMe>;
}

export function useMeQuery() {
  return useSuspenseQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
}
