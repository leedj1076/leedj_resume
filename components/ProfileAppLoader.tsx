"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { ProfileAppProps } from "./ProfileApp";

const ProfileApp = dynamic(() => import("@/components/ProfileApp"), {
  ssr: false,
}) as React.ComponentType<ProfileAppProps>;

export default function ProfileAppLoader({
  internal,
  visiblePersonas,
  personaLabels,
  source,
  defaultPersona,
}: ProfileAppProps) {
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
