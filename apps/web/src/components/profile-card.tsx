"use client";

import { useProfileQuery } from "@/queries/use-profile-query";
import { useLogoutMutation } from "@/queries/use-logout-mutation";
import { usePlansQuery } from "@/queries/use-plans-query";

export function ProfileCard() {
  const { data } = useProfileQuery();
  const { data: plans } = usePlansQuery();
  const logout = useLogoutMutation();

  const planName = plans?.find((p) => p.key === data.plan)?.name ?? data.plan;

  const initial = (
    data.name?.trim()?.[0] ??
    data.email[0] ??
    "?"
  ).toUpperCase();

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
        aria-hidden
      >
        {initial}
      </div>
      <h2 className="m-0 text-xl font-semibold">
        {data.name?.trim() || "Sem nome"}
      </h2>
      <div className="flex items-center gap-2">
        <p className="m-0 text-base text-muted-foreground">{data.email}</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {planName}
        </span>
      </div>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="mt-2 cursor-pointer self-start rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {logout.isPending ? "Saindo…" : "Sair"}
      </button>
    </article>
  );
}
