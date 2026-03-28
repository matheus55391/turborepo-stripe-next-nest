import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/use-user-store";
import { registerFn } from "@/services/auth";

export function useRegisterMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: registerFn,
    onSuccess: (user) => {
      useUserStore.getState().setUser(user);
      router.push("/dashboard");
    },
  });
}
