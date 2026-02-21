"use client";

import dynamic from "next/dynamic";

const ProfileApp = dynamic(() => import("@/components/ProfileApp"), {
  ssr: false,
});

export default function ProfileAppLoader() {
  return <ProfileApp />;
}
