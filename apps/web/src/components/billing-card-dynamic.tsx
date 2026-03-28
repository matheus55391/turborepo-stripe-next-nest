"use client";

import dynamic from "next/dynamic";

export const BillingCardDynamic = dynamic(
  () => import("./billing-card").then((m) => m.BillingCard),
  {
    ssr: false,
    loading: () => (
      <p className="p-8 text-center text-muted-foreground">Carregando planos…</p>
    ),
  },
);
