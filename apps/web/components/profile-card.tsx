"use client";

import { useMeQuery } from "@/queries/use-me-query";
import { useLogoutMutation } from "@/queries/use-logout-mutation";

export function ProfileCard() {
  const { data } = useMeQuery();
  const logout = useLogoutMutation();

  const initial = (
    data.name?.trim()?.[0] ??
    data.email[0] ??
    "?"
  ).toUpperCase();

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-fg"
        aria-hidden
      >
        {initial}
      </div>
      <h2 className="m-0 text-xl font-semibold">
        {data.name?.trim() || "Sem nome"}
      </h2>
      <p className="m-0 text-base text-muted">{data.email}</p>
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
