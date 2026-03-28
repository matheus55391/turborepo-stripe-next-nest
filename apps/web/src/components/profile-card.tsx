"use client";

import { useRef } from "react";
import { useProfileQuery } from "@/queries/use-profile-query";
import { useLogoutMutation } from "@/queries/use-logout-mutation";
import { usePlansQuery } from "@/queries/use-plans-query";
import { useAvatarMutation } from "@/queries/use-avatar-mutation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileCard() {
  const { data } = useProfileQuery();
  const { data: plans } = usePlansQuery();
  const logout = useLogoutMutation();
  const avatarMutation = useAvatarMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const planName = plans?.find((p) => p.key === data.plan)?.name ?? data.plan;

  const initial = (
    data.name?.trim()?.[0] ??
    data.email[0] ??
    "?"
  ).toUpperCase();

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      avatarMutation.mutate(file);
    }
    e.target.value = "";
  }

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
      <button
        type="button"
        onClick={handleAvatarClick}
        disabled={avatarMutation.isPending}
        className="group relative h-12 w-12 cursor-pointer rounded-full border-0 bg-transparent p-0"
        aria-label="Alterar avatar"
      >
        <Avatar className="h-12 w-12">
          {data.avatarUrl && (
            <AvatarImage src={data.avatarUrl} alt={data.name ?? "Avatar"} />
          )}
          <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {avatarMutation.isPending ? "…" : "✎"}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        data-testid="avatar-input"
      />
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
