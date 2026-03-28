import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-svh max-w-3xl p-6 md:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link
          className="text-sm text-muted-foreground no-underline hover:text-foreground"
          href="/"
        >
          ← Início
        </Link>
        <nav className="flex gap-4">
          <Link
            className="text-sm text-muted-foreground no-underline hover:text-foreground"
            href="/dashboard"
          >
            Perfil
          </Link>
          <Link
            className="text-sm text-muted-foreground no-underline hover:text-foreground"
            href="/dashboard/pages"
          >
            Páginas
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
