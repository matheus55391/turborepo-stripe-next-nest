import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { createLink } from "@/services/pages";
import type { CreateLinkInput } from "@repo/shared/types";

export function useCreateLinkMutation(pageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLinkInput) => createLink(pageId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LINKS, pageId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PAGE, pageId] });
    },
  });
}
