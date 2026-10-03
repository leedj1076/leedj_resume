"use client";

import { AdminConversationWorkspace } from "@/components/admin/AdminConversationWorkspace";
import { CaptureInterview } from "@/components/admin/CaptureInterview";

export default function CapturePage() {
  return (
    <AdminConversationWorkspace>
      <CaptureInterview />
    </AdminConversationWorkspace>
  );
}
