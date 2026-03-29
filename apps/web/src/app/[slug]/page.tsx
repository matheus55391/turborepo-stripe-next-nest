import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_URL } from "@/lib/api";
import type { PublicPage } from "@repo/shared/types";
import { PublicPageView } from "@/components/public-page-view";

async function getPublicPage(slug: string): Promise<PublicPage | null> {
  try {
    const res = await fetch(`${API_URL}/pages/slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60, tags: [`page-${slug}`] },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicPage(slug);
  if (!page) return { title: "Página não encontrada" };
  return {
    title: page.title,
    description: page.bio ?? `${page.title} — Links`,
  };
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublicPage(slug);
  if (!page) notFound();

  return <PublicPageView page={page} />;
}
