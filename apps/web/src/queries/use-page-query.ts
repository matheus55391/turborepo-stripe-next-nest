import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { fetchPage } from "@/services/pages";

export function usePageQuery(pageId: string) {
  return useQuery({
    queryKey: [QueryKey.PAGE, pageId],
    queryFn: () => fetchPage(pageId),
    enabled: !!pageId,
  });
}
