"use client";

import dynamic from "next/dynamic";

export const ProfileCardDynamic = dynamic(
  () => import("./profile-card").then((m) => m.ProfileCard),
  {
    ssr: false,
    loading: () => (
      <p className="p-8 text-center text-muted-foreground">Carregando perfil…</p>
    ),
  },
);
