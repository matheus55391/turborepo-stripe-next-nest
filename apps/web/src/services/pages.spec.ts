import { api } from "@/lib/api";
import {
  fetchPages,
  fetchPage,
  fetchPublicPage,
  createPage,
  updatePage,
  deletePage,
  fetchLinks,
  createLink,
  updateLink,
  deleteLink,
} from "./pages";

jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockPage = {
  id: "page-1",
  slug: "my-page",
  title: "My Page",
  bio: "A bio",
  avatarUrl: null,
  published: true,
  userId: "user-1",
  createdAt: "2026-03-28T00:00:00.000Z",
  updatedAt: "2026-03-28T00:00:00.000Z",
  links: [],
};

const mockPageSummary = {
  ...mockPage,
  _count: { links: 2 },
};

const mockLink = {
  id: "link-1",
  title: "Instagram",
  url: "https://instagram.com/test",
  position: 0,
  visible: true,
  pageId: "page-1",
  createdAt: "2026-03-28T00:00:00.000Z",
  updatedAt: "2026-03-28T00:00:00.000Z",
};

// ── Pages ──

describe("fetchPages", () => {
  it("should return pages list", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [mockPageSummary] });

    const result = await fetchPages();
    expect(result).toEqual([mockPageSummary]);
    expect(api.get).toHaveBeenCalledWith("/pages");
  });

  it("should throw on error", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Network error"));
    await expect(fetchPages()).rejects.toThrow("Network error");
  });
});

describe("fetchPage", () => {
  it("should return page detail", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockPage });

    const result = await fetchPage("page-1");
    expect(result).toEqual(mockPage);
    expect(api.get).toHaveBeenCalledWith("/pages/page-1");
  });

  it("should throw on not found", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Not found"));
    await expect(fetchPage("invalid")).rejects.toThrow("Not found");
  });
});

describe("fetchPublicPage", () => {
  it("should return public page by slug", async () => {
    const publicPage = { ...mockPage, user: { name: "Test" } };
    (api.get as jest.Mock).mockResolvedValue({ data: publicPage });

    const result = await fetchPublicPage("my-page");
    expect(result).toEqual(publicPage);
    expect(api.get).toHaveBeenCalledWith("/pages/slug/my-page");
  });

  it("should throw on unpublished page", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Not found"));
    await expect(fetchPublicPage("hidden")).rejects.toThrow("Not found");
  });
});

describe("createPage", () => {
  it("should create and return new page", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockPage });

    const result = await createPage({ slug: "my-page", title: "My Page" });
    expect(result).toEqual(mockPage);
    expect(api.post).toHaveBeenCalledWith("/pages", {
      slug: "my-page",
      title: "My Page",
    });
  });

  it("should throw on duplicate slug", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Slug already exists"));
    await expect(
      createPage({ slug: "taken", title: "Test" }),
    ).rejects.toThrow("Slug already exists");
  });

  it("should throw on plan limit exceeded", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Forbidden"));
    await expect(
      createPage({ slug: "extra", title: "Extra" }),
    ).rejects.toThrow("Forbidden");
  });
});

describe("updatePage", () => {
  it("should update and return page", async () => {
    const updated = { ...mockPage, title: "Updated" };
    (api.patch as jest.Mock).mockResolvedValue({ data: updated });

    const result = await updatePage("page-1", { title: "Updated" });
    expect(result).toEqual(updated);
    expect(api.patch).toHaveBeenCalledWith("/pages/page-1", {
      title: "Updated",
    });
  });

  it("should throw on not found", async () => {
    (api.patch as jest.Mock).mockRejectedValue(new Error("Not found"));
    await expect(
      updatePage("invalid", { title: "Test" }),
    ).rejects.toThrow("Not found");
  });
});

describe("deletePage", () => {
  it("should delete page and return ok", async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { ok: true } });

    const result = await deletePage("page-1");
    expect(result).toEqual({ ok: true });
    expect(api.delete).toHaveBeenCalledWith("/pages/page-1");
  });

  it("should throw on not found", async () => {
    (api.delete as jest.Mock).mockRejectedValue(new Error("Not found"));
    await expect(deletePage("invalid")).rejects.toThrow("Not found");
  });
});

// ── Links ──

describe("fetchLinks", () => {
  it("should return links for a page", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [mockLink] });

    const result = await fetchLinks("page-1");
    expect(result).toEqual([mockLink]);
    expect(api.get).toHaveBeenCalledWith("/pages/page-1/links");
  });

  it("should throw on error", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("Server error"));
    await expect(fetchLinks("page-1")).rejects.toThrow("Server error");
  });
});

describe("createLink", () => {
  it("should create and return new link", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockLink });

    const result = await createLink("page-1", {
      title: "Instagram",
      url: "https://instagram.com/test",
    });
    expect(result).toEqual(mockLink);
    expect(api.post).toHaveBeenCalledWith("/pages/page-1/links", {
      title: "Instagram",
      url: "https://instagram.com/test",
    });
  });

  it("should throw on plan limit exceeded", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Forbidden"));
    await expect(
      createLink("page-1", { title: "Extra", url: "https://example.com" }),
    ).rejects.toThrow("Forbidden");
  });
});

describe("updateLink", () => {
  it("should update and return link", async () => {
    const updated = { ...mockLink, title: "Updated" };
    (api.patch as jest.Mock).mockResolvedValue({ data: updated });

    const result = await updateLink("page-1", "link-1", { title: "Updated" });
    expect(result).toEqual(updated);
    expect(api.patch).toHaveBeenCalledWith("/pages/page-1/links/link-1", {
      title: "Updated",
    });
  });

  it("should throw on not found", async () => {
    (api.patch as jest.Mock).mockRejectedValue(new Error("Not found"));
    await expect(
      updateLink("page-1", "invalid", { title: "Test" }),
    ).rejects.toThrow("Not found");
  });
});

describe("deleteLink", () => {
  it("should delete link and return ok", async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { ok: true } });

    const result = await deleteLink("page-1", "link-1");
    expect(result).toEqual({ ok: true });
    expect(api.delete).toHaveBeenCalledWith("/pages/page-1/links/link-1");
  });

  it("should throw on not found", async () => {
    (api.delete as jest.Mock).mockRejectedValue(new Error("Not found"));
    await expect(deleteLink("page-1", "invalid")).rejects.toThrow("Not found");
  });
});
