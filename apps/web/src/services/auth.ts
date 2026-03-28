import { api } from "@/lib/api";
import { useUserStore } from "@/stores/use-user-store";
import { ApiRoute } from "@repo/shared/routes";
import type { LoginForm, RegisterForm } from "@repo/shared/schemas";
import type { Profile } from "@repo/shared/types";
import axios from "axios";

export async function fetchProfile(): Promise<Profile> {
  try {
    const { data } = await api.get<Profile>(ApiRoute.AUTH_ME);
    useUserStore.getState().setUser(data);
    return data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      window.location.href = "/login";
    }
    throw error;
  }
}

export async function loginFn(data: LoginForm): Promise<Profile> {
  const { data: user } = await api.post<Profile>(ApiRoute.AUTH_LOGIN, data);
  return user;
}

export async function registerFn(data: RegisterForm): Promise<Profile> {
  const body = {
    email: data.email,
    password: data.password,
    ...(data.name && data.name.length > 0 ? { name: data.name } : {}),
  };
  const { data: user } = await api.post<Profile>(ApiRoute.AUTH_REGISTER, body);
  return user;
}

export async function logoutFn(): Promise<void> {
  await api.post(ApiRoute.AUTH_LOGOUT);
}
