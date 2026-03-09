import type { ReactNode } from "react";
import Link from "next/link";

export function WorkspaceNav({
  backHref,
  backLabel,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex h-10 shrink-0 items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="text-sm font-semibold text-[var(--foreground)] transition hover:opacity-70"
        >
          youtube-crawl
        </Link>
        {backHref && backLabel ? (
          <>
            <span className="text-[var(--line-strong)]">/</span>
            <Link
              href={backHref}
              className="text-sm text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
            >
              {backLabel}
            </Link>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
