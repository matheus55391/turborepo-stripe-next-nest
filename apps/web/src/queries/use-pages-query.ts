import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { fetchPages } from "@/services/pages";

export function usePagesQuery() {
  return useQuery({
    queryKey: [QueryKey.PAGES],
    queryFn: fetchPages,
  });
}
