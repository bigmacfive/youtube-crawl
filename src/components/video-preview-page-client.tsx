"use client";

import Image from "next/image";
import Link from "next/link";

import { formatTimestamp } from "@/lib/youtube";

import { usePersistedWorkspace } from "@/components/use-persisted-workspace";
import { WorkspaceNav } from "@/components/workspace-nav";

export function VideoPreviewPageClient() {
  const { workspace, isHydrated } = usePersistedWorkspace();
  const transcript = workspace.transcript;

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <WorkspaceNav backHref="/" backLabel="Back" />
          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(40,52,78,0.06)]">
            <p className="text-sm text-[var(--muted)]">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!transcript) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <WorkspaceNav backHref="/" backLabel="Back" />
          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-8 text-center shadow-[0_24px_60px_rgba(40,52,78,0.08)]">
            <h1 className="text-2xl font-semibold tracking-[-0.04em]">
              No video is loaded yet.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Paste a YouTube link first, then this page will show the channel
              and video details before entering the workspace.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Back to Load
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const excerpt = transcript.segments
    .slice(0, 3)
    .map((segment) => `${segment.timestamp} ${segment.text}`)
    .join("\n");

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <WorkspaceNav backHref="/" backLabel="New Link">
          <Link
            href="/settings"
            className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
          >
            Settings
          </Link>
          <a
            href={transcript.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
          >
            YouTube
          </a>
        </WorkspaceNav>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(40,52,78,0.08)] sm:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
              Video Overview
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              {transcript.title ?? transcript.videoId}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Check the source first, then move into the workspace.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetaCard label="Channel" value={transcript.authorName ?? "Unknown"} />
              <MetaCard label="Language" value={transcript.language.label} />
              <MetaCard
                label="Transcript Length"
                value={formatTimestamp(transcript.stats.durationSeconds)}
              />
              <MetaCard
                label="Segments"
                value={transcript.stats.segmentCount.toLocaleString("en-US")}
              />
            </div>

            <div className="mt-6 rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                Opening Lines
              </p>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-[13px] leading-7 text-[var(--foreground)]">
                {excerpt}
              </pre>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/workspace"
                className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
              >
                Open Workspace
              </Link>
              <Link
                href="/"
                className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-center text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--line-strong)]"
              >
                Change Link
              </Link>
            </div>
          </div>

          <aside className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(40,52,78,0.08)]">
            <div className="relative aspect-video overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)]">
              {transcript.thumbnailUrl ? (
                <Image
                  src={transcript.thumbnailUrl}
                  alt={transcript.title ?? transcript.videoId}
                  fill
                  sizes="(max-width: 1280px) 100vw, 340px"
                  className="object-cover grayscale"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-7 text-[var(--muted)]">
                  Thumbnail unavailable
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                  Source URL
                </p>
                <p className="mt-2 break-all font-mono text-[13px] leading-6 text-[var(--foreground)]">
                  {transcript.canonicalUrl}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                  Available Captions
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                  {transcript.availableLanguages
                    .slice(0, 4)
                    .map((language) => language.label)
                    .join(", ") || "Only the current caption track is available."}
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetaCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium leading-7 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
