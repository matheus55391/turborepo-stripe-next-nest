import { useSuspenseQuery } from "@tanstack/react-query";
import { QueryKey } from "@repo/shared/routes";
import { fetchProfile } from "@/services/auth";

export function useProfileQuery() {
  return useSuspenseQuery({
    queryKey: [QueryKey.PROFILE],
    queryFn: fetchProfile,
    retry: false,
  });
}
