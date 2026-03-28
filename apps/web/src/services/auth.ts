import { api } from "@/lib/api";
import { useUserStore } from "@/stores/use-user-store";
import { AuthRoute } from "@repo/shared/routes";
import type { LoginForm, RegisterForm } from "@repo/shared/schemas";
import type { Profile } from "@repo/shared/types";
import axios from "axios";

let redirecting = false;

export async function fetchProfile(): Promise<Profile> {
  try {
    const { data } = await api.get<Profile>(AuthRoute.ME);
    useUserStore.getState().setUser(data);
    return data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !redirecting
    ) {
      redirecting = true;
      await api.post(AuthRoute.LOGOUT).catch(() => {});
      window.location.href = "/login";
    }
    throw error;
  }
}

export async function loginFn(data: LoginForm): Promise<Profile> {
  const { data: user } = await api.post<Profile>(AuthRoute.LOGIN, data);
  return user;
}

export async function registerFn(data: RegisterForm): Promise<Profile> {
  const body = {
    email: data.email,
    password: data.password,
    ...(data.name && data.name.length > 0 ? { name: data.name } : {}),
  };
  const { data: user } = await api.post<Profile>(AuthRoute.REGISTER, body);
  return user;
}

export async function logoutFn(): Promise<void> {
  await api.post(AuthRoute.LOGOUT);
}
