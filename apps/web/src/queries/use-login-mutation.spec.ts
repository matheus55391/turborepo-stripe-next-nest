import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockSetUser = jest.fn();
jest.mock("@/stores/use-user-store", () => ({
  useUserStore: { getState: () => ({ setUser: mockSetUser }) },
}));

const mockLoginFn = jest.fn();
jest.mock("@/services/auth", () => ({ loginFn: (...args: unknown[]) => mockLoginFn(...args) }));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

import { useLoginMutation } from "./use-login-mutation";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useLoginMutation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should redirect to dashboard on success", async () => {
    const user = { id: "1", email: "a@b.com", name: "A" };
    mockLoginFn.mockResolvedValue(user);

    const { result } = renderHook(() => useLoginMutation(), { wrapper });
    result.current.mutate({ email: "a@b.com", password: "123456" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetUser).toHaveBeenCalledWith(user);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("should show toast with API error message on failure", async () => {
    const axiosError = new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
      data: { message: "Credenciais inválidas" },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: {} as never,
    });
    mockLoginFn.mockRejectedValue(axiosError);

    const { result } = renderHook(() => useLoginMutation(), { wrapper });
    result.current.mutate({ email: "a@b.com", password: "wrong" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Credenciais inválidas");
  });

  it("should show fallback toast for non-axios errors", async () => {
    mockLoginFn.mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useLoginMutation(), { wrapper });
    result.current.mutate({ email: "a@b.com", password: "123456" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("Erro ao fazer login. Tente novamente.");
  });
});
