"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useLoginMutation } from "@/queries/use-login-mutation";
import { loginSchema } from "@repo/shared/schemas";
import type { LoginForm } from "@repo/shared/schemas";

export default function LoginPage() {
  const mutation = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-7 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
        <p className="mb-5 text-sm text-muted">
          Use seu e-mail e senha.
        </p>

        {mutation.isError ? (
          <div
            className="mb-4 rounded-lg bg-danger/10 px-2.5 py-2 text-sm text-danger dark:bg-danger/15"
            role="alert"
          >
            {(mutation.error as Error).message}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          noValidate
        >
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="rounded-lg border border-border bg-background px-2.5 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              {...register("email")}
            />
            {errors.email ? (
              <p className="m-0 text-xs text-danger">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="rounded-lg border border-border bg-background px-2.5 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              {...register("password")}
            />
            {errors.password ? (
              <p className="m-0 text-xs text-danger">{errors.password.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            className="mt-1 w-full cursor-pointer rounded-lg border-0 bg-accent py-2.5 font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Não tem conta?{" "}
          <Link
            className="font-medium underline underline-offset-2"
            href="/register"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
