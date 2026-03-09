import Link from "next/link";

import { FormattedTextBlocks } from "@/components/formatted-text-blocks";
import type { GeneratedDocumentState } from "@/lib/workspace";

export function SummaryView({
  state,
  onGenerate,
  disabled,
}: {
  state: GeneratedDocumentState;
  onGenerate: () => void;
  disabled: boolean;
}) {
  if (state.status === "loading") {
    return (
      <div className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <LoadingCard label="Summary" detail="Generating a short read view..." />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger-soft)] px-5 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--danger)]">
              Summary Error
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
              {state.error}
            </p>
            <button
              type="button"
              onClick={onGenerate}
              className="mt-4 rounded-full border border-[var(--danger)] px-4 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status !== "loaded") {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
        <div className="max-w-xl space-y-4 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[var(--muted)]">
            Summary
          </p>
          <h3 className="text-xl font-semibold text-[var(--foreground)]">
            Generate a concise summary only when you need it.
          </h3>
          <p className="text-sm leading-7 text-[var(--muted)]">
            The workspace keeps the raw script as the center of gravity. Summary
            is an optional AI lens on top of it.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onGenerate}
            className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-3 text-sm font-medium text-[var(--accent-strong)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Generate Summary
          </button>
          {disabled ? (
            <div className="text-sm leading-7 text-[var(--muted)]">
              Add your key in{" "}
              <Link
                href="/settings"
                className="font-medium text-[var(--accent-strong)]"
              >
                Settings
              </Link>
              .
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const lead = state.content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {lead ? (
          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--accent-soft)] px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Core Takeaway
            </p>
            <p className="mt-3 text-[15px] font-medium leading-8 text-[var(--foreground)]">
              {lead}
            </p>
          </div>
        ) : null}
        <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel)] px-5 py-5">
          <FormattedTextBlocks content={state.content} />
        </div>
      </div>
    </div>
  );
}

function LoadingCard({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-5">
      <div className="h-3 w-28 rounded-full bg-[var(--line)]/70" />
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full rounded-full bg-[var(--line)]/55" />
        <div className="h-3 w-[92%] rounded-full bg-[var(--line)]/55" />
        <div className="h-3 w-[74%] rounded-full bg-[var(--line)]/55" />
      </div>
    </div>
  );
}
