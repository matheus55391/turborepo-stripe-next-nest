import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { updatePage } from "@/services/pages";
import type { UpdatePageInput } from "@repo/shared/types";

export function useUpdatePageMutation(pageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePageInput) => updatePage(pageId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PAGES] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PAGE, pageId] });
    },
  });
}
