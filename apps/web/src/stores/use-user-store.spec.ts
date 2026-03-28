import { useUserStore } from "./use-user-store";
import type { Profile } from "@repo/shared/types";

const mockUser: Profile = {
  id: "u1",
  email: "test@example.com",
  name: "Test",
  plan: "FREE",
};

describe("useUserStore", () => {
  beforeEach(() => {
    useUserStore.getState().clearUser();
  });

  it("starts with user null", () => {
    expect(useUserStore.getState().user).toBeNull();
  });

  it("setUser stores the user", () => {
    useUserStore.getState().setUser(mockUser);
    expect(useUserStore.getState().user).toEqual(mockUser);
  });

  it("clearUser resets to null", () => {
    useUserStore.getState().setUser(mockUser);
    useUserStore.getState().clearUser();
    expect(useUserStore.getState().user).toBeNull();
  });
});
