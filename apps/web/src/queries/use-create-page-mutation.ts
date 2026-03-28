import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { createPage } from "@/services/pages";

export function useCreatePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PAGES] });
    },
  });
}
