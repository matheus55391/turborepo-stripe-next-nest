import { render, screen, fireEvent } from "@testing-library/react";
import type { PublicPage } from "@repo/shared/types";
import { PublicPageView } from "./public-page-view";

// Mock sendBeacon
Object.defineProperty(navigator, "sendBeacon", {
  value: jest.fn(),
  writable: true,
});

const mockPage: PublicPage = {
  id: "page-1",
  slug: "test-page",
  title: "Test Page",
  bio: "A test bio for the page",
  avatarUrl: null,
  published: true,
  links: [
    {
      id: "link-1",
      title: "Instagram",
      url: "https://instagram.com/test",
      position: 0,
      visible: true,
      pageId: "page-1",
      createdAt: "2026-03-28T00:00:00.000Z",
      updatedAt: "2026-03-28T00:00:00.000Z",
    },
    {
      id: "link-2",
      title: "Twitter",
      url: "https://twitter.com/test",
      position: 1,
      visible: true,
      pageId: "page-1",
      createdAt: "2026-03-28T00:00:00.000Z",
      updatedAt: "2026-03-28T00:00:00.000Z",
    },
  ],
  user: { name: "Test User" },
};

describe("PublicPageView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render page title", () => {
    render(<PublicPageView page={mockPage} />);
    expect(screen.getByText("Test Page")).toBeTruthy();
  });

  it("should render page bio", () => {
    render(<PublicPageView page={mockPage} />);
    expect(screen.getByText("A test bio for the page")).toBeTruthy();
  });

  it("should render all links", () => {
    render(<PublicPageView page={mockPage} />);
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("Twitter")).toBeTruthy();
  });

  it("should render links as anchor tags with correct href", () => {
    render(<PublicPageView page={mockPage} />);
    const instagramLink = screen.getByText("Instagram").closest("a");
    expect(instagramLink).toHaveAttribute("href", "https://instagram.com/test");
    expect(instagramLink).toHaveAttribute("target", "_blank");
    expect(instagramLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should track click on link click", () => {
    render(<PublicPageView page={mockPage} />);
    fireEvent.click(screen.getByText("Instagram"));
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      expect.stringContaining("/pages/page-1/links/link-1/click"),
    );
  });

  it("should render avatar fallback with initial from user name", () => {
    render(<PublicPageView page={mockPage} />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("should show empty message when no links", () => {
    const pageWithoutLinks = { ...mockPage, links: [] };
    render(<PublicPageView page={pageWithoutLinks} />);
    expect(screen.getByText("Nenhum link disponível.")).toBeTruthy();
  });

  it("should not render bio when null", () => {
    const pageWithoutBio = { ...mockPage, bio: null };
    render(<PublicPageView page={pageWithoutBio} />);
    expect(screen.queryByText("A test bio for the page")).toBeNull();
  });

  it("should render branding footer", () => {
    render(<PublicPageView page={mockPage} />);
    expect(screen.getByText("Criado com LinkBio")).toBeTruthy();
  });
});
