import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import { QueryKey } from "@repo/shared/routes";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUploadAvatar = jest.fn();
jest.mock("@/services/auth", () => ({
  uploadAvatarFn: (...args: unknown[]) => mockUploadAvatar(...args),
}));

import { useAvatarMutation } from "./use-avatar-mutation";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useAvatarMutation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should call uploadAvatarFn and show success toast", async () => {
    const profile = { id: "1", email: "a@b.com", name: "A", plan: "FREE", avatarUrl: "url" };
    mockUploadAvatar.mockResolvedValue(profile);

    const { result } = renderHook(() => useAvatarMutation(), {
      wrapper: createWrapper(),
    });

    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUploadAvatar).toHaveBeenCalled();
    expect(mockUploadAvatar.mock.calls[0][0]).toBe(file);
    expect(toast.success).toHaveBeenCalledWith("Avatar atualizado!");
  });

  it("should show error toast on failure", async () => {
    mockUploadAvatar.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAvatarMutation(), {
      wrapper: createWrapper(),
    });

    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Erro ao enviar avatar. Tente novamente.");
  });
});
