"use client";

import { AdminGate } from "@/components/admin/AdminGate";
import { CaptureInterview } from "@/components/admin/CaptureInterview";

export default function CapturePage() {
  return <AdminGate><CaptureInterview /></AdminGate>;
}
