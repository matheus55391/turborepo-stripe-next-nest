"use client";

import { useState } from "react";
import { useProfileQuery } from "@/queries/use-profile-query";
import { usePlansQuery } from "@/queries/use-plans-query";
import type { PlanInfo } from "@repo/shared/types";
import { useSubscriptionQuery } from "@/queries/use-subscription-query";
import { useCheckoutMutation } from "@/queries/use-checkout-mutation";
import { usePortalMutation } from "@/queries/use-portal-mutation";
import { useCancelMutation } from "@/queries/use-cancel-mutation";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  isLoading,
}: {
  plan: PlanInfo;
  isCurrent: boolean;
  onUpgrade?: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-5 ${
        isCurrent
          ? "border-accent bg-accent/5"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-lg font-semibold">{plan.name}</h3>
        {isCurrent && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-fg">
            Atual
          </span>
        )}
      </div>

      <p className="m-0 text-2xl font-bold">
        {plan.price === 0 ? (
          "Grátis"
        ) : (
          <>
            R$ {plan.price.toFixed(2).replace(".", ",")}
            <span className="text-sm font-normal text-muted">/mês</span>
          </>
        )}
      </p>

      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-muted">
        {plan.features.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>

      {!isCurrent && plan.priceId && (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={isLoading}
          className="mt-1 cursor-pointer rounded-lg border-0 bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Redirecionando…" : "Fazer upgrade"}
        </button>
      )}
    </div>
  );
}

export function BillingCard() {
  const { data: user } = useProfileQuery();
  const { data: plans, isLoading: plansLoading } = usePlansQuery();
  const { data: subscription } = useSubscriptionQuery();
  const checkout = useCheckoutMutation();
  const portal = usePortalMutation();
  const cancel = useCancelMutation();
  const [showConfirm, setShowConfirm] = useState(false);

  if (plansLoading || !plans) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="m-0 text-sm text-muted">Carregando planos…</p>
      </div>
    );
  }

  const hasActiveSubscription =
    subscription?.subscription?.status === "ACTIVE";
  const isCancelling = subscription?.subscription?.cancelAtPeriodEnd;
  const periodEnd = subscription?.subscription?.currentPeriodEnd;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-xl font-semibold">Plano & Cobrança</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            isCurrent={user.plan === plan.key}
            isLoading={checkout.isPending}
            onUpgrade={
              plan.priceId
                ? () => checkout.mutate({ priceId: plan.priceId! })
                : undefined
            }
          />
        ))}
      </div>

      {checkout.isError && (
        <p className="m-0 text-sm text-danger">
          {(checkout.error as Error).message}
        </p>
      )}

      {hasActiveSubscription && periodEnd && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          {isCancelling ? (
            <p className="m-0 text-muted">
              Plano cancelado. Acesso disponível até{" "}
              <strong className="text-foreground">
                {formatDate(periodEnd)}
              </strong>
              .
            </p>
          ) : (
            <p className="m-0 text-muted">
              Sua assinatura renova em{" "}
              <strong className="text-foreground">
                {formatDate(periodEnd)}
              </strong>
              .
            </p>
          )}
        </div>
      )}

      {hasActiveSubscription && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="cursor-pointer rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {portal.isPending
              ? "Abrindo portal…"
              : "Gerenciar assinatura"}
          </button>

          {!isCancelling && (
            <>
              {!showConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="cursor-pointer rounded-lg border border-danger/30 bg-transparent px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar assinatura
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">Tem certeza?</span>
                  <button
                    type="button"
                    onClick={() => {
                      cancel.mutate(false);
                      setShowConfirm(false);
                    }}
                    disabled={cancel.isPending}
                    className="cursor-pointer rounded-lg border-0 bg-danger px-3 py-1.5 text-sm font-medium text-white transition-colors hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Sim, cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cancel.mutate(true);
                      setShowConfirm(false);
                    }}
                    disabled={cancel.isPending}
                    className="cursor-pointer rounded-lg border border-danger/30 bg-transparent px-3 py-1.5 text-sm text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar imediato (dev)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="cursor-pointer rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover"
                  >
                    Não
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
