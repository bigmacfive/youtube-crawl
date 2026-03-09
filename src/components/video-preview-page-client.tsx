"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";

import type { TranscriptPayload } from "@/lib/contracts";
import { saveToHistory } from "@/lib/history";
import { formatTimestamp } from "@/lib/youtube";
import {
  buildSelectedVideo,
  createIdleDocumentState,
  writeWorkspaceStorage,
} from "@/lib/workspace";

import { usePersistedWorkspace } from "@/components/use-persisted-workspace";
import { WorkspaceNav } from "@/components/workspace-nav";

type FetchState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done" }
  | { phase: "error"; message: string };

type FetchAction =
  | { type: "start" }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "reset" };

function fetchReducer(_: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "start":
      return { phase: "loading" };
    case "done":
      return { phase: "done" };
    case "error":
      return { phase: "error", message: action.message };
    case "reset":
      return { phase: "idle" };
  }
}

const AUTO_REDIRECT_DELAY = 3000; // 3 seconds after load

export function VideoPreviewPageClient() {
  const router = useRouter();
  const { workspace, setWorkspace, isHydrated } = usePersistedWorkspace();
  const [fetchState, dispatch] = useReducer(fetchReducer, { phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const transcript = workspace.transcript;
  const url = workspace.url;
  const language = workspace.language;

  // Auto-redirect to workspace after transcript loads
  useEffect(() => {
    if (!transcript) return;
    const timer = setTimeout(() => {
      router.push("/workspace");
    }, AUTO_REDIRECT_DELAY);
    return () => clearTimeout(timer);
  }, [transcript, router]);

  // Auto-fetch transcript if URL exists but no transcript loaded
  useEffect(() => {
    if (!isHydrated) return;
    if (transcript) return;
    if (!url.trim()) return;

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: "start" });

    fetch("/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, language }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as unknown;
        if (!response.ok) {
          throw new Error(getErrorMessage(data, "Failed to load the transcript."));
        }
        return data as TranscriptPayload;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;

        const next = {
          url,
          language,
          provider: workspace.provider,
          instruction: workspace.instruction,
          activeTab: "script" as const,
          transcript: payload,
          selectedVideo: buildSelectedVideo(payload),
          summaryState: createIdleDocumentState(),
          detailState: createIdleDocumentState(),
          chatMessages: [],
          providerModels: workspace.providerModels,
          apiKeys: workspace.apiKeys,
        };

        writeWorkspaceStorage(next);
        setWorkspace(next);

        saveToHistory(payload, [], createIdleDocumentState(), createIdleDocumentState());
        dispatch({ type: "done" });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        dispatch({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to load the transcript.",
        });
      });

    return () => controller.abort();
    // Only depend on stable values, not the full workspace object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, transcript, url, language]);

  const isLoading = fetchState.phase === "loading";
  const fetchError = fetchState.phase === "error" ? fetchState.message : null;

  // --- Not hydrated ---
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <WorkspaceNav backHref="/" backLabel="Back">
            <NavLink href="/settings">Settings</NavLink>
          </WorkspaceNav>
        </div>
      </main>
    );
  }

  // --- No URL at all ---
  if (!transcript && !url.trim() && !isLoading) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
          <WorkspaceNav backHref="/" backLabel="Back" />
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center">
            <h1 className="text-xl font-semibold">No video loaded yet.</h1>
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">
              Paste a YouTube link first, then this page will show details
              before entering the workspace.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-85"
            >
              Back to Load
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // --- Preview layout (loading skeleton OR loaded content) ---
  const title = transcript?.title ?? null;
  const authorName = transcript?.authorName ?? null;
  const thumbnailUrl = transcript?.thumbnailUrl ?? null;
  const canonicalUrl = transcript?.canonicalUrl ?? url;

  const excerpt = transcript
    ? transcript.segments
        .slice(0, 3)
        .map((segment) => `${segment.timestamp} ${segment.text}`)
        .join("\n")
    : null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-5 sm:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <WorkspaceNav backHref="/" backLabel="New Link">
          {transcript && (
            <a
              href={transcript.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-1.5 text-sm text-[var(--foreground-muted)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
            >
              YouTube
            </a>
          )}
          <NavLink href="/settings">Settings</NavLink>
        </WorkspaceNav>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left column */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
              Video Overview
            </p>

            {/* Title */}
            {isLoading ? (
              <div className="mt-4 space-y-2">
                <div className="h-8 w-3/4 animate-pulse rounded-lg bg-[var(--panel-soft)]" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--panel-soft)]" />
              </div>
            ) : (
              <>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {title ?? "Untitled"}
                </h1>
                <p className="mt-3 text-sm text-[var(--foreground-muted)]">
                  Check the source first, then move into the workspace.
                </p>
              </>
            )}

            {/* Error banner */}
            {fetchError && (
              <div className="mt-5 rounded-xl border border-[var(--danger)]/35 bg-[var(--danger-soft)] px-4 py-3">
                <p className="text-sm text-[var(--foreground)]">{fetchError}</p>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "reset" })}
                  className="mt-2 text-xs font-medium text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Meta cards */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {isLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : transcript ? (
                <>
                  <MetaCard label="Channel" value={authorName ?? "Unknown"} />
                  <MetaCard label="Language" value={transcript.language.label} />
                  <MetaCard
                    label="Duration"
                    value={formatTimestamp(transcript.stats.durationSeconds)}
                  />
                  <MetaCard
                    label="Segments"
                    value={transcript.stats.segmentCount.toLocaleString("en-US")}
                  />
                </>
              ) : null}
            </div>

            {/* Opening lines */}
            <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                Opening Lines
              </p>
              {isLoading ? (
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-[var(--panel-strong)]" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--panel-strong)]" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--panel-strong)]" />
                </div>
              ) : (
                <pre className="mt-3 whitespace-pre-wrap font-mono text-[13px] leading-7 text-[var(--foreground)]">
                  {excerpt}
                </pre>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {isLoading ? (
                <div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--foreground)]" />
                  Loading transcript...
                </div>
              ) : transcript ? (
                <>
                  <Link
                    href="/workspace"
                    className="rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-center text-sm font-medium text-[var(--background)] transition hover:opacity-85"
                  >
                    Open Workspace
                  </Link>
                  <Link
                    href="/"
                    className="rounded-lg border border-[var(--line)] px-5 py-2.5 text-center text-sm text-[var(--foreground-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
                  >
                    Change Link
                  </Link>
                  <span className="self-center text-xs text-[var(--foreground-muted)]">
                    Auto-opening workspace...
                  </span>
                </>
              ) : (
                <Link
                  href="/"
                  className="rounded-lg border border-[var(--line)] px-5 py-2.5 text-center text-sm text-[var(--foreground-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
                >
                  Change Link
                </Link>
              )}
            </div>
          </div>

          {/* Right column — thumbnail + meta */}
          <aside className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-soft)]">
              {isLoading ? (
                <div className="flex h-full animate-pulse items-center justify-center bg-[var(--panel-soft)]">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--foreground)]" />
                </div>
              ) : thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={title ?? "Video thumbnail"}
                  fill
                  sizes="(max-width: 1280px) 100vw, 340px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--foreground-muted)]">
                  Thumbnail unavailable
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                  Source URL
                </p>
                <p className="mt-2 break-all font-mono text-[13px] leading-6 text-[var(--foreground)]">
                  {canonicalUrl}
                </p>
              </div>
              {transcript && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                    Available Captions
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    {transcript.availableLanguages
                      .slice(0, 4)
                      .map((language) => language.label)
                      .join(", ") || "Only the current caption track is available."}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-[var(--foreground-muted)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
    >
      {children}
    </Link>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4">
      <div className="h-3 w-16 animate-pulse rounded bg-[var(--panel-strong)]" />
      <div className="mt-3 h-4 w-24 animate-pulse rounded bg-[var(--panel-strong)]" />
    </div>
  );
}

function getErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const record = value as { error?: unknown };
  return typeof record.error === "string" ? record.error : fallback;
}
