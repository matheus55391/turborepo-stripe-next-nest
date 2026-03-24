import Link from "next/link";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has("access_token");

  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <div className="flex max-w-xl flex-col gap-4 text-center">
        <p className="m-0 text-sm font-medium uppercase tracking-widest text-muted">
          next-nest-stripe-monorepo
        </p>
        <h1 className="m-0 text-3xl font-semibold leading-tight">
          Monorepo Next.js + NestJS
        </h1>
        <p className="m-0 leading-relaxed text-muted">
          Autenticação com cookie HTTP-only, Prisma e PostgreSQL.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {!isLoggedIn && (
            <>
              <Link
                className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-base font-medium no-underline transition-colors duration-150 border border-transparent bg-accent text-accent-fg hover:brightness-105"
                href="/login"
              >
                Entrar
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-base font-medium no-underline transition-colors duration-150 border border-border bg-transparent text-foreground hover:bg-surface-hover"
                href="/register"
              >
                Criar conta
              </Link>
            </>
          )}
          {isLoggedIn && (
            <Link
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-base font-medium no-underline transition-colors duration-150 border border-transparent bg-accent text-accent-fg hover:brightness-105"
              href="/dashboard"
            >
              Área logada
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
