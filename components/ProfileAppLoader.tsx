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
  source?: string;
  defaultPersona?: string;
}>;

export default function ProfileAppLoader({
  internal,
  visiblePersonas,
  personaLabels,
  source,
  defaultPersona,
}: {
  internal?: boolean;
  visiblePersonas?: string[];
  personaLabels?: PersonaLabels;
  source?: string;
  defaultPersona?: string;
}) {
  return (
    <ProfileApp
      internal={internal}
      visiblePersonas={visiblePersonas}
      personaLabels={personaLabels}
      source={source}
      defaultPersona={defaultPersona}
    />
  );
}
