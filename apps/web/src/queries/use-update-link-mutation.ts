import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { updateLink } from "@/services/pages";
import type { UpdateLinkInput } from "@repo/shared/types";

export function useUpdateLinkMutation(pageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkId, input }: { linkId: string; input: UpdateLinkInput }) =>
      updateLink(pageId, linkId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LINKS, pageId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PAGE, pageId] });
    },
  });
}
