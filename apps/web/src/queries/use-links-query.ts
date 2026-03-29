import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { fetchLinks } from "@/services/pages";

export function useLinksQuery(pageId: string) {
  return useQuery({
    queryKey: [QueryKey.LINKS, pageId],
    queryFn: () => fetchLinks(pageId),
    enabled: !!pageId,
  });
}
