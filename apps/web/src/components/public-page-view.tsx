"use client";

import { API_URL } from "@/lib/api";
import { clickRoute } from "@repo/shared/routes";
import type { PublicPage } from "@repo/shared/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function trackClick(pageId: string, linkId: string) {
  navigator.sendBeacon(`${API_URL}${clickRoute(pageId, linkId)}`);
}

export function PublicPageView({ page }: { page: PublicPage }) {
  const initial = (
    page.user.name?.trim()?.[0] ??
    page.title[0] ??
    "?"
  ).toUpperCase();

  return (
    <main className="flex min-h-svh items-start justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {/* Avatar */}
        <Avatar className="h-24 w-24">
          {page.avatarUrl && <AvatarImage src={page.avatarUrl} alt={page.title} />}
          <AvatarFallback className="text-3xl font-semibold bg-primary text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>

        {/* Title & bio */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{page.title}</h1>
          {page.bio && (
            <p className="mt-1 text-muted-foreground">{page.bio}</p>
          )}
        </div>

        {/* Links */}
        <div className="w-full flex flex-col gap-3">
          {page.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick(page.id, link.id)}
              className="flex items-center justify-center rounded-xl border border-border bg-card px-6 py-4 text-center font-medium text-card-foreground no-underline transition-all hover:scale-[1.02] hover:bg-muted/50 active:scale-[0.98]"
            >
              {link.title}
            </a>
          ))}
        </div>

        {page.links.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum link disponível.
          </p>
        )}

        {/* Footer branding */}
        <p className="mt-8 text-xs text-muted-foreground/60">
          Criado com LinkBio
        </p>
      </div>
    </main>
  );
}
