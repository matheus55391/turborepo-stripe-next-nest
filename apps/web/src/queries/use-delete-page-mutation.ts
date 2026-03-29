import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { QueryKey } from "@repo/shared/routes";
import { deletePage } from "@/services/pages";

export function useDeletePageMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PAGES] });
      router.push("/dashboard/pages");
    },
  });
}
