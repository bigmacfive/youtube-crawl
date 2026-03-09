import Link from "next/link";

import { FormattedTextBlocks } from "@/components/formatted-text-blocks";
import { splitDetailSections, type GeneratedDocumentState } from "@/lib/workspace";

export function DetailView({
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
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--muted)]">
              Detail
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Building a deeper breakdown with themes, context, and notable lines.
            </p>
          </div>
          <SkeletonPanel />
          <SkeletonPanel />
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
              Detail Error
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
              {state.error}
            </p>
            <button
              type="button"
              onClick={onGenerate}
              className="mt-4 rounded-full border border-[var(--danger)] px-4 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--panel)]"
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
            Detail
          </p>
          <h3 className="text-xl font-semibold text-[var(--foreground)]">
            Expand the transcript into a structured explainer only on demand.
          </h3>
          <p className="text-sm leading-7 text-[var(--muted)]">
            This view is meant for deeper reading. It groups context, important
            lines, and supporting detail into sections you can fold open.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onGenerate}
            className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-3 text-sm font-medium text-[var(--accent-strong)] transition hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Generate Detail
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

  const sections = splitDetailSections(state.content);

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {sections.map((section, index) => (
          <details
            key={`${section.title}-${index}`}
            open={index === 0}
            className="group overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(40,52,78,0.04)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[var(--panel-soft)] px-5 py-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Section {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {section.title}
                </p>
              </div>
              <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Toggle
              </span>
            </summary>
            <div className="border-t border-[var(--line)] px-5 py-5">
              <FormattedTextBlocks content={section.body} compact />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-5">
      <div className="h-3 w-36 rounded-full bg-[var(--line)]/70" />
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full rounded-full bg-[var(--line)]/55" />
        <div className="h-3 w-[90%] rounded-full bg-[var(--line)]/55" />
        <div className="h-3 w-[82%] rounded-full bg-[var(--line)]/55" />
        <div className="h-3 w-[65%] rounded-full bg-[var(--line)]/55" />
      </div>
    </div>
  );
}
