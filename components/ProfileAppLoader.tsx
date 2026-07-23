"use client";

import React from "react";
import dynamic from "next/dynamic";

type PersonaLabels = Record<string, { en: string; kr: string }>;

const ProfileApp = dynamic(() => import("@/components/ProfileApp"), {
  ssr: false,
}) as React.ComponentType<{
  internal?: boolean;
  visiblePersonas?: string[];
  personaLabels?: PersonaLabels;
}>;

export default function ProfileAppLoader({
  internal,
  visiblePersonas,
  personaLabels,
}: {
  internal?: boolean;
  visiblePersonas?: string[];
  personaLabels?: PersonaLabels;
}) {
  return (
    <ProfileApp
      internal={internal}
      visiblePersonas={visiblePersonas}
      personaLabels={personaLabels}
    />
  );
}
