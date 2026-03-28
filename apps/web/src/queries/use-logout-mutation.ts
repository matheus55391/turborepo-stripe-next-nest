import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/use-user-store";
import { QueryKey } from "@repo/shared/routes";
import { logoutFn } from "@/services/auth";

export function useLogoutMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutFn,
    onSuccess: async () => {
      useUserStore.getState().clearUser();
      await queryClient.invalidateQueries({ queryKey: [QueryKey.PROFILE] });
      router.push("/login");
    },
  });
}
