"use client";

import ProfileAppLoader from "@/components/ProfileAppLoader";
import { AdminConversationWorkspace } from "@/components/admin/AdminConversationWorkspace";

export default function InternalPage() {
  return (
    <AdminConversationWorkspace>
      <ProfileAppLoader internal />
    </AdminConversationWorkspace>
  );
}
