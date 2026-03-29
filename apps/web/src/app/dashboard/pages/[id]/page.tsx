"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updatePageSchema,
  createLinkSchema,
} from "@repo/shared/schemas";
import type { UpdatePageForm, CreateLinkForm } from "@repo/shared/schemas";
import { PLAN_LIMITS } from "@repo/shared/types";
import { usePageQuery } from "@/queries/use-page-query";
import { useProfileQuery } from "@/queries/use-profile-query";
import { useUpdatePageMutation } from "@/queries/use-update-page-mutation";
import { useDeletePageMutation } from "@/queries/use-delete-page-mutation";
import { useCreateLinkMutation } from "@/queries/use-create-link-mutation";
import { useUpdateLinkMutation } from "@/queries/use-update-link-mutation";
import { useDeleteLinkMutation } from "@/queries/use-delete-link-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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

export default function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: user } = useProfileQuery();
  const { data: page, isLoading } = usePageQuery(id);
  const updatePage = useUpdatePageMutation(id);
  const deletePageMutation = useDeletePageMutation();
  const createLink = useCreateLinkMutation(id);
  const updateLink = useUpdateLinkMutation(id);
  const deleteLinkMutation = useDeleteLinkMutation(id);

  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const limits = PLAN_LIMITS[user.plan];

  const pageForm = useForm<UpdatePageForm>({
    resolver: zodResolver(updatePageSchema),
  });

  const linkForm = useForm<CreateLinkForm>({
    resolver: zodResolver(createLinkSchema),
  });

  if (isLoading || !page) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  const linkCount = page.links.length;
  const canAddLink = linkCount < limits.maxLinksPerPage;

  function onSavePage(data: UpdatePageForm) {
    const changes: Record<string, unknown> = {};
    if (data.slug && data.slug !== page!.slug) changes.slug = data.slug;
    if (data.title && data.title !== page!.title) changes.title = data.title;
    if (data.bio !== undefined && data.bio !== (page!.bio ?? ""))
      changes.bio = data.bio;
    if (Object.keys(changes).length > 0) {
      updatePage.mutate(changes);
    }
  }

  function onAddLink(data: CreateLinkForm) {
    createLink.mutate(data, {
      onSuccess: () => {
        linkForm.reset();
        setAddLinkOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/pages"
          className="text-sm text-muted-foreground no-underline hover:text-foreground"
        >
          ← Páginas
        </Link>
      </div>

      {/* Page settings card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{page.title}</CardTitle>
              <CardDescription>/{page.slug}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={page.published ? "default" : "secondary"}>
                {page.published ? "Publicada" : "Rascunho"}
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="published" className="text-sm">
                  Publicar
                </Label>
                <Switch
                  id="published"
                  checked={page.published}
                  onCheckedChange={(checked) =>
                    updatePage.mutate({ published: checked })
                  }
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={pageForm.handleSubmit(onSavePage)}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="editSlug">Slug</Label>
                <Input
                  id="editSlug"
                  defaultValue={page.slug}
                  {...pageForm.register("slug")}
                />
                {pageForm.formState.errors.slug && (
                  <p className="text-xs text-destructive">
                    {pageForm.formState.errors.slug.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="editTitle">Título</Label>
                <Input
                  id="editTitle"
                  defaultValue={page.title}
                  {...pageForm.register("title")}
                />
                {pageForm.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {pageForm.formState.errors.title.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="editBio">Bio</Label>
              <Input
                id="editBio"
                defaultValue={page.bio ?? ""}
                {...pageForm.register("bio")}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={updatePage.isPending}
                size="sm"
              >
                {updatePage.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
              {page.published && (
                <Link
                  href={`/${page.slug}`}
                  target="_blank"
                  className="text-sm text-muted-foreground no-underline hover:text-foreground"
                >
                  Ver página pública ↗
                </Link>
              )}
            </div>
            {updatePage.isError && (
              <p className="text-sm text-destructive">
                {(updatePage.error as Error).message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Links section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Links</h2>
          <p className="text-sm text-muted-foreground">
            {linkCount}/{limits.maxLinksPerPage} links
          </p>
        </div>
        <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
          <DialogTrigger
            disabled={!canAddLink}
            render={<Button size="sm" disabled={!canAddLink} />}
          >
            {canAddLink ? "Adicionar link" : "Limite atingido"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo link</DialogTitle>
              <DialogDescription>
                Adicione um link à sua página.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={linkForm.handleSubmit(onAddLink)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="linkTitle">Título</Label>
                <Input
                  id="linkTitle"
                  placeholder="Meu Instagram"
                  {...linkForm.register("title")}
                />
                {linkForm.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {linkForm.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  placeholder="https://instagram.com/seu-perfil"
                  {...linkForm.register("url")}
                />
                {linkForm.formState.errors.url && (
                  <p className="text-xs text-destructive">
                    {linkForm.formState.errors.url.message}
                  </p>
                )}
              </div>
              {createLink.isError && (
                <p className="text-sm text-destructive">
                  {(createLink.error as Error).message}
                </p>
              )}
              <Button type="submit" disabled={createLink.isPending}>
                {createLink.isPending ? "Adicionando…" : "Adicionar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {page.links.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Nenhum link adicionado ainda.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {page.links.map((link) => (
          <Card key={link.id}>
            <CardContent className="flex items-center justify-between gap-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{link.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {link.url}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`visible-${link.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Visível
                  </Label>
                  <Switch
                    id={`visible-${link.id}`}
                    checked={link.visible}
                    onCheckedChange={(checked) =>
                      updateLink.mutate({
                        linkId: link.id,
                        input: { visible: checked },
                      })
                    }
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLinkMutation.mutate(link.id)}
                  disabled={deleteLinkMutation.isPending}
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de perigo</CardTitle>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Excluir página
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Tem certeza? Todos os links serão excluídos.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deletePageMutation.mutate(id)}
                disabled={deletePageMutation.isPending}
              >
                {deletePageMutation.isPending ? "Excluindo…" : "Confirmar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
