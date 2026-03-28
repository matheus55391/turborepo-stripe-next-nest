export type PageSummary = {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { links: number };
};

export type LinkItem = {
  id: string;
  title: string;
  url: string;
  position: number;
  visible: boolean;
  pageId: string;
  createdAt: string;
  updatedAt: string;
};

export type PageDetail = {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  published: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  links: LinkItem[];
};

export type PublicPage = {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  published: boolean;
  links: LinkItem[];
  user: { name: string | null };
};

export type CreatePageInput = {
  slug: string;
  title: string;
  bio?: string;
};

export type UpdatePageInput = {
  slug?: string;
  title?: string;
  bio?: string;
  published?: boolean;
};

export type CreateLinkInput = {
  title: string;
  url: string;
  position?: number;
  visible?: boolean;
};

export type UpdateLinkInput = {
  title?: string;
  url?: string;
  position?: number;
  visible?: boolean;
};
