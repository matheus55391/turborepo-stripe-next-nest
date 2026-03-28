import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/use-user-store";
import { loginFn } from "@/services/auth";
import axios from "axios";
import { toast } from "sonner";

export function useLoginMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: loginFn,
    onSuccess: (user) => {
      useUserStore.getState().setUser(user);
      router.push("/dashboard");
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Erro ao fazer login. Tente novamente.";
      toast.error(message);
    },
  });
}
