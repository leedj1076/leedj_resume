import type { Metadata } from "next";
import ProfileApp from "@/components/ProfileApp";

export const metadata: Metadata = {
  title: "Dong Jae Lee — Ask DJ",
  description:
    "Interactive profile with AI-powered Q&A. Ask anything about my professional experience — answers grounded in verified data via RAG pipeline.",
};

export default function Home() {
  return <ProfileApp />;
}
