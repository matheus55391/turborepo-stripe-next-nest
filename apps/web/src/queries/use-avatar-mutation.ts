import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { uploadAvatarFn } from "@/services/auth";
import { toast } from "sonner";

export function useAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAvatarFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROFILE] });
      toast.success("Avatar atualizado!");
    },
    onError: () => {
      toast.error("Erro ao enviar avatar. Tente novamente.");
    },
  });
}
