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
