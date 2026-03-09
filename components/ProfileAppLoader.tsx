"use client";

import React from "react";
import dynamic from "next/dynamic";

const ProfileApp = dynamic(() => import("@/components/ProfileApp"), {
  ssr: false,
}) as React.ComponentType<{ internal?: boolean }>;

export default function ProfileAppLoader({ internal }: { internal?: boolean }) {
  return <ProfileApp internal={internal} />;
}
