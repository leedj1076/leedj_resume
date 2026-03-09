import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dong Jae Lee — Ask DJ (Internal)",
  description: "Internal testing page — not tracked in analytics.",
  robots: "noindex, nofollow",
};

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
