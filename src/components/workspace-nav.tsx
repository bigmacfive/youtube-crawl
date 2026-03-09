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
    <header className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--line)] bg-[var(--panel)]/92 px-3 py-3 shadow-[0_14px_35px_rgba(40,52,78,0.06)] backdrop-blur">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="rounded-xl px-3 py-2 text-sm font-semibold tracking-[-0.02em] text-[var(--foreground)] transition hover:bg-[var(--panel-soft)]"
        >
          Transcript Desk
        </Link>
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
          >
            {backLabel}
          </Link>
        ) : null}
      </div>

      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
