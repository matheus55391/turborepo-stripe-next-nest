"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPageSchema } from "@repo/shared/schemas";
import type { CreatePageForm } from "@repo/shared/schemas";
import { PLAN_LIMITS } from "@repo/shared/types";
import { usePagesQuery } from "@/queries/use-pages-query";
import { useCreatePageMutation } from "@/queries/use-create-page-mutation";
import { useProfileQuery } from "@/queries/use-profile-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PagesPage() {
  const { data: user } = useProfileQuery();
  const { data: pages, isLoading } = usePagesQuery();
  const createMutation = useCreatePageMutation();
  const [open, setOpen] = useState(false);

  const limits = PLAN_LIMITS[user.plan];
  const pageCount = pages?.length ?? 0;
  const canCreate = pageCount < limits.maxPages;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchema),
  });

  function onSubmit(data: CreatePageForm) {
    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando páginas…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Minhas Páginas</h1>
          <p className="text-sm text-muted-foreground">
            {pageCount}/{limits.maxPages} páginas
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            disabled={!canCreate}
            render={<Button disabled={!canCreate} />}
          >
            {canCreate ? "Nova página" : "Limite atingido"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar página</DialogTitle>
              <DialogDescription>
                Escolha um slug único para sua página pública.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="meu-perfil"
                  {...register("slug")}
                />
                {errors.slug && (
                  <p className="text-xs text-destructive">{errors.slug.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Meu Perfil"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bio">Bio (opcional)</Label>
                <Input
                  id="bio"
                  placeholder="Uma breve descrição"
                  {...register("bio")}
                />
                {errors.bio && (
                  <p className="text-xs text-destructive">{errors.bio.message}</p>
                )}
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {(createMutation.error as Error).message}
                </p>
              )}
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando…" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pages && pages.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Você ainda não tem nenhuma página. Crie a primeira!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {pages?.map((page) => (
          <Link
            key={page.id}
            href={`/dashboard/pages/${page.id}`}
            className="no-underline"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{page.title}</CardTitle>
                  <Badge variant={page.published ? "default" : "secondary"}>
                    {page.published ? "Publicada" : "Rascunho"}
                  </Badge>
                </div>
                <CardDescription>/{page.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {page._count.links} link{page._count.links !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
