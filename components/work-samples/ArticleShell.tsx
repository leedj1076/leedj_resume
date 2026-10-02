import type { ReactNode } from "react";
import Link from "next/link";

interface ArticleShellProps {
  title: ReactNode;
  children: ReactNode;
  footerStyle?: "byline" | "compact";
}

export default function ArticleShell({
  title,
  children,
  footerStyle = "byline",
}: ArticleShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      <header className="sticky top-0 z-10 bg-[var(--color-page-bg)]/80 backdrop-blur-md border-b border-[var(--color-border-primary)]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/dj"
            className="text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
          >
            &larr; Back to profile
          </Link>
          <span className="text-[12px] text-[var(--color-text-muted)] uppercase tracking-[0.15em]">
            Work Samples
          </span>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        {title}
        {children}
      </article>
      {footerStyle === "compact" ? (
        <footer className="max-w-3xl mx-auto px-6 pb-16">
          <div className="border-t border-[var(--color-border-primary)] pt-8">
            <Link
              href="/dj"
              className="text-[14px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
            >
              &larr; Back to profile
            </Link>
          </div>
        </footer>
      ) : (
        <footer className="border-t border-[var(--color-border-primary)]">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Written by Dong Jae Lee &middot;{" "}
              <Link
                href="/dj"
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors no-underline"
              >
                Back to profile
              </Link>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
