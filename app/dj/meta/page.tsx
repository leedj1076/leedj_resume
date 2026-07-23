import type { Metadata } from "next";
import ProfileAppLoader from "@/components/ProfileAppLoader";
import { getVisiblePersonas, getPersonaLabels } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Dong Jae Lee — Ask DJ",
  description:
    "Interactive profile with AI-powered Q&A. Ask anything about my professional experience — answers grounded in verified data via RAG pipeline.",
};

// Read fresh per request so admin visibility/label changes take effect immediately.
export const dynamic = "force-dynamic";

// Meta developer-partnerships landing: tagged source="meta" for analytics and
// defaulted to the Strategic Partnerships persona.
export default async function MetaProfile() {
  const [visiblePersonas, personaLabels] = await Promise.all([
    getVisiblePersonas(),
    getPersonaLabels(),
  ]);
  return (
    <ProfileAppLoader
      visiblePersonas={visiblePersonas}
      personaLabels={personaLabels}
      source="meta"
      defaultPersona="developer_partnerships"
    />
  );
}
