import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { deleteLink } from "@/services/pages";

export function useDeleteLinkMutation(pageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => deleteLink(pageId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.LINKS, pageId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PAGE, pageId] });
    },
  });
}
