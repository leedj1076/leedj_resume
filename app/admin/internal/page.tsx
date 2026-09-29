"use client";

import ProfileAppLoader from "@/components/ProfileAppLoader";
import { AdminGate } from "@/components/admin/AdminGate";

export default function InternalPage() {
  return <AdminGate><ProfileAppLoader internal /></AdminGate>;
}
