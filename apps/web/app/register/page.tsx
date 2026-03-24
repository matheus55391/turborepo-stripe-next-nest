"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRegisterMutation } from "@/queries/use-register-mutation";
import { type RegisterForm, registerSchema } from "@/schemas/auth";

export default function RegisterPage() {
  const mutation = useRegisterMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-7 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
        <p className="mb-5 text-sm text-muted">
          Preencha os dados abaixo.
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
            <label className="text-sm font-medium" htmlFor="name">
              Nome (opcional)
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="rounded-lg border border-border bg-background px-2.5 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              {...register("name")}
            />
            {errors.name ? (
              <p className="m-0 text-xs text-danger">{errors.name.message}</p>
            ) : null}
          </div>

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
              autoComplete="new-password"
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
            {mutation.isPending ? "Criando…" : "Cadastrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link
            className="font-medium underline underline-offset-2"
            href="/login"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
