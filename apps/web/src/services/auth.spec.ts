import { api } from "@/lib/api";
import { Plan } from "@repo/shared/types";
import { fetchProfile, loginFn, registerFn, logoutFn } from "./auth";

jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("@/stores/use-user-store", () => ({
  useUserStore: {
    getState: () => ({
      setUser: jest.fn(),
    }),
  },
}));

const mockUser = { id: "1", email: "a@b.com", name: "A", plan: Plan.FREE };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchProfile", () => {
  it("should return user on success", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    const result = await fetchProfile();
    expect(result).toEqual(mockUser);
  });

  it("should call api.get with AUTH_ME route", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    await fetchProfile();

    expect(api.get).toHaveBeenCalledWith("/auth/me");
  });

  it("should redirect on 401 error", async () => {
    const axiosModule = jest.requireActual("axios");
    const error = new axiosModule.AxiosError("Unauthorized", "ERR", undefined, undefined, {
      status: 401,
    });
    (api.get as jest.Mock).mockRejectedValue(error);
    (api.post as jest.Mock).mockResolvedValue({});

    await expect(fetchProfile()).rejects.toThrow();

    expect(api.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("should throw on non-401 error", async () => {
    const axiosModule = jest.requireActual("axios");
    const error = new axiosModule.AxiosError("Server Error", "ERR", undefined, undefined, {
      status: 500,
    });
    (api.get as jest.Mock).mockRejectedValue(error);

    await expect(fetchProfile()).rejects.toThrow("Server Error");
  });
});

describe("loginFn", () => {
  it("should return user on success", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockUser });

    const result = await loginFn({ email: "a@b.com", password: "123456" });
    expect(result).toEqual(mockUser);
  });

  it("should call api.post with AUTH_LOGIN route", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockUser });

    await loginFn({ email: "a@b.com", password: "123456" });

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.com",
      password: "123456",
    });
  });

  it("should throw on error", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Invalid credentials"));

    await expect(loginFn({ email: "a@b.com", password: "wrong" })).rejects.toThrow(
      "Invalid credentials",
    );
  });
});

describe("registerFn", () => {
  it("should return user on success", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockUser });

    const result = await registerFn({ email: "a@b.com", password: "123456" });
    expect(result).toEqual(mockUser);
  });

  it("should include name in body when provided", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockUser });

    await registerFn({ email: "a@b.com", password: "123456", name: "Test" });

    expect(api.post).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({ name: "Test" }),
    );
  });

  it("should omit name when empty string", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: mockUser });

    await registerFn({ email: "a@b.com", password: "123456", name: "" });

    const body = (api.post as jest.Mock).mock.calls[0][1];
    expect(body.name).toBeUndefined();
  });

  it("should throw on error", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Email already exists"));

    await expect(registerFn({ email: "a@b.com", password: "123456" })).rejects.toThrow(
      "Email already exists",
    );
  });
});

describe("logoutFn", () => {
  it("should resolve on success", async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await expect(logoutFn()).resolves.toBeUndefined();
  });

  it("should call api.post with AUTH_LOGOUT route", async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await logoutFn();

    expect(api.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("should throw on error", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("Logout failed"));

    await expect(logoutFn()).rejects.toThrow("Logout failed");
  });
});
