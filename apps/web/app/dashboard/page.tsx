import Link from "next/link";
import { ProfileCardDynamic } from "@/components/profile-card-dynamic";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="mx-auto min-h-svh max-w-xl p-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link
          className="text-sm text-muted no-underline hover:text-foreground"
          href="/"
        >
          ← Início
        </Link>
      </header>
      <ProfileCardDynamic />
    </div>
  );
}
