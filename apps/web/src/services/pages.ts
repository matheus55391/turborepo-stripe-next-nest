import { api } from "@/lib/api";
import {
  PageRoute,
  pageRoute,
  pageSlugRoute,
  linksRoute,
  linkRoute,
} from "@repo/shared/routes";
import type {
  PageSummary,
  PageDetail,
  PublicPage,
  CreatePageInput,
  UpdatePageInput,
  LinkItem,
  CreateLinkInput,
  UpdateLinkInput,
} from "@repo/shared/types";

// ── Pages ──

export async function fetchPages(): Promise<PageSummary[]> {
  const { data } = await api.get<PageSummary[]>(PageRoute.BASE);
  return data;
}

export async function fetchPage(pageId: string): Promise<PageDetail> {
  const { data } = await api.get<PageDetail>(pageRoute(pageId));
  return data;
}

export async function fetchPublicPage(slug: string): Promise<PublicPage> {
  const { data } = await api.get<PublicPage>(pageSlugRoute(slug));
  return data;
}

export async function createPage(input: CreatePageInput): Promise<PageDetail> {
  const { data } = await api.post<PageDetail>(PageRoute.BASE, input);
  return data;
}

export async function updatePage(
  pageId: string,
  input: UpdatePageInput,
): Promise<PageDetail> {
  const { data } = await api.patch<PageDetail>(pageRoute(pageId), input);
  return data;
}

export async function deletePage(
  pageId: string,
): Promise<{ ok: true }> {
  const { data } = await api.delete<{ ok: true }>(pageRoute(pageId));
  return data;
}

// ── Links ──

export async function fetchLinks(pageId: string): Promise<LinkItem[]> {
  const { data } = await api.get<LinkItem[]>(linksRoute(pageId));
  return data;
}

export async function createLink(
  pageId: string,
  input: CreateLinkInput,
): Promise<LinkItem> {
  const { data } = await api.post<LinkItem>(linksRoute(pageId), input);
  return data;
}

export async function updateLink(
  pageId: string,
  linkId: string,
  input: UpdateLinkInput,
): Promise<LinkItem> {
  const { data } = await api.patch<LinkItem>(
    linkRoute(pageId, linkId),
    input,
  );
  return data;
}

export async function deleteLink(
  pageId: string,
  linkId: string,
): Promise<{ ok: true }> {
  const { data } = await api.delete<{ ok: true }>(
    linkRoute(pageId, linkId),
  );
  return data;
}
