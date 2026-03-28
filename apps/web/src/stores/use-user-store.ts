import { create } from "zustand";
import type { Profile } from "@repo/shared/types";

type UserState = {
  user: Profile | null;
  setUser: (user: Profile) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
