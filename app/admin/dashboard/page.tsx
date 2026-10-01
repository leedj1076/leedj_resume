"use client";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminDashboardPage() {
  return <AdminGate><AdminDashboard /></AdminGate>;
}
